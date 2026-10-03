import { describe, expect, it } from "vitest";
import { classify, SEGMENT_DEFAULTS } from "@/lib/segments";
import { BUDGET_LABEL, isEmptyTaste, parseTaste, TASTE_MAX_ITEMS } from "@/lib/taste";
import { canSendMarketing, consentChange } from "@/lib/consent";

describe("classify", () => {
  it("확정 주문이 없으면 구매 전", () => {
    expect(classify([])).toEqual({ segment: "NONE", orders: 0, bottles: 0, avgPerBottle: null });
  });

  it("주문 1건은 입문 직구러, 가격이 높아도 반복 구매 전에는 입문", () => {
    expect(classify([{ qty: 1, estTotal: 400_000 }]).segment).toBe("STARTER");
  });

  it("반복 구매이고 병당 평균이 기준 미만이면 취향 수집가", () => {
    const r = classify([{ qty: 1, estTotal: 80_000 }, { qty: 2, estTotal: 200_000 }]);
    expect(r.segment).toBe("COLLECTOR");
    expect(r.avgPerBottle).toBe(93_333);
  });

  it("반복 구매이고 병당 평균이 기준 이상이면 고급 컬렉터, 평균은 병수 가중", () => {
    const r = classify([{ qty: 1, estTotal: 300_000 }, { qty: 2, estTotal: 200_000 }]);
    expect(r.segment).toBe("PREMIUM");
    expect(r.avgPerBottle).toBe(166_667);
  });

  it("기준값은 경계 포함", () => {
    const edge = SEGMENT_DEFAULTS.premiumPerBottle;
    expect(classify([{ qty: 1, estTotal: edge }, { qty: 1, estTotal: edge }]).segment).toBe("PREMIUM");
    expect(classify([{ qty: 1, estTotal: edge - 1 }, { qty: 1, estTotal: edge - 1 }]).segment).toBe("COLLECTOR");
  });

  it("다량 주문이 기준 횟수 이상이면 다른 조건보다 먼저 다량 구매", () => {
    const big = { qty: SEGMENT_DEFAULTS.bulkQty, estTotal: 900_000 };
    expect(classify([big]).segment).toBe("STARTER");
    expect(classify([big, big]).segment).toBe("BULK");
  });

  it("값이 이상한 주문은 무시", () => {
    const r = classify([{ qty: 0, estTotal: 100 }, { qty: 1, estTotal: Number.NaN }, { qty: 1, estTotal: 50_000 }]);
    expect(r.orders).toBe(1);
    expect(r.segment).toBe("STARTER");
  });

  it("기준값을 바꿔 넘길 수 있다", () => {
    const cfg = { ...SEGMENT_DEFAULTS, premiumPerBottle: 50_000 };
    expect(classify([{ qty: 1, estTotal: 60_000 }, { qty: 1, estTotal: 60_000 }], cfg).segment).toBe("PREMIUM");
  });
});

describe("parseTaste", () => {
  it("공백·중복을 정리하고 예산 구간은 목록에 있는 값만 받는다", () => {
    const t = parseTaste({ countries: [" 프랑스 ", "프랑스", "", "이탈리아"], types: ["레드"], budget: "50_100" });
    expect(t).toEqual({ countries: ["프랑스", "이탈리아"], types: ["레드"], budget: "50_100" });
    expect(BUDGET_LABEL["50_100"]).toBe("5만~10만원");
    expect(parseTaste({ budget: "1억" }).budget).toBeNull();
  });

  it("허용 목록에 없는 산지·종류는 버린다", () => {
    const t = parseTaste({ countries: ["프랑스", "<script>"], types: ["레드", "독극물"] }, { countries: ["프랑스"], types: ["레드"] });
    expect(t.countries).toEqual(["프랑스"]);
    expect(t.types).toEqual(["레드"]);
  });

  it("항목 수와 길이를 제한한다", () => {
    const many = Array.from({ length: 20 }, (_, i) => `산지${i}`);
    expect(parseTaste({ countries: many }).countries).toHaveLength(TASTE_MAX_ITEMS);
    expect(parseTaste({ countries: ["가".repeat(100)] }).countries[0]).toHaveLength(30);
  });

  it("모두 비면 빈 설문", () => {
    expect(isEmptyTaste(parseTaste({}))).toBe(true);
    expect(isEmptyTaste(parseTaste({ types: ["레드"] }))).toBe(false);
  });
});

describe("마케팅 동의", () => {
  it("동의 시각이 있어야만 홍보성 발송이 가능", () => {
    expect(canSendMarketing(null)).toBe(false);
    expect(canSendMarketing({ marketingConsentAt: null })).toBe(false);
    expect(canSendMarketing({ marketingConsentAt: new Date() })).toBe(true);
  });

  it("동의와 철회는 시각을 함께 남긴다", () => {
    const now = new Date("2026-10-03T00:00:00Z");
    expect(consentChange(true, now)).toEqual({ marketingConsentAt: now, marketingConsentUpdatedAt: now });
    expect(consentChange(false, now)).toEqual({ marketingConsentAt: null, marketingConsentUpdatedAt: now });
  });
});
