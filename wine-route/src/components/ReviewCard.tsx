import Link from "next/link";
import type { DirectReview, Seller, User, Wine } from "@prisma/client";
import { ROUTE_LABEL, type ChannelKey } from "@/lib/engine";
import { REPORT_REASONS } from "@/lib/community";
import { won, ymd } from "@/lib/format";
import { deleteMyReview, reportReview, toggleHelpful } from "@/app/community/actions";

export type ReviewWithRefs = DirectReview & { user: Pick<User, "nickname" | "founding">; wine: Pick<Wine, "id" | "nameKo">; seller: Pick<Seller, "id" | "name"> | null };

export function ReviewCard({ r, viewerId, liked, showWine = true }: { r: ReviewWithRefs; viewerId?: string | null; liked?: boolean; showWine?: boolean }) {
  const mine = viewerId === r.userId;
  const err = r.estTax ? (r.taxPaid - r.estTax) / r.estTax : null;
  return (
    <article className="box tight" style={{ gap: 8 }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 2 }}>
          {showWine && <Link href={`/wines/${r.wine.id}`}><b>{r.wine.nameKo}</b></Link>}
          <span className="small muted">
            {ROUTE_LABEL[r.route as ChannelKey] ?? r.route}
            {r.seller ? <> · <Link href={`/sellers/${r.seller.id}`}>{r.seller.name}</Link></> : ""} · {r.qty}병
          </span>
        </div>
        <span className="num" aria-label={`별점 ${r.rating}점`} style={{ color: "var(--accent)", whiteSpace: "nowrap" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        {r.proofStatus === "APPROVED" && <span className="chip ok">통관 인증</span>}
        {r.proofStatus === "PENDING" && mine && <span className="chip">인증 확인 중</span>}
        {r.sponsored && <span className="chip warn">광고·협찬</span>}
        <span className="chip">세금 {won(r.taxPaid)}{err !== null ? ` · 예상 대비 ${err >= 0 ? "+" : ""}${(err * 100).toFixed(0)}%` : ""}</span>
        <span className="chip">배송 {r.shippingDays}일</span>
        {r.damaged ? <span className="chip bad">파손·분실 있음</span> : <span className="chip">파손 없음</span>}
      </div>
      <p>{r.oneLiner}</p>
      <div className="row between small">
        <span className="muted">
          {r.user.nickname ?? "탈퇴 회원"}
          {r.user.founding && <span className="chip" style={{ marginLeft: 6 }}>초기 회원</span>} · {ymd(r.createdAt)}
        </span>
        <div className="row" style={{ gap: 6 }}>
          {!mine && (
            <form action={toggleHelpful}>
              <input type="hidden" name="id" value={r.id} />
              <button className={`btn small ${liked ? "" : "ghost"}`} aria-pressed={liked}>도움됨 {r.helpfulCount}</button>
            </form>
          )}
          {mine && <span className="muted">도움됨 {r.helpfulCount}</span>}
          {mine ? (
            <form action={deleteMyReview}><input type="hidden" name="id" value={r.id} /><button className="btn ghost small">삭제</button></form>
          ) : viewerId ? (
            <details>
              <summary className="muted">신고</summary>
              <form action={reportReview} className="row" style={{ marginTop: 6 }}>
                <input type="hidden" name="id" value={r.id} />
                <select name="reason" aria-label="신고 사유" style={{ width: 170 }}>{REPORT_REASONS.map((x) => <option key={x}>{x}</option>)}</select>
                <button className="btn ghost small">신고하기</button>
              </form>
            </details>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export const reviewInclude = {
  user: { select: { nickname: true, founding: true } },
  wine: { select: { id: true, nameKo: true } },
  seller: { select: { id: true, name: true } },
} as const;
