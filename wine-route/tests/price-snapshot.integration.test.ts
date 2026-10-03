/** Opt-in PostgreSQL checks: INTEGRATION_DATABASE_URL=postgresql://... npx vitest run tests/price-snapshot.integration.test.ts */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("도착가 일일 기록", () => {
  let prisma: PrismaClient;
  let snapshotAll: typeof import("@/jobs/alerts").snapshotAll;
  let loadContext: typeof import("@/server/compare").loadContext;
  const runId = randomUUID();
  const day = new Date("2026-10-03");
  let wineA: string, wineB: string, sellerId: string;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    ({ prisma } = await import("@/server/db"));
    ({ snapshotAll } = await import("@/jobs/alerts"));
    ({ loadContext } = await import("@/server/compare"));
    const mk = (n: string) => prisma.wine.create({ data: { name: `Snap ${n} ${runId}`, nameKo: `기록 ${n}`, producer: "T", country: "프랑스", region: "R", type: "레드", aliases: [] } });
    wineA = (await mk("A")).id;
    wineB = (await mk("B")).id;
    sellerId = (await prisma.seller.create({ data: { name: `Snap ${runId}`, country: "프랑스", channel: "WINERY_DIRECT", website: "https://example.test", currency: "EUR", shipBase: 30, shipPerBottle: 5 } })).id;
    await prisma.offer.create({ data: { wineId: wineA, sellerId, url: "https://example.test/a", price: 20 } });
    // 찜 알림이 이미 오늘 칸을 쓴 와인 B: 덮어쓰면 안 됨
    await prisma.watchPrice.create({ data: { wineId: wineB, qty: 1, bottleMl: 750, day, perBottle: 12345, route: "X" } });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.watchPrice.deleteMany({ where: { wineId: { in: [wineA, wineB] } } });
    await prisma.offer.deleteMany({ where: { sellerId } });
    await prisma.seller.deleteMany({ where: { id: sellerId } });
    await prisma.wine.deleteMany({ where: { id: { in: [wineA, wineB] } } });
    await prisma.$disconnect();
  });

  it("모든 와인의 1병·750ml 칸을 쓰고, 찜 알림이 쓴 칸은 건너뛴다", async () => {
    const ctx = await loadContext();
    await snapshotAll(ctx, day, new Set([`${wineB}|1|750`]));
    const a = await prisma.watchPrice.findUnique({ where: { wineId_qty_bottleMl_day: { wineId: wineA, qty: 1, bottleMl: 750, day } } });
    const b = await prisma.watchPrice.findUnique({ where: { wineId_qty_bottleMl_day: { wineId: wineB, qty: 1, bottleMl: 750, day } } });
    expect(a).not.toBeNull();
    expect(b?.perBottle).toBe(12345);
    // 같은 날 다시 돌려도 한 줄
    await snapshotAll(ctx, day, new Set([`${wineB}|1|750`]));
    expect(await prisma.watchPrice.count({ where: { wineId: wineA } })).toBe(1);
  });
});
