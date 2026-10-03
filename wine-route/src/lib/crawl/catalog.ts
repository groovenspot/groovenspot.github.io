/**
 * 판매처 카탈로그 수집용 순수 함수: robots.txt 해석, 목록 페이지에서 상품 링크 찾기, 상품 페이지 JSON-LD 읽기.
 * 수집은 판매처의 허락(제휴 계약·서면 동의)이 확인된 곳만, robots.txt 를 지키며, 요청 간격을 두고 합니다.
 */
import { isType, walk } from "./jsonld";
import { parseVintage } from "../match";

export const CATALOG_UA = "CellarDoorBot/0.1 (+price comparison; contact via site)";
const UA_TOKEN = "cellardoorbot";

/* ---------- robots.txt ---------- */
export type Robots = { allow: string[]; disallow: string[]; crawlDelay: number | null };

/** 우리 봇 이름 그룹이 있으면 그것을, 없으면 * 그룹을 씁니다. */
export function parseRobots(txt: string): Robots {
  const groups: { agents: string[]; allow: string[]; disallow: string[]; delay: number | null }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) { cur = { agents: [], allow: [], disallow: [], delay: null }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === "allow" && val) cur.allow.push(val);
    else if (key === "disallow" && val) cur.disallow.push(val);
    else if (key === "crawl-delay" && Number(val) > 0) cur.delay = Number(val);
  }
  const g = groups.find((x) => x.agents.some((a) => a !== "*" && UA_TOKEN.includes(a))) ?? groups.find((x) => x.agents.includes("*"));
  return { allow: g?.allow ?? [], disallow: g?.disallow ?? [], crawlDelay: g?.delay ?? null };
}

const ruleRe = (rule: string) => new RegExp("^" + rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));

/** 가장 긴(구체적인) 규칙이 이깁니다. 같은 길이면 Allow. */
export function robotsAllows(r: Robots, pathWithQuery: string) {
  let best: { len: number; allow: boolean } | null = null;
  for (const [list, allow] of [[r.allow, true], [r.disallow, false]] as const) {
    for (const rule of list) {
      if (ruleRe(rule).test(pathWithQuery) && (!best || rule.length > best.len || (rule.length === best.len && allow))) best = { len: rule.length, allow };
    }
  }
  return best ? best.allow : true;
}

/* ---------- 목록 페이지 ---------- */
const SKIP = /\/(cart|basket|checkout|account|login|register|wishlist|search|blog|news|pages\/|policies|contact|about)|^mailto:|^tel:|^javascript:|\.(jpg|jpeg|png|gif|webp|svg|pdf|css|js)(\?|$)/i;

function ldBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { out.push(JSON.parse(m[1].trim())); } catch { /* 깨진 블록은 건너뜀 */ }
  }
  return out;
}

/**
 * 목록 페이지에서 상품 후보 링크를 찾습니다. JSON-LD ItemList 가 있으면 그것을, 없으면 같은 사이트의 링크 중
 * 장바구니·계정 등 명백히 상품이 아닌 것을 뺀 링크를 돌려줍니다(상품 여부는 상품 페이지 JSON-LD 로 최종 판정).
 */
export function extractProductLinks(html: string, pageUrl: string, max = 500): string[] {
  const base = new URL(pageUrl);
  const found = new Set<string>();
  const add = (href: unknown) => {
    if (typeof href !== "string" || !href) return;
    try {
      const u = new URL(href, base);
      if (u.host !== base.host || !/^https?:$/.test(u.protocol)) return;
      u.hash = "";
      if (SKIP.test(u.pathname + u.search) || u.href === base.href) return;
      found.add(u.href);
    } catch { /* 잘못된 주소 */ }
  };
  let fromList = false;
  for (const data of ldBlocks(html)) {
    for (const o of walk(data)) {
      if (!isType(o, "ItemList")) continue;
      for (const el of (Array.isArray(o.itemListElement) ? o.itemListElement : []) as Record<string, unknown>[]) {
        const item = (el?.item ?? {}) as Record<string, unknown>;
        add(el?.url ?? item.url ?? item["@id"]);
        fromList = true;
      }
    }
  }
  if (!fromList) for (const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"'#][^"']*)["']/gi)) add(m[1].replace(/&amp;/g, "&"));
  return [...found].slice(0, max);
}

/** 다음 페이지: <link rel="next"> 또는 <a rel="next"> */
export function nextPageUrl(html: string, pageUrl: string): string | null {
  const m = html.match(/<(?:link|a)\b[^>]*\brel=["']next["'][^>]*\bhref=["']([^"']+)["']/i) ?? html.match(/<(?:link|a)\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']next["']/i);
  if (!m) return null;
  try { return new URL(m[1].replace(/&amp;/g, "&"), pageUrl).href; } catch { return null; }
}

/* ---------- 상품 페이지 ---------- */
export type ParsedProduct = { name: string; brand: string | null; price: number | null; currency: string | null; inStock: boolean; gtin: string | null; vintage: number | null; bottleMl: number };

/** 병 용량: 이름에 표기가 있으면 그것, 없으면 750ml */
export function guessBottleMl(name: string): number {
  const t = name.toLowerCase();
  const ml = t.match(/(\d{3,4})\s*ml\b/);
  if (ml) return Number(ml[1]);
  const cl = t.match(/(\d{2,3}(?:[.,]\d)?)\s*cl\b/);
  if (cl) return Math.round(Number(cl[1].replace(",", ".")) * 10);
  const l = t.match(/(\d(?:[.,]\d{1,2})?)\s*(?:l|lt|liter|litre)\b/);
  if (l) return Math.round(Number(l[1].replace(",", ".")) * 1000);
  if (/\bmagnum\b/.test(t)) return 1500;
  if (/\b(half|demi|halbe)\b/.test(t)) return 375;
  return 750;
}

const text = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** schema.org Product 의 이름·브랜드·가격·재고. 와인 상품 페이지가 아니면 null */
export function parseJsonLdProduct(html: string): ParsedProduct | null {
  for (const data of ldBlocks(html)) {
    for (const o of walk(data)) {
      if (!isType(o, "Product")) continue;
      const name = text(o.name);
      if (!name) continue;
      const b = o.brand as unknown;
      const brand = text(typeof b === "object" && b ? (b as Record<string, unknown>).name : b) || null;
      let price: number | null = null, currency: string | null = null, inStock = true;
      for (const of of walk(o.offers ?? [])) {
        if (!isType(of, "Offer") && !isType(of, "AggregateOffer")) continue;
        const spec = (of.priceSpecification ?? {}) as Record<string, unknown>;
        const p = Number(of.price ?? of.lowPrice ?? spec.price);
        const c = String(of.priceCurrency ?? spec.priceCurrency ?? "").toUpperCase();
        if (Number.isFinite(p) && p > 0 && /^[A-Z]{3}$/.test(c)) {
          price = p; currency = c;
          inStock = !/OutOfStock|SoldOut|Discontinued/i.test(String(of.availability ?? "InStock"));
          break;
        }
      }
      const gtin = text(o.gtin13 ?? o.gtin ?? o.gtin14 ?? o.gtin12 ?? o.gtin8) || null;
      return { name, brand, price, currency, inStock, gtin, vintage: parseVintage(name), bottleMl: guessBottleMl(name) };
    }
  }
  return null;
}

/** 와인 이름에서 빈티지·용량 표기를 뗍니다 (새 와인 등록 때 원어명 초안) */
export function cleanWineName(name: string) {
  return name
    .replace(/\b(19[5-9]\d|20[0-4]\d)\b/g, " ")
    .replace(/\b\d{2,4}(?:[.,]\d)?\s*(ml|cl|l|lt)\b/gi, " ")
    .replace(/\b(magnum|half bottle|bouteille)\b/gi, " ")
    .replace(/\s*[-–|·,]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
