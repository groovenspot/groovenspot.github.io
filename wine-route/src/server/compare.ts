import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getFx, getTaxConfig } from "./settings";
import { compare, type Comparison, type OfferIn } from "@/lib/engine";

export async function loadContext() {
  const [tax, fx, forwarders] = await Promise.all([
    getTaxConfig(),
    getFx(),
    prisma.forwarder.findMany({ where: { active: true } }),
  ]);
  return { tax, fx, forwarders };
}
export type Ctx = Awaited<ReturnType<typeof loadContext>>;

export function compareLoaded(
  wine: { country: string; krPrice: number | null; offers: OfferIn[] },
  qty: number,
  bottleMl: number,
  ctx: Ctx,
): Comparison {
  return compare({ wine, qty, bottleMl, offers: wine.offers, forwarders: ctx.forwarders, fx: ctx.fx.rates, tax: ctx.tax });
}

export async function compareWine(wineId: string, qty: number, bottleMl: number, ctx?: Ctx) {
  const c = ctx ?? (await loadContext());
  const wine = await prisma.wine.findUnique({ where: { id: wineId }, include: { offers: { include: { seller: true } } } });
  if (!wine) return null;
  return { wine, ctx: c, result: compareLoaded(wine, qty, bottleMl, c) };
}

/** 목록·알림용: 여러 와인의 최저 도착가를 한 번에 계산 */
export async function compareMany(where: Prisma.WineWhereInput, qty = 1, bottleMl = 750) {
  const ctx = await loadContext();
  const wines = await prisma.wine.findMany({ where, include: { offers: { include: { seller: true } } }, orderBy: { nameKo: "asc" } });
  return { ctx, items: wines.map((w) => ({ wine: w, result: compareLoaded(w, qty, bottleMl, ctx) })) };
}
