import { describe, expect, it } from "vitest";
import { parseCsv, csvObjects } from "@/lib/csvParse";
import { cleanWineName, extractProductLinks, guessBottleMl, nextPageUrl, parseJsonLdProduct, parseRobots, robotsAllows } from "@/lib/crawl/catalog";
import { countryKo, lwinTypeKo, mapLwinRows, searchTokens } from "@/lib/lwin";
import { parseWineCsv } from "@/lib/wineCsv";

describe("CSV 읽기", () => {
  it("따옴표 속 쉼표·줄바꿈·\"\" 와 BOM·CRLF 를 처리합니다", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","he said ""hi""\nok"\r\n\r\n3,4')).toEqual([["a", "b"], ["x, y", 'he said "hi"\nok'], ["3", "4"]]);
    expect(csvObjects("Display Name,LWIN\nChablis,1012345").rows).toEqual([{ display_name: "Chablis", lwin: "1012345" }]);
  });
});

describe("robots.txt", () => {
  const txt = "User-agent: *\nDisallow: /checkout\nDisallow: /*?sort=\nAllow: /checkout/help\nCrawl-delay: 3\n\nUser-agent: OtherBot\nDisallow: /";
  it("* 그룹 규칙과 가장 구체적인 규칙을 따릅니다", () => {
    const r = parseRobots(txt);
    expect(r.crawlDelay).toBe(3);
    expect(robotsAllows(r, "/collections/red")).toBe(true);
    expect(robotsAllows(r, "/checkout/pay")).toBe(false);
    expect(robotsAllows(r, "/checkout/help")).toBe(true);
    expect(robotsAllows(r, "/collections/red?sort=price")).toBe(false);
  });
  it("우리 봇 이름 그룹이 있으면 그것을 씁니다", () => {
    const r = parseRobots("User-agent: *\nDisallow:\n\nUser-agent: CellarDoorBot\nDisallow: /wine");
    expect(robotsAllows(r, "/wine/a")).toBe(false);
    expect(robotsAllows(parseRobots(""), "/anything")).toBe(true);
  });
});

describe("목록 페이지", () => {
  it("JSON-LD ItemList 가 있으면 그 링크만", () => {
    const html = `<script type="application/ld+json">{"@type":"ItemList","itemListElement":[{"@type":"ListItem","url":"/products/a"},{"item":{"url":"https://shop.example/products/b"}}]}</script><a href="/products/zzz">x</a>`;
    expect(extractProductLinks(html, "https://shop.example/collections/red")).toEqual(["https://shop.example/products/a", "https://shop.example/products/b"]);
  });
  it("없으면 같은 사이트 링크에서 장바구니·계정·이미지·외부 링크를 뺍니다", () => {
    const html = `<a href="/products/a#top">a</a><a href="/cart">c</a><a href="https://other.com/p">o</a><a href="/account/login">l</a><a href="/img/x.jpg">i</a><a href="/products/b?variant=1">b</a><a href="mailto:x@y">m</a>`;
    expect(extractProductLinks(html, "https://shop.example/collections/red")).toEqual(["https://shop.example/products/a", "https://shop.example/products/b?variant=1"]);
  });
  it("다음 페이지 링크", () => {
    expect(nextPageUrl('<link rel="next" href="/collections/red?page=2">', "https://shop.example/collections/red")).toBe("https://shop.example/collections/red?page=2");
    expect(nextPageUrl("<p>end</p>", "https://shop.example/")).toBeNull();
  });
});

describe("상품 페이지", () => {
  it("Product 의 이름·브랜드·가격·재고·GTIN·빈티지·용량", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Domaine X Chablis 1er Cru Montmains 2022 75cl","brand":{"@type":"Brand","name":"Domaine X"},"gtin13":"3760000000001","offers":{"@type":"Offer","price":"42.50","priceCurrency":"eur","availability":"https://schema.org/OutOfStock"}}</script>`;
    expect(parseJsonLdProduct(html)).toEqual({ name: "Domaine X Chablis 1er Cru Montmains 2022 75cl", brand: "Domaine X", price: 42.5, currency: "EUR", inStock: false, gtin: "3760000000001", vintage: 2022, bottleMl: 750 });
  });
  it("Product 가 없으면 null", () => {
    expect(parseJsonLdProduct('<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>')).toBeNull();
  });
  it("용량 표기", () => {
    expect([guessBottleMl("Bollinger Magnum"), guessBottleMl("Sauternes 37.5cl"), guessBottleMl("X 1.5L"), guessBottleMl("Y 375 ml"), guessBottleMl("Z")]).toEqual([1500, 375, 1500, 375, 750]);
    expect(cleanWineName("Chablis Montmains 2022 75cl -")).toBe("Chablis Montmains");
  });
});

describe("LWIN", () => {
  it("머리줄 이름으로 열을 찾고, 7자리가 아닌 줄은 건너뜁니다", () => {
    const { header, rows } = csvObjects("LWIN,STATUS,DISPLAY_NAME,PRODUCER_TITLE,PRODUCER_NAME,WINE,COUNTRY,REGION,SUB_REGION,COLOUR,TYPE\n1012345,Live,\"Domaine X, Chablis Montmains\",Domaine,X,Chablis Montmains,France,Burgundy,Chablis,White,Still\n99,Live,Bad,,,,,,,,\n");
    const r = mapLwinRows(header, rows);
    expect(r.skipped).toBe(1);
    expect(r.rows[0]).toMatchObject({ lwin: "1012345", displayName: "Domaine X, Chablis Montmains", producer: "Domaine X", country: "France", subRegion: "Chablis", colour: "White" });
  });
  it("필수 열이 없으면 알려 줍니다", () => {
    expect(mapLwinRows(["name"], []).missing).toEqual(["LWIN"]);
  });
  it("국가·종류를 한글로", () => {
    expect([countryKo("France"), countryKo("United States"), countryKo("Moldova")]).toEqual(["프랑스", "미국", "Moldova"]);
    expect([lwinTypeKo("White", "Still"), lwinTypeKo("White", "Sparkling"), lwinTypeKo("Red", "Fortified"), lwinTypeKo("Rose", "Still"), lwinTypeKo("White", "Sweet")]).toEqual(["화이트", "스파클링", "주정강화", "로제", "디저트"]);
    expect(searchTokens("Ch. Margaux 2015, Grand Vin")).toEqual(["ch", "margaux", "2015", "grand"]);
  });
});

describe("와인 CSV", () => {
  const head = "name,name_ko,producer,country,region,type,vintage,kr_price,rating,rating_src,aliases,lwin,notes_ko,notes_src";
  it("올바른 줄을 읽고 aliases 는 | 로 나눕니다", () => {
    const r = parseWineCsv(`${head}\nChablis,샤블리,Domaine X,프랑스,샤블리,화이트,2022,"59,000",,,샤블리|Chablis AOC,1012345,,`);
    expect(r.errors).toEqual([]);
    expect(r.rows[0].wine).toMatchObject({ name: "Chablis", vintage: 2022, krPrice: 59000, aliases: ["샤블리", "Chablis AOC"], lwin: "1012345" });
  });
  it("종류·빈티지·평점 출처·노트 출처·LWIN·중복을 검사합니다", () => {
    const r = parseWineCsv([head,
      "A,에이,P,프랑스,R,오렌지,,,,,,,,",
      "B,비,P,프랑스,R,레드,1850,,,,,,,",
      "C,씨,P,프랑스,R,레드,,,92,,,,,",
      "D,디,P,프랑스,R,레드,,,,,,,맛있는 와인,",
      "E,이,P,프랑스,R,레드,,,,,,123,,",
      "F,에프,P,프랑스,R,레드,NV,,,,,,,",
      "F,에프,P,프랑스,R,레드,,,,,,,,",
    ].join("\n"));
    expect(r.errors.map((e) => e.split(":")[0])).toEqual(["2행", "3행", "4행", "5행", "6행", "8행"]);
    expect(r.rows.map((x) => x.wine.name)).toEqual(["F"]);
  });
  it("필수 열이 없으면 거절", () => {
    expect(parseWineCsv("name,country\nA,프랑스").errors[0]).toContain("name_ko");
  });
});
