import { prisma } from "@/server/db";
import { compareWine } from "@/server/compare";
import { type FirstPurchaseSelection, preparationKey } from "@/lib/first-purchase";
import { safeHttpUrl } from "@/lib/checkout";

export async function loadGuideContext(selection: FirstPurchaseSelection) {
  if (!selection.offerId) return { selection, offer: null, candidate: null, forwarder: null, routeKey: preparationKey(selection.route) };
  const offer = await prisma.offer.findUnique({ where: { id: selection.offerId }, include: { wine: true, seller: true } });
  if (!offer) return null;
  const comparison = await compareWine(offer.wineId, selection.qty, offer.bottleMl);
  const candidate = comparison?.result.routes.flatMap((r) => r.candidates).find((c) => c.offerId === offer.id && c.channel === selection.route) ?? null;
  const f = candidate?.forwarder ? comparison?.ctx.forwarders.find((f) => f.id === candidate.forwarder!.id) : null;
  const forwarder = f ? { id: f.id, name: f.name, website: safeHttpUrl(f.website)?.toString() ?? null } : null;
  return { selection, offer, candidate, forwarder, routeKey: preparationKey(selection.route, forwarder?.id) };
}
