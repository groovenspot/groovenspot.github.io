import type { OrderStatus } from "@prisma/client";
import { prisma } from "./db";
import { sendMail } from "./mail";
import { alimtalkConfigured, sendOrderAlimtalk } from "./alimtalk";
import { canMove, ORDER_LABEL } from "@/lib/order";
import { recordManualShipmentStage } from "./tracking";

type By = "seller" | "customer" | "admin" | "system";

/**
 * 주문 상태를 바꾸고 기록을 남깁니다. 되돌리는 변경은 무시합니다.
 * 판매처·관리자가 바꾼 경우 손님에게 알립니다 (손님이 직접 바꾼 경우는 알리지 않음).
 */
export async function moveOrder(orderId: string, to: OrderStatus, by: By, extra: { note?: string; orderRef?: string | null; carrier?: string | null; trackingNo?: string | null } = {}) {
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, wine: true, seller: true } });
  if (!o) return { ok: false as const, reason: "not_found" };
  const data = {
    ...(extra.orderRef ? { orderRef: extra.orderRef } : {}),
    ...(extra.carrier ? { carrier: extra.carrier } : {}),
    ...(extra.trackingNo ? { trackingNo: extra.trackingNo } : {}),
    ...(extra.trackingNo && !o.trackingRegisteredAt ? { trackingRegisteredAt: new Date() } : {}),
  };
  if (!canMove(o.status, to)) {
    if (Object.keys(data).length) await prisma.order.update({ where: { id: o.id }, data });
    return { ok: false as const, reason: "no_transition" };
  }
  const changed = await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: o.id, status: o.status }, data: { ...data, status: to } });
    if (!r.count) return false;
    await tx.orderEvent.create({ data: { orderId: o.id, status: to, by, note: extra.note ?? null } });
    return true;
  });
  if (!changed) return { ok: false as const, reason: "no_transition" };
  const stage = to === "SHIPPED" ? "INTERNATIONAL" : to === "CUSTOMS" ? "CUSTOMS" : to === "DELIVERED" ? "DELIVERED" : null;
  if (stage) await recordManualShipmentStage(o.id, stage, by, { note: extra.note });
  if (by !== "customer") await notify(o.user.email, o.user.phone, o.wine.nameKo, o.seller.name, to, extra.trackingNo ?? o.trackingNo).catch((e) => console.error("order notify failed", o.id, e));
  return { ok: true as const };
}

/** 직접 수령 확인: 추적 API가 먼저 도착 처리한 경우에도 실납부 세금을 남깁니다. */
export async function confirmReceived(orderId: string, userId: string, taxPaid: number) {
  if (!Number.isSafeInteger(taxPaid) || taxPaid < 0 || taxPaid > 100_000_000) return { ok: false as const, error: "실제 낸 세금을 확인해 주세요." };
  return prisma.$transaction(async (tx) => {
    // 중복 제출에도 구매 기록은 한 건만 생성됩니다.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} AND "userId" = ${userId} FOR UPDATE`;
    const o = await tx.order.findFirst({ where: { id: orderId, userId }, include: { seller: true } });
    if (!o || o.status === "CLICKED" || o.status === "CANCELLED") return { ok: false as const, error: "구매가 확인된 주문만 수령 확인할 수 있습니다." };
    const now = new Date();
    if (o.purchaseId) {
      await tx.purchase.update({ where: { id: o.purchaseId }, data: { taxPaid } });
    } else {
      const p = await tx.purchase.create({ data: {
        userId, wineId: o.wineId, sellerName: o.seller.name, route: o.route, qty: o.qty,
        goodsPaid: Math.max(0, o.estTotal - o.estTax), shipPaid: 0, currency: "KRW",
        taxPaid, estTax: o.estTax, orderedAt: o.createdAt,
      } });
      await tx.order.update({ where: { id: o.id }, data: { purchaseId: p.id } });
    }
    if (o.status !== "DELIVERED") {
      await tx.orderEvent.create({ data: { orderId: o.id, status: "DELIVERED", by: "customer", note: "수령 확인" } });
    }
    if (o.shipmentStage !== "DELIVERED") {
      await tx.shipmentEvent.create({ data: { orderId: o.id, stage: "DELIVERED", source: "customer", occurredAt: now, note: "수령인이 도착을 확인했습니다." } });
    }
    await tx.order.update({ where: { id: o.id }, data: { status: "DELIVERED", shipmentStage: "DELIVERED", deliveredAt: o.deliveredAt ?? now, actualTax: taxPaid, trackingUpdatedAt: o.trackingUpdatedAt && o.trackingUpdatedAt > now ? o.trackingUpdatedAt : now } });
    return { ok: true as const };
  });
}

async function notify(email: string, phone: string | null, wine: string, seller: string, to: OrderStatus, tracking: string | null) {
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/me#orders`;
  const status = ORDER_LABEL[to];
  if (phone && alimtalkConfigured("order")) return sendOrderAlimtalk(phone, { wine, status, seller, link });
  const lines = [`${wine} 주문이 '${status}' 상태가 됐습니다. (판매처: ${seller})`];
  if (to === "SHIPPED" && tracking) lines.push(`운송장 번호: ${tracking}`);
  if (to === "SHIPPED") lines.push("한국에 도착하면 통관 단계에서 세금 납부 안내가 옵니다.");
  lines.push(link);
  await sendMail(email, `[셀러도어] 주문 ${status}: ${wine}`, lines.join("\n"));
}
