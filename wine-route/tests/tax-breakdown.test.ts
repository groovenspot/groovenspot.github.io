import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TaxBreakdown } from "@/components/TaxBreakdown";
import { calcTax, DEFAULT_TAX } from "@/lib/tax";

describe("관리자 세율과 계산 근거 표시", () => {
  it("상담과 계산기에서 적용한 변경 세율·소액 기준을 그대로 표시한다", () => {
    const config = { ...DEFAULT_TAX, liquorRate: 0.4, eduRate: 0.05, vatRate: 0.12, minCollect: 100000 };
    const tax = calcTax({ cif: 11000, goodsUsdPerBottle: 10, qty: 2, bottleMl: 750, fta: false }, config);
    const html = renderToStaticMarkup(createElement(TaxBreakdown, {
      goodsKrw: 10000, shipKrw: 1000, tax, total: 11000 + tax.pay, qty: 2, dutyRate: config.dutyRate, taxConfig: config,
    }));
    expect(html).toContain("40.0%");
    expect(html).toContain("5.0%");
    expect(html).toContain("12.0%");
    expect(html).toContain("100,000원 미만이라 징수 면제");
    expect(html).not.toContain("1만원 미만");
  });
});
