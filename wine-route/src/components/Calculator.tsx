"use client";
import { useMemo, useState } from "react";
import { calcTax, type TaxConfig } from "@/lib/tax";
import { TaxBreakdown } from "./TaxBreakdown";
import { won } from "@/lib/format";

export function Calculator({ tax, fx }: { tax: TaxConfig; fx: Record<string, number> }) {
  const currencies = Object.keys(fx).filter((c) => c !== "KRW").sort();
  const [price, setPrice] = useState("68");
  const [cur, setCur] = useState(currencies.includes("EUR") ? "EUR" : currencies[0]);
  const [ship, setShip] = useState("35");
  const [qty, setQty] = useState(1);
  const [ml, setMl] = useState(750);
  const [fta, setFta] = useState(true);
  const [kr, setKr] = useState("");

  const r = useMemo(() => {
    const rate = fx[cur] ?? 0;
    const unit = Math.max(0, Number(price) || 0);
    const goodsKrw = unit * qty * rate;
    const shipKrw = Math.max(0, Number(ship) || 0) * rate;
    const t = calcTax({ cif: goodsKrw + shipKrw, goodsUsdPerBottle: (unit * rate) / (fx.USD || 1), qty, bottleMl: ml, fta }, tax);
    return { goodsKrw, shipKrw, tax: t, total: t.cif + t.pay };
  }, [price, cur, ship, qty, ml, fta, fx, tax]);
  const perBottle = r.total / qty;
  const krN = Number(kr) || 0;

  return (
    <div className="grid-side">
      <div className="box">
        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="c-price">병당 물품가</label>
            <input id="c-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="c-cur">통화 · {won(fx[cur] ?? 0)}</label>
            <select id="c-cur" value={cur} onChange={(e) => setCur(e.target.value)}>
              {currencies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="c-ship">한국까지 국제운임 (주문 전체, 같은 통화)</label>
          <input id="c-ship" type="number" min={0} step="0.01" value={ship} onChange={(e) => setShip(e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="c-qty">수량</label>
            <input id="c-qty" type="number" min={1} max={24} value={qty} onChange={(e) => setQty(Math.min(24, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
          <div className="field">
            <label className="label" htmlFor="c-ml">병 용량</label>
            <select id="c-ml" value={ml} onChange={(e) => setMl(Number(e.target.value))}>
              <option value={375}>375ml</option>
              <option value={750}>750ml</option>
              <option value={1500}>1.5L</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="c-fta">구매 형태</label>
          <select id="c-fta" value={fta ? "1" : "0"} onChange={(e) => setFta(e.target.value === "1")}>
            <option value="1">FTA 원산지 국가 판매처에서 구매 (관세 0%)</option>
            <option value="0">제3국 또는 FTA 미체결 국가에서 구매 (관세 {Math.round(tax.dutyRate * 100)}%)</option>
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="c-kr">국내 판매가(병당, 원) · 선택</label>
          <input id="c-kr" type="number" min={0} step={1000} value={kr} onChange={(e) => setKr(e.target.value)} placeholder="없으면 비워 두세요" />
        </div>
      </div>
      <div className="box">
        <div className="label">병당 도착가</div>
        <div className="big">{Math.round(perBottle).toLocaleString("ko-KR")}<small>원</small></div>
        {krN > 0 && (
          <p className="small">
            국내가 대비 <span className={`num ${krN - perBottle >= 0 ? "pos" : "neg"}`}>{krN - perBottle >= 0 ? "−" : "+"}{won(Math.abs(krN - perBottle))}</span>
          </p>
        )}
        {qty === 2 && <div className="alert">2병부터는 1병 면세구간을 벗어나 부가세가 붙습니다.</div>}
        {qty >= tax.bulkWarnQty && <div className="alert">수량이 많으면 재판매용으로 보아 일반 수입신고 대상이 될 수 있습니다.</div>}
        <TaxBreakdown goodsKrw={r.goodsKrw} shipKrw={r.shipKrw} tax={r.tax} total={r.total} qty={qty} dutyRate={tax.dutyRate} />
      </div>
    </div>
  );
}
