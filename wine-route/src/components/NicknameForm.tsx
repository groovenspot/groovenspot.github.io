"use client";
import { keepFormSubmit } from "@/components/useKeepForm";
import { useActionState } from "react";
import { saveNickname } from "@/app/community/actions";

export function NicknameForm({ current, next }: { current: string; next: string }) {
  const [state, action, pending] = useActionState(saveNickname, {} as { ok?: boolean; error?: string; message?: string });
  return (
    <form onSubmit={keepFormSubmit(action)} className="row">
      <input type="hidden" name="next" value={next} />
      <input name="nickname" defaultValue={current} required placeholder="한글·영문·숫자 2~12자" style={{ width: 220 }} aria-label="닉네임" />
      <button className="btn" disabled={pending}>{current ? "닉네임 바꾸기" : "닉네임 정하기"}</button>
      {state.error && <span className="small neg">{state.error}</span>}
      {state.message && <span className="small pos">{state.message}</span>}
    </form>
  );
}
