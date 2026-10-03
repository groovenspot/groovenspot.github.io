import { describe, expect, it } from "vitest";
import { consolidate, isConsolidation, type ConsolidationForwarder } from "@/lib/consolidate";
import { DEFAULT_TAX } from "@/lib/tax";
import type { OfferIn, SellerIn } from "@/lib/engine";

const fx = { EUR: 1500, USD: 1400 };
const seller = (id: string, over: Partial<SellerIn> = {}): SellerIn => ({ id, name: id, country: "프랑스", channel: "LOCAL_SHOP", shipsToKorea: false, currency: "EUR", shipBase: 8, shipPerBottle: 1, daysMin: 3, daysMax: 5, insured: false, active: true, ...over });
const offer = (id: string, s: SellerIn, price: number, over: Partial<OfferIn> = {}): OfferIn => ({ id, price, bottleMl: 750, inStock: true, url: "https://x", checkedAt: new Date(0), seller: s, ...over });
const wine = (id: string, country = "프랑스") => ({ id, nameKo: id, country });
const fw: ConsolidationForwarder = { id: "fw", name: "파리 배대지", country: "프랑스", acceptsAlcohol: true, currency: "EUR", shipBase: 30, shipPerBottle: 5, daysMin: 10, daysMax: 20, active: true, consolidateFee: 4, handlingPerPackage: 2, maxBottles: 6 };

describe("합배송 견적", () => {
  it("판매처 2곳 3병: 운임·처리비·합포장비를 더하고 세금은 합산 신고", () => {
    const a = seller("a"), b = seller("b");
    const r = consolidate({ items: [{ offer: offer("o1", a, 20), qty: 2, wine: wine("w1") }, { offer: offer("o2", b, 30), qty: 1, wine: wine("w2") }], forwarder: fw, fx, tax: DEFAULT_TAX });
    if (!isConsolidation(r)) throw new Error(r.error);
    expect(r.packages).toBe(2);
    expect(r.boxes).toBe(1);
    // 판매처 → 배대지: a (8 + 1×2) + b (8 + 1×1) = 19 EUR
    expect(r.sellerLegKrw).toBe(19 * 1500);
    // 배대지: 기본 30 + 병당 5×3 + 처리 2×2 + 합포장 4 = 53 EUR
    expect(r.forwarderKrw).toBe(53 * 1500);
    // 3병이라 면세구간 아님 → 부가세 있음, FTA 프랑스라 관세 0
    expect(r.items.every((i) => i.vat > 0 && i.duty === 0)).toBe(true);
    // 운임은 병 수 비율로 나눔
    expect(Math.round(r.items[0].shipKrw / r.items[1].shipKrw)).toBe(2);
    expect(Math.round(r.total)).toBe(Math.round(r.cif + r.taxPay));
  });

  it("판매처가 하나면 합포장 수수료가 없고, 상자 한도를 넘으면 상자가 늘어납니다", () => {
    const a = seller("a");
    const r = consolidate({ items: [{ offer: offer("o1", a, 20), qty: 7, wine: wine("w1") }], forwarder: fw, fx, tax: DEFAULT_TAX });
    if (!isConsolidation(r)) throw new Error(r.error);
    expect(r.boxes).toBe(2);
    expect(r.feeLines.some((l) => l.label.includes("합포장"))).toBe(false);
    expect(r.forwarderKrw).toBe((30 * 2 + 5 * 7 + 2) * 1500);
  });

  it("다른 나라 판매처·품절·최소 주문 미달은 이유와 함께 뺍니다", () => {
    const de = seller("de", { country: "독일" }), min = seller("min", { minBottles: 3 }), ok = seller("ok");
    const r = consolidate({
      items: [
        { offer: offer("x1", de, 10), qty: 1, wine: wine("w1", "독일") },
        { offer: offer("x2", ok, 10, { inStock: false }), qty: 1, wine: wine("w2") },
        { offer: offer("x3", min, 10), qty: 2, wine: wine("w3") },
        { offer: offer("x4", ok, 10), qty: 2, wine: wine("w4") },
      ], forwarder: fw, fx, tax: DEFAULT_TAX,
    });
    if (!isConsolidation(r)) throw new Error(r.error);
    expect(r.items.map((i) => i.offer.id)).toEqual(["x4"]);
    expect(r.excluded.map((e) => e.offerId).sort()).toEqual(["x1", "x2", "x3"]);
    expect(r.excluded.find((e) => e.offerId === "x3")?.reason).toContain("3병 이상");
  });

  it("FTA가 아닌 원산지 와인은 그 몫에만 관세가 붙습니다", () => {
    const a = seller("a");
    const r = consolidate({ items: [{ offer: offer("o1", a, 20), qty: 1, wine: wine("fr") }, { offer: offer("o2", a, 20), qty: 1, wine: wine("ar", "아르헨티나") }], forwarder: fw, fx, tax: DEFAULT_TAX });
    if (!isConsolidation(r)) throw new Error(r.error);
    expect(r.items.find((i) => i.wine.id === "fr")!.duty).toBe(0);
    expect(r.items.find((i) => i.wine.id === "ar")!.duty).toBeGreaterThan(0);
  });

  it("주류를 받지 않는 배대지는 견적하지 않습니다", () => {
    const r = consolidate({ items: [{ offer: offer("o1", seller("a"), 20), qty: 1, wine: wine("w1") }], forwarder: { ...fw, acceptsAlcohol: false }, fx, tax: DEFAULT_TAX });
    expect(isConsolidation(r)).toBe(false);
  });
});
