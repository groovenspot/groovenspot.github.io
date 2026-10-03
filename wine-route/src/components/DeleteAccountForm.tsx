"use client";
import { useActionState } from "react";
import { deleteMyAccount } from "@/app/me/actions";
import { keepFormSubmit } from "@/components/useKeepForm";

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(deleteMyAccount, {} as { error?: string });
  return (
    <form onSubmit={keepFormSubmit(action)} className="stack">
      <ul className="list small">
        <li>지워지는 것: 주문 기록, 찜·알림, 구매 기록, 직구 후기, 포인트, 상담 기록, 취향 설문, 주문서 정보(영문 주소·통관부호), 로그인 세션, 대기자 등록.</li>
        <li>남는 것: 회원과 연결이 끊긴 통계 기록(판매처 이동 횟수, 사진 검색, 공유 카드, 구해주세요 요청). 누구의 기록인지 알 수 없습니다.</li>
        <li>프리미엄 기간과 포인트는 돌려받을 수 없습니다. 같은 이메일로 다시 가입하면 새 계정이 됩니다.</li>
      </ul>
      <div className="form-grid">
        <div className="field"><label className="label" htmlFor="da-email">가입한 이메일</label><input id="da-email" name="email" type="email" placeholder={email} autoComplete="off" required /></div>
        <div className="field"><label className="label" htmlFor="da-confirm">확인: &lsquo;탈퇴합니다&rsquo; 입력</label><input id="da-confirm" name="confirm" autoComplete="off" required /></div>
      </div>
      <div className="row">
        <button className="btn danger" disabled={pending}>{pending ? "탈퇴하는 중…" : "회원 탈퇴"}</button>
        {state.error && <span className="small neg">{state.error}</span>}
      </div>
    </form>
  );
}
