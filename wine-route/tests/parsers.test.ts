import { describe, expect, it } from "vitest";
import { parseExim, yyyymmdd } from "@/lib/fx";
import { parseJsonLdOffer } from "@/lib/crawl/jsonld";
import { matchesQuery } from "@/lib/search";
import { solapiAuthHeader } from "@/server/alimtalk";
import { createHmac } from "node:crypto";

describe("parseExim", () => {
  it("쉼표를 지우고 JPY(100)은 1엔 단위로 바꾼다", () => {
    const r = parseExim([
      { result: 1, cur_unit: "USD", deal_bas_r: "1,390.5" },
      { result: 1, cur_unit: "JPY(100)", deal_bas_r: "930.12" },
      { result: 1, cur_unit: "EUR", deal_bas_r: "1,625" },
    ]);
    expect(r).toEqual({ USD: 1390.5, JPY: 9.3012, EUR: 1625 });
  });
  it("한국 시간 기준 날짜를 만든다", () => {
    expect(yyyymmdd(new Date("2026-10-01T16:00:00Z"))).toBe("20261002");
  });
});

describe("parseJsonLdOffer", () => {
  it("@graph 안의 Product → Offer에서 가격과 재고를 읽는다", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Product","name":"Chablis","offers":{"@type":"Offer","price":"41.90","priceCurrency":"eur","availability":"https://schema.org/InStock"}}]}</script>`;
    expect(parseJsonLdOffer(html)).toEqual({ price: 41.9, currency: "EUR", inStock: true });
  });
  it("품절과 AggregateOffer를 처리하고, 깨진 JSON은 건너뛴다", () => {
    const html = `<script type="application/ld+json">{oops</script><script type='application/ld+json'>[{"@type":"Product","offers":[{"@type":"AggregateOffer","lowPrice":55,"priceCurrency":"USD","availability":"OutOfStock"}]}]</script>`;
    expect(parseJsonLdOffer(html)).toEqual({ price: 55, currency: "USD", inStock: false });
  });
  it("가격이 없으면 null", () => {
    expect(parseJsonLdOffer("<html></html>")).toBeNull();
  });
});

describe("matchesQuery", () => {
  const hay = "Domaine William Fèvre Chablis 1er Cru 윌리엄 페브르 부르고뉴 화이트";
  it("한글 표기로 원어를 찾는다", () => {
    expect(matchesQuery(hay, "샤블리")).toBe(true);
    expect(matchesQuery("Billecart-Salmon Brut Réserve champagne", "샴페인")).toBe(true);
  });
  it("악센트와 공백을 무시하고, 모든 단어가 맞아야 한다", () => {
    expect(matchesQuery(hay, "fevre chablis")).toBe(true);
    expect(matchesQuery(hay, "fevre 바롤로")).toBe(false);
  });
});

describe("solapiAuthHeader", () => {
  it("date+salt를 HMAC-SHA256으로 서명한다", () => {
    const h = solapiAuthHeader("KEY", "SECRET", "2026-10-02T00:00:00Z", "abc");
    const sig = createHmac("sha256", "SECRET").update("2026-10-02T00:00:00Zabc").digest("hex");
    expect(h).toBe(`HMAC-SHA256 apiKey=KEY, date=2026-10-02T00:00:00Z, salt=abc, signature=${sig}`);
  });
});
