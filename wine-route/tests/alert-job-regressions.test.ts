import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  alerts: { findMany: vi.fn(), update: vi.fn() },
  prices: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn() },
  wine: { findUnique: vi.fn(), findMany: vi.fn(async () => []) },
  allocation: { findUniqueOrThrow: vi.fn() },
  context: vi.fn(), compare: vi.fn(), notify: vi.fn(),
}));
vi.mock("@/server/db", () => ({ prisma: { priceAlert: mocks.alerts, watchPrice: mocks.prices, wine: mocks.wine, allocationOpen: mocks.allocation } }));
vi.mock("@/server/compare", () => ({ loadContext: mocks.context, compareLoaded: mocks.compare }));
vi.mock("@/server/notify", () => ({ notify: mocks.notify }));
vi.mock("@/server/points", () => ({ isPremium: (u: { plan: string }) => u.plan === "PREMIUM" }));
import { notifyAllocation, notifyNewVintage, runAlertsJob } from "@/jobs/alerts";

const user = (plan = "FREE") => ({ id: "u1", plan });
const watch = (id: string, plan = "FREE") => ({
  id, userId: "u1", wineId: id, wine: { id, nameKo: "샤블리" }, user: user(plan), qty: 1, bottleMl: 750,
  channel: "EMAIL", targetPerBottle: 50000, lastPrice: 100000, notifiedPrice: null,
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-02T08:00:00Z"));
  mocks.context.mockResolvedValue({ tax: { freeAlertLimit: 3 } });
  mocks.compare.mockReturnValue({ best: { perBottle: 95000, channel: "WINERY" } });
  mocks.prices.findUnique.mockResolvedValue({ perBottle: 100000 });
  mocks.notify.mockImplementation(async (n) => ({ sent: !n.queue, queued: !!n.queue }));
});
afterEach(() => vi.useRealTimers());

describe("알림 작업의 무료·프리미엄 범위", () => {
  it("프리미엄이 끝나 찜이 4개인 무료 회원은 3개 하락 알림만 주간 묶음으로 받는다", async () => {
    mocks.alerts.findMany.mockResolvedValue([1, 2, 3, 4].map((n) => watch(`w${n}`)));
    await runAlertsJob();
    expect(mocks.notify).toHaveBeenCalledTimes(3);
    for (const [n] of mocks.notify.mock.calls) expect(n).toMatchObject({ type: "DROP", queue: true, channel: "EMAIL" });
  });
  it("프리미엄 회원은 한도 없이 즉시 하락 알림을 받는다", async () => {
    mocks.alerts.findMany.mockResolvedValue([1, 2, 3, 4].map((n) => watch(`w${n}`, "PREMIUM")));
    await runAlertsJob();
    expect(mocks.notify).toHaveBeenCalledTimes(4);
    for (const [n] of mocks.notify.mock.calls) expect(n.queue).toBe(false);
  });
  it("재입고 알림은 프리미엄 회원에게만 보낸다", async () => {
    mocks.alerts.findMany.mockResolvedValue([watch("w1"), { ...watch("w1", "PREMIUM"), id: "premium", userId: "u2", user: { id: "u2", plan: "PREMIUM" } }]);
    mocks.prices.findUnique.mockResolvedValue({ perBottle: null });
    await runAlertsJob();
    expect(mocks.notify).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ type: "RESTOCK", user: { id: "u2", plan: "PREMIUM" } }));
  });
  it("새 빈티지 등록은 프리미엄 찜 회원만 알려준다", async () => {
    mocks.wine.findUnique.mockResolvedValue({ id: "new", name: "Chablis", nameKo: "샤블리", producer: "Domaine", vintage: 2023 });
    mocks.alerts.findMany.mockResolvedValue([watch("w1"), watch("w2", "PREMIUM")]);
    expect(await notifyNewVintage("new")).toBe(1);
    expect(mocks.notify).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ type: "VINTAGE", channel: "EMAIL" }));
  });
  it("배정 오픈은 프리미엄 회원당 한 번만 보내고 구매 보상을 만들지 않는다", async () => {
    mocks.allocation.findUniqueOrThrow.mockResolvedValue({ id: "alloc", producer: "Domaine", note: "배정 시즌이 시작됐습니다", url: null });
    mocks.alerts.findMany.mockResolvedValue([watch("free"), watch("w1", "PREMIUM"), watch("w2", "PREMIUM")]);
    expect(await notifyAllocation("alloc")).toBe(1);
    expect(mocks.notify).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ type: "ALLOCATION", channel: "EMAIL" }));
  });
});
