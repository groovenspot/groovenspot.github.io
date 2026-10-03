/** Opt-in PostgreSQL checks: INTEGRATION_DATABASE_URL=postgresql://... npx vitest run tests/wineprice.integration.test.ts */
import type { PrismaClient } from "@prisma/client";
import { beforeAll, describe, expect, it, vi } from "vitest";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("미리 계산한 최저 도착가(WinePrice)", () => {
  let prisma: PrismaClient;
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    ({ prisma } = await import("@/server/db"));
  });

  it("다시 계산한 값이 엔진 계산과 같고, DB 검색 결과가 예전 화면 검색과 같습니다", async () => {
    const { refreshWinePrices, searchWhere } = await import("@/server/winePrice");
    const { compareMany } = await import("@/server/compare");
    const { matchesQuery } = await import("@/lib/search");
    await refreshWinePrices();
    const { items } = await compareMany({});
    const rows = await prisma.winePrice.findMany();
    for (const { wine, result } of items) {
      const r = rows.find((x) => x.wineId === wine.id)!;
      expect(r.perBottle).toBe(result.best ? Math.round(result.best.perBottle) : null);
      expect(r.exempt).toBe(!!result.best?.tax.exempt);
      expect(r.krPerBottle).toBe(result.krPerBottle);
    }
    for (const q of ["샤블리", "chablis", "부르고뉴 피노", "riesling", "샴페인", "버건디", "없는와인이름"]) {
      const old = items.filter(({ wine }) => matchesQuery([wine.name, wine.nameKo, wine.producer, wine.region, wine.country, wine.type, wine.grape, ...wine.aliases].join(" "), q)).map((i) => i.wine.id).sort();
      const now = (await prisma.winePrice.findMany({ where: searchWhere(q), select: { wineId: true } })).map((r) => r.wineId).sort();
      expect(now, q).toEqual(old);
    }
  });

  it("빠진 와인만 채웁니다", async () => {
    const { ensureWinePrices } = await import("@/server/winePrice");
    const w = await prisma.winePrice.findFirstOrThrow();
    await prisma.winePrice.delete({ where: { wineId: w.wineId } });
    expect(await ensureWinePrices()).toBe(1);
    expect(await ensureWinePrices()).toBe(0);
  });
});
