"use client";
import { useActionState } from "react";
import { importOffers } from "@/app/admin/actions";

export function ImportForm() {
  const [state, action, pending] = useActionState(importOffers, {} as { message?: string; error?: string });
  return (
    <form action={action} className="box">
      <div className="field">
        <label className="label" htmlFor="csv">CSV 붙여넣기</label>
        <textarea id="csv" name="csv" className="num" style={{ minHeight: 220 }} placeholder={"wine_id,seller_id,url,price,bottle_ml,in_stock\nclx...,clx...,https://shop.example/chablis,41.9,750,1"} />
      </div>
      <div className="row">
        <button className="btn" disabled={pending}>{pending ? "반영하는 중…" : "가져오기"}</button>
        {state.message && <span className="small pos">{state.message}</span>}
      </div>
      {state.error && <pre className="alert bad" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{state.error}</pre>}
    </form>
  );
}
