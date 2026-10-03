/** Opt-in PostgreSQL checks: INTEGRATION_DATABASE_URL=postgresql://... npx vitest run tests/customer-convenience.integration.test.ts */
import { randomUUID } from "node:crypto";
import type { PrismaClient, Order } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackingPayload } from "@/lib/tracking";

const auth = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock("@/server/auth", () => ({ requireUser: auth.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("customer convenience PostgreSQL integration", () => {
  let prisma: PrismaClient;
  let applyTrackingUpdate: typeof import("@/server/tracking").applyTrackingUpdate;
  let recordManualShipmentStage: typeof import("@/server/tracking").recordManualShipmentStage;
  let confirmReceived: typeof import("@/server/orders").confirmReceived;
  let registerTracking: typeof import("@/app/tracking/actions").registerTracking;
  let ownerId: string;
  let otherId: string;
  let wineId: string;
  let sellerId: string;
  let offerId: string;
  const clickIds: string[] = [];
  const runId = randomUUID();
  let current: Order;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    ({ prisma } = await import("@/server/db"));
    ({ applyTrackingUpdate, recordManualShipmentStage } = await import("@/server/tracking"));
    ({ confirmReceived } = await import("@/server/orders"));
    ({ registerTracking } = await import("@/app/tracking/actions"));
    const owner = await prisma.user.create({ data: { email: `integration-owner-${runId}@example.test` } });
    ownerId = owner.id;
    const other = await prisma.user.create({ data: { email: `integration-other-${runId}@example.test` } });
    otherId = other.id;
    const wine = await prisma.wine.create({ data: { name: `Integration ${runId}`, nameKo: "통합 테스트 와인", producer: "Integration", country: "프랑스", region: "테스트", type: "레드", aliases: [] } });
    wineId = wine.id;
    const seller = await prisma.seller.create({ data: { name: `Integration ${runId}`, country: "프랑스", channel: "WINERY_DIRECT", website: "https://example.test", currency: "EUR" } });
    sellerId = seller.id;
    const offer = await prisma.offer.create({ data: { wineId, sellerId, url: "https://example.test/wine", price: 20 } });
    offerId = offer.id;
  });

  beforeEach(async () => {
    const click = await prisma.clickLog.create({ data: { offerId, wineId, userId: ownerId, route: "WINERY_DIRECT", qty: 1, estPerBottle: 50000 } });
    clickIds.push(click.id);
    current = await prisma.order.create({ data: {
      clickId: click.id, userId: ownerId, wineId, sellerId, route: "WINERY_DIRECT", qty: 1, bottleMl: 750,
      estTotal: 50000, estTax: 5000, status: "SHIPPED", carrier: "DHL", trackingNo: "DHL123456",
      trackingRegisteredAt: new Date(), shipmentStage: "INTERNATIONAL",
    } });
    auth.requireUser.mockResolvedValue({ id: ownerId });
  });

  afterAll(async () => {
    if (prisma) {
      // Remove only this run's records; never truncate a database or touch the seed catalog.
      if (clickIds.length) await prisma.clickLog.deleteMany({ where: { id: { in: clickIds } } });
      if (ownerId || otherId) await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId].filter(Boolean) } } });
      if (wineId) await prisma.wine.delete({ where: { id: wineId } });
      if (sellerId) await prisma.seller.delete({ where: { id: sellerId } });
      await prisma.$disconnect();
    }
    vi.unstubAllEnvs();
  });

  const payload = (overrides: Partial<TrackingPayload> = {}): TrackingPayload => {
    const at = Date.now() - 120_000;
    return {
      orderId: current.id, trackingNo: "DHL123456", updatedAt: new Date(at).toISOString(),
      events: [{ id: "customs-event", stage: "CUSTOMS", occurredAt: new Date(at - 60_000).toISOString() }],
      ...overrides,
    };
  };

  it("serializes concurrent polling/webhook repeats into one event and one order advancement", async () => {
    const data = payload();
    const results = await Promise.all([
      applyTrackingUpdate(current.id, data, "api"),
      applyTrackingUpdate(current.id, data, "webhook"),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(results.map((result) => result.ok ? result.added : -1).sort()).toEqual([0, 1]);
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: current.id }, include: { events: true, shipmentEvents: true } });
    expect(saved).toMatchObject({ status: "CUSTOMS", shipmentStage: "CUSTOMS" });
    expect(saved.events).toHaveLength(1);
    expect(saved.shipmentEvents).toHaveLength(1);
  });

  it("appends older history without changing newer stage, tax zero, estimate, or carrier metadata", async () => {
    const newTime = Date.now() - 30_000;
    const estimate = new Date(Date.now() + 86400_000).toISOString();
    await applyTrackingUpdate(current.id, payload({
      updatedAt: new Date(newTime).toISOString(), actualTax: 0,
      estimatedDeliveryAt: estimate, domesticCarrier: "POST", domesticTrackingNo: "1234567890",
      events: [{ id: "domestic-event", stage: "DOMESTIC", occurredAt: new Date(newTime - 1000).toISOString() }],
    }));
    const before = await prisma.order.findUniqueOrThrow({ where: { id: current.id } });
    expect(await applyTrackingUpdate(current.id, payload({ actualTax: 9999, domesticCarrier: "old carrier" }), "webhook")).toMatchObject({ ok: true, added: 1, moved: false });
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: current.id } });
    expect(saved).toMatchObject({ status: "CUSTOMS", shipmentStage: "DOMESTIC", actualTax: 0, domesticCarrier: "POST", domesticTrackingNo: "1234567890" });
    expect(saved.estimatedDeliveryAt?.toISOString()).toBe(estimate);
    expect(saved.trackingUpdatedAt).toEqual(before.trackingUpdatedAt);
    expect(saved.trackingSyncedAt).toEqual(before.trackingSyncedAt);
    expect(await prisma.shipmentEvent.count({ where: { orderId: current.id } })).toBe(2);
  });

  it("rejects mismatched tracking identity and contradictory reused event identifiers without writes", async () => {
    expect(await applyTrackingUpdate(current.id, payload({ trackingNo: "OTHER123" }))).toEqual({ ok: false, error: "identity_mismatch" });
    expect(await applyTrackingUpdate("another-order", payload())).toEqual({ ok: false, error: "identity_mismatch" });
    expect(await prisma.shipmentEvent.count({ where: { orderId: current.id } })).toBe(0);
    const data = payload();
    await applyTrackingUpdate(current.id, data);
    expect(await applyTrackingUpdate(current.id, { ...data, events: [{ ...data.events[0], stage: "DELIVERED" }] })).toEqual({ ok: false, error: "invalid_response" });
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: current.id } });
    expect(saved.status).toBe("CUSTOMS");
    expect(saved.deliveredAt).toBeNull();
    expect(await prisma.shipmentEvent.count({ where: { orderId: current.id } })).toBe(1);
  });

  it("stores manual zero tax and actual receipt time even before a tracking number is known", async () => {
    await prisma.order.update({ where: { id: current.id }, data: { trackingNo: null, status: "CONFIRMED", shipmentStage: null } });
    const receivedAt = new Date(Date.now() - 60_000);
    expect(await recordManualShipmentStage(current.id, "DELIVERED", "customer", { actualTax: 0, occurredAt: receivedAt })).toMatchObject({ ok: true });
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: current.id }, include: { shipmentEvents: true } });
    expect(saved).toMatchObject({ status: "DELIVERED", shipmentStage: "DELIVERED", actualTax: 0, deliveredAt: receivedAt });
    expect(saved.shipmentEvents[0]).toMatchObject({ source: "customer", occurredAt: receivedAt });
  });

  it("keeps API delivery time, creates one purchase for concurrent receipt confirmations, and protects paid tax from later callbacks", async () => {
    const receivedAt = new Date(Date.now() - 180_000);
    const data = payload({
      actualTax: 5000,
      events: [{ id: "delivered-event", stage: "DELIVERED", occurredAt: receivedAt.toISOString() }],
    });
    await applyTrackingUpdate(current.id, data);
    expect((await confirmReceived(current.id, otherId, 0)).ok).toBe(false);
    const results = await Promise.all([confirmReceived(current.id, ownerId, 0), confirmReceived(current.id, ownerId, 0)]);
    expect(results.every((result) => result.ok)).toBe(true);
    let saved = await prisma.order.findUniqueOrThrow({ where: { id: current.id }, include: { purchase: true, shipmentEvents: true } });
    expect(saved).toMatchObject({ actualTax: 0, deliveredAt: receivedAt, purchase: { taxPaid: 0 } });
    expect(saved.shipmentEvents).toHaveLength(1);
    expect(await prisma.purchase.count({ where: { userId: ownerId } })).toBe(1);
    // A late callback and an actually newer carrier correction both preserve the user's paid amount.
    expect(await applyTrackingUpdate(current.id, payload({ updatedAt: new Date(Date.now() - 30_000).toISOString(), actualTax: 9999, events: [] }), "webhook")).toMatchObject({ ok: true });
    expect(await applyTrackingUpdate(current.id, payload({ updatedAt: new Date(Date.now() + 1000).toISOString(), actualTax: 8888, events: [] }), "webhook")).toMatchObject({ ok: true });
    saved = await prisma.order.findUniqueOrThrow({ where: { id: current.id }, include: { purchase: true, shipmentEvents: true } });
    expect(saved).toMatchObject({ status: "DELIVERED", actualTax: 0, deliveredAt: receivedAt, purchase: { taxPaid: 0 } });
  });

  it("preserves a cancelled order when an authenticated carrier reports delivery", async () => {
    await prisma.order.update({ where: { id: current.id }, data: { status: "CANCELLED" } });
    await applyTrackingUpdate(current.id, payload({ actualTax: 1000, events: [{ id: "cancelled-delivery", stage: "DELIVERED", occurredAt: new Date(Date.now() - 180_000).toISOString() }] }));
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: current.id } });
    expect(saved).toMatchObject({ status: "CANCELLED", shipmentStage: "INTERNATIONAL", actualTax: null, deliveredAt: null });
    expect((await confirmReceived(current.id, ownerId, 0)).ok).toBe(false);
  });

  it("requires the authenticated owner for registration and prevents replacement once shipment history exists", async () => {
    const fd = new FormData();
    for (const [key, value] of Object.entries({ id: current.id, carrier: "UPS", trackingNo: "UPS987654", customsNo: "", customsYear: "2026", domesticCarrier: "", domesticTrackingNo: "" })) fd.set(key, value);
    auth.requireUser.mockResolvedValue({ id: otherId });
    expect((await registerTracking({}, fd)).ok).not.toBe(true);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: current.id } })).trackingNo).toBe("DHL123456");
    auth.requireUser.mockResolvedValue({ id: ownerId });
    expect((await registerTracking({}, fd)).ok).toBe(true);
    await applyTrackingUpdate(current.id, payload({ trackingNo: "UPS987654" }));
    fd.set("trackingNo", "UPS111111");
    expect((await registerTracking({}, fd)).ok).not.toBe(true);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: current.id } })).trackingNo).toBe("UPS987654");
  });
});
