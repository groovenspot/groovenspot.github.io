/** Opt-in PostgreSQL checks: INTEGRATION_DATABASE_URL=postgresql://... npx vitest run tests/account.integration.test.ts */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("회원 탈퇴와 내 데이터 내려받기", () => {
  let prisma: PrismaClient;
  let deleteAccount: typeof import("@/server/account").deleteAccount;
  let exportAccount: typeof import("@/server/account").exportAccount;
  let encrypt: typeof import("@/server/crypto").encrypt;
  const runId = randomUUID();
  const email = `account-${runId}@example.test`;
  let userId: string, friendId: string, wineId: string, sellerId: string, clickId: string;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("ORDER_DATA_KEY", "integration-order-key-0123456789");
    ({ prisma } = await import("@/server/db"));
    ({ deleteAccount, exportAccount } = await import("@/server/account"));
    ({ encrypt } = await import("@/server/crypto"));
    const u = await prisma.user.create({ data: { email, pcccEnc: encrypt("P123456789012"), nickname: `탈퇴${runId.slice(0, 6)}` } });
    userId = u.id;
    friendId = (await prisma.user.create({ data: { email: `friend-${runId}@example.test`, referredById: userId } })).id;
    wineId = (await prisma.wine.create({ data: { name: `Acct ${runId}`, nameKo: "탈퇴 테스트", producer: "T", country: "프랑스", region: "R", type: "레드", aliases: [] } })).id;
    sellerId = (await prisma.seller.create({ data: { name: `Acct ${runId}`, country: "프랑스", channel: "WINERY_DIRECT", website: "https://example.test", currency: "EUR" } })).id;
    const offer = await prisma.offer.create({ data: { wineId, sellerId, url: "https://example.test/w", price: 20 } });
    clickId = (await prisma.clickLog.create({ data: { offerId: offer.id, wineId, userId, route: "WINERY_DIRECT", qty: 1, estPerBottle: 40000 } })).id;
    await prisma.order.create({ data: { clickId, userId, wineId, sellerId, route: "WINERY_DIRECT", qty: 1, bottleMl: 750, estTotal: 40000, estTax: 4000 } });
    await prisma.priceAlert.create({ data: { userId, wineId, targetPerBottle: 30000 } });
    await prisma.pointTx.create({ data: { userId, amount: 300, reason: "test", refId: runId } });
    await prisma.wineRequest.create({ data: { userId, text: `요청 ${runId}`, source: "manual" } });
    await prisma.shareEvent.create({ data: { userId, kind: "wine", format: "story", action: "save" } });
    await prisma.waitlist.create({ data: { email } });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.wineRequest.deleteMany({ where: { text: `요청 ${runId}` } });
    await prisma.user.deleteMany({ where: { id: friendId } });
    await prisma.wine.deleteMany({ where: { id: wineId } });
    await prisma.seller.deleteMany({ where: { id: sellerId } });
    await prisma.$disconnect();
  });

  it("내려받기에는 본인 기록과 복호화한 통관부호가 들어 있다", async () => {
    const d = await exportAccount(userId);
    expect(d.account.email).toBe(email);
    expect(d.account.pccc).toBe("P123456789012");
    expect(d.account.orders).toHaveLength(1);
    expect(d.account.alerts).toHaveLength(1);
    expect(JSON.stringify(d)).not.toContain("pcccEnc");
  });

  it("탈퇴하면 개인 데이터는 지우고 통계 기록은 연결만 끊는다", async () => {
    expect(await deleteAccount(userId)).toBe(true);
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
    expect(await prisma.order.count({ where: { userId } })).toBe(0);
    expect(await prisma.priceAlert.count({ where: { userId } })).toBe(0);
    expect(await prisma.pointTx.count({ where: { userId } })).toBe(0);
    expect(await prisma.waitlist.count({ where: { email } })).toBe(0);
    const click = await prisma.clickLog.findUnique({ where: { id: clickId } });
    expect(click?.userId).toBeNull(); // 판매처 이동 통계는 남김
    expect((await prisma.wineRequest.findFirst({ where: { text: `요청 ${runId}` } }))?.userId).toBeNull();
    expect(await prisma.shareEvent.count({ where: { userId } })).toBe(0);
    expect((await prisma.user.findUnique({ where: { id: friendId } }))?.referredById).toBeNull();
    expect(await deleteAccount(userId)).toBe(false);
  });
});
