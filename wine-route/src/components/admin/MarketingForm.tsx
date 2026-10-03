"use client";
import { useActionState } from "react";
import { sendMarketing } from "@/app/admin/actions";
import { keepFormSubmit } from "@/components/useKeepForm";

export function MarketingForm({ segment, country, count, quiet }: { segment: string; country: string; count: number; quiet: boolean }) {
  const [state, action, pending] = useActionState(sendMarketing, {} as { ok?: boolean; error?: string; message?: string });
  return (
    <form onSubmit={keepFormSubmit(action)} className="box">
      <input type="hidden" name="segment" value={segment} />
      <input type="hidden" name="country" value={country} />
      <div className="field"><label className="label" htmlFor="mk-title">제목 (앞에 &lsquo;(광고)&rsquo;가 자동으로 붙습니다)</label><input id="mk-title" name="title" maxLength={80} required placeholder="이번 달 국내 미유통 부르고뉴 화이트 3종" /></div>
      <div className="field"><label className="label" htmlFor="mk-body">본문</label><textarea id="mk-body" name="body" maxLength={3000} required style={{ minHeight: 160 }} placeholder="와인 소개와 경로별 도착가 안내. 음주를 권하는 표현은 쓰지 않습니다." /></div>
      <div className="field"><label className="label" htmlFor="mk-link">링크 (선택)</label><input id="mk-link" name="link" type="url" placeholder="https://.../wines/..." /></div>
      <p className="small muted">본문 끝에 보낸 곳, 수신 거부 방법, &lsquo;19세 미만 음주 금지&rsquo; 문구가 자동으로 붙습니다. 이메일로만 보냅니다 (알림톡은 정보성 메시지만 가능).</p>
      <label className="check"><input type="checkbox" name="confirm" /> 받는 사람 {count.toLocaleString("ko-KR")}명과 내용을 확인했습니다</label>
      <div className="row">
        <button className="btn" disabled={pending || quiet || count === 0}>{pending ? "보내는 중…" : `${count.toLocaleString("ko-KR")}명에게 보내기`}</button>
        {quiet && <span className="small neg">지금은 야간 시간(21~08시 KST)이라 보낼 수 없습니다.</span>}
        {state.error && <span className="small neg">{state.error}</span>}
        {state.message && <span className="small pos">{state.message}</span>}
      </div>
    </form>
  );
}
