import { describe, expect, it } from "vitest";
import { tasteScore, type TasteClean } from "@/lib/taste";
import { groupRequests, type RequestRow } from "@/lib/requests";
import { importerCost } from "@/lib/importer";
import { adSubject, campaignProblems, inQuietHours, marketingFooter } from "@/lib/marketing";
import { toCsv } from "@/lib/csv";
import { parseSegmentConfig, SEGMENT_DEFAULTS } from "@/lib/segments";
import { compare, type OfferIn, type SellerIn } from "@/lib/engine";
import { DEFAULT_TAX } from "@/lib/tax";

describe("취향 점수", () => {
  const t: TasteClean = { countries: ["프랑스"], types: ["화이트"], budget: "100_200" };
  it("산지·종류·예산을 더한다", () => {
    expect(tasteScore({ country: "프랑스", type: "화이트" }, 140000, t)).toBe(5);
    expect(tasteScore({ country: "프랑스", type: "레드" }, 90000, t)).toBe(2);
    expect(tasteScore({ country: "독일", type: "레드" }, null, t)).toBe(0);
    expect(tasteScore({ country: "프랑스", type: "화이트" }, 1, null)).toBe(0);
  });
});

describe("구해주세요 묶기", () => {
  const d = (n: number) => new Date(Date.UTC(2026, 9, 3) - n * 86400e3);
  const rows: RequestRow[] = [
    { id: "1", text: "Penfolds Grange 2018", userId: "a", source: "scan", status: "open", createdAt: d(1) },
    { id: "2", text: "penfolds grange shiraz 2019", userId: "b", source: "manual", status: "open", createdAt: d(2) },
    { id: "3", text: "Penfolds Grange 2018", userId: "a", source: "scan", status: "open", createdAt: d(3) },
    { id: "4", text: "Domaine Leflaive Puligny-Montrachet", userId: null, source: "manual", status: "added", createdAt: d(40) },
  ];
  it("비슷한 표기를 묶고 요청자 수로 우선순위를 낸다", () => {
    const g = groupRequests(rows, new Date(Date.UTC(2026, 9, 3)));
    expect(g).toHaveLength(2);
    expect(g[0]).toMatchObject({ label: "Penfolds Grange 2018", count: 3, people: 2, fromScan: 2, vintages: [2018, 2019], open: 3 });
    expect(g[1]).toMatchObject({ count: 1, people: 1, open: 0 });
    expect(g[0].score).toBeGreaterThan(g[1].score);
  });
});

describe("수입업자 원가", () => {
  const cfg = { dutyRate: 0.15, liquorRate: 0.3, eduRate: 0.1, vatRate: 0.1 };
  const base = { bottles: 600, fobPerBottle: 10, fx: 1600, freightKrw: 1_200_000, insuranceRate: 0, fta: true, brokerFeeKrw: 0, inspectionKrw: 0, labelPerBottle: 0, otherKrw: 0, marginRate: 0 };
  it("FTA면 관세 0, 주세·교육세는 과세가격 기준, 부가세는 원가에서 뺀다", () => {
    const r = importerCost(base, cfg);
    expect(r.cif).toBe(10_800_000);
    expect([r.duty, r.liquor, r.edu]).toEqual([0, 3_240_000, 324_000]);
    expect(r.vat).toBe(1_436_400);
    expect(r.costPerBottle).toBeCloseTo(23_940);
    expect(r.pricePerBottle).toBe(24_000);
  });
  it("비FTA면 관세 15%가 주세 과세표준에 들어간다", () => {
    const r = importerCost({ ...base, fta: false, marginRate: 0.3 }, cfg);
    expect(r.duty).toBe(1_620_000);
    expect(r.liquor).toBe(3_726_000);
    expect(r.pricePerBottle).toBe(Math.ceil(((10_800_000 + 1_620_000 + 3_726_000 + 372_600) / 600) * 1.3 / 100) * 100);
  });
});

describe("홍보 발송 규칙", () => {
  it("(광고) 표기, 야간 차단, 금지 표현, 수신 거부 안내", () => {
    expect(adSubject("가을 부르고뉴 소개")).toBe("(광고) 가을 부르고뉴 소개");
    expect(adSubject("(광고) x")).toBe("(광고) x");
    expect(inQuietHours(new Date("2026-10-03T12:30:00Z"))).toBe(true); // 21:30 KST
    expect(inQuietHours(new Date("2026-10-03T01:00:00Z"))).toBe(false); // 10:00 KST
    expect(inQuietHours(new Date("2026-10-02T22:59:00Z"))).toBe(true); // 07:59 KST
    expect(campaignProblems({ title: "할인 폭탄", body: "본문이 충분히 깁니다." })[0]).toContain("할인");
    expect(marketingFooter("https://x")).toContain("수신 거부");
  });
});

describe("CSV", () => {
  it("BOM, 따옴표·쉼표 처리, 수식 주입 방지", () => {
    const s = toCsv([["이메일", "메모"], ["a@b.kr", 'he said "hi", ok'], ["=SUM(A1)", null]]);
    expect(s.startsWith("﻿이메일,메모\r\n")).toBe(true);
    expect(s).toContain('"he said ""hi"", ok"');
    expect(s).toContain("'=SUM(A1),");
  });
});

describe("세그먼트 기준값", () => {
  it("빈 값은 기본값, 범위를 벗어나면 맞춘다", () => {
    expect(parseSegmentConfig(null)).toEqual(SEGMENT_DEFAULTS);
    expect(parseSegmentConfig({ premiumPerBottle: "200000", bulkQty: 0, repeatOrders: "x" })).toEqual({ ...SEGMENT_DEFAULTS, premiumPerBottle: 200000, bulkQty: 2 });
  });
});

describe("판매처 발송 조건", () => {
  const fx = { USD: 1400, EUR: 1600 };
  const seller = (p: Partial<SellerIn>): SellerIn => ({ id: "s", name: "숍", country: "프랑스", channel: "EXPORT_RETAILER", shipsToKorea: true, currency: "EUR", shipBase: 20, shipPerBottle: 8, daysMin: 7, daysMax: 12, insured: false, active: true, ...p });
  const offer = (price: number, s: SellerIn): OfferIn => ({ id: "o", price, bottleMl: 750, inStock: true, url: "u", checkedAt: new Date(), seller: s });
  it("최소 주문 병수보다 적으면 경로에서 빠지고 이유를 알려준다", () => {
    const r = compare({ wine: { country: "프랑스", krPrice: null }, qty: 2, bottleMl: 750, offers: [offer(40, seller({ minBottles: 6 }))], forwarders: [], fx, tax: DEFAULT_TAX });
    const ret = r.routes.find((x) => x.channel === "EXPORT_RETAILER")!;
    expect(ret.available).toBe(false);
    expect(ret.reason).toBe("6병 이상 주문해야 살 수 있습니다");
    const r6 = compare({ wine: { country: "프랑스", krPrice: null }, qty: 6, bottleMl: 750, offers: [offer(40, seller({ minBottles: 6 }))], forwarders: [], fx, tax: DEFAULT_TAX });
    expect(r6.routes.find((x) => x.channel === "EXPORT_RETAILER")!.available).toBe(true);
  });
  it("과세가격 1,000달러 초과 FTA 구매에 원산지증명 경고", () => {
    const big = compare({ wine: { country: "프랑스", krPrice: null }, qty: 12, bottleMl: 750, offers: [offer(120, seller({}))], forwarders: [], fx, tax: DEFAULT_TAX });
    expect(big.warnings.some((w) => w.includes("원산지증명"))).toBe(true);
    const ok = compare({ wine: { country: "프랑스", krPrice: null }, qty: 12, bottleMl: 750, offers: [offer(120, seller({ cooAvailable: true }))], forwarders: [], fx, tax: DEFAULT_TAX });
    expect(ok.warnings.some((w) => w.includes("원산지증명"))).toBe(false);
    const small = compare({ wine: { country: "프랑스", krPrice: null }, qty: 2, bottleMl: 750, offers: [offer(40, seller({}))], forwarders: [], fx, tax: DEFAULT_TAX });
    expect(small.warnings.some((w) => w.includes("원산지증명"))).toBe(false);
  });
});
