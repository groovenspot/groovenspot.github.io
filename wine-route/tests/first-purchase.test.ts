import { describe, expect, it } from "vitest";
import { firstPurchaseHref, firstPurchaseOrderHref, firstPurchaseProgress, firstPurchaseSelection, preparationKey } from "@/lib/first-purchase";

const user = { adultVerifiedAt: new Date(), pcccEnc: null, firstNameEn: "Gildong", lastNameEn: "Hong", address1En: "12, Teheran-ro", cityEn: "Seoul", zip: "06134", phone: "01012345678" };
const guide = { pcccIssued: true, cardChecked: true, addressConfirmed: true, preparedRoutes: ["EXPORT_RETAILER"] };

describe("첫 직구 도우미의 실제 준비 상태", () => {
  it("통관부호를 저장하지 않고 발급 확인만 해도 주문 준비를 마칠 수 있다", () => {
    const result = firstPurchaseProgress(user, guide, false, "EXPORT_RETAILER");
    expect(result.count).toBe(5);
    expect(result.readyToPurchase).toBe(true);
    expect(result.completed).toBe(false);
    expect(result.nextStep).toBe(6);
    expect(firstPurchaseProgress(user, guide, true, "EXPORT_RETAILER").completed).toBe(true);
  });
  it("로그인과 체크만으로 성인인증이나 주소를 완료하지 않는다", () => {
    expect(firstPurchaseProgress({ ...user, adultVerifiedAt: null }, guide, true).done[0]).toBe(false);
    expect(firstPurchaseProgress({ ...user, address1En: null }, guide, true).done[3]).toBe(false);
    expect(firstPurchaseProgress({ ...user, zip: "123" }, guide, true).readyToPurchase).toBe(false);
    expect(firstPurchaseProgress(null, guide, false).done[0]).toBe(false);
  });
  it("저장된 통관부호는 재발급 체크 없이도 완료로 인정한다", () => {
    expect(firstPurchaseProgress({ ...user, pcccEnc: "encrypted" }, { ...guide, pcccIssued: false }, false).done[1]).toBe(true);
    expect(firstPurchaseProgress(user, { ...guide, pcccIssued: false }, false).done[1]).toBe(false);
  });
  it("배송대행지는 실제 선택한 업체의 준비를 따로 확인한다", () => {
    const prepared = { ...guide, preparedRoutes: [preparationKey("FORWARDER", "fw1")] };
    expect(firstPurchaseProgress(user, prepared, false, "FORWARDER:fw1").done[4]).toBe(true);
    expect(firstPurchaseProgress(user, prepared, false, "FORWARDER:fw2").done[4]).toBe(false);
    expect(firstPurchaseProgress(user, prepared, true).completed).toBe(true);
    expect(firstPurchaseProgress(user, { ...guide, preparedRoutes: ["attacker"] }, true).completed).toBe(false);
  });
});

describe("로그인·프로필 변경 전후 구매 선택 유지", () => {
  it("와인·정수 수량·허용 경로만 로컬 URL로 전달한다", () => {
    const selection = firstPurchaseSelection({ offerId: "offer_123", qty: "2", route: "FORWARDER" });
    const url = new URL(firstPurchaseHref(selection), "https://cellardoor.example");
    expect(url.pathname).toBe("/guide/first");
    expect(url.searchParams.get("offerId")).toBe("offer_123");
    expect(url.searchParams.get("qty")).toBe("2");
    expect(url.searchParams.get("route")).toBe("FORWARDER");
    expect(firstPurchaseOrderHref(selection)).toContain("guide=skip");
  });
  it("외부 주소·알 수 없는 경로·비정상 수량은 구매 선택으로 받지 않는다", () => {
    expect(firstPurchaseSelection({ offerId: "//evil.example", qty: "1.5", route: "https://evil.example" })).toEqual({ offerId: null, qty: 1, route: "EXPORT_RETAILER" });
    expect(firstPurchaseSelection({ qty: "Infinity", route: "INVALID" }, "FORWARDER")).toEqual({ offerId: null, qty: 1, route: "FORWARDER" });
    expect(firstPurchaseSelection({ qty: 25 }).qty).toBe(1);
    expect(firstPurchaseOrderHref(firstPurchaseSelection({}))).toBe("/");
  });
});
