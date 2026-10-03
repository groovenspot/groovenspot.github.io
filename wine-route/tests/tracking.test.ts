import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  carrierTrackingUrl, shipmentStageForOrder, trackingConfigured, trackingPayloadSchema,
  trackingTimesValid, trackingUpdatePlan, type TrackingPayload, type TrackingSnapshot,
} from "@/lib/tracking";
import { applyTrackingUpdate, readTrackingBody, recordManualShipmentStage, syncOrderTracking, trackingEventId, verifyTrackingSignature } from "@/server/tracking";
import { POST } from "@/app/api/tracking/webhook/route";

const db = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  shipmentEvent: { createMany: vi.fn(), findMany: vi.fn() },
  orderEvent: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/server/db", () => ({ prisma: db }));

const now = Date.UTC(2026, 9, 2, 12);
const iso = (offset = 0) => new Date(now + offset).toISOString();
const base = (): TrackingPayload => ({
  orderId: "order1", trackingNo: "DHL123456", updatedAt: iso(),
  events: [{ id: "event1", stage: "CUSTOMS", occurredAt: iso(-60_000), note: "수입 신고" }],
});
const snapshot = (): TrackingSnapshot => ({
  status: "SHIPPED", shipmentStage: "INTERNATIONAL", trackingUpdatedAt: null,
  deliveredAt: null, taxNoticeAt: null,
});
type StoredOrder = TrackingSnapshot & {
  id: string; trackingNo: string | null; carrier: string | null;
  customsNo: string | null; customsYear: number | null; trackingSyncedAt: Date | null;
  actualTax?: number; estimatedDeliveryAt?: Date;
};
type StoredEvent = { externalId: string; stage: string; occurredAt: Date };
let order: StoredOrder;
let events: StoredEvent[];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  order = { ...snapshot(), id: "order1", trackingNo: "DHL123456", carrier: "DHL", customsNo: null, customsYear: 2026, trackingSyncedAt: null };
  events = [];
  db.$transaction.mockImplementation((fn) => fn(db));
  db.order.findUnique.mockImplementation(async () => ({ ...order }));
  db.order.update.mockImplementation(async ({ data }) => { Object.assign(order, data); return { ...order }; });
  db.order.updateMany.mockImplementation(async ({ data }) => { Object.assign(order, data); return { count: 1 }; });
  db.shipmentEvent.findMany.mockImplementation(async () => events);
  db.shipmentEvent.createMany.mockImplementation(async ({ data }: { data: StoredEvent[] }) => {
    let count = 0;
    for (const event of data) {
      if (!events.some((old) => old.externalId === event.externalId)) { events.push(event); count++; }
    }
    return { count };
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("normalized tracking contract", () => {
  it("accepts zero actual tax and keeps estimates separate", () => {
    const payload = trackingPayloadSchema.parse({ ...base(), actualTax: 0, estimatedDeliveryAt: iso(86400_000) });
    expect(trackingUpdatePlan(snapshot(), payload).actualTax).toBe(0);
    const estimatedOnly = trackingUpdatePlan(snapshot(), { ...base(), estimatedDeliveryAt: iso(86400_000) });
    expect(estimatedOnly).not.toHaveProperty("actualTax");
  });
  it("rejects unknown sensitive fields, controls, out-of-range taxes, and imaginary current stages", () => {
    expect(trackingPayloadSchema.safeParse({ ...base(), pccc: "P123456789012" }).success).toBe(false);
    expect(trackingPayloadSchema.safeParse({ ...base(), actualTax: -1 }).success).toBe(false);
    expect(trackingPayloadSchema.safeParse({ ...base(), actualTax: 1.2 }).success).toBe(false);
    expect(trackingPayloadSchema.safeParse({ ...base(), stage: "DELIVERED" }).success).toBe(false);
    expect(trackingPayloadSchema.safeParse({ ...base(), events: [{ ...base().events[0], note: "bad\u0000note" }] }).success).toBe(false);
  });
  it("requires event timestamps at or before snapshot time and bounds future timestamps", () => {
    expect(trackingPayloadSchema.safeParse({ ...base(), events: [{ ...base().events[0], occurredAt: "not-a-date" }] }).success).toBe(false);
    expect(trackingPayloadSchema.safeParse({ ...base(), events: [{ ...base().events[0], occurredAt: iso(60_000) }] }).success).toBe(false);
    expect(trackingTimesValid({ ...base(), updatedAt: iso(301_000) }, now)).toBe(false);
    expect(trackingTimesValid({ ...base(), estimatedDeliveryAt: iso(367 * 86400_000) }, now)).toBe(false);
    expect(trackingTimesValid({ ...base(), estimatedDeliveryAt: iso(86400_000) }, now)).toBe(true);
  });
  it("rejects conflicting event identifiers within one callback", () => {
    expect(trackingPayloadSchema.safeParse({ ...base(), events: [base().events[0], { ...base().events[0], stage: "DELIVERED" }] }).success).toBe(false);
  });
});

describe("forward-only tracking merge", () => {
  it("keeps newer metadata when an older callback arrives, including actual tax zero", () => {
    const current = { ...snapshot(), status: "CUSTOMS" as const, shipmentStage: "DOMESTIC" as const, trackingUpdatedAt: new Date(now + 1000) };
    const plan = trackingUpdatePlan(current, { ...base(), actualTax: 0, domesticCarrier: "old carrier", estimatedDeliveryAt: iso(86400_000) });
    expect(plan).toEqual({});
  });
  it("can append late delivery evidence without replacing newer metadata", () => {
    const current = { ...snapshot(), shipmentStage: "DOMESTIC" as const, trackingUpdatedAt: new Date(now + 1000) };
    const plan = trackingUpdatePlan(current, { ...base(), actualTax: 12345, events: [{ stage: "DELIVERED", occurredAt: iso(-60_000) }] });
    expect(plan).toMatchObject({ shipmentStage: "DELIVERED", status: "DELIVERED", deliveredAt: new Date(now - 60_000) });
    expect(plan).not.toHaveProperty("actualTax");
  });
  it("preserves cancellation and actual delivery timestamp", () => {
    const delivery = { ...base(), events: [{ stage: "DELIVERED" as const, occurredAt: iso(-60_000) }] };
    expect(trackingUpdatePlan({ ...snapshot(), status: "CANCELLED" }, delivery)).toEqual({});
    const completed = { ...snapshot(), status: "DELIVERED" as const, shipmentStage: "DELIVERED" as const, deliveredAt: new Date(now - 120_000) };
    const plan = trackingUpdatePlan(completed, delivery);
    expect(plan).not.toHaveProperty("status");
    expect(plan).not.toHaveProperty("shipmentStage");
    expect(plan).not.toHaveProperty("deliveredAt");
  });
  it("records a confirmed legacy stage while inferring UI stage from order status", () => {
    expect(shipmentStageForOrder("CUSTOMS", null)).toBe("CUSTOMS");
    const plan = trackingUpdatePlan({ ...snapshot(), shipmentStage: null }, { ...base(), events: [{ stage: "INTERNATIONAL", occurredAt: iso(-60_000) }] });
    expect(plan.shipmentStage).toBe("INTERNATIONAL");
  });
});

describe("transactional updates and gateway sync", () => {
  it("requires both order identity and registered tracking identity", async () => {
    expect(await applyTrackingUpdate("other", base())).toEqual({ ok: false, error: "identity_mismatch" });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(await applyTrackingUpdate("order1", { ...base(), trackingNo: "OTHER123" })).toEqual({ ok: false, error: "identity_mismatch" });
    expect(db.shipmentEvent.createMany).not.toHaveBeenCalled();
  });
  it("deduplicates a polling event repeated by webhook, with one status advancement", async () => {
    expect(await applyTrackingUpdate("order1", base(), "api")).toMatchObject({ ok: true, added: 1, moved: true });
    expect(await applyTrackingUpdate("order1", base(), "webhook")).toMatchObject({ ok: true, added: 0, moved: false });
    expect(events).toHaveLength(1);
    expect(db.orderEvent.create).toHaveBeenCalledTimes(1);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it("rejects reuse of a stored event ID for another stage", async () => {
    await applyTrackingUpdate("order1", base());
    expect(await applyTrackingUpdate("order1", { ...base(), events: [{ ...base().events[0], stage: "DELIVERED" }] })).toEqual({ ok: false, error: "invalid_response" });
    expect(order.status).toBe("CUSTOMS");
  });
  it("appends late history without replacing newer tax evidence or resetting a webhook cooldown", async () => {
    order.status = "CUSTOMS";
    order.shipmentStage = "DOMESTIC";
    order.actualTax = 0;
    order.trackingUpdatedAt = new Date(now + 1000);
    order.trackingSyncedAt = new Date(now - 1000);
    expect(await applyTrackingUpdate("order1", { ...base(), actualTax: 10000 }, "webhook")).toMatchObject({ ok: true, added: 1, moved: false });
    expect(order.actualTax).toBe(0);
    expect(order.trackingUpdatedAt).toEqual(new Date(now + 1000));
    expect(order.trackingSyncedAt).toEqual(new Date(now - 1000));
  });
  it("uses event time for delivery and supports manual confirmation without tracking", async () => {
    order.trackingNo = null;
    expect(await recordManualShipmentStage("order1", "DELIVERED", "customer", { actualTax: 0, occurredAt: iso(-60_000) })).toMatchObject({ ok: true });
    expect(order).toMatchObject({ status: "DELIVERED", shipmentStage: "DELIVERED", actualTax: 0, deliveredAt: new Date(now - 60_000) });
    expect(order.trackingSyncedAt).toBeNull();
  });
  it("returns a validation error for malformed manual dates", async () => {
    expect(await recordManualShipmentStage("order1", "DELIVERED", "customer", { occurredAt: new Date("invalid") })).toEqual({ ok: false, error: "invalid_response" });
  });
  it("keeps the user in manual mode when no API is configured", async () => {
    vi.stubEnv("TRACKING_API_URL", "");
    vi.stubEnv("TRACKING_API_KEY", "");
    expect(await syncOrderTracking("order1")).toEqual({ ok: false, error: "not_configured" });
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it("claims cooldown before sending only the permitted gateway fields", async () => {
    vi.stubEnv("TRACKING_API_URL", "https://gateway.example/tracking");
    vi.stubEnv("TRACKING_API_KEY", "test-key");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...base(), actualTax: 0 })));
    vi.stubGlobal("fetch", fetcher);
    expect(await syncOrderTracking("order1")).toMatchObject({ ok: true });
    const request = fetcher.mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual({ orderId: "order1", trackingNo: "DHL123456", carrier: "DHL", customsNo: null, customsYear: 2026 });
    expect(request.headers.Authorization).toBe("Bearer test-key");
    db.order.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await syncOrderTracking("order1")).toEqual({ ok: false, error: "cooldown" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("returns a fixed error code instead of exposing provider responses", async () => {
    vi.stubEnv("TRACKING_API_URL", "https://gateway.example/tracking");
    vi.stubEnv("TRACKING_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider secret detail", { status: 500 })));
    expect(await syncOrderTracking("order1")).toEqual({ ok: false, error: "provider_unavailable" });
  });
});

describe("webhook authentication", () => {
  const sign = (body: string, time = String(Math.floor(now / 1000)), secret = "webhook-key") => `sha256=${createHmac("sha256", secret).update(`${time}.${body}`).digest("hex")}`;
  it("requires exact raw body, correct secret, and a recent timestamp", () => {
    const raw = JSON.stringify(base());
    const time = String(Math.floor(now / 1000));
    expect(verifyTrackingSignature(raw, time, sign(raw), "webhook-key", now)).toBe(true);
    expect(verifyTrackingSignature(raw + " ", time, sign(raw), "webhook-key", now)).toBe(false);
    expect(verifyTrackingSignature(raw, time, sign(raw), "wrong-key", now)).toBe(false);
    const oldTime = String(Math.floor((now - 301_000) / 1000));
    expect(verifyTrackingSignature(raw, oldTime, sign(raw, oldTime), "webhook-key", now)).toBe(false);
    expect(verifyTrackingSignature(raw, time, "sha256=bad", "webhook-key", now)).toBe(false);
  });
  it("rejects unauthenticated HTTP requests before touching order data", async () => {
    vi.stubEnv("TRACKING_WEBHOOK_SECRET", "webhook-key");
    const response = await POST(new NextRequest("https://cellardoor.example/api/tracking/webhook", { method: "POST", body: JSON.stringify(base()) }));
    expect(response.status).toBe(401);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("accepts a signed callback and makes repeated callbacks idempotent", async () => {
    vi.stubEnv("TRACKING_WEBHOOK_SECRET", "webhook-key");
    const body = JSON.stringify(base());
    const req = () => new NextRequest("https://cellardoor.example/api/tracking/webhook", {
      method: "POST", body, headers: { "x-tracking-timestamp": String(now / 1000), "x-tracking-signature": sign(body) },
    });
    expect(await (await POST(req())).json()).toMatchObject({ ok: true, added: 1 });
    expect(await (await POST(req())).json()).toMatchObject({ ok: true, added: 0 });
  });
  it("checks identity even for a valid HMAC", async () => {
    vi.stubEnv("TRACKING_WEBHOOK_SECRET", "webhook-key");
    const body = JSON.stringify({ ...base(), trackingNo: "OTHER123" });
    const response = await POST(new NextRequest("https://cellardoor.example/api/tracking/webhook", {
      method: "POST", body, headers: { "x-tracking-timestamp": String(now / 1000), "x-tracking-signature": sign(body) },
    }));
    expect(response.status).toBe(409);
    expect(events).toHaveLength(0);
  });
  it("bounds streamed bodies even when Content-Length is absent", async () => {
    await expect(readTrackingBody(new Response("x".repeat(65537)))).rejects.toThrow("body_too_large");
  });
});

describe("safe links and configuration", () => {
  it("always builds official destinations and rejects untrusted tracking input", () => {
    expect(new URL(carrierTrackingUrl("DHL", "123456")!).hostname).toBe("www.dhl.com");
    expect(new URL(carrierTrackingUrl("POST", "123456")!).hostname).toBe("service.epost.go.kr");
    expect(carrierTrackingUrl("unknown", "123456")).toBeNull();
    expect(carrierTrackingUrl("UPS", "https://evil.example")).toBeNull();
    const event = base().events[0];
    expect(trackingEventId(event, "api")).toBe(trackingEventId(event, "webhook"));
    expect(trackingEventId({ ...event, id: undefined }, "api")).toBe(trackingEventId({ ...event, id: undefined }, "webhook"));
  });
  it("requires HTTPS and an API key in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRACKING_API_KEY", "key");
    vi.stubEnv("TRACKING_API_URL", "http://gateway.example/tracking");
    expect(trackingConfigured()).toBe(false);
    vi.stubEnv("TRACKING_API_URL", "https://user:password@gateway.example/tracking");
    expect(trackingConfigured()).toBe(false);
    vi.stubEnv("TRACKING_API_URL", "https://gateway.example/tracking");
    expect(trackingConfigured()).toBe(true);
    vi.stubEnv("TRACKING_API_KEY", "");
    expect(trackingConfigured()).toBe(false);
  });
});
