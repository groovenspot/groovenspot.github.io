import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUser: vi.fn(), encrypt: vi.fn(), redirect: vi.fn(), revalidate: vi.fn(),
  user: { update: vi.fn(), findUnique: vi.fn() },
  order: { findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
  guide: { findUnique: vi.fn(), updateMany: vi.fn() },
  transaction: vi.fn(), lock: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("@/server/auth", () => ({ requireUser: m.requireUser }));
vi.mock("@/server/crypto", () => ({ encrypt: m.encrypt }));
vi.mock("@/server/settings", () => ({ getFx: vi.fn(), getTaxConfig: vi.fn() }));
vi.mock("@/server/orders", () => ({ confirmReceived: vi.fn(), moveOrder: vi.fn() }));
vi.mock("@/server/points", () => ({ isPremium: vi.fn() }));
vi.mock("@/server/tracking", () => ({ recordManualShipmentStage: vi.fn(), syncOrderTracking: vi.fn() }));
vi.mock("@/server/db", () => ({ prisma: {
  user: m.user, order: m.order, firstPurchaseGuide: m.guide,
  $transaction: m.transaction, $queryRaw: m.lock,
} }));

import { saveProfile } from "@/app/me/actions";
import { registerTracking } from "@/app/tracking/actions";

const member = {
  id: "owner", adultVerifiedAt: new Date("2026-10-01T00:00:00Z"), pcccEnc: "existing-ciphertext",
  firstNameEn: "Gildong", lastNameEn: "Hong", address1En: "12, Teheran-ro", cityEn: "Seoul",
  zip: "06134", phone: "01012345678", pcccInNote: true,
};
const readyGuide = {
  userId: "owner", pcccIssued: true, cardChecked: true, addressConfirmed: true,
  preparedRoutes: ["EXPORT_RETAILER"], completedAt: null,
};
const existingOrder = {
  id: "order1", userId: "owner", status: "SHIPPED", carrier: "FedEx", trackingNo: "123456789012",
  trackingRegisteredAt: new Date("2026-10-01T12:00:00Z"), _count: { shipmentEvents: 1 },
};
let storedOrder: typeof existingOrder;

function profile(values: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries({
    firstNameEn: "Gildong", lastNameEn: "Hong", address1En: "12, Teheran-ro", cityEn: "Seoul",
    zip: "06134", phone: "01012345678", userId: "not-the-owner", ...values,
  })) fd.set(key, value);
  return fd;
}
function tracking(values: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries({
    id: "order1", carrier: "FEDEX", trackingNo: "123456789012", customsNo: "", customsYear: "2026",
    domesticCarrier: "CJ", domesticTrackingNo: "9876543210", userId: "not-the-owner", ...values,
  })) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.resetAllMocks();
  storedOrder = { ...existingOrder, _count: { shipmentEvents: 1 } };
  m.requireUser.mockResolvedValue({ ...member });
  m.encrypt.mockReturnValue("new-ciphertext");
  m.user.update.mockResolvedValue({ ...member });
  m.user.findUnique.mockResolvedValue({ ...member });
  m.guide.findUnique.mockResolvedValue({ ...readyGuide, cardChecked: false });
  m.guide.updateMany.mockResolvedValue({ count: 1 });
  m.order.findFirst.mockImplementation(async ({ where }) =>
    where.id === storedOrder.id && where.userId === storedOrder.userId ? { ...storedOrder } : null);
  m.order.update.mockImplementation(async ({ data }) => {
    Object.assign(storedOrder, data);
    return { ...storedOrder };
  });
  m.order.count.mockImplementation(async ({ where }) =>
    where.userId === storedOrder.userId && storedOrder.trackingNo && storedOrder.trackingRegisteredAt ? 1 : 0);
  m.transaction.mockImplementation((fn) => fn({ order: m.order, $queryRaw: m.lock }));
  m.redirect.mockImplementation((href) => { throw new Error(`redirect:${href}`); });
});

describe("주문서 정보의 통관부호 저장 선택", () => {
  it("저장에 동의하지 않으면 기존 번호를 삭제하고 제출된 평문도 무시한다", async () => {
    expect(await saveProfile({}, profile({ pccc: "not-even-a-valid-number", pcccInNote: "on" }))).toEqual({ ok: true });
    expect(m.encrypt).not.toHaveBeenCalled();
    expect(m.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "owner" }, data: expect.objectContaining({ pcccEnc: null, pcccInNote: false }),
    }));
  });
  it("저장 동의한 번호를 정규화해 암호화하고 메모 전달은 별도로 동의해야 한다", async () => {
    expect(await saveProfile({}, profile({ storePccc: "on", pccc: "p1234-5678-9012" }))).toEqual({ ok: true });
    expect(m.encrypt).toHaveBeenCalledWith("P123456789012");
    const saved = m.user.update.mock.calls[0][0].data;
    expect(saved).toMatchObject({ pcccEnc: "new-ciphertext", pcccInNote: false });
    expect(JSON.stringify(saved)).not.toContain("P123456789012");
  });
  it("삭제 선택이 새 번호 및 저장·메모 전달 선택보다 우선한다", async () => {
    expect(await saveProfile({}, profile({ storePccc: "on", clearPccc: "on", pcccInNote: "on", pccc: "P123456789012" }))).toEqual({ ok: true });
    expect(m.encrypt).not.toHaveBeenCalled();
    expect(m.user.update.mock.calls[0][0].data).toMatchObject({ pcccEnc: null, pcccInNote: false });
  });
  it("번호를 다시 입력하지 않아도 저장 동의한 기존 번호와 메모 선택을 유지한다", async () => {
    expect(await saveProfile({}, profile({ storePccc: "on", pcccInNote: "on" }))).toEqual({ ok: true });
    const saved = m.user.update.mock.calls[0][0].data;
    expect(saved).not.toHaveProperty("pcccEnc");
    expect(saved.pcccInNote).toBe(true);
    expect(m.encrypt).not.toHaveBeenCalled();
  });
  it("암호화 설정이 없으면 저장하지 않고 선택 해제 안내를 반환한다", async () => {
    m.encrypt.mockImplementationOnce(() => { throw new Error("encryption not configured"); });
    const result = await saveProfile({}, profile({ storePccc: "on", pccc: "P123456789012" }));
    expect(result.error).toContain("저장 선택을 해제");
    expect(m.user.update).not.toHaveBeenCalled();
    expect(m.redirect).not.toHaveBeenCalled();
  });
});

describe("주소 저장 이후 선택한 구매 화면으로 복귀", () => {
  it.each([
    "/order/offer1?qty=2&route=FORWARDER&guide=skip",
    "/guide/first?qty=2&route=EXPORT_RETAILER&offerId=offer1",
  ])("로그인이 만료되어도 %s 선택을 로그인 복귀 문맥에 남긴다", async (next) => {
    m.requireUser.mockRejectedValueOnce(new Error("login required"));
    await expect(saveProfile({}, profile({ next }))).rejects.toThrow("login required");
    expect(m.requireUser).toHaveBeenCalledWith(`/me?next=${encodeURIComponent(next)}#profile`);
    expect(m.user.update).not.toHaveBeenCalled();
  });
  it("준비 중이던 와인·수량·경로를 저장 후 그대로 이어간다", async () => {
    const next = "/guide/first?qty=2&route=FORWARDER&offerId=offer1";
    await expect(saveProfile({}, profile({ next }))).rejects.toThrow(`redirect:${next}`);
    expect(m.user.update).toHaveBeenCalledOnce();
    expect(m.redirect).toHaveBeenCalledWith(next);
  });
  it.each(["https://evil.example", "//evil.example", "/order/offer1\\evil", "/guide/first?offerId=one\u0001"])(
    "외부·잘못된 복귀 주소 %s는 사용하지 않는다", async (next) => {
      expect(await saveProfile({}, profile({ next }))).toEqual({ ok: true });
      expect(m.requireUser).toHaveBeenCalledWith("/me#profile");
      expect(m.redirect).not.toHaveBeenCalled();
    },
  );
});

describe("기록이 있는 주문의 운송장 추가 및 소유권", () => {
  it("판매처의 FedEx 표기를 FEDEX로 제출해도 같은 번호의 국내 배송 정보를 추가한다", async () => {
    const result = await registerTracking({}, tracking());
    expect(result.ok).toBe(true);
    expect(storedOrder).toMatchObject({ carrier: "FEDEX", trackingNo: "123456789012", domesticCarrier: "CJ", domesticTrackingNo: "9876543210" });
    const written = m.order.update.mock.calls[0][0].data;
    expect(written.trackingRegisteredAt).toEqual(existingOrder.trackingRegisteredAt);
    expect(written).not.toHaveProperty("trackingUpdatedAt");
    expect(written).not.toHaveProperty("trackingSyncedAt");
  });
  it("실제 다른 해외 운송장으로 바꾸면 기존 배송 기록을 보호한다", async () => {
    const result = await registerTracking({}, tracking({ trackingNo: "different123" }));
    expect(result.error).toContain("직접 교체할 수 없습니다");
    expect(m.order.update).not.toHaveBeenCalled();
    expect(storedOrder.trackingNo).toBe(existingOrder.trackingNo);
  });
  it("폼의 userId로 다른 회원의 주문을 수정할 수 없다", async () => {
    storedOrder.userId = "another-owner";
    expect((await registerTracking({}, tracking({ userId: "another-owner" }))).error).toContain("주문을 찾을 수 없습니다");
    expect(m.order.findFirst.mock.calls[0][0].where).toEqual({ id: "order1", userId: "owner" });
    expect(m.order.update).not.toHaveBeenCalled();
    expect(m.guide.updateMany).not.toHaveBeenCalled();
  });
});

describe("실제 운송장 등록에 따른 첫 직구 완료", () => {
  it("다섯 준비 단계와 실제 운송장을 모두 갖춘 회원만 완료 시각을 저장한다", async () => {
    m.guide.findUnique.mockResolvedValue({ ...readyGuide });
    expect((await registerTracking({}, tracking())).ok).toBe(true);
    expect(m.guide.updateMany).toHaveBeenCalledWith({ where: { userId: "owner", completedAt: null }, data: { completedAt: expect.any(Date) } });
  });
  it.each(["adult", "card", "address", "route"])("%s 준비가 빠지면 운송장만 등록하고 완료 처리하지 않는다", async (missing) => {
    if (missing === "adult") m.user.findUnique.mockResolvedValue({ ...member, adultVerifiedAt: null });
    if (missing === "address") m.user.findUnique.mockResolvedValue({ ...member, address1En: null });
    m.guide.findUnique.mockResolvedValue({
      ...readyGuide, cardChecked: missing !== "card", preparedRoutes: missing === "route" ? [] : readyGuide.preparedRoutes,
    });
    expect((await registerTracking({}, tracking())).ok).toBe(true);
    expect(m.guide.updateMany).not.toHaveBeenCalled();
  });
  it("완료한 회원이 운송장을 수정해도 최초 완료 시각을 바꾸지 않는다", async () => {
    m.guide.findUnique.mockResolvedValue({ ...readyGuide, completedAt: new Date("2026-10-01T14:00:00Z") });
    expect((await registerTracking({}, tracking())).ok).toBe(true);
    expect(m.guide.updateMany).not.toHaveBeenCalled();
  });
});
