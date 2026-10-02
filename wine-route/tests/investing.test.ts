import { describe, expect, it } from "vitest";
import { fetchInvestingRates, parseInvestingPrice, rejectJumps } from "@/lib/investing";

describe("parseInvestingPrice", () => {
  it("현재 화면의 instrument-price-last를 읽는다", () => {
    expect(parseInvestingPrice(`<div class="x" data-test="instrument-price-last">1,391.27</div>`)).toBe(1391.27);
  });
  it("Next.js 초기 데이터의 price.last를 읽는다", () => {
    const html = `<script id="__NEXT_DATA__">{"props":{"instrument":{"price":{"bid":1,"last":1625.4,"ask":2}}}}</script>`;
    expect(parseInvestingPrice(html)).toBe(1625.4);
  });
  it("예전 화면의 last_last를 읽는다", () => {
    expect(parseInvestingPrice(`<span id="last_last" dir="ltr">9.3021</span>`)).toBe(9.3021);
  });
  it("가격이 없으면 null", () => {
    expect(parseInvestingPrice("<html>Just a moment...</html>")).toBeNull();
  });
});

describe("fetchInvestingRates", () => {
  it("통화별로 받고, 실패한 통화는 이유를 남긴다", async () => {
    const fake = (async (url: string) => {
      if (url.endsWith("usd-krw")) return new Response(`<div data-test="instrument-price-last">1,390.5</div>`);
      if (url.endsWith("eur-krw")) return new Response("blocked", { status: 403 });
      return new Response("<html></html>");
    }) as unknown as typeof fetch;
    const r = await fetchInvestingRates(["USD", "EUR", "AUD", "XYZ"], fake, 0);
    expect(r.rates).toEqual({ USD: 1390.5 });
    expect(r.errors.EUR).toContain("403");
    expect(r.errors.AUD).toContain("찾지 못했습니다");
    expect(r.errors.XYZ).toBe("지원하지 않는 통화");
  });
});

describe("rejectJumps", () => {
  it("직전 값 대비 기준 넘게 바뀐 값은 버린다", () => {
    const r = rejectJumps({ USD: 1400, EUR: 16250, NZD: 800 }, { USD: 1390, EUR: 1625 }, 0.1);
    expect(r.ok).toEqual({ USD: 1400, NZD: 800 });
    expect(Object.keys(r.rejected)).toEqual(["EUR"]);
  });
});
