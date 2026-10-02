import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { ROUTE_LABEL } from "@/lib/engine";
import { money, ymd } from "@/lib/format";
import { saveReview } from "./actions";

export const dynamic = "force-dynamic";

const CH: Record<string, string> = { ...ROUTE_LABEL, LOCAL_SHOP: "현지 내수 판매처 (배송대행지 경로)" };

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await prisma.seller.findUnique({
    where: { id },
    include: { reviews: { orderBy: { createdAt: "desc" }, take: 50 }, offers: { include: { wine: true }, orderBy: { price: "asc" }, take: 50 } },
  });
  if (!s) notFound();
  const user = await getUser();
  const mine = user ? s.reviews.find((r) => r.userId === user.id) : undefined;
  const n = s.reviews.length;
  const avg = n ? s.reviews.reduce((a, r) => a + r.rating, 0) / n : null;
  const damaged = s.reviews.filter((r) => r.damaged).length;
  const days = s.reviews.filter((r) => r.shippingDays).map((r) => r.shippingDays!);

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
        </div>
        <p className="small muted">안내 배송 기간 {s.daysMin}~{s.daysMax}일 · 운임 {money(s.shipBase, s.currency)} + 병당 {money(s.shipPerBottle, s.currency)} · <a href={s.website} rel="nofollow noopener" target="_blank">웹사이트</a></p>
      </section>

      <div className="grid-4">
        <div className="box tight stat"><span className="label">신뢰 점수</span><span className="v">{avg ? avg.toFixed(1) : "-"}</span><span className="small muted">후기 {n}개 평균 (5점 만점)</span></div>
        <div className="box tight stat"><span className="label">실제 배송 기간</span><span className="v">{days.length ? `${Math.round(days.reduce((a, b) => a + b, 0) / days.length)}일` : "-"}</span><span className="small muted">후기 평균</span></div>
        <div className="box tight stat"><span className="label">파손·분실</span><span className="v">{damaged}</span><span className="small muted">건 보고됨</span></div>
        <div className="box tight stat"><span className="label">판매 와인</span><span className="v">{s.offers.length}</span><span className="small muted">종</span></div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="stack">
          <h2>후기</h2>
          {n ? s.reviews.map((r) => (
            <div key={r.id} className="box tight">
              <div className="row"><span className="num">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>{r.shippingDays && <span className="small muted">{r.shippingDays}일 걸림</span>}{r.damaged && <span className="chip bad">파손·분실</span>}<span className="small muted">{ymd(r.createdAt)}</span></div>
              {r.comment && <p className="small">{r.comment}</p>}
            </div>
          )) : <div className="box"><p className="muted">아직 후기가 없습니다.</p></div>}
        </section>
        <section className="box">
          <h2>{mine ? "내 후기 수정" : "후기 남기기"}</h2>
          {user ? (
            <form action={saveReview} className="stack">
              <input type="hidden" name="sellerId" value={s.id} />
              <div className="grid-2">
                <div className="field"><label className="label" htmlFor="rv-rating">평점</label>
                  <select id="rv-rating" name="rating" defaultValue={mine?.rating ?? 5}>{[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{v}점</option>)}</select></div>
                <div className="field"><label className="label" htmlFor="rv-days">받기까지 걸린 날</label><input id="rv-days" name="shippingDays" type="number" min={1} defaultValue={mine?.shippingDays ?? ""} /></div>
              </div>
              <label className="check"><input type="checkbox" name="damaged" defaultChecked={mine?.damaged} /> 파손 또는 분실이 있었습니다</label>
              <div className="field"><label className="label" htmlFor="rv-comment">내용</label><textarea id="rv-comment" name="comment" maxLength={1000} defaultValue={mine?.comment ?? ""} /></div>
              <div><button className="btn">저장</button></div>
            </form>
          ) : (
            <p className="small"><Link href={`/login?next=/sellers/${s.id}`}>로그인</Link>하면 후기를 남길 수 있습니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}
