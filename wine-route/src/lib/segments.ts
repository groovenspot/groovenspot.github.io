/**
 * 회원 세그먼트 (초기안).
 * 기준 수치는 데이터가 쌓이기 전의 가설이며, 첫 분기 주문 분포를 보고 조정합니다.
 * 소득·자산은 묻지 않고, 확정 주문의 병당 도착가와 구매 횟수만 씁니다.
 */
export type Segment = "NONE" | "STARTER" | "COLLECTOR" | "PREMIUM" | "BULK";

export const SEGMENT_ORDER: Segment[] = ["PREMIUM", "COLLECTOR", "STARTER", "BULK", "NONE"];

export const SEGMENT_LABEL: Record<Segment, string> = {
  NONE: "구매 전",
  STARTER: "입문 직구러",
  COLLECTOR: "취향 수집가",
  PREMIUM: "고급 컬렉터",
  BULK: "다량 구매",
};

export const SEGMENT_USE: Record<Segment, string> = {
  NONE: "첫 직구 도우미와 도착가 안내로 첫 구매까지 돕기",
  STARTER: "세금 안내와 계산기로 신뢰 쌓기",
  COLLECTOR: "국내 미유통 와인 소량 제안",
  PREMIUM: "한정 물량·사전 예약 안내, 수입 단계 시 우선 안내",
  BULK: "수입 단계 문의 대상. 직구는 자가사용만 가능하므로 판매 목적 구매를 권하지 않음",
};

export type SegmentConfig = {
  /** 이 병당 도착가(원) 이상을 반복 구매하면 고급 컬렉터 */
  premiumPerBottle: number;
  /** 한 주문이 이 병수 이상이면 다량 주문 */
  bulkQty: number;
  /** 다량 주문이 이 횟수 이상이면 다량 구매 */
  bulkOrders: number;
  /** 확정 주문이 이 횟수 이상이면 반복 구매 */
  repeatOrders: number;
};

export const SEGMENT_DEFAULTS: SegmentConfig = {
  premiumPerBottle: 150_000,
  bulkQty: 6,
  bulkOrders: 2,
  repeatOrders: 2,
};

/** 구매가 확인된 주문 상태 (클릭만 한 주문과 취소 주문은 제외) */
export const COUNTED_STATUSES = ["CONFIRMED", "SHIPPED", "CUSTOMS", "DELIVERED"] as const;

export type SegmentOrder = { qty: number; estTotal: number };
export type SegmentResult = { segment: Segment; orders: number; bottles: number; avgPerBottle: number | null };

export function classify(orders: SegmentOrder[], cfg: SegmentConfig = SEGMENT_DEFAULTS): SegmentResult {
  const valid = orders.filter((o) => Number.isFinite(o.qty) && o.qty > 0 && Number.isFinite(o.estTotal) && o.estTotal >= 0);
  const bottles = valid.reduce((s, o) => s + o.qty, 0);
  const total = valid.reduce((s, o) => s + o.estTotal, 0);
  const avgPerBottle = bottles > 0 ? Math.round(total / bottles) : null;
  const base = { orders: valid.length, bottles, avgPerBottle };
  if (valid.length === 0) return { segment: "NONE", ...base };
  if (valid.filter((o) => o.qty >= cfg.bulkQty).length >= cfg.bulkOrders) return { segment: "BULK", ...base };
  if (valid.length >= cfg.repeatOrders && avgPerBottle !== null && avgPerBottle >= cfg.premiumPerBottle) return { segment: "PREMIUM", ...base };
  if (valid.length >= cfg.repeatOrders) return { segment: "COLLECTOR", ...base };
  return { segment: "STARTER", ...base };
}
