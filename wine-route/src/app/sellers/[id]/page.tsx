import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { ROUTE_LABEL } from "@/lib/engine";
import { money } from "@/lib/format";
import { ReviewCard, reviewInclude } from "@/components/ReviewCard";

export const dynamic = "force-dynamic";

const CH: Record<string, string> = { ...ROUTE_LABEL, LOCAL_SHOP: "현지 내수 판매처 (배송대행지 경로)" };

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await prisma.seller.findUnique({ where: { id }, include: { _count: { select: { offers: true } } } });
  if (!s) notFound();
  const user = await getUser();
  const reviews = await prisma.directReview.findMany({ where: { sellerId: id, status: "PUBLISHED" }, include: reviewInclude, orderBy: { createdAt: "desc" }, take: 50 });
  const honest = reviews.filter((r) => !r.sponsored);
  const n = honest.length;
  const avg = n ? honest.reduce((a, r) => a + r.rating, 0) / n : null;
  const damaged = honest.filter((r) => r.damaged).length;
  const days = n ? honest.reduce((a, r) => a + r.shippingDays, 0) / n : null;
  const liked = user ? new Set((await prisma.helpful.findMany({ where: { userId: user.id, reviewId: { in: reviews.map((r) => r.id) } } })).map((h) => h.reviewId)) : new Set<string>();

  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 6 }}>
        <div className="label">판매처</div>
        <h1 style={{ fontSize: 28 }}>{s.name}</h1>
        <div className="row" style={{ gap: 6 }}>
          <span className="chip">{CH[s.channel]}</span>
          <span className="chip">{s.country}</span>
          <span className={`chip ${s.shipsToKorea ? "ok" : ""}`}>{s.shipsToKorea ? "한국 발송" : "한국 발송 안 함"}</span>
          {s.insured && <span className="chip ok">파손 보험</span>}
          {s.cooAvailable && <span className="chip ok">원산지증명 발급</span>}
          {s.minBottles > 1 && <span className="chip warn">{s.minBottles}병부터 주문</span>}
        </div>
        <p className="small muted">안내 배송 기간 {s.daysMin}~{s.daysMax}일 · 운임 {money(s.shipBase, s.currency)} + 병당 {money(s.shipPerBottle, s.currency)}{s.shipMethod ? ` (${s.shipMethod})` : ""}{s.shipCountries.length ? ` · 발송 국가 ${s.shipCountries.join(", ")}` : ""} · <a href={s.website} rel="nofollow noopener" target="_blank">웹사이트</a></p>
      </section>

      <div className="grid-4">
        <div className="box tight stat"><span className="label">신뢰 점수</span><span className="v">{avg ? avg.toFixed(1) : "-"}</span><span className="small muted">직구 후기 {n}건 평균 (5점 만점, 협찬 제외)</span></div>
        <div className="box tight stat"><span className="label">실제 배송 기간</span><span className="v">{days ? `${Math.round(days)}일` : "-"}</span><span className="small muted">안내 {s.daysMin}~{s.daysMax}일</span></div>
        <div className="box tight stat"><span className="label">파손·분실</span><span className="v">{damaged}</span><span className="small muted">건 보고됨</span></div>
        <div className="box tight stat"><span className="label">판매 와인</span><span className="v">{s._count.offers}</span><span className="small muted">종</span></div>
      </div>

      <section className="stack">
        <div className="row between">
          <h2>이 판매처 직구 후기</h2>
          <Link className="btn small" href="/community/write">후기 쓰기</Link>
        </div>
        {reviews.length ? reviews.map((r) => <ReviewCard key={r.id} r={r} viewerId={user?.id} liked={liked.has(r.id)} />) : <div className="box"><p className="muted">아직 후기가 없습니다. 이 판매처에서 직구했다면 첫 후기를 남겨 주세요.</p></div>}
      </section>
    </div>
  );
}
