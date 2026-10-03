"use client";
import { useActionState } from "react";
import { keepFormSubmit } from "@/components/useKeepForm";
import { importWinesCsv } from "@/app/admin/actions";

/** 와인 CSV: 미리 보기 → 반영. 미리 보기 결과의 CSV 를 그대로 다시 보내 반영합니다. */
export function WineCsvForm() {
  const [state, action, pending] = useActionState(importWinesCsv, {});
  return (
    <div className="stack">
      <form onSubmit={keepFormSubmit(action)} className="stack">
        <input type="hidden" name="mode" value="preview" />
        <div className="field"><label className="label" htmlFor="wc-file">CSV 파일</label><input id="wc-file" name="file" type="file" accept=".csv,text/csv" /></div>
        <div className="field"><label className="label" htmlFor="wc-csv">또는 붙여 넣기</label><textarea id="wc-csv" name="csv" className="num" style={{ minHeight: 120 }} placeholder="name,name_ko,producer,country,region,type,…" /></div>
        <div><button className="btn ghost" disabled={pending}>{pending ? "확인하는 중…" : "미리 보기"}</button></div>
      </form>
      {state.error && <pre className="alert bad" style={{ whiteSpace: "pre-wrap" }}>{state.error}</pre>}
      {state.message && <div className="alert ok">{state.message}</div>}
      {state.preview && state.csv && (
        <form onSubmit={keepFormSubmit(action)} className="box tight">
          <input type="hidden" name="mode" value="apply" />
          <input type="hidden" name="csv" value={state.csv} />
          <span>새 와인 <b>{state.preview.created}</b>개, 기존 와인 갱신 <b>{state.preview.updated}</b>개입니다.</span>
          <div><button className="btn" disabled={pending}>{pending ? "반영하는 중…" : "이대로 반영"}</button></div>
        </form>
      )}
    </div>
  );
}
