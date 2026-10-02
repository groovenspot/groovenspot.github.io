import type { OrderStatus } from "@prisma/client";
import { prisma } from "./db";
import { sendMail } from "./mail";
import { alimtalkConfigured, sendOrderAlimtalk } from "./alimtalk";
import { canMove, ORDER_LABEL } from "@/lib/order";

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
  };
  if (!canMove(o.status, to)) {
    if (Object.keys(data).length) await prisma.order.update({ where: { id: o.id }, data });
    return { ok: false as const, reason: "no_transition" };
  }
  await prisma.$transaction([
    prisma.order.update({ where: { id: o.id }, data: { ...data, status: to } }),
    prisma.orderEvent.create({ data: { orderId: o.id, status: to, by, note: extra.note ?? null } }),
  ]);
  if (by !== "customer") await notify(o.user.email, o.user.phone, o.wine.nameKo, o.seller.name, to, extra.trackingNo ?? o.trackingNo).catch((e) => console.error("order notify failed", o.id, e));
  return { ok: true as const };
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
