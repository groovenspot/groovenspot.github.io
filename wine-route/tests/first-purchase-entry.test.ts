import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ user: vi.fn(), offer: vi.fn(), comparison: vi.fn(), guide: vi.fn(), started: vi.fn(), order: vi.fn(), createOrder: vi.fn(), click: vi.fn() }));
vi.mock("@/server/auth", () => ({ getUser: m.user }));
vi.mock("@/server/compare", () => ({ compareWine: m.comparison }));
vi.mock("@/server/shipper", () => ({ shipperOf: () => ({ email: "owner@example.kr" }) }));
vi.mock("@/server/db", () => ({ prisma: {
  offer: { findUnique: m.offer }, firstPurchaseGuide: { findUnique: m.guide, upsert: m.started },
  order: { findFirst: m.order, create: m.createOrder }, clickLog: { create: m.click },
} }));
import { GET as checkout } from "@/app/go/[offerId]/route";
import { GET as entry } from "@/app/guide/first/entry/route";

const offer = { id: "offer1", wineId: "wine1", sellerId: "seller1", bottleMl: 750, url: "https://seller.example/wine", checkoutRef: null, seller: { channel: "EXPORT_RETAILER", website: "https://seller.example", checkoutMode: "PRODUCT_PAGE", cartTpl: null, affiliateTpl: null } };
const candidate = { offerId: "offer1", channel: "EXPORT_RETAILER", perBottle: 50000, total: 100000, tax: { pay: 13000 } };
function request(query = "qty=2&route=EXPORT_RETAILER", seen = false) { return new NextRequest(`https://cellardoor.example/go/offer1?${query}`, { headers: seen ? { cookie: "cd_first_guide_seen=1" } : {} }); }
const params = { params: Promise.resolve({ offerId: "offer1" }) };
beforeEach(() => {
  vi.clearAllMocks();
  m.user.mockResolvedValue({ id: "owner", email: "owner@example.kr" });
  m.offer.mockResolvedValue(offer);
  m.comparison.mockResolvedValue({ result: { routes: [{ candidates: [candidate] }] } });
  m.guide.mockResolvedValue(null); m.order.mockResolvedValue(null);
  m.started.mockResolvedValue({ userId: "owner" });
  m.click.mockResolvedValue({ id: "click1" });
  m.createOrder.mockResolvedValue({ id: "order1" });
});

describe("첫 구매 도우미 자동 초대와 건너뛰기", () => {
  it("첫 판매처 이동은 선택을 유지한 도우미로 보내며 주문을 만들지 않는다", async () => {
    const res = await checkout(request(), params);
    const destination = new URL(res.headers.get("location")!);
    expect(destination.pathname).toBe("/guide/first/entry");
    expect(destination.searchParams.get("offerId")).toBe("offer1");
    expect(destination.searchParams.get("qty")).toBe("2");
    expect(destination.searchParams.get("route")).toBe("EXPORT_RETAILER");
    expect(m.click).not.toHaveBeenCalled();
    expect(m.createOrder).not.toHaveBeenCalled();
    expect(m.order.mock.calls[0][0].where.userId).toBe("owner");
  });
  it("명시적으로 건너뛰면 판매처로 이동하고 실제 클릭·주문을 기록한다", async () => {
    const res = await checkout(request("qty=2&route=EXPORT_RETAILER&guide=skip"), params);
    expect(res.headers.get("location")).toBe("https://seller.example/wine");
    expect(m.createOrder).toHaveBeenCalledOnce();
    expect(m.createOrder.mock.calls[0][0].data).toMatchObject({ userId: "owner", qty: 2, route: "EXPORT_RETAILER" });
  });
  it("도우미를 이미 봤거나 준비 기록이 있으면 다시 강제로 보내지 않는다", async () => {
    await checkout(request(undefined, true), params);
    expect(m.guide).not.toHaveBeenCalled();
    expect(m.createOrder).toHaveBeenCalledOnce();
    vi.clearAllMocks();
    m.guide.mockResolvedValue({ userId: "owner" });
    const res = await checkout(request(), params);
    expect(res.headers.get("location")).toBe("https://seller.example/wine");
    expect(m.createOrder).toHaveBeenCalledOnce();
  });
  it("비회원도 도우미를 건너뛰고 원래 판매처에 갈 수 있다", async () => {
    m.user.mockResolvedValue(null);
    const res = await checkout(request("qty=2&route=EXPORT_RETAILER&guide=skip"), params);
    expect(res.headers.get("location")).toBe("https://seller.example/wine");
    expect(m.createOrder).not.toHaveBeenCalled();
  });
  it("이용 불가 경로에 0원 예상 주문을 만들지 않는다", async () => {
    m.comparison.mockResolvedValue({ result: { routes: [] } });
    const res = await checkout(request("qty=2&route=FORWARDER&guide=skip"), params);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/wines/wine1");
    expect(m.createOrder).not.toHaveBeenCalled();
  });
  it("초대 진입 시 최초 안내 쿠키와 본인 준비 기록을 저장한다", async () => {
    const res = await entry(new NextRequest("https://cellardoor.example/guide/first/entry?offerId=offer1&qty=2&route=FORWARDER"));
    expect(m.started).toHaveBeenCalledWith({ where: { userId: "owner" }, create: { userId: "owner" }, update: {} });
    expect(res.headers.get("set-cookie")).toContain("cd_first_guide_seen=1");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
    expect(new URL(res.headers.get("location")!).pathname).toBe("/guide/first");
  });
});
