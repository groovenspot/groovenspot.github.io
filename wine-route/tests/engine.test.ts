import { describe, expect, it } from "vitest";
import { compare, type ForwarderIn, type OfferIn, type SellerIn } from "@/lib/engine";
import { DEFAULT_TAX } from "@/lib/tax";

const fx = { USD: 1400, EUR: 1600, HKD: 180, KRW: 1 };
const seller = (p: Partial<SellerIn>): SellerIn => ({
  id: p.channel ?? "s",
  name: "s",
  country: "프랑스",
  channel: "EXPORT_RETAILER",
  shipsToKorea: true,
  currency: "EUR",
  shipBase: 20,
  shipPerBottle: 8,
  daysMin: 7,
  daysMax: 12,
  insured: false,
  active: true,
  ...p,
});
const offer = (price: number, s: SellerIn, id = s.id, bottleMl = 750): OfferIn => ({ id, price, bottleMl, inStock: true, url: "u", checkedAt: new Date(), seller: s });
const fw = (p: Partial<ForwarderIn> = {}): ForwarderIn => ({ id: "f", name: "f", country: "프랑스", acceptsAlcohol: true, currency: "EUR", shipBase: 10, shipPerBottle: 12, daysMin: 10, daysMax: 20, active: true, ...p });

const offers = [
  offer(40, seller({ channel: "WINERY_DIRECT", shipBase: 26, shipPerBottle: 9 })),
  offer(44, seller({ channel: "EXPORT_RETAILER" })),
  offer(41, seller({ channel: "LOCAL_SHOP", shipsToKorea: false, shipBase: 8, shipPerBottle: 1 })),
  offer(420, seller({ channel: "HK_RETAILER", country: "홍콩", currency: "HKD", shipBase: 95, shipPerBottle: 45 })),
];

describe("compare", () => {
  it("4개 경로를 계산하고 최저 경로를 고른다", () => {
    const r = compare({ wine: { country: "프랑스", krPrice: 150000 }, qty: 1, bottleMl: 750, offers, forwarders: [fw()], fx, tax: DEFAULT_TAX });
    expect(r.routes.map((x) => x.channel)).toEqual(["WINERY_DIRECT", "EXPORT_RETAILER", "FORWARDER", "HK_RETAILER"]);
    expect(r.routes.every((x) => x.available)).toBe(true);
    const min = Math.min(...r.routes.map((x) => x.best!.perBottle));
    expect(r.best!.perBottle).toBe(min);
    expect(r.savingPerBottle).toBeCloseTo(150000 - min);
  });

  it("홍콩 경유는 FTA를 받지 못하고, 원산지 구매는 받는다", () => {
    const r = compare({ wine: { country: "프랑스", krPrice: null }, qty: 2, bottleMl: 750, offers, forwarders: [fw()], fx, tax: DEFAULT_TAX });
    const hk = r.routes.find((x) => x.channel === "HK_RETAILER")!.best!;
    const direct = r.routes.find((x) => x.channel === "WINERY_DIRECT")!.best!;
    expect(hk.tax.fta).toBe(false);
    expect(hk.tax.duty).toBeGreaterThan(0);
    expect(direct.tax.fta).toBe(true);
    expect(direct.tax.duty).toBe(0);
  });

  it("주류를 받지 않는 배송대행지와 해외 발송 안 하는 와이너리는 이유와 함께 제외", () => {
    const us = [offer(50, seller({ channel: "WINERY_DIRECT", country: "미국", currency: "USD", shipsToKorea: false }))];
    const r = compare({ wine: { country: "미국", krPrice: null }, qty: 1, bottleMl: 750, offers: us, forwarders: [fw({ country: "미국", acceptsAlcohol: false })], fx, tax: DEFAULT_TAX });
    expect(r.routes[0].available).toBe(false);
    expect(r.routes[0].reason).toContain("해외로 발송하지 않습니다");
    expect(r.routes[2].reason).toContain("주류를 접수하지 않습니다");
    expect(r.best).toBeUndefined();
  });

  it("FTA 미체결 원산지는 직배송도 관세가 붙고 경고를 낸다", () => {
    const ar = [offer(110, seller({ channel: "WINERY_DIRECT", country: "아르헨티나", currency: "USD" }))];
    const r = compare({ wine: { country: "아르헨티나", krPrice: null }, qty: 2, bottleMl: 750, offers: ar, forwarders: [], fx, tax: DEFAULT_TAX });
    expect(r.best!.tax.duty).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.includes("FTA"))).toBe(true);
  });

  it("병 용량이 다른 판매 정보는 제외하고, 매그넘은 면세구간이 아니다", () => {
    const mag = [offer(100, seller({ channel: "EXPORT_RETAILER" }), "m", 1500)];
    const r = compare({ wine: { country: "프랑스", krPrice: 100000 }, qty: 1, bottleMl: 1500, offers: [...offers, ...mag], forwarders: [], fx, tax: DEFAULT_TAX });
    const ret = r.routes.find((x) => x.channel === "EXPORT_RETAILER")!;
    expect(ret.candidates).toHaveLength(1);
    expect(ret.best!.tax.exempt).toBe(false);
    expect(r.krPerBottle).toBe(200000);
  });

  it("환율이 없으면 그 판매처는 계산하지 않는다", () => {
    const r = compare({ wine: { country: "프랑스", krPrice: null }, qty: 1, bottleMl: 750, offers, forwarders: [], fx: { USD: 1400, EUR: 1600 }, tax: DEFAULT_TAX });
    expect(r.routes.find((x) => x.channel === "HK_RETAILER")!.available).toBe(false);
  });
});
