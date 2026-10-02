export type OrderStatusKey = "CLICKED" | "CONFIRMED" | "SHIPPED" | "CUSTOMS" | "DELIVERED" | "CANCELLED";

export const ORDER_FLOW: OrderStatusKey[] = ["CLICKED", "CONFIRMED", "SHIPPED", "CUSTOMS", "DELIVERED"];

export const ORDER_LABEL: Record<OrderStatusKey, string> = {
  CLICKED: "판매처로 이동",
  CONFIRMED: "주문 확정",
  SHIPPED: "발송",
  CUSTOMS: "통관 중",
  DELIVERED: "도착",
  CANCELLED: "취소",
};

/** 상태는 앞으로만 진행합니다. 늦게 도착한 포스트백이 상태를 되돌리지 않도록. 취소는 도착 전까지만. */
export function canMove(from: OrderStatusKey, to: OrderStatusKey) {
  if (from === to) return false;
  if (from === "CANCELLED" || from === "DELIVERED") return false;
  if (to === "CANCELLED") return true;
  return ORDER_FLOW.indexOf(to) > ORDER_FLOW.indexOf(from);
}

/** 포스트백 status 값 → 상태 */
export function parsePostbackStatus(v: string | null): OrderStatusKey | null {
  const m: Record<string, OrderStatusKey> = {
    confirmed: "CONFIRMED",
    paid: "CONFIRMED",
    approved: "CONFIRMED",
    shipped: "SHIPPED",
    fulfilled: "SHIPPED",
    delivered: "DELIVERED",
    cancelled: "CANCELLED",
    canceled: "CANCELLED",
    refunded: "CANCELLED",
  };
  return m[(v ?? "confirmed").toLowerCase()] ?? null;
}

/** 개인통관고유부호: P + 숫자 12자리 */
export function normalizePccc(v: string) {
  const s = v.trim().toUpperCase().replace(/[\s-]/g, "");
  return /^P\d{12}$/.test(s) ? s : null;
}

export function maskPccc(v: string | null) {
  return v ? `${v.slice(0, 3)}${"•".repeat(6)}${v.slice(-4)}` : "";
}
