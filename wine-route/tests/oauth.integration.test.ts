/** Opt-in PostgreSQL checks: INTEGRATION_DATABASE_URL=postgresql://... npx vitest run tests/oauth.integration.test.ts */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("소셜 계정 연결 규칙", () => {
  let prisma: PrismaClient;
  let resolveOAuthUser: typeof import("@/server/oauth").resolveOAuthUser;
  const run = randomUUID().slice(0, 8);
  const existingEmail = `oauth-old-${run}@example.test`;
  const newEmail = `oauth-new-${run}@example.test`;
  let existingId: string, otherId: string;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    ({ prisma } = await import("@/server/db"));
    ({ resolveOAuthUser } = await import("@/server/oauth"));
    existingId = (await prisma.user.create({ data: { email: existingEmail } })).id;
    otherId = (await prisma.user.create({ data: { email: `oauth-other-${run}@example.test` } })).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.user.deleteMany({ where: { email: { contains: run } } });
    await prisma.$disconnect();
  });

  it("인증된 같은 이메일이면 기존 계정에 붙고, 다음에는 연결로 찾습니다", async () => {
    const r = await resolveOAuthUser("kakao", { providerId: `k-${run}`, email: existingEmail.toUpperCase(), emailVerified: true }, null);
    expect(r).toMatchObject({ ok: true, userId: existingId, created: false, linked: true });
    const again = await resolveOAuthUser("kakao", { providerId: `k-${run}`, email: null, emailVerified: false }, null);
    expect(again).toMatchObject({ ok: true, userId: existingId, linked: false });
  });

  it("인증되지 않은 이메일로는 가입·연결하지 않습니다", async () => {
    const r = await resolveOAuthUser("kakao", { providerId: `k2-${run}`, email: existingEmail, emailVerified: false }, null);
    expect(r.ok).toBe(false);
    expect(await prisma.oAuthAccount.count({ where: { providerId: `k2-${run}` } })).toBe(0);
  });

  it("처음 보는 이메일이면 새로 가입합니다", async () => {
    const r = await resolveOAuthUser("naver", { providerId: `n-${run}`, email: newEmail, emailVerified: true }, null);
    expect(r).toMatchObject({ ok: true, created: true });
    expect(await prisma.user.count({ where: { email: newEmail } })).toBe(1);
  });

  it("로그인 중이면 지금 계정에 연결하고, 남의 계정에 붙은 소셜 계정은 거절합니다", async () => {
    const r = await resolveOAuthUser("naver", { providerId: `n2-${run}`, email: null, emailVerified: false }, otherId);
    expect(r).toMatchObject({ ok: true, userId: otherId, linked: true });
    const stolen = await resolveOAuthUser("kakao", { providerId: `k-${run}`, email: null, emailVerified: false }, otherId);
    expect(stolen.ok).toBe(false);
  });

  it("탈퇴하면 소셜 연결도 지워집니다", async () => {
    await prisma.user.delete({ where: { id: otherId } });
    expect(await prisma.oAuthAccount.count({ where: { providerId: `n2-${run}` } })).toBe(0);
  });
});
