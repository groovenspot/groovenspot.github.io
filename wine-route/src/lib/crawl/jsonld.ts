/**
 * 상품 페이지의 schema.org JSON-LD에서 가격·재고를 읽습니다.
 * 셀러 API가 없을 때 쓰는 기본 크롤러입니다.
 */
export type ParsedOffer = { price: number; currency: string; inStock: boolean };

function* walk(node: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(node)) for (const n of node) yield* walk(n);
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    yield o;
    for (const k of ["@graph", "offers", "mainEntity", "itemOffered"]) if (k in o) yield* walk(o[k]);
  }
}

const isType = (o: Record<string, unknown>, t: string) => {
  const v = o["@type"];
  return v === t || (Array.isArray(v) && v.includes(t));
};

export function parseJsonLdOffer(html: string): ParsedOffer | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const raw of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(raw.trim());
    } catch {
      continue;
    }
    for (const o of walk(data)) {
      if (!isType(o, "Offer") && !isType(o, "AggregateOffer")) continue;
      const spec = (o.priceSpecification ?? {}) as Record<string, unknown>;
      const price = Number(o.price ?? o.lowPrice ?? spec.price);
      const currency = String(o.priceCurrency ?? spec.priceCurrency ?? "").toUpperCase();
      if (!Number.isFinite(price) || price <= 0 || !/^[A-Z]{3}$/.test(currency)) continue;
      const avail = String(o.availability ?? "InStock");
      return { price, currency, inStock: !/OutOfStock|SoldOut|Discontinued/i.test(avail) };
    }
  }
  return null;
}
