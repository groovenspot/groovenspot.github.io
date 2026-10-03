import Link from "next/link";
import { prisma } from "@/server/db";
import { getFx } from "@/server/settings";
import { saveStatement } from "@/app/admin/actions";
import { money, won, ymd } from "@/lib/format";

export const metadata = { title: "수수료 정산" };

const STATUS: Record<string, string> = { pending: "예상", invoiced: "청구함", paid: "입금 확인", disputed: "이의 제기" };

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1) - 9 * 3600e3), end: new Date(Date.UTC(y, m, 1) - 9 * 3600e3) };
}

export default async function Commissions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const k = new Date(Date.now() + 9 * 3600e3);
  const lastMonth = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : lastMonth;
  const { start, end } = monthBounds(month);
  const [conversions, statements, fx] = await Promise.all([
    prisma.conversion.findMany({ where: { createdAt: { gte: start, lt: end } }, include: { click: { include: { offer: { include: { seller: true } } } } } }),
    prisma.commissionStatement.findMany({ where: { month } }),
    getFx(),
  ]);
  // 판매처별 합계 (포스트백에 수수료가 없으면 주문액 × 계약 수수료율로 추정)
  const by = new Map<string, { seller: (typeof conversions)[number]["click"]["offer"]["seller"]; n: number; amount: number; commission: number; estimated: number }>();
  for (const c of conversions) {
    const s = c.click.offer.seller;
    const g = by.get(s.id) ?? { seller: s, n: 0, amount: 0, commission: 0, estimated: 0 };
    g.n++;
    g.amount += c.amount ?? 0;
    if (c.commission !== null) g.commission += c.commission;
    else if (c.amount !== null) { g.commission += c.amount * s.commissionRate; g.estimated++; }
    by.set(s.id, g);
  }
  const rows = [...by.values()].sort((a, b) => b.commission * (fx.rates[b.seller.currency] ?? 0) - a.commission * (fx.rates[a.seller.currency] ?? 0));
  const totalKrw = rows.reduce((s, r) => s + r.commission * (fx.rates[r.seller.currency] ?? 0), 0);
  const paidKrw = rows.reduce((s, r) => {
    const st = statements.find((x) => x.sellerId === r.seller.id);
    return s + (st?.status === "paid" ? (st.paidAmount ?? r.commission) * (fx.rates[r.seller.currency] ?? 0) : 0);
  }, 0);
  const prev = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 1)).toISOString().slice(0, 7);

  return (
    <div className="stack-lg">
      <section className="stack">
        <div className="row between">
          <h1 style={{ fontSize: 28 }}>제휴 수수료 정산 · {month}</h1>
          <nav className="seg"><Link href={`/admin/commissions?month=${prev}`}>← {prev}</Link><Link href={`/admin/commissions?month=${next}`}>{next} →</Link></nav>
        </div>
        <p className="small muted">판매처 포스트백으로 확인된 주문(전환) 기준입니다. 포스트백에 수수료가 없으면 주문액 × 계약 수수료율로 추정하고 &lsquo;추정&rsquo;으로 표시합니다. 원화 환산은 최근 환율이며, 실제 입금액은 판매처 통화로 기록합니다.</p>
        <div className="grid-3">
          <div className="box tight stat"><span className="label">확인된 주문</span><span className="v">{conversions.length}</span><span className="small muted">판매처 {rows.length}곳</span></div>
          <div className="box tight stat"><span className="label">받을 수수료 (원화 환산)</span><span className="v">{won(totalKrw)}</span><span className="small muted">추정 포함</span></div>
          <div className="box tight stat"><span className="label">입금 확인</span><span className="v">{won(paidKrw)}</span><span className="small muted">미수 {won(Math.max(0, totalKrw - paidKrw))}</span></div>
        </div>
      </section>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>판매처</th><th className="r">주문</th><th className="r">주문액</th><th className="r">수수료</th><th className="r">원화 환산</th><th>정산 상태</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((r) => {
              const st = statements.find((x) => x.sellerId === r.seller.id);
              return (
                <tr key={r.seller.id}>
                  <td>{r.seller.name}<span className="formula">계약 수수료율 {(r.seller.commissionRate * 100).toFixed(1)}%</span></td>
                  <td className="r">{r.n}</td>
                  <td className="r">{money(r.amount, r.seller.currency)}</td>
                  <td className="r">{money(Math.round(r.commission * 100) / 100, r.seller.currency)}{r.estimated > 0 && <span className="formula">{r.estimated}건 추정</span>}</td>
                  <td className="r">{won(r.commission * (fx.rates[r.seller.currency] ?? 0))}</td>
                  <td>
                    <form key={`${st?.status}-${st?.paidAmount}-${st?.note}`} action={saveStatement} className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                      <input type="hidden" name="sellerId" value={r.seller.id} />
                      <input type="hidden" name="month" value={month} />
                      <select name="status" defaultValue={st?.status ?? "pending"} aria-label="정산 상태" style={{ width: 110 }}>{Object.entries(STATUS).map(([k2, v]) => <option key={k2} value={k2}>{v}</option>)}</select>
                      <input name="paidAmount" type="number" step="0.01" placeholder={`입금액 ${r.seller.currency}`} defaultValue={st?.paidAmount ?? ""} style={{ width: 130 }} aria-label="입금액" />
                      <input name="note" placeholder="메모" defaultValue={st?.note ?? ""} style={{ width: 140 }} aria-label="메모" />
                      <button className="btn ghost small">저장</button>
                      {st?.invoicedAt && <span className="small muted">청구 {ymd(st.invoicedAt)}{st.paidAt ? ` · 입금 ${ymd(st.paidAt)}` : ""}</span>}
                    </form>
                  </td>
                </tr>
              );
            }) : <tr><td colSpan={6} className="muted">이 달에 확인된 주문이 없습니다. 판매처 포스트백이 연결되면 여기에 쌓입니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
