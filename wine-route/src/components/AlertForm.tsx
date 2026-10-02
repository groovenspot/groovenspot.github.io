"use client";
import { keepFormSubmit } from "@/components/useKeepForm";
import { useActionState, useState } from "react";
import { createAlert } from "@/app/wines/[id]/actions";
import type { FormState } from "@/app/actions";

export function AlertForm(props: { wineId: string; qty: number; ml: number; suggested: number; loggedIn: boolean; phone: string | null; existingTarget: number | null; source?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAlert, {});
  const [channel, setChannel] = useState<"EMAIL" | "KAKAO">(props.phone ? "KAKAO" : "EMAIL");
  return (
    <form onSubmit={keepFormSubmit(action)} className="stack">
      <input type="hidden" name="wineId" value={props.wineId} />
      <input type="hidden" name="qty" value={props.qty} />
      <input type="hidden" name="ml" value={props.ml} />
      <input type="hidden" name="source" value={props.source ?? "detail"} />
      <div className="field">
        <label className="label" htmlFor="al-target">목표 병당 도착가(원)</label>
        <input id="al-target" name="target" type="number" min={1000} step={1000} defaultValue={props.existingTarget ?? props.suggested} required />
      </div>
      <fieldset className="row" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 6 }}>받는 방법</legend>
        <label className="check"><input type="radio" name="channel" value="EMAIL" checked={channel === "EMAIL"} onChange={() => setChannel("EMAIL")} /> 이메일</label>
        <label className="check"><input type="radio" name="channel" value="KAKAO" checked={channel === "KAKAO"} onChange={() => setChannel("KAKAO")} /> 카카오 알림톡</label>
      </fieldset>
      {channel === "KAKAO" && (
        <div className="field">
          <label className="label" htmlFor="al-phone">휴대폰 번호</label>
          <input id="al-phone" name="phone" inputMode="numeric" placeholder="01012345678" defaultValue={props.phone ?? ""} />
        </div>
      )}
      <div className="row">
        <button className="btn" disabled={pending}>{props.loggedIn ? (props.existingTarget ? "목표가 바꾸기" : "찜하고 알림 받기") : "로그인하고 찜하기"}</button>
      </div>
      {state.error && <p className="small neg">{state.error}</p>}
      {state.limit && <a className="small" href="/me#points">포인트로 프리미엄 받기 · 찜 정리하기</a>}
      {state.message && <p className="small pos">{state.message}</p>}
    </form>
  );
}
