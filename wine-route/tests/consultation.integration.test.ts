/** Opt-in PostgreSQL checks: INTEGRATION_DATABASE_URL=postgresql://... npx vitest run tests/consultation.integration.test.ts */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("consultation PostgreSQL quota and ownership", () => {
  let prisma: PrismaClient;
  let reserve: typeof import("@/server/consultation").reserveConsultationQuota;
  let feedback: typeof import("@/server/consultation").consultationFeedback;
  let history: typeof import("@/server/consultation").consultationHistory;
  let ownerId: string;
  let otherId: string;
  const now = new Date("2026-10-02T14:59:59Z");
  const runId = randomUUID();

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    ({ prisma } = await import("@/server/db"));
    ({ reserveConsultationQuota: reserve, consultationFeedback: feedback, consultationHistory: history } = await import("@/server/consultation"));
    ownerId = (await prisma.user.create({ data: { email: `consultation-owner-${runId}@example.test`, adultVerifiedAt: now } })).id;
    otherId = (await prisma.user.create({ data: { email: `consultation-other-${runId}@example.test`, adultVerifiedAt: now } })).id;
  });

  beforeEach(async () => {
    await prisma.consultationDailyUsage.deleteMany({ where: { userId: ownerId } });
    await prisma.consultation.deleteMany({ where: { userId: ownerId } });
    await prisma.user.update({ where: { id: ownerId }, data: { plan: "FREE", premiumUntil: null, adultVerifiedAt: now } });
  });

  afterAll(async () => {
    if (prisma) {
      // Delete only the records belonging to this test run; relations cascade.
      await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId].filter(Boolean) } } });
      await prisma.$disconnect();
    }
    vi.unstubAllEnvs();
  });

  it("admits exactly five of eight concurrent requests when the daily row does not yet exist", async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => reserve(ownerId, now)));
    const accepted = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(accepted).toHaveLength(5); expect(rejected).toHaveLength(3);
    for (const result of rejected) if (result.status === "rejected") expect(result.reason).toMatchObject({ code: "daily_limit", status: 429 });
    const saved = await prisma.consultationDailyUsage.findMany({ where: { userId: ownerId } });
    expect(saved).toHaveLength(1); expect(saved[0].count).toBe(5);
    expect(await reserve(ownerId, new Date("2026-10-02T15:00:00Z"))).toMatchObject({ remaining: 4, isPremium: false });
    expect(await prisma.consultationDailyUsage.count({ where: { userId: ownerId } })).toBe(2);
  });

  it("accepts paid and reward premium accounts beyond five while requiring actual adult verification", async () => {
    await prisma.user.update({ where: { id: ownerId }, data: { premiumUntil: new Date(now.getTime() + 86400_000) } });
    const results = await Promise.all(Array.from({ length: 8 }, () => reserve(ownerId, now)));
    expect(results.every((result) => result.isPremium && result.remaining === null)).toBe(true);
    await prisma.user.update({ where: { id: ownerId }, data: { adultVerifiedAt: null } });
    await expect(reserve(ownerId, now)).rejects.toMatchObject({ code: "adult_required", status: 403 });
    expect((await prisma.consultationDailyUsage.findFirst({ where: { userId: ownerId } }))?.count).toBe(8);
  });

  it("never returns another user's records or mutates expired/foreign feedback", async () => {
    const valid = await prisma.consultation.create({ data: { userId: ownerId, question: "세금 계산해줘", answer: { kind: "procedure", text: "안내", links: [], wineCards: [] }, expiresAt: new Date(now.getTime() + 86400_000) } });
    const expired = await prisma.consultation.create({ data: { userId: ownerId, question: "만료 기록", answer: {}, expiresAt: now } });
    await expect(feedback(otherId, valid.id, { helpful: true }, now)).rejects.toMatchObject({ code: "not_found", status: 404 });
    await expect(feedback(ownerId, expired.id, { helpful: true }, now)).rejects.toMatchObject({ code: "not_found", status: 404 });
    expect(await feedback(ownerId, valid.id, { action: "compare" }, now)).toEqual({ ok: true });
    expect((await prisma.consultation.findUniqueOrThrow({ where: { id: valid.id } })).compareClickedAt).toEqual(now);
    const ownerHistory = await history({ id: ownerId, plan: "FREE", premiumUntil: null }, now);
    const otherHistory = await history({ id: otherId, plan: "FREE", premiumUntil: null }, now);
    expect(ownerHistory.history.map((row) => row.id)).toEqual([valid.id]);
    expect(otherHistory.history).toEqual([]);
  });
});
