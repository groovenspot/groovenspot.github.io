import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { PNG, adminEmail, expect, loginAs, prisma, test } from "./fixtures";

const run = randomUUID().slice(0, 8);
let wineId = "", sellerId = "", shop: Server, shopUrl = "";

// 수집을 허락한 가짜 판매처: robots.txt, 목록 1쪽, 상품 1개(JSON-LD + 사진)
const product = () => JSON.stringify({ "@type": "Product", name: `E2E Cuvee ${run} 2022`, brand: { "@type": "Brand", name: `Maison E2E ${run}` }, image: "/img/bottle.png", offers: { "@type": "Offer", price: "27.5", priceCurrency: "EUR", availability: "https://schema.org/InStock" } });

test.beforeAll(async () => {
  shop = createServer((req, res) => {
    const u = req.url ?? "/";
    if (u === "/robots.txt") return res.end("User-agent: *\nDisallow: /private/");
    if (u === "/collections/wine") return res.end(`<a href="/products/e2e">e2e</a><a href="/private/x">x</a>`);
    if (u === "/products/e2e") return res.end(`<html><script type="application/ld+json">${product()}</script></html>`);
    res.statusCode = 404; res.end("not found");
  });
  await new Promise<void>((r) => shop.listen(0, "127.0.0.1", r));
  shopUrl = `http://127.0.0.1:${(shop.address() as AddressInfo).port}`;
  wineId = (await prisma.wine.create({ data: { name: `E2E Cuvee ${run}`, nameKo: `이투이 퀴베 ${run}`, producer: `Maison E2E ${run}`, country: "프랑스", region: "부르고뉴", type: "레드", vintage: 2022, aliases: [] } })).id;
  sellerId = (await prisma.seller.create({ data: { name: `E2E Shop ${run}`, country: "프랑스", channel: "EXPORT_RETAILER", website: shopUrl, currency: "EUR", catalogUrls: [`${shopUrl}/collections/wine`], crawlConsentAt: new Date(), crawlConsentNote: "E2E 테스트" } })).id;
});

test.afterAll(async () => {
  shop?.close();
  await prisma.catalogItem.deleteMany({ where: { sellerId } });
  await prisma.offer.deleteMany({ where: { sellerId } });
  await prisma.seller.deleteMany({ where: { id: sellerId } });
  await prisma.wine.deleteMany({ where: { id: wineId } });
});

test.beforeEach(async ({ context, baseURL }) => {
  await loginAs(context, adminEmail(), baseURL!);
});

test("관리자 화면은 관리자만", async ({ browser, baseURL }) => {
  const anon = await browser.newContext();
  const p = await anon.newPage();
  await p.goto(`${baseURL}/admin`);
  await expect(p).toHaveURL(/\/login/);
  await anon.close();
});

test("카탈로그 수집 → 연결하면 판매 정보가 생기고 작업 기록이 남습니다", async ({ page, pageErrors }) => {
  void pageErrors;
  await page.goto("/admin/catalog");
  await page.locator("tr", { hasText: `E2E Shop ${run}` }).getByRole("button", { name: /지금 수집/ }).click();
  await expect.poll(() => prisma.catalogItem.count({ where: { sellerId } }), { timeout: 30_000 }).toBe(1);
  const item = await prisma.catalogItem.findFirstOrThrow({ where: { sellerId } });
  // 사진은 https 주소만 받습니다 (http 사진은 https 사이트에서 혼합 콘텐츠로 막힘). 연결 시 사진 복사는 통합 테스트에서 확인합니다.
  expect(item).toMatchObject({ price: 27.5, currency: "EUR", image: null });

  await page.goto("/admin/catalog");
  const box = page.locator(".box", { hasText: `E2E Cuvee ${run} 2022` }).first();
  await box.locator("select[name=wineId]").selectOption(wineId);
  await box.getByRole("button", { name: "이 와인에 연결" }).click();
  await expect.poll(() => prisma.offer.count({ where: { sellerId, wineId } })).toBe(1);
  await page.goto(`/wines/${wineId}`);
  await expect(page.locator(".routes").first()).toContainText(`E2E Shop ${run}`);

  await page.goto("/admin/audit");
  await expect(page.locator("table tr", { hasText: "수집 상품 연결" }).first()).toBeVisible();
});

test("와인 정보에 사진 주소·출처를 넣으면 상세 화면에 출처와 함께 보입니다", async ({ page, pageErrors }) => {
  void pageErrors;
  await page.route("https://img.e2e.test/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  await page.goto(`/admin/wines/${wineId}`);
  await page.locator("#w-img").fill("https://img.e2e.test/bottle.png");
  await page.locator("#w-imgsrc").fill("생산자 공식 자료");
  await page.getByRole("button", { name: "저장" }).first().click();
  await expect.poll(async () => (await prisma.wine.findUnique({ where: { id: wineId } }))?.imageUrl).toBe("https://img.e2e.test/bottle.png");
  await page.goto(`/wines/${wineId}`);
  const fig = page.locator("figure.thumb.lg");
  await expect(fig.locator("img")).toHaveAttribute("src", "https://img.e2e.test/bottle.png");
  await expect(fig.locator("figcaption")).toContainText("생산자 공식 자료");
});
