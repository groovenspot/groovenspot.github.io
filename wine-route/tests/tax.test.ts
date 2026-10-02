import { describe, expect, it } from "vitest";
import { calcTax, DEFAULT_TAX } from "@/lib/tax";

const base = { cif: 100_000, goodsUsdPerBottle: 50, qty: 1, bottleMl: 750, fta: true };

describe("calcTax", () => {
  it("1병·1L 이하·150달러 이하는 주세+교육세만, 과세가격의 33%", () => {
    const t = calcTax(base);
    expect(t.exempt).toBe(true);
    expect([t.duty, t.liquor, t.edu, t.vat]).toEqual([0, 30000, 3000, 0]);
    expect(t.rate).toBeCloseTo(0.33, 3);
  });

  it("2병 + FTA 원산지 구매는 약 46%", () => {
    const t = calcTax({ ...base, qty: 2 });
    expect(t.exempt).toBe(false);
    expect([t.duty, t.liquor, t.edu, t.vat]).toEqual([0, 30000, 3000, 13300]);
    expect(t.rate).toBeCloseTo(0.463, 3);
  });

  it("제3국 구매는 관세 15%, 주세는 (가격+관세)의 30%, 약 68%", () => {
    const t = calcTax({ ...base, qty: 2, fta: false });
    expect(t.duty).toBe(15000);
    expect(t.liquor).toBe(34500);
    expect(t.edu).toBe(3450);
    expect(t.vat).toBe(15295);
    expect(t.rate).toBeCloseTo(0.682, 3);
  });

  it("150달러 초과나 1L 초과는 1병이어도 면세구간이 아니다", () => {
    expect(calcTax({ ...base, goodsUsdPerBottle: 150.01 }).exempt).toBe(false);
    expect(calcTax({ ...base, goodsUsdPerBottle: 150 }).exempt).toBe(true);
    expect(calcTax({ ...base, bottleMl: 1500 }).exempt).toBe(false);
  });

  it("세액 합계 1만원 미만은 징수 면제", () => {
    const t = calcTax({ ...base, cif: 30_000 });
    expect(t.sum).toBe(9900);
    expect(t.waived).toBe(true);
    expect(t.pay).toBe(0);
  });

  it("세율은 설정값을 따른다", () => {
    const t = calcTax({ ...base, qty: 2, fta: false }, { ...DEFAULT_TAX, dutyRate: 0.2 });
    expect(t.duty).toBe(20000);
  });
});
