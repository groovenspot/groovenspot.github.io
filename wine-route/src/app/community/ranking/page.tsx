import Link from "next/link";
import { prisma } from "@/server/db";
import { CommunityNav } from "@/components/CommunityNav";
import { measuredSaving } from "@/lib/community";
import { monthKings } from "@/server/ranking";
import { ROUTE_LABEL, type ChannelKey } from "@/lib/engine";
import { won } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "랭킹" };

export default async function Ranking() {
  const week = new Date(Date.now() - 7 * 86400e3);
  const month = new Date(Date.now() - 30 * 86400e3);
  const [carted, savingRows, kings] = await Promise.all([
    prisma.clickLog.groupBy({ by: ["wineId"], where: { createdAt: { gte: week } }, _count: true, orderBy: { _count: { wineId: "desc" } }, take: 10 }),
    prisma.directReview.findMany({ where: { status: "PUBLISHED", createdAt: { gte: month }, cardPaidKrw: { not: null } }, include: { wine: true } }),
    monthKings(0),
  ]);
  const wines = await prisma.wine.findMany({ where: { id: { in: carted.map((c) => c.wineId) } }, select: { id: true, nameKo: true } });

  // 실측 절약액: 와인×경로별 후기 평균
  const groups = new Map<string, { wineId: string; name: string; route: string; sum: number; n: number }>();
  for (const r of savingRows) {
    const s = measuredSaving(r, r.wine.krPrice);
    if (s === null) continue;
    const k = `${r.wineId}:${r.route}`;
    const g = groups.get(k) ?? { wineId: r.wineId, name: r.wine.nameKo, route: r.route, sum: 0, n: 0 };
    g.sum += s;
    g.n++;
    groups.set(k, g);
  }
  const savings = [...groups.values()].map((g) => ({ ...g, avg: g.sum / g.n })).filter((g) => g.avg > 0).sort((a, b) => b.avg - a.avg).slice(0, 10);

  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 28 }}>랭킹</h1>
        <p className="lede">이번 주 많이 담긴 와인, 후기로 확인된 절약액이 큰 경로, 이달의 후기왕.</p>
        <CommunityNav current="ranking" />
      </section>
      <div className="grid-3" style={{ alignItems: "start" }}>
        <section className="box">
          <h2>이번 주 많이 담긴 와인</h2>
          <p className="small muted">최근 7일 판매처 결제 화면으로 넘어간 횟수</p>
          {carted.length ? (
            <ol className="list">
              {carted.map((c) => <li key={c.wineId}><Link href={`/wines/${c.wineId}`}>{wines.find((w) => w.id === c.wineId)?.nameKo}</Link> <span className="small muted num">{c._count}회</span></li>)}
            </ol>
          ) : <p className="small muted">아직 집계할 기록이 없습니다.</p>}
        </section>
        <section className="box">
          <h2>절약액 큰 경로 (실측)</h2>
          <p className="small muted">최근 30일 후기의 카드 청구액+세금 기준, 국내가 대비 병당</p>
          {savings.length ? (
            <ol className="list">
              {savings.map((g) => (
                <li key={g.wineId + g.route}>
                  <Link href={`/wines/${g.wineId}`}>{g.name}</Link>
                  <div className="small muted">{ROUTE_LABEL[g.route as ChannelKey]} · 후기 {g.n}건 · <span className="pos num">−{won(g.avg)}</span></div>
                </li>
              ))}
            </ol>
          ) : <p className="small muted">카드 청구액을 적은 후기가 쌓이면 여기에 실측 절약액이 나옵니다.</p>}
        </section>
        <section className="box">
          <h2>이달의 후기왕 · {kings.label}</h2>
          <p className="small muted">후기 1점, 통관 인증 +2점, 도움됨 10개당 1점. 협찬 후기는 제외. 월 3명 프리미엄 1개월.</p>
          {kings.list.length ? (
            <ol className="list">
              {kings.list.map((k, i) => (
                <li key={k.userId}>
                  {i < 3 && <span className="chip best" style={{ marginRight: 6 }}>{i + 1}위</span>}
                  {k.nickname} <span className="small muted">· {k.score}점 (후기 {k.reviews}, 인증 {k.verified}, 도움됨 {k.helpful})</span>
                </li>
              ))}
            </ol>
          ) : <p className="small muted">이달 첫 후기를 쓰면 1위입니다.</p>}
        </section>
      </div>
    </div>
  );
}
