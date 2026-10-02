import { prisma } from "@/server/db";
import { getTaxConfig } from "@/server/settings";
import { runJobAction, saveTax, setRate } from "@/app/admin/actions";
import { ymd } from "@/lib/format";

export default async function SettingsPage() {
  const [t, rates] = await Promise.all([
    getTaxConfig(),
    prisma.$queryRaw<{ currency: string; krw: number; date: Date; source: string }[]>`
      SELECT DISTINCT ON (currency) currency, krw, date, source FROM "ExchangeRate" ORDER BY currency, date DESC`,
  ]);
  const pct = (v: number) => +(v * 100).toFixed(4);
  return (
    <div className="stack-lg">
      <section className="stack">
        <h1 style={{ fontSize: 28 }}>세율 설정</h1>
        <p className="small muted">세법이 바뀌면 여기서 바로 고칩니다. 저장하면 모든 도착가 계산에 즉시 반영됩니다.</p>
        <form action={saveTax} className="box">
          <div className="form-grid">
            <div className="field"><label className="label" htmlFor="t-duty">관세 (비FTA·제3국, %)</label><input id="t-duty" name="dutyRate" type="number" step="0.01" defaultValue={pct(t.dutyRate)} /></div>
            <div className="field"><label className="label" htmlFor="t-liq">주세 (%)</label><input id="t-liq" name="liquorRate" type="number" step="0.01" defaultValue={pct(t.liquorRate)} /></div>
            <div className="field"><label className="label" htmlFor="t-edu">교육세 (주세 대비 %)</label><input id="t-edu" name="eduRate" type="number" step="0.01" defaultValue={pct(t.eduRate)} /></div>
            <div className="field"><label className="label" htmlFor="t-vat">부가세 (%)</label><input id="t-vat" name="vatRate" type="number" step="0.01" defaultValue={pct(t.vatRate)} /></div>
            <div className="field"><label className="label" htmlFor="t-usd">면세구간 물품가 상한 (USD)</label><input id="t-usd" name="exemptUsd" type="number" defaultValue={t.exemptUsd} /></div>
            <div className="field"><label className="label" htmlFor="t-ml">면세구간 용량 상한 (ml)</label><input id="t-ml" name="exemptMaxMl" type="number" defaultValue={t.exemptMaxMl} /></div>
            <div className="field"><label className="label" htmlFor="t-min">소액 징수 면제 기준 (원)</label><input id="t-min" name="minCollect" type="number" defaultValue={t.minCollect} /></div>
            <div className="field"><label className="label" htmlFor="t-bulk">수량 경고 기준 (병)</label><input id="t-bulk" name="bulkWarnQty" type="number" defaultValue={t.bulkWarnQty} /></div>
            <div className="field"><label className="label" htmlFor="t-free">무료 회원 알림 개수</label><input id="t-free" name="freeAlertLimit" type="number" defaultValue={t.freeAlertLimit} /></div>
          </div>
          <div className="field"><label className="label" htmlFor="t-fta">FTA 관세 0% 원산지 (쉼표 구분)</label><textarea id="t-fta" name="ftaCountries" defaultValue={t.ftaCountries.join(", ")} /></div>
          <div><button className="btn">세율 저장</button></div>
        </form>
      </section>
      <section className="stack">
        <div className="row between">
          <h2>환율</h2>
          <form action={runJobAction}><input type="hidden" name="job" value="fx" /><button className="btn ghost small">수출입은행에서 지금 갱신</button></form>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>통화</th><th className="r">1단위당 원</th><th>기준일</th><th>출처</th></tr></thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.currency}><td>{r.currency}</td><td className="r">{r.krw.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td><td className="num small">{ymd(r.date)}</td><td className="small">{r.source}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={setRate} className="row">
          <input name="currency" placeholder="통화 (예: CHF)" maxLength={3} style={{ width: 130 }} aria-label="통화" required />
          <input name="krw" type="number" step="0.0001" placeholder="1단위당 원" style={{ width: 150 }} aria-label="1단위당 원" required />
          <button className="btn ghost small">오늘 환율 직접 입력</button>
        </form>
      </section>
    </div>
  );
}
