"use client";
import { keepFormSubmit } from "@/components/useKeepForm";
import { useActionState } from "react";
import { createReview } from "@/app/community/actions";

type Opt = { id: string; label: string };
type Prefill = { orderId?: string; wineLabel?: string; routeLabel?: string; sellerLabel?: string; qty?: number; taxPaid?: number | null; shippingDays?: number | null };

export function ReviewForm({ wines, sellers, routes, prefill, wineId }: { wines: Opt[]; sellers: Opt[]; routes: Opt[]; prefill?: Prefill; wineId?: string }) {
  const [state, action, pending] = useActionState(createReview, {} as { error?: string });
  const fromOrder = !!prefill?.orderId;
  return (
    <form onSubmit={keepFormSubmit(action)} className="box" encType="multipart/form-data">
      {fromOrder ? (
        <>
          <input type="hidden" name="orderId" value={prefill!.orderId} />
          <div className="stack" style={{ gap: 2 }}>
            <span className="label">내 주문에서 쓰는 후기</span>
            <b>{prefill!.wineLabel}</b>
            <span className="small muted">{prefill!.routeLabel} · {prefill!.sellerLabel} · {prefill!.qty}병</span>
          </div>
        </>
      ) : (
        <div className="form-grid">
          <div className="field"><label className="label" htmlFor="rv-wine">와인</label>
            <select id="rv-wine" name="wineId" required defaultValue={wineId ?? ""}><option value="" disabled>골라 주세요</option>{wines.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}</select></div>
          <div className="field"><label className="label" htmlFor="rv-route">구매 경로</label>
            <select id="rv-route" name="route" required defaultValue=""><option value="" disabled>골라 주세요</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
          <div className="field"><label className="label" htmlFor="rv-seller">판매처</label>
            <select id="rv-seller" name="sellerId" defaultValue=""><option value="">목록에 없음</option>{sellers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          <div className="field"><label className="label" htmlFor="rv-qty">수량 (병)</label><input id="rv-qty" name="qty" type="number" min={1} max={24} defaultValue={1} /></div>
          <div className="field"><label className="label" htmlFor="rv-ml">병 용량</label>
            <select id="rv-ml" name="ml" defaultValue={750}><option value={375}>375ml</option><option value={750}>750ml</option><option value={1500}>1.5L</option></select></div>
        </div>
      )}
      <div className="form-grid">
        <div className="field"><label className="label" htmlFor="rv-tax">실제 낸 세금 (원) *</label><input id="rv-tax" name="taxPaid" type="number" min={0} required defaultValue={prefill?.taxPaid ?? ""} placeholder="면세였으면 0" /></div>
        <div className="field"><label className="label" htmlFor="rv-days">주문부터 받기까지 (일) *</label><input id="rv-days" name="shippingDays" type="number" min={1} max={120} required defaultValue={prefill?.shippingDays ?? ""} /></div>
        <div className="field"><label className="label" htmlFor="rv-paid">카드 청구액 (원, 선택)</label><input id="rv-paid" name="cardPaidKrw" type="number" min={0} placeholder="물품+운임" /></div>
        <div className="field"><label className="label" htmlFor="rv-rating">별점 *</label>
          <select id="rv-rating" name="rating" required defaultValue=""><option value="" disabled>골라 주세요</option>{[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{"★".repeat(v)} {v}점</option>)}</select></div>
      </div>
      <label className="check"><input type="checkbox" name="damaged" /> 파손 또는 분실이 있었습니다</label>
      <div className="field">
        <label className="label" htmlFor="rv-one">한 줄 평 * (5~100자)</label>
        <input id="rv-one" name="oneLiner" required minLength={5} maxLength={100} placeholder="예: 세금이 예상과 거의 같았고, 포장이 꼼꼼해서 파손 걱정 없었어요." />
      </div>
      <div className="field">
        <label className="label" htmlFor="rv-proof">통관 내역·영수증 사진 (선택, 인증 배지)</label>
        <input id="rv-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" />
        <span className="small muted">이름·주소·통관부호는 가리고 올려 주세요. 사진은 운영자만 보고, 확인이 끝나면 바로 지웁니다.</span>
      </div>
      <label className="check"><input type="checkbox" name="sponsored" /> 판매처로부터 제품·돈 등 대가를 받고 쓰는 후기입니다 (광고·협찬 표시)</label>
      <p className="small muted">판매·양도·나눔·공동구매 모집 글은 자동으로 막히고, 신고되면 바로 숨겨집니다.</p>
      <div className="row">
        <button className="btn" disabled={pending}>{pending ? "올리는 중…" : "후기 올리기"}</button>
        {state.error && <span className="small neg">{state.error}</span>}
      </div>
    </form>
  );
}
