import { prisma } from "./db";
import { compareLoaded, loadContext } from "./compare";
import { consolidate, isConsolidation } from "@/lib/consolidate";

export const MAX_PICK_QTY = 24;

/** 합배송을 받는 배송대행지 (주류 접수, 사용 중) */
export const consolidationForwarders = () =>
  prisma.forwarder.findMany({ where: { active: true, acceptsAlcohol: true }, orderBy: [{ country: "asc" }, { name: "asc" }] });

/** 배대지 나라의 판매처에서 살 수 있는 와인 (홍콩 리테일러 제외) */
export const consolidationOffers = (country: string) =>
  prisma.offer.findMany({
    where: { inStock: true, seller: { country, active: true, channel: { not: "HK_RETAILER" } } },
    include: { seller: true, wine: { select: { id: true, nameKo: true, name: true, vintage: true, country: true } } },
    orderBy: [{ seller: { name: "asc" } }, { wine: { nameKo: "asc" } }],
  });

/**
 * 합배송 견적과, 같은 와인을 각자 가장 싼 경로로 따로 샀을 때의 합계를 함께 돌려줍니다.
 * 따로 사면 1병 면세를 받던 와인이 합배송에서는 과세될 수 있어 비교가 꼭 필요합니다.
 */
export async function quoteConsolidation(forwarderId: string, picks: { offerId: string; qty: number }[]) {
  const ctx = await loadContext();
  const f = await prisma.forwarder.findUnique({ where: { id: forwarderId } });
  if (!f) return null;
  const qtyOf = new Map(picks.filter((p) => Number.isInteger(p.qty) && p.qty > 0 && p.qty <= MAX_PICK_QTY).map((p) => [p.offerId, p.qty]));
  if (!qtyOf.size) return null;
  const offers = await prisma.offer.findMany({ where: { id: { in: [...qtyOf.keys()] } }, include: { seller: true, wine: { include: { offers: { include: { seller: true } } } } } });
  const r = consolidate({
    items: offers.map((o) => ({ offer: o, qty: qtyOf.get(o.id)!, wine: o.wine })),
    forwarder: f,
    fx: ctx.fx.rates,
    tax: ctx.tax,
  });
  if (!isConsolidation(r)) return { forwarder: f, result: r, separate: null };

  // 따로 살 때: 와인마다 그 수량으로 4개 경로 중 가장 싼 것
  const separate = r.items.map((it) => {
    const wine = offers.find((o) => o.id === it.offer.id)!.wine;
    const c = compareLoaded(wine, it.qty, it.offer.bottleMl, ctx);
    return { offerId: it.offer.id, wineId: wine.id, nameKo: wine.nameKo, qty: it.qty, best: c.best ?? null };
  });
  const allPriced = separate.every((s) => s.best);
  const separateTotal = allPriced ? separate.reduce((a, s) => a + s.best!.total, 0) : null;
  const exemptLost = separate.filter((s) => s.best?.tax.exempt).map((s) => s.nameKo);
  return { forwarder: f, result: r, separate: { rows: separate, total: separateTotal, exemptLost } };
}
