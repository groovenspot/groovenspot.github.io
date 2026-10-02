import { prisma } from "@/server/db";
import { parseJsonLdOffer } from "@/lib/crawl/jsonld";

const UA = "WineRouteBot/0.1 (+price comparison; contact via site)";

/** JSONLD 셀러의 상품 페이지를 돌며 가격·재고를 갱신합니다. 셀러당 요청 간격 1.5초. */
export async function runCrawlJob(sellerId?: string, fetchFn: typeof fetch = fetch) {
  const sellers = await prisma.seller.findMany({
    where: { active: true, priceSource: "JSONLD", ...(sellerId ? { id: sellerId } : {}) },
    include: { offers: true },
  });
  const lines: string[] = [];
  for (const s of sellers) {
    const run = await prisma.crawlRun.create({ data: { sellerId: s.id } });
    let updated = 0;
    let failed = 0;
    for (const o of s.offers) {
      try {
        const res = await fetchFn(o.url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = parseJsonLdOffer(await res.text());
        if (!parsed) throw new Error("페이지에서 가격 정보를 찾지 못했습니다");
        if (parsed.currency !== s.currency) throw new Error(`통화 불일치: ${parsed.currency} ≠ ${s.currency}`);
        await prisma.offer.update({ where: { id: o.id }, data: { price: parsed.price, inStock: parsed.inStock, checkedAt: new Date(), lastError: null } });
        updated++;
      } catch (e) {
        failed++;
        await prisma.offer.update({ where: { id: o.id }, data: { lastError: String((e as Error).message).slice(0, 300) } });
      }
      await new Promise((r) => setTimeout(r, process.env.NODE_ENV === "test" ? 0 : 1500));
    }
    const status = failed === 0 ? "ok" : updated === 0 && s.offers.length ? "failed" : "partial";
    await prisma.crawlRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status, updated, failed } });
    lines.push(`${s.name}: 갱신 ${updated}, 실패 ${failed}`);
  }
  return lines.length ? lines.join(" / ") : "크롤링 대상 셀러가 없습니다";
}
