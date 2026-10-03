import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  SHIPMENT_STAGES, TRACKING_SYNC_COOLDOWN_MS, trackingConfigured,
  trackingPayloadSchema, trackingTimesValid, trackingUpdatePlan,
  type ShipmentStageKey, type TrackingEvent, type TrackingPayload,
} from "@/lib/tracking";

export { trackingConfigured } from "@/lib/tracking";
export type TrackingSource = "api" | "webhook" | "customer" | "seller" | "admin" | "system";
export type TrackingError = "not_found" | "identity_mismatch" | "invalid_response" | "no_tracking" | "terminal_order" | "not_configured" | "cooldown" | "provider_unavailable";
export type TrackingResult = { ok: true; added: number; moved: boolean } | { ok: false; error: TrackingError };
const MAX_BODY_BYTES = 64 * 1024;

/** SHA-256 fingerprints also deduplicate gateways that omit event IDs. Polling and webhooks share a namespace. */
export function trackingEventId(event: TrackingEvent, source: TrackingSource) {
  const namespace = source === "api" || source === "webhook" ? "gateway" : source;
  const identity = event.id ? [namespace, "id", event.id] : [namespace, "event", event.stage, new Date(event.occurredAt).toISOString(), event.note ?? "", event.location ?? ""];
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (e) {
      // A concurrent callback may have advanced this order. Re-read rather than writing an older snapshot.
      if (attempt >= 2 || !(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2034") throw e;
    }
  }
}

async function applyValidatedUpdate(orderId: string, payload: TrackingPayload, source: TrackingSource, allowUnregistered: boolean): Promise<TrackingResult> {
  return serializable(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return { ok: false, error: "not_found" };
    if (payload.orderId !== order.id || (!allowUnregistered && (!order.trackingNo || payload.trackingNo !== order.trackingNo))) {
      return { ok: false, error: "identity_mismatch" };
    }
    const data = trackingUpdatePlan(allowUnregistered ? { ...order, trackingUpdatedAt: null } : order, payload);
    // A receipt-confirmed purchase is the user's paid amount. Later carrier notices cannot replace it.
    if (!allowUnregistered && order.purchaseId) delete data.actualTax;
    if (allowUnregistered && data.trackingUpdatedAt && order.trackingUpdatedAt && order.trackingUpdatedAt > data.trackingUpdatedAt) {
      data.trackingUpdatedAt = order.trackingUpdatedAt;
    }
    const events = payload.events.map((event) => ({
      orderId, stage: event.stage, source, occurredAt: new Date(event.occurredAt),
      note: event.note ?? null, location: event.location ?? null, externalId: trackingEventId(event, source),
    }));
    const existing = events.length ? await tx.shipmentEvent.findMany({
      where: { orderId, externalId: { in: events.map((event) => event.externalId) } },
      select: { externalId: true, stage: true, occurredAt: true },
    }) : [];
    if (events.some((event) => existing.some((old) => old.externalId === event.externalId && (old.stage !== event.stage || old.occurredAt.getTime() !== event.occurredAt.getTime())))) {
      return { ok: false, error: "invalid_response" };
    }
    const inserted = events.length ? await tx.shipmentEvent.createMany({ data: events, skipDuplicates: true }) : { count: 0 };
    if (data.status) {
      await tx.orderEvent.create({ data: { orderId, status: data.status, by: source === "api" || source === "webhook" ? "system" : source, note: "배송 추적 단계 갱신" } });
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        ...data,
        // Manual confirmations do not consume a polling request. Their timestamp still protects newer tax evidence.
        ...(!allowUnregistered && (source === "api" || data.trackingUpdatedAt || data.status || data.shipmentStage)
          ? { trackingSyncedAt: new Date(), trackingError: null } : {}),
      },
    });
    return { ok: true, added: inserted.count, moved: !!data.shipmentStage || !!data.status };
  });
}

/** Safe entry point for the normalized gateway and authenticated webhook. Never takes a PCCC. */
export async function applyTrackingUpdate(orderId: string, input: unknown, source: TrackingSource = "api"): Promise<TrackingResult> {
  const parsed = trackingPayloadSchema.safeParse(input);
  if (!parsed.success || !trackingTimesValid(parsed.data)) return { ok: false, error: "invalid_response" };
  if (parsed.data.orderId !== orderId) return { ok: false, error: "identity_mismatch" };
  return applyValidatedUpdate(orderId, parsed.data, source, false);
}

/** Seller/customer stages are real confirmations, and can be recorded before a tracking number exists. */
export async function recordManualShipmentStage(
  orderId: string,
  stage: ShipmentStageKey,
  source: Exclude<TrackingSource, "api" | "webhook"> = "customer",
  extra: { actualTax?: number; occurredAt?: Date | string; note?: string } = {},
): Promise<TrackingResult> {
  if (!SHIPMENT_STAGES.includes(stage)) return { ok: false, error: "invalid_response" };
  const now = new Date();
  if (extra.occurredAt instanceof Date && !Number.isFinite(extra.occurredAt.getTime())) return { ok: false, error: "invalid_response" };
  const at = extra.occurredAt instanceof Date ? extra.occurredAt.toISOString() : extra.occurredAt ?? now.toISOString();
  const parsed = trackingPayloadSchema.safeParse({
    orderId, trackingNo: "manual", updatedAt: now.toISOString(),
    events: [{ stage, occurredAt: at, ...(extra.note ? { note: extra.note } : {}) }],
    ...(extra.actualTax !== undefined ? { actualTax: extra.actualTax } : {}),
  });
  if (!parsed.success || !trackingTimesValid(parsed.data)) return { ok: false, error: "invalid_response" };
  // Manual tax confirmation is current user evidence, rather than an old API snapshot.
  return applyValidatedUpdate(orderId, parsed.data, source, true);
}

/** X-Tracking-Signature: sha256=<hex HMAC(timestamp + '.' + exact raw body)>; timestamp is Unix seconds. */
export function verifyTrackingSignature(raw: string, timestamp: string | null, signature: string | null, secret = process.env.TRACKING_WEBHOOK_SECRET, now = Date.now()) {
  if (!secret || !timestamp || !/^\d{10}$/.test(timestamp) || !signature || !/^sha256=[a-fA-F0-9]{64}$/.test(signature)) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > 5 * 60_000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest();
  const received = Buffer.from(signature.slice(7), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Bound actual streamed bytes as well as Content-Length, including chunked responses. */
export async function readTrackingBody(response: { body: ReadableStream<Uint8Array> | null; headers: Headers }) {
  const length = response.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) throw new Error("body_too_large");
  if (!response.body) throw new Error("empty_body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("body_too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}

/** Caller must authorize ownership. The scheduled job also uses this function; it claims a DB cooldown atomically. */
export async function syncOrderTracking(orderId: string): Promise<TrackingResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "not_found" };
  if (!order.trackingNo) return { ok: false, error: "no_tracking" };
  if (order.status === "CANCELLED" || order.status === "DELIVERED") return { ok: false, error: "terminal_order" };
  if (!trackingConfigured()) return { ok: false, error: "not_configured" };
  const now = new Date();
  const claim = await prisma.order.updateMany({
    where: {
      id: orderId, trackingNo: order.trackingNo, status: { notIn: ["CANCELLED", "DELIVERED"] },
      OR: [{ trackingSyncedAt: null }, { trackingSyncedAt: { lt: new Date(now.getTime() - TRACKING_SYNC_COOLDOWN_MS) } }],
    },
    data: { trackingSyncedAt: now, trackingError: null },
  });
  if (!claim.count) return { ok: false, error: "cooldown" };
  let result: TrackingResult;
  try {
    const response = await fetch(process.env.TRACKING_API_URL!, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TRACKING_API_KEY}` },
      body: JSON.stringify({ orderId: order.id, trackingNo: order.trackingNo, carrier: order.carrier, customsNo: order.customsNo, customsYear: order.customsYear }),
      signal: AbortSignal.timeout(12_000), redirect: "error", cache: "no-store",
    });
    if (!response.ok) result = { ok: false, error: "provider_unavailable" };
    else {
      let payload: unknown;
      try { payload = JSON.parse(await readTrackingBody(response)); }
      catch { payload = null; }
      result = await applyTrackingUpdate(orderId, payload, "api");
    }
  } catch { result = { ok: false, error: "provider_unavailable" }; }
  if (!result.ok) {
    await prisma.order.updateMany({
      where: { id: orderId, trackingNo: order.trackingNo, trackingSyncedAt: now }, data: { trackingError: result.error },
    });
  }
  return result;
}
