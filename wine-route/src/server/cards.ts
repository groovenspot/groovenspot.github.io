import type { User } from "@prisma/client";
import { prisma } from "./db";
import { compareWine } from "./compare";
import { ensureRefCode } from "./referral";
import { measuredSaving } from "@/lib/community";
import { ROUTE_LABEL, type ChannelKey } from "@/lib/engine";
import type { CardData } from "@/lib/share";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

async function shareLink(user: User | null, to: string) {
  if (!user) return `${appUrl()}${to}`;
  const code = await ensureRefCode(user.id);
  return `${appUrl()}/r/${code}?to=${encodeURIComponent(to)}`;
}

const sub = (w: { region: string; country: string; vintage: number | null }) => `${w.country} · ${w.region} · ${w.vintage ?? "NV"}`;

/** 1. 경로 비교 직후: 계산한 도착가 카드 */
export async function wineCard(user: User | null, wineId: string, qty: number, ml: number): Promise<CardData | null> {
  const d = await compareWine(wineId, qty, ml);
  if (!d?.result.best) return null;
  const b = d.result.best;
  return {
    kind: "wine",
    eyebrow: "직구 도착가 계산",
    title: d.wine.nameKo,
    subtitle: sub(d.wine),
    krLabel: "국내 소매 추정가",
    krValue: d.result.krPerBottle,
    myLabel: `직구 도착가 (세금·운임 포함${qty > 1 ? `, ${qty}병 기준 병당` : ""})`,
    myValue: Math.round(b.perBottle),
    saving: d.result.savingPerBottle !== null ? Math.round(d.result.savingPerBottle) : null,
    routeLine: `최적경로 ${ROUTE_LABEL[b.channel]} · ${b.daysMin}~${b.daysMax}일`,
    link: await shareLink(user, `/wines/${wineId}?qty=${qty}&ml=${ml}`),
  };
}

/** 2. 후기 작성 직후: 실측 금액으로 '나는 이만큼 아꼈다' */
export async function reviewCard(user: User, reviewId: string): Promise<CardData | null> {
  const r = await prisma.directReview.findFirst({ where: { id: reviewId, userId: user.id }, include: { wine: true, order: true } });
  if (!r) return null;
  const paid = r.cardPaidKrw ?? (r.order ? r.order.estTotal - r.order.estTax : null);
  const actual = paid !== null ? Math.round((paid + r.taxPaid) / r.qty) : null;
  const saving = paid !== null ? measuredSaving({ cardPaidKrw: paid, taxPaid: r.taxPaid, qty: r.qty, bottleMl: r.bottleMl }, r.wine.krPrice) : null;
  return {
    kind: "review",
    eyebrow: "실제로 받아 본 직구 도착가",
    title: r.wine.nameKo,
    subtitle: sub(r.wine),
    krLabel: "국내 소매 추정가",
    krValue: r.wine.krPrice ? Math.round(r.wine.krPrice * (r.bottleMl / 750)) : null,
    myLabel: "내가 낸 병당 금액 (세금 포함)",
    myValue: actual,
    saving: saving !== null ? Math.round(saving) : null,
    routeLine: `${ROUTE_LABEL[r.route as ChannelKey] ?? r.route} · 받기까지 ${r.shippingDays}일`,
    link: await shareLink(user, `/wines/${r.wineId}`),
  };
}

/** 3. 월말: 이번 달 직구로 아낀 금액 (내 직구 후기의 실측 기준) */
export async function monthCard(user: User, monthStart: Date, monthEnd: Date, label: string): Promise<CardData> {
  const rs = await prisma.directReview.findMany({ where: { userId: user.id, status: "PUBLISHED", createdAt: { gte: monthStart, lt: monthEnd } }, include: { wine: true, order: true } });
  let kr = 0, mine = 0, bottles = 0;
  for (const r of rs) {
    const paid = r.cardPaidKrw ?? (r.order ? r.order.estTotal - r.order.estTax : null);
    if (paid === null || !r.wine.krPrice) continue;
    kr += r.wine.krPrice * (r.bottleMl / 750) * r.qty;
    mine += paid + r.taxPaid;
    bottles += r.qty;
  }
  return {
    kind: "month",
    eyebrow: `${label.replace("-", "년 ")}월 직구 결산`,
    title: bottles ? `와인 ${bottles}병을 직구했어요` : "이번 달 직구 기록이 없어요",
    subtitle: `직구 후기 ${rs.length}건 기준`,
    krLabel: "국내 소매 추정가 합계",
    krValue: bottles ? Math.round(kr) : null,
    myLabel: "실제로 낸 금액 합계 (세금 포함)",
    myValue: bottles ? Math.round(mine) : null,
    saving: bottles ? Math.round(kr - mine) : null,
    routeLine: "셀러도어 경로 비교로 산 와인",
    link: await shareLink(user, "/"),
  };
}
