"use client";
import { keepFormSubmit } from "@/components/useKeepForm";
import { useActionState } from "react";
import { applyInvite, redeemPremiumAction } from "@/app/community/actions";

export function RedeemButton({ cost, balance }: { cost: number; balance: number }) {
  const [state, action, pending] = useActionState(redeemPremiumAction, {} as { ok?: boolean; error?: string; message?: string });
  return (
    <form action={action} className="row">
      <button className="btn" disabled={pending || balance < cost}>프리미엄 1개월로 바꾸기 ({cost.toLocaleString("ko-KR")}P)</button>
      {state.message && <span className="small pos">{state.message}</span>}
      {state.error && <span className="small neg">{state.error}</span>}
    </form>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(applyInvite, {} as { ok?: boolean; error?: string; message?: string });
  return (
    <form onSubmit={keepFormSubmit(action)} className="row">
      <input name="code" placeholder="초대 코드" style={{ width: 160 }} aria-label="초대 코드" required />
      <button className="btn ghost small" disabled={pending}>적용</button>
      {state.message && <span className="small pos">{state.message}</span>}
      {state.error && <span className="small neg">{state.error}</span>}
    </form>
  );
}
