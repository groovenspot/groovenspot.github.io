/** Opt-in PostgreSQL checks: INTEGRATION_DATABASE_URL=postgresql://... npx vitest run tests/ops.integration.test.ts */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const ip = { value: "203.0.113.7" };
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": `${ip.value}, 10.0.0.1` }), cookies: async () => ({ get: () => undefined }) }));
const mails: { to: string; subject: string; text: string }[] = [];
vi.mock("@/server/mail", () => ({ sendMail: async (to: string, subject: string, text: string) => { mails.push({ to, subject, text }); return { ok: true }; } }));

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("운영 기능 (한도·동의 안내·수신 거부·작업 기록)", () => {
  let prisma: PrismaClient;
  const run = randomUUID().slice(0, 8);
  let oldId: string, freshId: string, offId: string;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("SCAN_LIMIT_ANON", "2");
    vi.stubEnv("SCAN_LIMIT_PER_MINUTE", "50");
    ({ prisma } = await import("@/server/db"));
    const day = 86400e3;
    oldId = (await prisma.user.create({ data: { email: `ops-old-${run}@example.test`, marketingConsentAt: new Date(Date.now() - 800 * day) } })).id;
    freshId = (await prisma.user.create({ data: { email: `ops-fresh-${run}@example.test`, marketingConsentAt: new Date(Date.now() - 30 * day) } })).id;
    offId = (await prisma.user.create({ data: { email: `ops-off-${run}@example.test`, marketingConsentAt: null, marketingConsentUpdatedAt: new Date() } })).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.scanQuota.deleteMany({ where: { createdAt: { gt: new Date(Date.now() - 3600e3) } } });
    await prisma.adminLog.deleteMany({ where: { adminEmail: `ops-${run}@example.test` } });
    await prisma.user.deleteMany({ where: { email: { contains: run } } });
    await prisma.$disconnect();
  });

  it("비회원 사진 인식은 접속지당 한도에서 멈추고, 다른 접속지는 따로 셉니다", async () => {
    const { takeScanQuota } = await import("@/server/quota");
    ip.value = `198.51.100.${Math.floor(Math.random() * 200)}`;
    expect((await takeScanQuota(null)).ok).toBe(true);
    expect((await takeScanQuota(null)).ok).toBe(true);
    expect(await takeScanQuota(null)).toMatchObject({ ok: false });
    ip.value = "192.0.2.99";
    expect((await takeScanQuota(null)).ok).toBe(true);
  });

  it("2년 된 동의에만 안내 메일을 보내고 보낸 날을 남깁니다", async () => {
    const { runConsentNotices } = await import("@/jobs/consent");
    mails.length = 0;
    await runConsentNotices();
    const to = mails.map((m) => m.to);
    expect(to).toContain(`ops-old-${run}@example.test`);
    expect(to).not.toContain(`ops-fresh-${run}@example.test`);
    expect(to).not.toContain(`ops-off-${run}@example.test`);
    expect((await prisma.user.findUnique({ where: { id: oldId } }))?.marketingConsentNoticeAt).not.toBeNull();
    mails.length = 0;
    await runConsentNotices();
    expect(mails.map((m) => m.to)).not.toContain(`ops-old-${run}@example.test`);
  });

  it("수신 거부 링크는 서명이 맞을 때만 동의를 철회합니다", async () => {
    const { withdrawByLink } = await import("@/server/unsubscribe");
    const { unsubscribeToken } = await import("@/lib/unsubscribe");
    expect(await withdrawByLink(freshId, "wrong-token-wrong-token-wrong-tok")).toBe("invalid");
    expect(await withdrawByLink(freshId, unsubscribeToken(freshId))).toBe("done");
    const u = await prisma.user.findUnique({ where: { id: freshId } });
    expect(u?.marketingConsentAt).toBeNull();
    expect(u?.marketingConsentUpdatedAt).not.toBeNull();
    expect(await withdrawByLink(freshId, unsubscribeToken(freshId))).toBe("already");
    expect(await withdrawByLink(offId, unsubscribeToken(offId))).toBe("already");
  });

  it("관리자 작업은 성공·실패 모두 기록하고, 실패는 그대로 다시 던집니다", async () => {
    const { audited } = await import("@/server/audit");
    const fd = new FormData(); fd.set("dutyRate", "15"); fd.set("PORTONE_API_SECRET", "x");
    await audited(`ops-${run}@example.test`, "saveTax", fd, async () => 1);
    await expect(audited(`ops-${run}@example.test`, "saveTax", fd, async () => { throw new Error("세율 오류"); })).rejects.toThrow("세율 오류");
    const logs = await prisma.adminLog.findMany({ where: { adminEmail: `ops-${run}@example.test` }, orderBy: { createdAt: "asc" } });
    expect(logs.map((l) => l.ok)).toEqual([true, false]);
    expect(logs[1].error).toBe("세율 오류");
    expect((logs[0].detail as Record<string, string>).PORTONE_API_SECRET).toBe("***");
  });
});
