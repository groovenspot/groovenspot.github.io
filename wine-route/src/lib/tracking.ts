import { z } from "zod";
import { canMove, type OrderStatusKey } from "./order";

export const SHIPMENT_STAGES = ["INTERNATIONAL", "KOREA_ARRIVAL", "CUSTOMS", "TAX_NOTICE", "DOMESTIC", "DELIVERED"] as const;
export type ShipmentStageKey = (typeof SHIPMENT_STAGES)[number];
export const SHIPMENT_LABEL: Record<ShipmentStageKey, string> = {
  INTERNATIONAL: "해외 배송", KOREA_ARRIVAL: "한국 도착", CUSTOMS: "통관", TAX_NOTICE: "세금 고지", DOMESTIC: "국내 배송", DELIVERED: "수령 완료",
};
export const TRACKING_SYNC_COOLDOWN_MS = 5 * 60_000;

export function normalizeCarrierCode(value: string | null | undefined, domestic = false): string {
  if (!value?.trim()) return "";
  const code = value.toLowerCase().replace(/[\s._-]/g, "");
  if (domestic) {
    if (["cj", "cj대한통운", "대한통운", "cjlogistics"].includes(code)) return "CJ";
    if (["hanjin", "한진", "한진택배"].includes(code)) return "HANJIN";
    if (["lotte", "롯데", "롯데택배"].includes(code)) return "LOTTE";
    if (["logen", "로젠", "로젠택배"].includes(code)) return "LOGEN";
    if (["post", "ems", "koreapost", "우체국", "우체국ems", "우체국택배"].includes(code)) return "POST";
  } else {
    if (code.includes("dhl")) return "DHL";
    if (code.includes("fedex") || code === "federalexpress") return "FEDEX";
    if (code === "ups" || code.startsWith("upsexpress")) return "UPS";
    if (["post", "ems", "koreapost", "우체국", "우체국ems", "우체국택배"].includes(code)) return "EMS";
  }
  return "OTHER";
}

const boundedText = (max: number) => z.string().trim().min(1).max(max).refine((s) => !/[\u0000-\u001f\u007f]/.test(s), "제어 문자는 허용하지 않습니다.");
export const trackingNumberSchema = boundedText(80).refine((s) => /^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(s), "운송장 번호 형식을 확인해 주세요.");
const timestamp = z.string().datetime({ offset: true }).refine((s) => Date.parse(s) >= Date.UTC(2000, 0, 1), "날짜 범위를 확인해 주세요.");

export const trackingEventSchema = z.object({
  id: boundedText(160).optional(),
  stage: z.enum(SHIPMENT_STAGES),
  occurredAt: timestamp,
  note: boundedText(500).optional(),
  location: boundedText(160).optional(),
}).strict();

/** Contract for a normalized gateway, rather than a carrier-specific response. All tax amounts are KRW. */
export const trackingPayloadSchema = z.object({
  orderId: boundedText(100),
  trackingNo: trackingNumberSchema,
  updatedAt: timestamp,
  events: z.array(trackingEventSchema).max(100),
  stage: z.enum(SHIPMENT_STAGES).optional(),
  estimatedDeliveryAt: timestamp.optional(),
  actualTax: z.number().int().min(0).max(100_000_000).optional(),
  taxNoticeAt: timestamp.optional(),
  domesticCarrier: boundedText(80).optional(),
  domesticTrackingNo: trackingNumberSchema.optional(),
}).strict().superRefine((v, ctx) => {
  if (v.events.some((e) => Date.parse(e.occurredAt) > Date.parse(v.updatedAt))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "이벤트 시각은 갱신 시각 이후일 수 없습니다." });
  }
  if (v.stage && !v.events.some((e) => e.stage === v.stage)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "현재 단계에 대응하는 실제 이벤트가 필요합니다." });
  }
  if (v.taxNoticeAt && Date.parse(v.taxNoticeAt) > Date.parse(v.updatedAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "세금 고지 시각을 확인해 주세요." });
  }
  const identities = new Map<string, string>();
  for (const event of v.events) {
    if (!event.id) continue;
    const fingerprint = `${event.stage}:${Date.parse(event.occurredAt)}`;
    if (identities.has(event.id) && identities.get(event.id) !== fingerprint) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "동일한 이벤트 식별자의 단계와 시각은 일치해야 합니다." });
    }
    identities.set(event.id, fingerprint);
  }
});
export const TrackingPayloadSchema = trackingPayloadSchema;
export type TrackingPayload = z.infer<typeof trackingPayloadSchema>;
export type TrackingEvent = z.infer<typeof trackingEventSchema>;

export function stageToOrderStatus(stage: ShipmentStageKey): OrderStatusKey {
  if (stage === "DELIVERED") return "DELIVERED";
  if (stage === "CUSTOMS" || stage === "TAX_NOTICE" || stage === "DOMESTIC") return "CUSTOMS";
  return "SHIPPED";
}

export function shipmentStageForOrder(status: OrderStatusKey, stage?: ShipmentStageKey | null): ShipmentStageKey | null {
  if (status === "CANCELLED") return null;
  if (status === "DELIVERED") return "DELIVERED";
  if (stage) return stage;
  if (status === "CUSTOMS") return "CUSTOMS";
  return status === "SHIPPED" ? "INTERNATIONAL" : null;
}

export type TrackingSnapshot = {
  status: OrderStatusKey;
  shipmentStage: ShipmentStageKey | null;
  trackingUpdatedAt: Date | null;
  deliveredAt: Date | null;
  taxNoticeAt: Date | null;
};

/** This pure merge also runs for late callbacks: append history, but never regress stages or metadata. */
export function trackingUpdatePlan(order: TrackingSnapshot, payload: Pick<TrackingPayload, "updatedAt" | "events" | "estimatedDeliveryAt" | "actualTax" | "taxNoticeAt" | "domesticCarrier" | "domesticTrackingNo">) {
  const data: {
    status?: OrderStatusKey; shipmentStage?: ShipmentStageKey; trackingUpdatedAt?: Date;
    estimatedDeliveryAt?: Date; actualTax?: number; taxNoticeAt?: Date; deliveredAt?: Date;
    domesticCarrier?: string; domesticTrackingNo?: string;
  } = {};
  if (order.status === "CANCELLED") return data;
  const highest = payload.events.reduce<ShipmentStageKey | null>((stage, event) =>
    !stage || SHIPMENT_STAGES.indexOf(event.stage) > SHIPMENT_STAGES.indexOf(stage) ? event.stage : stage, null);
  const current = shipmentStageForOrder(order.status, order.shipmentStage);
  if (highest && (!current || SHIPMENT_STAGES.indexOf(highest) > SHIPMENT_STAGES.indexOf(current) || (!order.shipmentStage && highest === current))) data.shipmentStage = highest;
  // A legacy completed order may have no stage yet. Its status is still preserved.
  if (order.status === "DELIVERED" && order.shipmentStage !== "DELIVERED") data.shipmentStage = "DELIVERED";
  if (highest && canMove(order.status, stageToOrderStatus(highest))) data.status = stageToOrderStatus(highest);
  const delivered = payload.events.filter((e) => e.stage === "DELIVERED").sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))[0];
  if (delivered && !order.deliveredAt) data.deliveredAt = new Date(delivered.occurredAt);
  const updatedAt = new Date(payload.updatedAt);
  const fresh = !order.trackingUpdatedAt || updatedAt > order.trackingUpdatedAt;
  if (fresh) {
    data.trackingUpdatedAt = updatedAt;
    if (payload.estimatedDeliveryAt && order.status !== "DELIVERED" && highest !== "DELIVERED") data.estimatedDeliveryAt = new Date(payload.estimatedDeliveryAt);
    if (payload.actualTax !== undefined) data.actualTax = payload.actualTax;
    if (payload.taxNoticeAt) data.taxNoticeAt = new Date(payload.taxNoticeAt);
    else if (!order.taxNoticeAt) {
      const notice = payload.events.filter((e) => e.stage === "TAX_NOTICE").sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))[0];
      if (notice) data.taxNoticeAt = new Date(notice.occurredAt);
    }
    if (payload.domesticCarrier) data.domesticCarrier = payload.domesticCarrier;
    if (payload.domesticTrackingNo) data.domesticTrackingNo = payload.domesticTrackingNo;
  }
  return data;
}

/** Reject implausibly future events; estimates may intentionally refer to future dates. */
export function trackingTimesValid(payload: TrackingPayload, now = Date.now()) {
  const upper = now + 5 * 60_000;
  return Date.parse(payload.updatedAt) <= upper
    && payload.events.every((e) => Date.parse(e.occurredAt) <= upper)
    && (!payload.taxNoticeAt || Date.parse(payload.taxNoticeAt) <= upper)
    && (!payload.estimatedDeliveryAt || Date.parse(payload.estimatedDeliveryAt) <= now + 366 * 24 * 3600_000);
}

export function trackingConfigured() {
  if (!process.env.TRACKING_API_KEY?.trim() || !process.env.TRACKING_API_URL) return false;
  try {
    const u = new URL(process.env.TRACKING_API_URL);
    return !u.username && !u.password && (u.protocol === "https:" || (process.env.NODE_ENV !== "production" && u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)));
  } catch { return false; }
}
export const configured = trackingConfigured;

/** URLs are constructed from fixed official origins; user input can never provide a destination. */
export function carrierTrackingUrl(carrier: string | null | undefined, trackingNo: string | null | undefined): string | null {
  if (!trackingNo || !trackingNumberSchema.safeParse(trackingNo).success) return null;
  const code = (carrier ?? "").toLowerCase().replace(/[\s._-]/g, "");
  const n = encodeURIComponent(trackingNo.trim());
  if (code.includes("dhl")) return `https://www.dhl.com/kr-ko/home/tracking.html?tracking-id=${n}`;
  if (code.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (code.includes("ups")) return `https://www.ups.com/track?loc=ko_KR&tracknum=${n}`;
  if (code === "ems") return `https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?POST_CODE=${n}&displayHeader=N`;
  if (["post", "우체국", "우체국택배", "koreapost"].includes(code)) return `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${n}&displayHeader=N`;
  if (["cj", "cj대한통운", "대한통운", "cjlogistics"].includes(code)) return `https://trace.cjlogistics.com/next/tracking.html?wblNo=${n}`;
  if (["한진", "한진택배", "hanjin"].includes(code)) return `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnumText2=${n}`;
  if (["롯데", "롯데택배", "lotte"].includes(code)) return `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${n}`;
  if (["로젠", "로젠택배", "logen"].includes(code)) return `https://www.ilogen.com/web/personal/trace/${n}`;
  return null;
}

export function customsTrackingUrl(_customsNo?: string | null, _customsYear?: number | null) {
  return "https://unipass.customs.go.kr/csp/index.do";
}
