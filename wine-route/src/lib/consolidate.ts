/**
 * 합배송 견적: 한 나라의 여러 판매처에서 산 와인을 현지 배송대행지에서 한 상자로 묶어 한국으로 보낼 때의 도착가.
 * 엔진(engine.ts)의 배송대행지 경로와 같은 운임 규칙을 쓰고, 세금은 한 번의 수입신고로 합산합니다.
 * DB와 분리된 순수 함수입니다.
 */
import { bottleUnits, type ForwarderIn, type Fx, type OfferIn } from "./engine";
import { calcTax, type TaxConfig } from "./tax";

export type ConsolidationForwarder = ForwarderIn & { consolidateFee: number; handlingPerPackage: number; maxBottles: number };

export type ConsItemIn = { offer: OfferIn; qty: number; wine: { id: string; nameKo: string; country: string } };

export type ConsItem = ConsItemIn & {
  units: number;
  goodsKrw: number;
  shipKrw: number; // 이 와인 몫으로 나눈 운임 (750ml 환산 병 수 비율)
  fta: boolean;
  duty: number;
  liquor: number;
  edu: number;
  vat: number;
  total: number; // 물품가 + 운임 몫 + 세금 몫 (소액 면제 반영 전)
};

export type Excluded = { offerId: string; name: string; reason: string };

export type Consolidation = {
  items: ConsItem[];
  excluded: Excluded[];
  packages: number; // 배대지에 들어오는 소포 수 (판매처 수)
  boxes: number; // 한국으로 보내는 상자 수
  bottles: number;
  units: number;
  sellerLegKrw: number; // 판매처 → 배대지 운임 합
  forwarderKrw: number; // 배대지 → 한국 운임 + 처리비 + 합포장비
  feeLines: { label: string; krw: number }[];
  cif: number;
  taxSum: number;
  waived: boolean;
  taxPay: number;
  total: number;
  perBottle: number;
  daysMin: number;
  daysMax: number;
};

type Input = { items: ConsItemIn[]; forwarder: ConsolidationForwarder; fx: Fx; tax: TaxConfig };

export function consolidate({ items, forwarder: f, fx, tax }: Input): Consolidation | { error: string; excluded: Excluded[] } {
  const excluded: Excluded[] = [];
  if (!f.active || !f.acceptsAlcohol) return { error: `${f.name}은(는) 주류를 접수하지 않습니다`, excluded };
  const usd = fx["USD"], fwRate = fx[f.currency];
  if (!usd || !fwRate) return { error: "환율 정보가 없습니다", excluded };

  const picked = items.filter((it) => it.qty > 0);
  const ok: ConsItemIn[] = [];
  for (const it of picked) {
    const s = it.offer.seller;
    const name = `${it.wine.nameKo} · ${s.name}`;
    if (s.country !== f.country || s.channel === "HK_RETAILER") excluded.push({ offerId: it.offer.id, name, reason: `${f.country} 판매처가 아니라 이 배송대행지로 묶을 수 없습니다` });
    else if (!s.active || !it.offer.inStock) excluded.push({ offerId: it.offer.id, name, reason: "지금 살 수 없습니다(품절 또는 판매 중단)" });
    else if (!fx[s.currency]) excluded.push({ offerId: it.offer.id, name, reason: `${s.currency} 환율 정보가 없습니다` });
    else ok.push(it);
  }
  // 최소 주문 병수는 판매처별 합계로 봅니다.
  const bySeller = new Map<string, ConsItemIn[]>();
  for (const it of ok) bySeller.set(it.offer.seller.id, [...(bySeller.get(it.offer.seller.id) ?? []), it]);
  for (const [sid, list] of [...bySeller]) {
    const s = list[0].offer.seller;
    const n = list.reduce((a, it) => a + it.qty, 0);
    if ((s.minBottles ?? 1) > n) {
      bySeller.delete(sid);
      for (const it of list) excluded.push({ offerId: it.offer.id, name: `${it.wine.nameKo} · ${s.name}`, reason: `${s.name}은(는) ${s.minBottles}병 이상 주문해야 합니다 (지금 ${n}병)` });
    }
  }
  const kept = [...bySeller.values()].flat();
  if (!kept.length) return { error: "묶을 수 있는 와인이 없습니다", excluded };

  // 운임: 판매처 → 배대지 (엔진과 같은 규칙), 배대지 → 한국
  let sellerLegKrw = 0;
  for (const list of bySeller.values()) {
    const s = list[0].offer.seller;
    const u = list.reduce((a, it) => a + bottleUnits(it.qty, it.offer.bottleMl), 0);
    const leg = s.channel === "LOCAL_SHOP" ? s.shipBase + s.shipPerBottle * u : Math.min(s.shipBase, 15);
    sellerLegKrw += leg * fx[s.currency];
  }
  const units = kept.reduce((a, it) => a + bottleUnits(it.qty, it.offer.bottleMl), 0);
  const bottles = kept.reduce((a, it) => a + it.qty, 0);
  const packages = bySeller.size;
  const boxes = Math.max(1, Math.ceil(units / Math.max(1, f.maxBottles)));
  const feeLines = [
    { label: `국제 운임 기본료 × 상자 ${boxes}`, krw: f.shipBase * boxes * fwRate },
    { label: `병당 운임 × ${units}병(750ml 환산)`, krw: f.shipPerBottle * units * fwRate },
    { label: `입고 처리비 × 소포 ${packages}`, krw: f.handlingPerPackage * packages * fwRate },
    ...(packages > 1 ? [{ label: `합포장 수수료 × 상자 ${boxes}`, krw: f.consolidateFee * boxes * fwRate }] : []),
  ].filter((l) => l.krw > 0);
  const forwarderKrw = feeLines.reduce((a, l) => a + l.krw, 0);
  const shipKrw = sellerLegKrw + forwarderKrw;

  // 세금: 한 번에 들어오는 물품은 합산과세. 2병 이상이면 1병 면세구간이 아닙니다.
  // 원산지 국가에서 산 FTA 와인만 관세 0%, 나머지는 관세가 붙습니다. 소액 징수 면제는 합계로 판단합니다.
  const noWaive = { ...tax, minCollect: 0 };
  const out: ConsItem[] = kept.map((it) => {
    const rate = fx[it.offer.seller.currency];
    const u = bottleUnits(it.qty, it.offer.bottleMl);
    const goodsKrw = it.offer.price * it.qty * rate;
    const share = shipKrw * (u / units);
    const fta = tax.ftaCountries.includes(it.wine.country) && it.offer.seller.country === it.wine.country;
    const t = calcTax({ cif: goodsKrw + share, goodsUsdPerBottle: (it.offer.price * rate) / usd, qty: bottles, bottleMl: it.offer.bottleMl, fta }, noWaive);
    return { ...it, units: u, goodsKrw, shipKrw: share, fta, duty: t.duty, liquor: t.liquor, edu: t.edu, vat: t.vat, total: goodsKrw + share + t.sum };
  });
  const cif = out.reduce((a, it) => a + it.goodsKrw + it.shipKrw, 0);
  const taxSum = out.reduce((a, it) => a + it.duty + it.liquor + it.edu + it.vat, 0);
  const waived = taxSum < tax.minCollect;
  const taxPay = waived ? 0 : taxSum;
  const total = cif + taxPay;
  return {
    items: out, excluded, packages, boxes, bottles, units, sellerLegKrw, forwarderKrw, feeLines,
    cif, taxSum, waived, taxPay, total, perBottle: total / bottles, daysMin: f.daysMin, daysMax: f.daysMax,
  };
}

export const isConsolidation = (r: ReturnType<typeof consolidate>): r is Consolidation => !("error" in r);
