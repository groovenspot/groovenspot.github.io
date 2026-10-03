/**
 * 최적경로 엔진: 환율 → 경로별 물품가·운임 → 세금 규칙 → 병당 도착가 → 국내가 대비 절감액.
 * DB와 분리된 순수 함수입니다.
 */
import { calcTax, type TaxConfig, type TaxResult } from "./tax";

export type ChannelKey = "WINERY_DIRECT" | "EXPORT_RETAILER" | "FORWARDER" | "HK_RETAILER";

export const ROUTE_LABEL: Record<ChannelKey, string> = {
  WINERY_DIRECT: "와이너리 직배송",
  EXPORT_RETAILER: "현지 수출 리테일러",
  FORWARDER: "현지 배송대행지",
  HK_RETAILER: "홍콩 경유 리테일러",
};
export const ROUTE_ORDER: ChannelKey[] = ["WINERY_DIRECT", "EXPORT_RETAILER", "FORWARDER", "HK_RETAILER"];

export type SellerIn = {
  id: string;
  name: string;
  country: string;
  channel: "WINERY_DIRECT" | "EXPORT_RETAILER" | "LOCAL_SHOP" | "HK_RETAILER";
  shipsToKorea: boolean;
  currency: string;
  shipBase: number;
  shipPerBottle: number;
  daysMin: number;
  daysMax: number;
  insured: boolean;
  active: boolean;
  minBottles?: number; // 최소 주문 병수 (기본 1)
  cooAvailable?: boolean; // 원산지증명(신고) 발급 가능
};

export type OfferIn = {
  id: string;
  price: number;
  bottleMl: number;
  inStock: boolean;
  url: string;
  checkedAt: Date;
  seller: SellerIn;
};

export type ForwarderIn = {
  id: string;
  name: string;
  country: string;
  acceptsAlcohol: boolean;
  currency: string;
  shipBase: number;
  shipPerBottle: number;
  daysMin: number;
  daysMax: number;
  active: boolean;
};

export type Fx = Record<string, number>; // 통화 → 1단위당 원

export type Candidate = {
  channel: ChannelKey;
  offerId: string;
  sellerId: string;
  sellerName: string;
  sellerCountry: string;
  currency: string;
  unitPrice: number; // 병당 물품가 (판매처 통화)
  goodsKrw: number;
  shipKrw: number;
  tax: TaxResult;
  total: number; // 주문 전체 도착가 (원)
  perBottle: number; // 병당 도착가 (원)
  daysMin: number;
  daysMax: number;
  insured: boolean;
  checkedAt: Date;
  forwarder?: { id: string; name: string };
};

export type RouteResult = {
  channel: ChannelKey;
  label: string;
  available: boolean;
  reason?: string;
  best?: Candidate;
  candidates: Candidate[];
};

export type Comparison = {
  qty: number;
  bottleMl: number;
  routes: RouteResult[];
  best?: Candidate;
  krPerBottle: number | null; // 같은 용량 기준 국내가
  savingPerBottle: number | null;
  warnings: string[];
  ftaOrigin: boolean;
};

export type EngineInput = {
  wine: { country: string; krPrice: number | null };
  qty: number;
  bottleMl: number;
  offers: OfferIn[];
  forwarders: ForwarderIn[];
  fx: Fx;
  tax: TaxConfig;
};

/** 750ml 환산 병 수 (운임 계산용). 하프 보틀도 최소 0.5병으로 칩니다. */
export function bottleUnits(qty: number, bottleMl: number) {
  return qty * Math.max(0.5, bottleMl / 750);
}

export function compare(input: EngineInput): Comparison {
  const { wine, qty, bottleMl, fx, tax } = input;
  const ftaOrigin = tax.ftaCountries.includes(wine.country);
  const usd = fx["USD"];
  const units = bottleUnits(qty, bottleMl);
  const offers = input.offers.filter((o) => o.bottleMl === bottleMl && o.inStock && o.seller.active);

  const build = (
    channel: ChannelKey,
    o: OfferIn,
    ship: { currency: string; krw?: number; base: number; per: number }[],
    days: [number, number],
    forwarder?: { id: string; name: string },
  ): Candidate | null => {
    const rate = fx[o.seller.currency];
    if (!rate || !usd) return null;
    let shipKrw = 0;
    for (const s of ship) {
      const r = fx[s.currency];
      if (!r) return null;
      shipKrw += (s.base + s.per * units) * r;
    }
    const goodsKrw = o.price * qty * rate;
    const fta = ftaOrigin && o.seller.country === wine.country && channel !== "HK_RETAILER";
    const t = calcTax({ cif: goodsKrw + shipKrw, goodsUsdPerBottle: (o.price * rate) / usd, qty, bottleMl, fta }, tax);
    const total = t.cif + t.pay;
    return {
      channel,
      offerId: o.id,
      sellerId: o.seller.id,
      sellerName: o.seller.name,
      sellerCountry: o.seller.country,
      currency: o.seller.currency,
      unitPrice: o.price,
      goodsKrw,
      shipKrw,
      tax: t,
      total,
      perBottle: total / qty,
      daysMin: days[0],
      daysMax: days[1],
      insured: o.seller.insured,
      checkedAt: o.checkedAt,
      forwarder,
    };
  };

  const shipOf = (s: SellerIn) => [{ currency: s.currency, base: s.shipBase, per: s.shipPerBottle }];
  const routes: RouteResult[] = [];

  // 1·2·4. 판매처가 한국으로 직접 보내는 경로
  for (const [channel, sellerChannel, noData, noShip] of [
    ["WINERY_DIRECT", "WINERY_DIRECT", "해외로 발송하는 와이너리 판매 정보가 없습니다", "이 와이너리는 해외로 발송하지 않습니다"],
    ["EXPORT_RETAILER", "EXPORT_RETAILER", "재고가 있는 수출 리테일러가 없습니다", "리테일러가 한국으로 발송하지 않습니다"],
    ["HK_RETAILER", "HK_RETAILER", "홍콩 리테일러 재고가 없습니다", "홍콩 리테일러가 한국으로 발송하지 않습니다"],
  ] as const) {
    const pool = offers.filter((o) => o.seller.channel === sellerChannel);
    const toKorea = pool.filter((o) => o.seller.shipsToKorea);
    const shippable = toKorea.filter((o) => (o.seller.minBottles ?? 1) <= qty);
    const minNeeded = toKorea.length && !shippable.length ? Math.min(...toKorea.map((o) => o.seller.minBottles ?? 1)) : null;
    const cands = shippable
      .map((o) => build(channel, o, shipOf(o.seller), [o.seller.daysMin, o.seller.daysMax]))
      .filter((c): c is Candidate => !!c)
      .sort((a, b) => a.perBottle - b.perBottle);
    routes.push({
      channel,
      label: ROUTE_LABEL[channel],
      available: cands.length > 0,
      reason: cands.length
        ? undefined
        : minNeeded
          ? `${minNeeded}병 이상 주문해야 살 수 있습니다`
          : pool.length && !toKorea.length
            ? noShip
            : shippable.length
              ? "환율 정보가 없습니다"
              : noData,
      best: cands[0],
      candidates: cands,
    });
  }

  // 3. 현지 배송대행지: 원산지 국가 판매처에서 사서 현지 배대지를 거쳐 한국으로
  {
    const fws = input.forwarders.filter((f) => f.active && f.country === wine.country);
    const okFws = fws.filter((f) => f.acceptsAlcohol);
    const local = offers.filter((o) => o.seller.country === wine.country && o.seller.channel !== "HK_RETAILER" && (o.seller.minBottles ?? 1) <= qty);
    const cands: Candidate[] = [];
    for (const o of local) {
      for (const f of okFws) {
        // 내수 판매처는 배대지까지 운임만, 해외 발송 판매처도 배대지로 받으면 국내 운임 수준이라 shipBase를 그대로 씁니다.
        const sellerLeg = o.seller.channel === "LOCAL_SHOP" ? shipOf(o.seller) : [{ currency: o.seller.currency, base: Math.min(o.seller.shipBase, 15), per: 0 }];
        const c = build(
          "FORWARDER",
          o,
          [...sellerLeg, { currency: f.currency, base: f.shipBase, per: f.shipPerBottle }],
          [f.daysMin, f.daysMax],
          { id: f.id, name: f.name },
        );
        if (c) cands.push(c);
      }
    }
    cands.sort((a, b) => a.perBottle - b.perBottle);
    let reason: string | undefined;
    if (!cands.length) {
      if (!fws.length) reason = `${wine.country} 배송대행지 정보가 없습니다`;
      else if (!okFws.length) reason = `${wine.country} 배송대행지는 주류를 접수하지 않습니다`;
      else if (!local.length) reason = "현지 판매처 가격 정보가 없습니다";
      else reason = "환율 정보가 없습니다";
    }
    routes.splice(2, 0, {
      channel: "FORWARDER",
      label: ROUTE_LABEL.FORWARDER,
      available: cands.length > 0,
      reason,
      best: cands[0],
      candidates: cands,
    });
  }

  const best = routes
    .filter((r) => r.best)
    .map((r) => r.best!)
    .sort((a, b) => a.perBottle - b.perBottle)[0];

  const krPerBottle = wine.krPrice ? Math.round(wine.krPrice * (bottleMl / 750)) : null;
  const savingPerBottle = best && krPerBottle ? krPerBottle - best.perBottle : null;

  const warnings: string[] = [];
  if (qty >= tax.bulkWarnQty)
    warnings.push("수량이 많으면 재판매용으로 보아 일반 수입신고 대상이 될 수 있습니다. 자가사용 범위인지 확인하세요.");
  if (qty === 2) warnings.push("2병부터는 1병 면세구간을 벗어나 부가세가 붙습니다. 1병 도착가와 비교해 보세요.");
  if (bottleMl > tax.exemptMaxMl && qty === 1) warnings.push("1L를 넘는 병은 1병이어도 면세구간에 해당하지 않습니다.");
  // FTA 0%는 원산지 증빙이 필요합니다. 과세가격이 기준(기본 1,000달러)을 넘는데 판매처가 원산지증명을 못 해 주면 관세가 붙을 수 있습니다.
  if (best?.tax.fta && !best.tax.exempt && usd) {
    const seller = offers.find((o) => o.id === best.offerId)?.seller;
    if (seller && !seller.cooAvailable && best.tax.cif / usd > tax.cooExemptUsd)
      warnings.push(`과세가격이 ${tax.cooExemptUsd.toLocaleString("en-US")}달러를 넘어 FTA 관세 0%에 원산지증명(또는 원산지 신고 문구가 있는 인보이스)이 필요할 수 있습니다. ${seller.name}의 발급 가능 여부를 확인하세요.`);
  }
  if (!ftaOrigin) warnings.push(`${wine.country}는 한국과 와인 FTA 관세 혜택이 없어 어느 경로든 관세 ${Math.round(tax.dutyRate * 100)}%가 붙습니다.`);

  return { qty, bottleMl, routes, best, krPerBottle, savingPerBottle, warnings, ftaOrigin };
}
