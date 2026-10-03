import Link from "next/link";
import type { Metadata } from "next";
import { consolidationForwarders, consolidationOffers, quoteConsolidation, MAX_PICK_QTY } from "@/server/consolidate";
import { isConsolidation } from "@/lib/consolidate";
import { ROUTE_LABEL } from "@/lib/engine";
import { money, sizeLabel, won } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "합배송 견적",
  description: "한 나라의 여러 판매처에서 산 와인을 현지 배송대행지에서 한 상자로 묶어 받을 때의 도착가와, 따로 샀을 때를 비교합니다.",
};

type SP = Promise<Record<string, string | undefined>>;

export default async function ConsolidatePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const forwarders = await consolidationForwarders();
  const f = forwarders.find((x) => x.id === sp.f) ?? null;
  const offers = f ? await consolidationOffers(f.country) : [];
  const picks = Object.entries(sp)
    .filter(([k]) => k.startsWith("q_"))
    .map(([k, v]) => ({ offerId: k.slice(2), qty: Math.floor(Number(v)) }))
    .filter((p) => p.qty > 0);
  const quote = f && picks.length ? await quoteConsolidation(f.id, picks) : null;
  const qtyOf = new Map(picks.map((p) => [p.offerId, p.qty]));
  const sellers = [...new Map(offers.map((o) => [o.sellerId, o.seller])).values()];

  const r = quote && isConsolidation(quote.result) ? quote.result : null;
  const sep = quote?.separate ?? null;
  const diff = r && sep?.total != null ? sep.total - r.total : null;

  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 6 }}>
        <div className="label">합배송 견적</div>
        <h1 style={{ fontSize: "clamp(22px,3.4vw,30px)" }}>여러 판매처 와인을 한 상자로 받으면 얼마?</h1>
        <p className="muted small">한 나라의 여러 판매처에서 내가 산 와인을 현지 배송대행지에서 한 상자로 묶어 한국으로 받을 때의 도착가입니다. 같은 와인을 각자 가장 싼 경로로 따로 샀을 때와 비교합니다. 다른 사람과 함께 사는 공동구매는 다루지 않습니다.</p>
      </section>

      <form className="box" action="/consolidate" method="get">
        <div className="field">
          <label className="label" htmlFor="f">배송대행지</label>
          <select id="f" name="f" defaultValue={f?.id ?? ""} required>
            <option value="" disabled>배송대행지를 고르세요</option>
            {forwarders.map((x) => <option key={x.id} value={x.id}>{x.country} · {x.name}</option>)}
          </select>
          {!forwarders.length && <p className="small muted">주류를 받는 배송대행지 정보가 아직 없습니다.</p>}
        </div>
        {f && (
          <>
            <p className="small muted">
              {f.country} 판매처 와인만 묶을 수 있습니다. 운임: 상자당 {money(f.shipBase, f.currency)} + 병당 {money(f.shipPerBottle, f.currency)}
              {f.handlingPerPackage > 0 && ` · 소포당 처리비 ${money(f.handlingPerPackage, f.currency)}`}
              {f.consolidateFee > 0 && ` · 합포장 수수료 상자당 ${money(f.consolidateFee, f.currency)}`} · 한 상자 최대 {f.maxBottles}병 · {f.daysMin}~{f.daysMax}일
            </p>
            {sellers.length ? sellers.map((s) => (
              <fieldset key={s.id} className="stack" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", gap: 6 }}>
                <legend className="small"><b>{s.name}</b> <span className="muted">{s.channel === "LOCAL_SHOP" ? "현지 판매처" : ROUTE_LABEL[s.channel as keyof typeof ROUTE_LABEL] ?? s.channel}{s.minBottles > 1 ? ` · ${s.minBottles}병 이상` : ""}</span></legend>
                {offers.filter((o) => o.sellerId === s.id).map((o) => (
                  <div key={o.id} className="row between" style={{ gap: 8 }}>
                    <label htmlFor={`q_${o.id}`} className="small" style={{ flex: "1 1 220px" }}>
                      {o.wine.nameKo} <span className="muted">{o.wine.vintage ?? "NV"} · {sizeLabel(o.bottleMl)} · {money(o.price, s.currency)}</span>
                    </label>
                    <input id={`q_${o.id}`} name={`q_${o.id}`} type="number" min={0} max={MAX_PICK_QTY} step={1} defaultValue={qtyOf.get(o.id) ?? ""} placeholder="0" style={{ width: 72 }} aria-label={`${o.wine.nameKo} 병 수`} />
                  </div>
                ))}
              </fieldset>
            )) : <p className="small muted">{f.country} 판매처 가격 정보가 없습니다.</p>}
          </>
        )}
        <div className="row"><button className="btn">{f ? "견적 보기" : "와인 고르기"}</button>{picks.length > 0 && f && <Link className="btn ghost" href={`/consolidate?f=${f.id}`}>비우기</Link>}</div>
      </form>

      {quote && !r && "error" in quote.result && <div className="alert bad">{quote.result.error}</div>}
      {quote && quote.result.excluded.length > 0 && (
        <div className="alert">
          <b>견적에서 뺀 와인</b>
          <ul className="list">{quote.result.excluded.map((e) => <li key={e.offerId}>{e.name}: {e.reason}</li>)}</ul>
        </div>
      )}

      {r && (
        <section className="stack" aria-labelledby="quote-h">
          <h2 id="quote-h">합배송 견적 · {r.bottles}병, 소포 {r.packages}개 → 상자 {r.boxes}개</h2>
          <div className="grid-2" style={{ alignItems: "start" }}>
            <div className="box">
              <div className="label">합배송 도착가 (세금 포함)</div>
              <div className="big">{Math.round(r.total).toLocaleString("ko-KR")}<small>원</small></div>
              <div className="small muted">병당 평균 {won(r.perBottle)} · 배송대행지에서 한국까지 {r.daysMin}~{r.daysMax}일 (모든 소포가 배송대행지에 도착할 때까지 기다리는 기간 별도)</div>
            </div>
            <div className="box">
              <div className="label">각자 가장 싼 경로로 따로 살 때</div>
              {sep?.total != null ? (
                <>
                  <div className="big">{Math.round(sep.total).toLocaleString("ko-KR")}<small>원</small></div>
                  {diff !== null && <div className={`num ${diff >= 0 ? "pos" : "neg"}`}><b>{diff >= 0 ? `합배송이 ${won(diff)} 쌉니다` : `따로 사는 쪽이 ${won(-diff)} 쌉니다`}</b></div>}
                </>
              ) : <p className="small muted">일부 와인은 따로 살 수 있는 경로가 없어 비교하지 못했습니다.</p>}
            </div>
          </div>
          {sep && sep.exemptLost.length > 0 && <div className="alert">따로 사면 1병 면세구간(주세·교육세만)이던 {sep.exemptLost.join(", ")}이(가) 합배송에서는 다른 와인과 합산돼 관세·부가세 대상이 됩니다.</div>}

          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>와인</th><th className="r">병</th><th className="r">물품가</th><th className="r">운임 몫</th><th className="r">세금 몫</th><th>관세</th><th className="r">따로 살 때</th></tr></thead>
              <tbody>
                {r.items.map((it) => {
                  const s = sep?.rows.find((x) => x.offerId === it.offer.id);
                  return (
                    <tr key={it.offer.id}>
                      <td><Link href={`/wines/${it.wine.id}`}>{it.wine.nameKo}</Link><div className="small muted">{it.offer.seller.name}</div></td>
                      <td className="r">{it.qty}</td>
                      <td className="r">{won(it.goodsKrw)}</td>
                      <td className="r">{won(it.shipKrw)}</td>
                      <td className="r">{won(it.duty + it.liquor + it.edu + it.vat)}</td>
                      <td>{it.fta ? <span className="chip ok">FTA 0%</span> : <span className="chip warn">관세</span>}</td>
                      <td className="r">{s?.best ? <>{won(s.best.total)}<div className="small muted">{ROUTE_LABEL[s.best.channel]}{s.best.tax.exempt ? " · 면세구간" : ""}</div></> : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid-2" style={{ alignItems: "start" }}>
            <div className="box tight">
              <h3 style={{ fontSize: 15 }}>운임</h3>
              <table className="taxtable"><tbody>
                <tr><td>판매처 → 배송대행지 (소포 {r.packages}개)</td><td className="r">{won(r.sellerLegKrw)}</td></tr>
                {r.feeLines.map((l) => <tr key={l.label}><td>{l.label}</td><td className="r">{won(l.krw)}</td></tr>)}
                <tr><td><b>운임 합계</b></td><td className="r"><b>{won(r.sellerLegKrw + r.forwarderKrw)}</b></td></tr>
              </tbody></table>
            </div>
            <div className="box tight">
              <h3 style={{ fontSize: 15 }}>세금 (한 번에 합산 신고)</h3>
              <table className="taxtable"><tbody>
                <tr><td>과세가격 (물품가 + 운임)</td><td className="r">{won(r.cif)}</td></tr>
                <tr><td>관세</td><td className="r">{won(r.items.reduce((a, i) => a + i.duty, 0))}</td></tr>
                <tr><td>주세</td><td className="r">{won(r.items.reduce((a, i) => a + i.liquor, 0))}</td></tr>
                <tr><td>교육세</td><td className="r">{won(r.items.reduce((a, i) => a + i.edu, 0))}</td></tr>
                <tr><td>부가세</td><td className="r">{won(r.items.reduce((a, i) => a + i.vat, 0))}</td></tr>
                <tr><td><b>납부 세금</b></td><td className="r"><b>{r.waived ? "0원 (소액 면제)" : won(r.taxPay)}</b></td></tr>
              </tbody></table>
            </div>
          </div>
          <p className="small muted">
            추정치입니다. 같은 날 같은 사람에게 도착하는 물품은 합산과세되므로 상자가 여러 개여도 한 번에 신고한다고 보고 계산했습니다. 상자 수·합포장 수수료·처리비는 배송대행지 요금표에 따라 다를 수 있으니 주문 전에 배송대행지에서 확인하세요.
            관세 0%는 원산지 국가에서 산 FTA 와인에만 적용했고, 실제 적용 여부는 원산지 증빙에 따라 달라집니다.
          </p>
        </section>
      )}
    </div>
  );
}
