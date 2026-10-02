"use client";
import { useActionState } from "react";
import { joinWaitlist, type FormState } from "@/app/actions";

export function WaitlistForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(joinWaitlist, {});
  return (
    <form action={action} className="stack">
      <div className="field">
        <label className="label" htmlFor="wl-email">알림 받을 이메일</label>
        <input id="wl-email" name="email" type="email" required placeholder="name@example.com" autoComplete="email" />
      </div>
      <div className="field">
        <label className="label" htmlFor="wl-wish">찾고 있는 와인 또는 산지</label>
        <input id="wl-wish" name="wish" maxLength={120} placeholder="예: 부르고뉴 1er Cru 화이트" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="wl-target">목표 병당 도착가(원)</label>
          <input id="wl-target" name="target" type="number" min={0} step={1000} placeholder="예: 90000" />
        </div>
        <div className="field">
          <label className="label" htmlFor="wl-purpose">구매 목적</label>
          <select id="wl-purpose" name="purpose">
            <option>개인 소장·음용</option>
            <option>선물·기념일</option>
            <option>와인바·업장 운영</option>
          </select>
        </div>
      </div>
      <label className="check"><input type="checkbox" name="agree" /> 출시 알림 발송을 위한 이메일 수집에 동의합니다.</label>
      <div className="row">
        <button className="btn" disabled={pending}>{pending ? "등록하는 중…" : "대기자 등록"}</button>
        {state.error && <span className="small neg">{state.error}</span>}
        {state.message && <span className="small pos">{state.message}</span>}
      </div>
    </form>
  );
}
