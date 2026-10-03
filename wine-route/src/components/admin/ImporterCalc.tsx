"use client";
import { useMemo, useState } from "react";
import { importerCost } from "@/lib/importer";
import type { TaxConfig } from "@/lib/tax";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

export function ImporterCalc({ tax, fx }: { tax: TaxConfig; fx: Record<string, number> }) {
  const curs = Object.keys(fx).filter((c) => c !== "KRW").sort();
  const [v, setV] = useState({ bottles: "600", fob: "12", cur: curs.includes("EUR") ? "EUR" : curs[0], freight: "1800000", ins: "0.3", fta: true, broker: "300000", insp: "500000", label: "300", other: "400000", margin: "35" });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const r = useMemo(() => importerCost({
    bottles: Number(v.bottles) || 1, fobPerBottle: Number(v.fob) || 0, fx: fx[v.cur] ?? 0, freightKrw: Number(v.freight) || 0,
    insuranceRate: (Number(v.ins) || 0) / 100, fta: v.fta, brokerFeeKrw: Number(v.broker) || 0, inspectionKrw: Number(v.insp) || 0,
    labelPerBottle: Number(v.label) || 0, otherKrw: Number(v.other) || 0, marginRate: (Number(v.margin) || 0) / 100,
  }, tax), [v, fx, tax]);
  const field = (id: keyof typeof v, label: string, step = "1") => (
    <div className="field"><label className="label" htmlFor={`ic-${id}`}>{label}</label><input id={`ic-${id}`} type="number" step={step} min={0} value={v[id] as string} onChange={set(id)} /></div>
  );
  return (
    <div className="grid-side" style={{ alignItems: "start" }}>
      <div className="box">
        <div className="form-grid">
          {field("bottles", "수입 병수")}
          {field("fob", "병당 FOB 가격", "0.01")}
          <div className="field"><label className="label" htmlFor="ic-cur">통화 · {won(fx[v.cur] ?? 0)}</label><select id="ic-cur" value={v.cur} onChange={set("cur")}>{curs.map((c) => <option key={c}>{c}</option>)}</select></div>
          {field("freight", "해상·항공 운임 전체 (원)")}
          {field("ins", "적하보험료율 (%)", "0.01")}
          {field("broker", "통관 수수료 (원)")}
          {field("insp", "수입식품 검사·신고 (원)")}
          {field("label", "한글 라벨 작업 (원/병)")}
          {field("other", "창고·내륙 운송 등 (원)")}
          {field("margin", "희망 마진율 (원가 대비 %)", "0.1")}
        </div>
        <label className="check"><input type="checkbox" checked={v.fta} onChange={(e) => setV({ ...v, fta: e.target.checked })} /> FTA 원산지 증명으로 관세 0% (아니면 {Math.round(tax.dutyRate * 100)}%)</label>
      </div>
      <div className="box">
        <div className="label">병당 원가 (부가세 제외)</div>
        <div className="big">{Math.round(r.costPerBottle).toLocaleString("ko-KR")}<small>원</small></div>
        <p className="small">희망 마진 반영 공급가 <b className="num">{won(r.pricePerBottle)}</b> · 부가세 포함 <span className="num">{won(r.priceWithVat)}</span></p>
        <table className="taxtable">
          <tbody>
            {r.breakdown.map((b) => <tr key={b.label}><td>{b.label}</td><td>{won(b.total)}</td></tr>)}
            <tr className="total"><td>원가 합계<span className="formula">병당 세금(관세·주세·교육세) {won(r.taxPerBottle)}</span></td><td>{won(r.costTotal)}</td></tr>
            <tr className="sub"><td>수입 부가세 (매입세액 공제 대상, 원가 제외)</td><td>{won(r.vat)}</td></tr>
          </tbody>
        </table>
        <p className="small muted">과세가격 = FOB + 운임 + 보험료 ({won(r.cif)}). 주세는 (과세가격 + 관세)의 {Math.round(tax.liquorRate * 100)}%, 교육세는 주세의 {Math.round(tax.eduRate * 100)}%. 검토용 추정이며 실제 신고 전 관세사 확인이 필요합니다.</p>
      </div>
    </div>
  );
}
