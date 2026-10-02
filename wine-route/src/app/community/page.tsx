import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { getCommunityConfig } from "@/server/settings";
import { pointMultiplier } from "@/lib/community";
import { ROUTE_LABEL, ROUTE_ORDER } from "@/lib/engine";
import { ReviewCard, reviewInclude } from "@/components/ReviewCard";
import { CommunityNav } from "@/components/CommunityNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "직구 후기" };

export default async function Community({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getUser();
  const cfg = await getCommunityConfig();
  const where: Prisma.DirectReviewWhereInput = {
    status: "PUBLISHED",
    ...(sp.route ? { route: sp.route } : {}),
    ...(sp.verified === "1" ? { proofStatus: "APPROVED" } : {}),
  };
  const [reviews, total, verified] = await Promise.all([
    prisma.directReview.findMany({ where, include: reviewInclude, orderBy: sp.sort === "helpful" ? [{ helpfulCount: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" }, take: 50 }),
    prisma.directReview.count({ where: { status: "PUBLISHED" } }),
    prisma.directReview.count({ where: { status: "PUBLISHED", proofStatus: "APPROVED" } }),
  ]);
  const liked = user ? new Set((await prisma.helpful.findMany({ where: { userId: user.id, reviewId: { in: reviews.map((r) => r.id) } } })).map((h) => h.reviewId)) : new Set<string>();
  const mult = pointMultiplier(cfg);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ route: sp.route, verified: sp.verified, sort: sp.sort, ...patch })) if (v) p.set(k, v);
    return `/community?${p}`;
  };

  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 8 }}>
        <div className="label">커뮤니티</div>
        <h1>먼저 사 본 사람의 <em>실제 세금</em></h1>
        <p className="lede">직구 후기 하나가 경로 하나의 실측 비용 기록입니다. 실제 낸 세금·배송일·파손 여부가 쌓일수록 도착가 계산이 정확해집니다.</p>
        <CommunityNav current="feed" />
      </section>

      {sp.written && (
        <div className="alert ok row between">
          <span>후기를 올렸습니다. {Number(sp.p) > 0 ? `${Number(sp.p).toLocaleString("ko-KR")}P를 드렸습니다.` : ""} 통관 내역 사진을 올렸다면 운영자 확인 후 인증 배지와 {cfg.points.proof * mult}P가 더해집니다.</span>
          <Link className="btn small" href={`/share?kind=review&review=${sp.written}`}>&lsquo;나는 이만큼 아꼈다&rsquo; 카드 만들기</Link>
        </div>
      )}

      <div className="grid-side">
        <section className="stack">
          <div className="row between">
            <nav className="seg" aria-label="경로">
              <Link href={qs({ route: undefined })} aria-current={!sp.route ? "true" : undefined}>전체 경로</Link>
              {ROUTE_ORDER.map((r) => <Link key={r} href={qs({ route: r })} aria-current={sp.route === r ? "true" : undefined}>{ROUTE_LABEL[r]}</Link>)}
            </nav>
            <nav className="seg" aria-label="보기">
              <Link href={qs({ verified: sp.verified === "1" ? undefined : "1" })} aria-current={sp.verified === "1" ? "true" : undefined}>통관 인증만</Link>
              <Link href={qs({ sort: sp.sort === "helpful" ? undefined : "helpful" })} aria-current={sp.sort === "helpful" ? "true" : undefined}>도움됨 많은 순</Link>
            </nav>
          </div>
          {reviews.length ? reviews.map((r) => <ReviewCard key={r.id} r={r} viewerId={user?.id} liked={liked.has(r.id)} />) : (
            <div className="box">
              <h2>{total ? "조건에 맞는 후기가 없습니다" : "첫 후기를 기다립니다"}</h2>
              <p className="small muted">직구한 와인의 경로, 실제 낸 세금, 배송일만 적으면 됩니다. 다음 사람이 같은 와인을 실패 없이 살 수 있습니다.</p>
              <div><Link className="btn" href="/community/write">후기 쓰기</Link></div>
            </div>
          )}
        </section>

        <aside className="stack-lg">
          <section className="box">
            <h2>후기 쓰고 포인트 받기</h2>
            {mult > 1 && <div className="alert ok">오픈 이벤트: {cfg.bonusUntil}까지 후기 포인트 {mult}배</div>}
            <table className="taxtable">
              <tbody>
                <tr><td>기본 후기 (경로·세금·배송일)</td><td>{(cfg.points.review * mult).toLocaleString("ko-KR")}P</td></tr>
                <tr><td>통관 내역 사진 인증</td><td>+{(cfg.points.proof * mult).toLocaleString("ko-KR")}P</td></tr>
                <tr><td>내 후기 도움됨 10개마다</td><td>+{(cfg.points.helpful10 * mult).toLocaleString("ko-KR")}P</td></tr>
                <tr><td>이달의 후기왕 (월 3명)</td><td>프리미엄 1개월</td></tr>
              </tbody>
            </table>
            <p className="small muted">포인트는 프리미엄 구독({cfg.costs.premiumMonth.toLocaleString("ko-KR")}P = 1개월)에만 쓸 수 있고, 와인 값으로는 쓸 수 없습니다.</p>
            <Link className="btn" href="/community/write">후기 쓰기</Link>
          </section>
          <section className="box tight">
            <span className="label">지금까지 쌓인 실측 기록</span>
            <span className="num" style={{ fontSize: 24 }}>{total.toLocaleString("ko-KR")}건</span>
            <span className="small muted">그중 통관 인증 {verified.toLocaleString("ko-KR")}건</span>
            <Link className="small" href="/community/ranking">이번 주 랭킹 보기</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
