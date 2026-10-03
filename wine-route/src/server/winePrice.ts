import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { compareLoaded, loadContext } from "./compare";
import { expandQuery, fold } from "@/lib/search";

/** 검색용 글자: 이름·생산자·산지·국가·종류·품종·별칭을 접어서(소문자·악센트·공백 제거) 붙입니다. 화면의 matchesQuery 와 같은 규칙. */
export const searchTextOf = (w: { name: string; nameKo: string; producer: string; region: string; country: string; type: string; grape: string; aliases: string[] }) =>
  fold([w.name, w.nameKo, w.producer, w.region, w.country, w.type, w.grape, ...w.aliases].join(" "));

/** 검색어 → DB 조건 (낱말마다 별칭 중 하나라도 들어 있으면 일치) */
export function searchWhere(q: string): Prisma.WinePriceWhereInput {
  const groups = expandQuery(q);
  return groups.length ? { AND: groups.map((alts) => ({ OR: alts.map((a) => ({ searchText: { contains: a } })) })) } : {};
}

const CHUNK = 200;

/**
 * 1병·750ml 최저 도착가를 다시 계산해 저장합니다. ids 를 주면 그 와인만.
 * 환율·가격·세율·판매처·배송대행지가 바뀌는 곳에서 부릅니다.
 */
export async function refreshWinePrices(ids?: string[]) {
  const ctx = await loadContext();
  let n = 0, cursor: string | undefined;
  for (;;) {
    const wines = await prisma.wine.findMany({
      where: ids ? { id: { in: ids } } : undefined,
      include: { offers: { include: { seller: true } } },
      orderBy: { id: "asc" },
      take: CHUNK,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (!wines.length) break;
    await prisma.$transaction(wines.map((w) => {
      const r = compareLoaded(w, 1, 750, ctx);
      const b = r.best;
      const data = {
        perBottle: b ? Math.round(b.perBottle) : null,
        route: b?.channel ?? null,
        sellerCountry: b?.sellerCountry ?? null,
        krPerBottle: r.krPerBottle,
        saving: r.savingPerBottle !== null ? Math.round(r.savingPerBottle) : null,
        exempt: !!b?.tax.exempt,
        ftaOrigin: r.ftaOrigin,
        searchText: searchTextOf(w),
      };
      return prisma.winePrice.upsert({ where: { wineId: w.id }, update: data, create: { wineId: w.id, ...data } });
    }));
    n += wines.length;
    cursor = wines[wines.length - 1].id;
    if (wines.length < CHUNK) break;
  }
  return n;
}

/** 아직 계산하지 않은 와인만 채웁니다 (배포 직후·새 와인). 화면에서 부르므로 빠진 것이 없으면 쿼리 두 번으로 끝납니다. */
export async function ensureWinePrices() {
  const [wines, prices] = await Promise.all([prisma.wine.count(), prisma.winePrice.count()]);
  if (prices >= wines) return 0;
  const missing = await prisma.wine.findMany({ where: { price: null }, select: { id: true } });
  return missing.length ? refreshWinePrices(missing.map((m) => m.id)) : 0;
}

/** 관리자 변경 뒤: 실패해도 저장 자체는 성공으로 둡니다 (다음 정기 작업이 다시 계산). */
export async function refreshQuietly(ids?: string[]) {
  try {
    await refreshWinePrices(ids);
  } catch (e) {
    console.error("refreshWinePrices", e);
  }
}
