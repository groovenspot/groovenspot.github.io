/** Opt-in PostgreSQL checks: INTEGRATION_DATABASE_URL=postgresql://... npx vitest run tests/push.integration.test.ts */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mails: { to: string; subject: string }[] = [];
vi.mock("@/server/mail", () => ({ sendMail: async (to: string, subject: string) => { mails.push({ to, subject }); return { ok: true }; } }));
const pushMode = { status: 0 as number }; // 0 = 성공, 그 밖은 그 상태 코드로 실패
const pushed: string[] = [];
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (sub: { endpoint: string }) => {
      if (pushMode.status) throw Object.assign(new Error("push failed"), { statusCode: pushMode.status });
      pushed.push(sub.endpoint);
      return { statusCode: 201 };
    },
  },
}));

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("브라우저 알림 발송", () => {
  let prisma: PrismaClient;
  const run = randomUUID().slice(0, 8);
  let userId: string;
  const ep = (n: number) => `https://push.example.test/${run}/${n}`;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY", "pub");
    vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "priv");
    ({ prisma } = await import("@/server/db"));
    userId = (await prisma.user.create({ data: { email: `push-${run}@example.test` } })).id;
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("등록한 기기로 보내고, 성공하면 실패 횟수를 지웁니다", async () => {
    const { sendPushToUser } = await import("@/server/push");
    await prisma.pushSubscription.createMany({ data: [1, 2].map((n) => ({ userId, endpoint: ep(n), p256dh: "k", auth: "a", failCount: 2 })) });
    pushMode.status = 0;
    expect(await sendPushToUser(userId, "t", "b", "/")).toMatchObject({ sent: 2, failed: 0 });
    expect(pushed).toEqual(expect.arrayContaining([ep(1), ep(2)]));
    const rows = await prisma.pushSubscription.findMany({ where: { userId } });
    expect(rows.every((r) => r.failCount === 0 && r.lastOkAt)).toBe(true);
  });

  it("일시 실패는 횟수를 쌓고, 5번째에 지웁니다. 410 은 바로 지웁니다", async () => {
    const { sendPushToUser } = await import("@/server/push");
    pushMode.status = 500;
    await prisma.pushSubscription.update({ where: { endpoint: ep(2) }, data: { failCount: 4 } });
    expect(await sendPushToUser(userId, "t", "b", "/")).toMatchObject({ sent: 0, failed: 2 });
    expect((await prisma.pushSubscription.findUnique({ where: { endpoint: ep(1) } }))?.failCount).toBe(1);
    expect(await prisma.pushSubscription.findUnique({ where: { endpoint: ep(2) } })).toBeNull();
    pushMode.status = 410;
    await sendPushToUser(userId, "t", "b", "/");
    expect(await prisma.pushSubscription.count({ where: { userId } })).toBe(0);
  });

  it("푸시 알림: 받으면 push 로 기록, 기기가 없으면 메일로 대신 보냅니다", async () => {
    const { notify } = await import("@/server/notify");
    const user = { id: userId, email: `push-${run}@example.test`, phone: null };
    pushMode.status = 0;
    await prisma.pushSubscription.create({ data: { userId, endpoint: ep(3), p256dh: "k", auth: "a" } });
    expect(await notify({ user, type: "DROP", title: "가격 하락", body: "내렸습니다", link: "/", dedupeKey: `push-a-${run}`, channel: "PUSH" })).toEqual({ sent: true });
    expect((await prisma.notification.findUnique({ where: { dedupeKey: `push-a-${run}` } }))?.channel).toBe("push");
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    const before = mails.length;
    expect(await notify({ user, type: "DROP", title: "가격 하락", body: "내렸습니다", link: "/", dedupeKey: `push-b-${run}`, channel: "PUSH" })).toEqual({ sent: true });
    expect((await prisma.notification.findUnique({ where: { dedupeKey: `push-b-${run}` } }))?.channel).toBe("email");
    expect(mails.length).toBe(before + 1);
  });
});
