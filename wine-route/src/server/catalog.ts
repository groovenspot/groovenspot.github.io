import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { CATALOG_UA, extractProductLinks, nextPageUrl, parseJsonLdProduct, parseRobots, robotsAllows, type Robots } from "@/lib/crawl/catalog";
import { matchWines } from "@/lib/match";
import type { LwinRow } from "@/lib/lwin";
import { searchTokens } from "@/lib/lwin";
import type { WineInput } from "@/lib/wineCsv";

type Opts = { fetchFn?: typeof fetch; delayMs?: number; maxPages?: number; maxProducts?: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 판매처 카탈로그 수집: 목록 페이지(다음 페이지 포함)에서 상품 링크를 찾고, 상품 페이지 JSON-LD 를 읽어 수집 대기열에 넣습니다.
 * - 수집 허락 확인일이 있는 판매처만
 * - robots.txt 가 막은 주소는 건너뜀, 요청 간격 1.5초 이상(Crawl-delay 가 길면 그만큼)
 * - 이미 연결했거나 제외한 상품은 다시 읽지 않음 (연결된 상품의 가격은 기존 가격 수집이 갱신)
 */
export async function runCatalogCrawl(sellerId?: string, opts: Opts = {}) {
  const fetchFn = opts.fetchFn ?? fetch;
  const maxPages = opts.maxPages ?? 5, maxProducts = opts.maxProducts ?? 100;
  const sellers = await prisma.seller.findMany({
    where: { active: true, crawlConsentAt: { not: null }, NOT: { catalogUrls: { isEmpty: true } }, ...(sellerId ? { id: sellerId } : {}) },
  });
  if (!sellers.length) return "카탈로그 수집 대상이 없습니다 (판매처에 목록 주소와 수집 허락 확인일이 있어야 합니다)";
  const wines = await prisma.wine.findMany({ select: { id: true, name: true, nameKo: true, producer: true, vintage: true, aliases: true } });
  const robotsCache = new Map<string, Robots>();
  const get = async (url: string) => {
    const res = await fetchFn(url, { headers: { "User-Agent": CATALOG_UA, Accept: "text/html" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };
  const robotsFor = async (url: string) => {
    const origin = new URL(url).origin;
    if (!robotsCache.has(origin)) {
      let r: Robots = { allow: [], disallow: [], crawlDelay: null };
      try {
        const res = await fetchFn(`${origin}/robots.txt`, { headers: { "User-Agent": CATALOG_UA }, signal: AbortSignal.timeout(10000) });
        if (res.ok) r = parseRobots(await res.text());
        // 4xx(파일 없음)는 제한 없음으로 봅니다. 5xx·네트워크 오류는 보수적으로 전체 금지.
        else if (res.status >= 500) r = { allow: [], disallow: ["/"], crawlDelay: null };
      } catch {
        r = { allow: [], disallow: ["/"], crawlDelay: null };
      }
      robotsCache.set(origin, r);
    }
    return robotsCache.get(origin)!;
  };
  const allowed = async (url: string) => { const u = new URL(url); return robotsAllows(await robotsFor(url), u.pathname + u.search); };

  const lines: string[] = [];
  for (const s of sellers) {
    const run = await prisma.crawlRun.create({ data: { sellerId: s.id, kind: "catalog" } });
    const errors: string[] = [];
    const wait = async (url: string) => sleep(Math.max(opts.delayMs ?? (process.env.NODE_ENV === "test" ? 0 : 1500), ((await robotsFor(url)).crawlDelay ?? 0) * 1000));
    // 1) 목록 페이지에서 링크 모으기
    const links = new Set<string>();
    for (const start of s.catalogUrls) {
      let page: string | null = start;
      for (let n = 0; page && n < maxPages; n++) {
        if (!(await allowed(page))) { errors.push(`robots.txt 금지: ${page}`); break; }
        try {
          const html = await get(page);
          extractProductLinks(html, page).forEach((l) => links.add(l));
          page = nextPageUrl(html, page);
        } catch (e) {
          errors.push(`${page}: ${(e as Error).message}`);
          break;
        }
        await wait(start);
      }
    }
    // 2) 읽을 상품: 연결·제외한 것과 하루 안에 읽은 것은 건너뜀
    const known = await prisma.catalogItem.findMany({ where: { sellerId: s.id, url: { in: [...links] } }, select: { url: true, status: true, lastSeenAt: true } });
    const skip = new Set(known.filter((k) => k.status !== "new" || Date.now() - k.lastSeenAt.getTime() < 86400e3).map((k) => k.url));
    const todo = [...links].filter((l) => !skip.has(l)).slice(0, maxProducts);
    let added = 0, refreshed = 0, notProduct = 0;
    for (const url of todo) {
      if (!(await allowed(url))) { errors.push(`robots.txt 금지: ${url}`); continue; }
      try {
        const p = parseJsonLdProduct(await get(url));
        if (!p || p.price === null) { notProduct++; continue; }
        const best = matchWines(`${p.brand ?? ""} ${p.name}`, wines, 1)[0];
        const data = {
          name: p.name.slice(0, 300), brand: p.brand?.slice(0, 120) ?? null, price: p.price, currency: p.currency, inStock: p.inStock,
          bottleMl: p.bottleMl, vintage: p.vintage, gtin: p.gtin, suggestId: best?.wine.id ?? null, suggestScore: best?.score ?? null, lastSeenAt: new Date(),
        };
        const prev = await prisma.catalogItem.findUnique({ where: { sellerId_url: { sellerId: s.id, url } }, select: { id: true } });
        await prisma.catalogItem.upsert({ where: { sellerId_url: { sellerId: s.id, url } }, update: data, create: { sellerId: s.id, url, ...data } });
        if (prev) refreshed++; else added++;
      } catch (e) {
        errors.push(`${url}: ${(e as Error).message}`);
      }
      await wait(url);
    }
    const status = errors.length === 0 ? "ok" : added + refreshed > 0 ? "partial" : "failed";
    const message = `링크 ${links.size}개 · 새 상품 ${added} · 갱신 ${refreshed} · 상품 아님 ${notProduct}${errors.length ? ` · 오류 ${errors.length}건: ${errors.slice(0, 3).join(" / ")}` : ""}`;
    await prisma.crawlRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status, updated: added + refreshed, failed: errors.length, message: message.slice(0, 1000) } });
    lines.push(`${s.name}: ${message}`);
  }
  return lines.join(" / ");
}

/** 대기열 상품을 기존 와인에 연결 → 판매 정보(Offer) 생성·갱신 */
export async function linkCatalogItem(itemId: string, wineId: string) {
  const item = await prisma.catalogItem.findUnique({ where: { id: itemId }, include: { seller: true } });
  if (!item) throw new Error("상품을 찾을 수 없습니다");
  if (!item.price || !item.currency) throw new Error("가격을 읽지 못한 상품은 연결할 수 없습니다");
  if (item.currency !== item.seller.currency) throw new Error(`통화가 다릅니다: 상품 ${item.currency}, 판매처 ${item.seller.currency}`);
  if (!(await prisma.wine.findUnique({ where: { id: wineId }, select: { id: true } }))) throw new Error("와인을 찾을 수 없습니다");
  await prisma.$transaction([
    prisma.offer.upsert({
      where: { wineId_sellerId_bottleMl: { wineId, sellerId: item.sellerId, bottleMl: item.bottleMl } },
      update: { url: item.url, price: item.price, inStock: item.inStock, checkedAt: new Date(), lastError: null },
      create: { wineId, sellerId: item.sellerId, bottleMl: item.bottleMl, url: item.url, price: item.price, inStock: item.inStock },
    }),
    prisma.catalogItem.update({ where: { id: itemId }, data: { status: "linked", wineId } }),
  ]);
}

export async function lwinSearch(q: string, limit = 8) {
  const tokens = searchTokens(q);
  if (!tokens.length) return [];
  return prisma.lwinRef.findMany({
    where: { AND: tokens.map((t) => ({ displayName: { contains: t, mode: "insensitive" as const } })), status: { not: "Deleted" } },
    take: limit,
    orderBy: { displayName: "asc" },
  });
}

/** LWIN 목록 저장: 2,000줄씩 한 번에 넣고, 이미 있으면 값을 갱신합니다. */
export async function upsertLwin(rows: LwinRow[]) {
  let n = 0;
  for (let i = 0; i < rows.length; i += 2000) {
    const chunk = rows.slice(i, i + 2000);
    const values = Prisma.join(chunk.map((r) => Prisma.sql`(${r.lwin}, ${r.displayName}, ${r.producer}, ${r.wine}, ${r.country}, ${r.region}, ${r.subRegion}, ${r.colour}, ${r.type}, ${r.status}, now())`));
    await prisma.$executeRaw`
      INSERT INTO "LwinRef" (lwin, "displayName", producer, wine, country, region, "subRegion", colour, type, status, "updatedAt")
      VALUES ${values}
      ON CONFLICT (lwin) DO UPDATE SET "displayName" = EXCLUDED."displayName", producer = EXCLUDED.producer, wine = EXCLUDED.wine,
        country = EXCLUDED.country, region = EXCLUDED.region, "subRegion" = EXCLUDED."subRegion", colour = EXCLUDED.colour,
        type = EXCLUDED.type, status = EXCLUDED.status, "updatedAt" = now()`;
    n += chunk.length;
  }
  return n;
}

/** 와인 CSV 반영: LWIN+빈티지, 없으면 원어명+생산자+빈티지가 같은 와인을 갱신하고 나머지는 새로 만듭니다. */
export async function applyWineRows(rows: { line: number; wine: WineInput }[], apply: boolean) {
  let created = 0, updated = 0;
  const errors: string[] = [];
  for (const { line, wine } of rows) {
    try {
      const existing = await prisma.wine.findFirst({
        where: wine.lwin
          ? { lwin: wine.lwin, vintage: wine.vintage }
          : { name: { equals: wine.name, mode: "insensitive" }, producer: { equals: wine.producer, mode: "insensitive" }, vintage: wine.vintage },
        select: { id: true },
      });
      if (existing) {
        updated++;
        if (apply) await prisma.wine.update({ where: { id: existing.id }, data: wine });
      } else {
        created++;
        if (apply) await prisma.wine.create({ data: wine });
      }
    } catch (e) {
      errors.push(`${line}행: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  return { created, updated, errors };
}
