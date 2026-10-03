/** Opt-in PostgreSQL checks: INTEGRATION_DATABASE_URL=postgresql://... npx vitest run tests/catalog.integration.test.ts */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

const run = randomUUID().slice(0, 8);
const HOST = `https://shop-${run}.example`;
const product = (name: string, brand: string, price: number, currency = "EUR", image?: unknown) =>
  `<html><script type="application/ld+json">${JSON.stringify({ "@type": "Product", name, brand: { "@type": "Brand", name: brand }, image, offers: { "@type": "Offer", price, priceCurrency: currency, availability: "https://schema.org/InStock" } })}</script></html>`;
const pages: Record<string, string> = {
  "/robots.txt": "User-agent: *\nDisallow: /private/",
  "/collections/wine": `<a href="/products/known-${run}">a</a><a href="/products/new-${run}">b</a><a href="/private/secret">c</a><a href="/cart">d</a><link rel="next" href="/collections/wine?page=2">`,
  "/collections/wine?page=2": `<a href="/pages/about">x</a><a href="/products/gift-card">g</a>`,
  [`/products/known-${run}`]: product(`Catalog Known Wine ${run} 2021`, `Maison ${run}`, 31.5, "EUR", { "@type": "ImageObject", url: "/img/known.jpg" }),
  [`/products/new-${run}`]: product(`Brand New Cuvee ${run} 2020 Magnum`, `Domaine Neuf ${run}`, 80),
  "/products/gift-card": `<html><p>gift card, no JSON-LD</p></html>`,
};
const requested: string[] = [];
const fakeFetch = (async (input: string | URL) => {
  const u = new URL(String(input));
  requested.push(u.pathname + u.search);
  const body = pages[u.pathname + u.search];
  return new Response(body ?? "not found", { status: body === undefined ? 404 : 200 });
}) as typeof fetch;

integration("카탈로그 수집 → 연결 · 새 와인 · CSV · LWIN", () => {
  let prisma: PrismaClient;
  let sellerId: string, knownWineId: string, noConsentId: string;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    ({ prisma } = await import("@/server/db"));
    knownWineId = (await prisma.wine.create({ data: { name: `Catalog Known Wine ${run}`, nameKo: "수집 테스트 와인", producer: `Maison ${run}`, country: "프랑스", region: "R", type: "레드", vintage: 2021, aliases: [] } })).id;
    sellerId = (await prisma.seller.create({ data: { name: `Catalog Shop ${run}`, country: "프랑스", channel: "EXPORT_RETAILER", website: HOST, currency: "EUR", catalogUrls: [`${HOST}/collections/wine`], crawlConsentAt: new Date(), crawlConsentNote: "테스트 계약" } })).id;
    noConsentId = (await prisma.seller.create({ data: { name: `No Consent ${run}`, country: "프랑스", channel: "EXPORT_RETAILER", website: HOST, currency: "EUR", catalogUrls: [`${HOST}/collections/wine`] } })).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.offer.deleteMany({ where: { sellerId } });
    await prisma.seller.deleteMany({ where: { id: { in: [sellerId, noConsentId] } } });
    await prisma.wine.deleteMany({ where: { OR: [{ name: { contains: run } }, { producer: { contains: run } }] } });
    await prisma.lwinRef.deleteMany({ where: { lwin: { in: ["9900001", "9900002"] } } });
    await prisma.$disconnect();
  });

  it("허락받은 판매처만, robots.txt 를 지키며, 상품만 대기열에 넣고 자동 매칭합니다", async () => {
    const { runCatalogCrawl } = await import("@/server/catalog");
    const msg = await runCatalogCrawl(undefined, { fetchFn: fakeFetch, delayMs: 0 });
    expect(msg).toContain(`Catalog Shop ${run}`);
    expect(msg).not.toContain(`No Consent ${run}`);
    expect(requested).not.toContain("/private/secret");
    expect(requested).toContain("/collections/wine?page=2");
    const items = await prisma.catalogItem.findMany({ where: { sellerId }, orderBy: { url: "asc" } });
    expect(items.map((i) => i.url.replace(HOST, ""))).toEqual([`/products/known-${run}`, `/products/new-${run}`]);
    const known = items.find((i) => i.url.includes("known"))!;
    expect(known.suggestId).toBe(knownWineId);
    expect(known.suggestScore!).toBeGreaterThan(0.7);
    const nw = items.find((i) => i.url.includes("new"))!;
    expect(nw).toMatchObject({ bottleMl: 1500, vintage: 2020, price: 80, currency: "EUR" });
    expect(await prisma.catalogItem.count({ where: { sellerId: noConsentId } })).toBe(0);
  });

  it("연결하면 판매 정보가 생기고, 다시 수집해도 연결한 상품은 읽지 않습니다", async () => {
    const { linkCatalogItem, runCatalogCrawl } = await import("@/server/catalog");
    const known = await prisma.catalogItem.findFirstOrThrow({ where: { sellerId, url: { contains: "known" } } });
    await linkCatalogItem(known.id, knownWineId);
    const offer = await prisma.offer.findUniqueOrThrow({ where: { wineId_sellerId_bottleMl: { wineId: knownWineId, sellerId, bottleMl: 750 } } });
    expect(offer).toMatchObject({ price: 31.5, url: `${HOST}/products/known-${run}` });
    // 사진이 없던 와인에는 판매처 상품 사진과 출처가 붙습니다
    expect(await prisma.wine.findUnique({ where: { id: knownWineId }, select: { imageUrl: true, imageSrc: true } })).toEqual({ imageUrl: `${HOST}/img/known.jpg`, imageSrc: `Catalog Shop ${run}` });
    requested.length = 0;
    await runCatalogCrawl(sellerId, { fetchFn: fakeFetch, delayMs: 0 });
    expect(requested).not.toContain(`/products/known-${run}`);
    expect(requested).not.toContain(`/products/new-${run}`); // 하루 안에 읽은 대기 상품도 건너뜀
  });

  it("LWIN 을 올리고 찾아서 새 와인 정보를 채웁니다", async () => {
    const { upsertLwin, lwinSearch } = await import("@/server/catalog");
    const { countryKo, lwinTypeKo } = await import("@/lib/lwin");
    await upsertLwin([
      { lwin: "9900001", displayName: `Domaine Neuf ${run}, Brand New Cuvee`, producer: `Domaine Neuf ${run}`, wine: "Brand New Cuvee", country: "France", region: "Rhone", subRegion: "Cornas", colour: "Red", type: "Still", status: "Live" },
      { lwin: "9900002", displayName: `Other ${run}`, producer: null, wine: null, country: "Italy", region: null, subRegion: null, colour: "White", type: "Sparkling", status: "Live" },
    ]);
    await upsertLwin([{ lwin: "9900002", displayName: `Other ${run} renamed`, producer: null, wine: null, country: "Italy", region: null, subRegion: null, colour: "White", type: "Sparkling", status: "Live" }]);
    expect((await prisma.lwinRef.findUnique({ where: { lwin: "9900002" } }))?.displayName).toBe(`Other ${run} renamed`);
    const hits = await lwinSearch(`domaine neuf ${run} cuvee`);
    expect(hits.map((h) => h.lwin)).toEqual(["9900001"]);
    expect([countryKo(hits[0].country), lwinTypeKo(hits[0].colour, hits[0].type)]).toEqual(["프랑스", "레드"]);
  });

  it("와인 CSV: 미리 보기는 저장하지 않고, 반영하면 새로 만들거나 갱신합니다", async () => {
    const { applyWineRows } = await import("@/server/catalog");
    const { parseWineCsv } = await import("@/lib/wineCsv");
    const csv = `name,name_ko,producer,country,region,type,vintage,kr_price\nCatalog Known Wine ${run},수집 테스트 와인 (수정),Maison ${run},프랑스,R,레드,2021,70000\nCsv Only ${run},CSV 와인,P ${run},이탈리아,토스카나,레드,2019,`;
    const { rows, errors } = parseWineCsv(csv);
    expect(errors).toEqual([]);
    expect(await applyWineRows(rows, false)).toEqual({ created: 1, updated: 1, errors: [] });
    expect(await prisma.wine.count({ where: { name: `Csv Only ${run}` } })).toBe(0);
    await applyWineRows(rows, true);
    expect((await prisma.wine.findUniqueOrThrow({ where: { id: knownWineId } })).krPrice).toBe(70000);
    expect(await prisma.wine.count({ where: { name: `Csv Only ${run}` } })).toBe(1);
  });
});
