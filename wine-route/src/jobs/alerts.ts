import { prisma } from "@/server/db";
import { compareLoaded, loadContext } from "@/server/compare";
import { notify } from "@/server/notify";
import { isPremium } from "@/server/points";
import { isDrop, isFxLow } from "@/lib/alerts";
import { won } from "@/lib/format";
import { ROUTE_LABEL, type ChannelKey } from "@/lib/engine";

const kstDay = (d = new Date()) => new Date(new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10));

/**
 * 찜 알림 (가격 수집·환율 갱신 뒤 실행)
 * - 목표가 도달: 무료·프리미엄 모두 즉시 (무료는 찜 3개까지)
 * - 직전 대비 5% 이상 하락: 프리미엄 즉시, 무료는 주간 묶음
 * - 재입고 (살 수 있는 경로가 없다가 생김): 프리미엄만
 */
export async function runAlertsJob() {
  const ctx = await loadContext();
  const watches = await prisma.priceAlert.findMany({
    where: { active: true },
    include: { user: true, wine: { include: { offers: { include: { seller: true } } } } },
  });
  const today = kstDay();
  const groups = new Map<string, typeof watches>();
  for (const w of watches) {
    const k = `${w.wineId}|${w.qty}|${w.bottleMl}`;
    groups.set(k, [...(groups.get(k) ?? []), w]);
  }
  const counts = { target: 0, drop: 0, restock: 0 };

  for (const [, ws] of groups) {
    const { wine, qty, bottleMl, wineId } = ws[0];
    const r = compareLoaded(wine, qty, bottleMl, ctx);
    const price = r.best ? Math.round(r.best.perBottle) : null;
    const routeLabel = r.best ? ROUTE_LABEL[r.best.channel as ChannelKey] : null;
    const key = { wineId_qty_bottleMl_day: { wineId, qty, bottleMl, day: today } };
    const prev =
      (await prisma.watchPrice.findUnique({ where: key })) ??
      (await prisma.watchPrice.findFirst({ where: { wineId, qty, bottleMl, day: { lt: today } }, orderBy: { day: "desc" } }));
    await prisma.watchPrice.upsert({
      where: key,
      update: { perBottle: price, route: r.best?.channel ?? null },
      create: { wineId, qty, bottleMl, day: today, perBottle: price, route: r.best?.channel ?? null },
    });
    const link = `/wines/${wineId}?qty=${qty}&ml=${bottleMl}`;
    const cond = `${qty}병${bottleMl !== 750 ? ` · ${bottleMl}ml` : ""}`;

    for (const w of ws) {
      const premium = isPremium(w.user);
      if (price !== null && price <= w.targetPerBottle && (w.notifiedPrice === null || price < w.notifiedPrice)) {
        const res = await notify({
          user: w.user, type: "TARGET", wineId,
          title: `${wine.nameKo} 목표가 도달`,
          body: `${cond} 병당 도착가 ${won(price)} (목표 ${won(w.targetPerBottle)}) · ${routeLabel}`,
          link, dedupeKey: `target:${w.id}:${price}`,
        });
        if (res.sent) {
          counts.target++;
          await prisma.priceAlert.update({ where: { id: w.id }, data: { notifiedPrice: price, notifiedAt: new Date() } });
        }
      } else if (price !== null && price > w.targetPerBottle && w.notifiedPrice !== null) {
        await prisma.priceAlert.update({ where: { id: w.id }, data: { notifiedPrice: null } });
      }

      if (prev && isDrop(prev.perBottle, price)) {
        const pct = Math.round(((prev.perBottle! - price!) / prev.perBottle!) * 100);
        const res = await notify({
          user: w.user, type: "DROP", wineId,
          title: `${wine.nameKo} 도착가 ${pct}% 내려감`,
          body: `${cond} 병당 ${won(prev.perBottle!)} → ${won(price!)} · ${routeLabel}`,
          link, dedupeKey: `drop:${w.id}:${price}`, queue: !premium,
        });
        if (res.sent || res.queued) counts.drop++;
      }

      if (premium && prev && prev.perBottle === null && price !== null) {
        const res = await notify({
          user: w.user, type: "RESTOCK", wineId,
          title: `${wine.nameKo} 다시 살 수 있어요`,
          body: `품절이던 와인을 ${routeLabel}로 살 수 있습니다. 병당 도착가 ${won(price)}`,
          link, dedupeKey: `restock:${w.id}:${today.toISOString().slice(0, 10)}`,
        });
        if (res.sent) counts.restock++;
      }
      if (w.lastPrice !== price) await prisma.priceAlert.update({ where: { id: w.id }, data: { lastPrice: price } });
    }
  }
  return `찜 ${watches.length}건 확인 · 목표가 ${counts.target} · 하락 ${counts.drop} · 재입고 ${counts.restock}`;
}

/** 신규 빈티지 등록: 같은 와인의 다른 빈티지를 찜한 프리미엄 회원에게 */
export async function notifyNewVintage(wineId: string) {
  const w = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!w?.vintage) return 0;
  const watchers = await prisma.priceAlert.findMany({
    where: { active: true, wine: { name: w.name, producer: w.producer, NOT: { id: w.id } } },
    include: { user: true },
  });
  let n = 0;
  for (const a of watchers) {
    if (!isPremium(a.user)) continue;
    const r = await notify({
      user: a.user, type: "VINTAGE", wineId: w.id,
      title: `${w.nameKo} ${w.vintage} 새 빈티지`,
      body: `찜한 와인의 ${w.vintage} 빈티지가 등록됐습니다. 경로별 도착가를 확인해 보세요.`,
      link: `/wines/${w.id}`, dedupeKey: `vintage:${a.userId}:${w.id}`,
    });
    if (r.sent) n++;
  }
  return n;
}

/** 와이너리 배정(메일링 회원 판매) 시즌 시작: 그 생산자 와인을 찜한 프리미엄 회원에게 */
export async function notifyAllocation(allocationId: string) {
  const a = await prisma.allocationOpen.findUniqueOrThrow({ where: { id: allocationId } });
  const watchers = await prisma.priceAlert.findMany({ where: { active: true, wine: { producer: a.producer } }, include: { user: true, wine: true } });
  const seen = new Set<string>();
  let n = 0;
  for (const w of watchers) {
    if (seen.has(w.userId) || !isPremium(w.user)) continue;
    seen.add(w.userId);
    const r = await notify({
      user: w.user, type: "ALLOCATION", wineId: w.wineId,
      title: `${a.producer} 배정 판매 시작`,
      body: `${a.note}${a.url ? `\n${a.url}` : ""}`,
      link: `/wines/${w.wineId}`, dedupeKey: `alloc:${a.id}:${w.userId}`,
    });
    if (r.sent) n++;
  }
  return n;
}

/** 유로·달러가 최근 30일 저점: 그 통화로 파는 와인을 찜한 프리미엄 회원에게 (통화·날짜당 1회) */
export async function notifyFxLows(currencies = ["EUR", "USD"]) {
  const today = kstDay();
  const lines: string[] = [];
  for (const cur of currencies) {
    const rows = await prisma.exchangeRate.findMany({ where: { currency: cur, date: { gte: new Date(today.getTime() - 31 * 86400e3) } }, orderBy: { date: "asc" } });
    const t = rows.find((r) => r.date.getTime() === today.getTime());
    if (!t || !isFxLow(rows.map((r) => ({ day: r.date, krw: r.krw })), { day: t.date, krw: t.krw })) continue;
    const watchers = await prisma.priceAlert.findMany({
      where: { active: true, wine: { offers: { some: { seller: { currency: cur } } } } },
      include: { user: true, wine: true },
    });
    const seen = new Set<string>();
    let n = 0;
    for (const w of watchers) {
      if (seen.has(w.userId) || !isPremium(w.user)) continue;
      seen.add(w.userId);
      const r = await notify({
        user: w.user, type: "FX", wineId: w.wineId,
        title: `${cur === "EUR" ? "유로" : "달러"} 환율 30일 저점`,
        body: `오늘 ${cur} ${t.krw.toLocaleString("ko-KR")}원으로 최근 30일 중 가장 낮습니다. 찜한 ${w.wine.nameKo} 도착가를 확인해 보세요.`,
        link: "/me#watch", dedupeKey: `fx:${cur}:${today.toISOString().slice(0, 10)}:${w.userId}`,
      });
      if (r.sent) n++;
    }
    lines.push(`${cur} 30일 저점 알림 ${n}건`);
  }
  return lines.join(", ");
}
