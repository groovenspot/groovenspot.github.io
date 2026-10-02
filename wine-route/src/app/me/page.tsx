import Link from "next/link";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { getTaxConfig, getFx } from "@/server/settings";
import { ROUTE_LABEL } from "@/lib/engine";
import { money, sizeLabel, won, ymd } from "@/lib/format";
import { addPurchase, deleteAlert, deletePurchase, toggleAlert, updatePhone } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "내 알림·기록" };

export default async function Me() {
  const user = await requireUser("/me");
  const [alerts, purchases, wines, tax, fx] = await Promise.all([
    prisma.priceAlert.findMany({ where: { userId: user.id }, include: { wine: true }, orderBy: { createdAt: "desc" } }),
    prisma.purchase.findMany({ where: { userId: user.id }, include: { wine: true }, orderBy: { orderedAt: "desc" } }),
    prisma.wine.findMany({ select: { id: true, nameKo: true }, orderBy: { nameKo: "asc" } }),
    getTaxConfig(),
    getFx(),
  ]);
  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <div className="stack-lg">
      <section className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>내 알림·기록</h1>
          <p className="muted small">{user.email} · {user.plan === "PREMIUM" ? "프리미엄 회원 (알림 무제한)" : `무료 회원 (알림 ${activeCount}/${tax.freeAlertLimit})`}</p>
        </div>
        <form action={updatePhone} className="row">
          <label className="label" htmlFor="phone">알림톡 번호</label>
          <input id="phone" name="phone" defaultValue={user.phone ?? ""} placeholder="01012345678" style={{ width: 160 }} inputMode="numeric" />
          <button className="btn ghost small">저장</button>
        </form>
      </section>

      <section className="stack">
        <h2>가격 알림</h2>
        {alerts.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>와인</th><th>조건</th><th className="r">목표가</th><th className="r">현재 도착가</th><th>방법</th><th>상태</th><th></th></tr></thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td><Link href={`/wines/${a.wineId}?qty=${a.qty}&ml=${a.bottleMl}`}>{a.wine.nameKo}</Link></td>
                    <td className="small">{a.qty}병 · {sizeLabel(a.bottleMl)}</td>
                    <td className="r">{won(a.targetPerBottle)}</td>
                    <td className="r">{a.lastPrice ? won(a.lastPrice) : "다음 확인 때 계산"}</td>
                    <td className="small">{a.channel === "KAKAO" ? "알림톡" : "이메일"}</td>
                    <td>{a.active ? <span className="chip ok">켜짐</span> : <span className="chip">꺼짐</span>}{a.notifiedAt && <span className="small muted"> · {ymd(a.notifiedAt)} 발송</span>}</td>
                    <td className="row" style={{ flexWrap: "nowrap" }}>
                      <form action={toggleAlert}><input type="hidden" name="id" value={a.id} /><button className="btn ghost small">{a.active ? "끄기" : "켜기"}</button></form>
                      <form action={deleteAlert}><input type="hidden" name="id" value={a.id} /><button className="btn ghost small">삭제</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="box"><p className="muted">아직 건 알림이 없습니다. 와인 상세 화면에서 목표 도착가를 정해 알림을 걸어 보세요.</p></div>
        )}
      </section>

      <section className="stack">
        <h2>구매 기록</h2>
        <p className="small muted">직구한 내역과 실제 낸 세금을 남기면 예상 세금과 비교해 드립니다. 모인 기록은 도착가 계산 정확도를 검증하는 데 씁니다.</p>
        <form action={addPurchase} className="box">
          <div className="form-grid">
            <div className="field"><label className="label" htmlFor="p-wine">와인</label>
              <select id="p-wine" name="wineId"><option value="">목록에 없음</option>{wines.map((w) => <option key={w.id} value={w.id}>{w.nameKo}</option>)}</select></div>
            <div className="field"><label className="label" htmlFor="p-seller">판매처</label><input id="p-seller" name="sellerName" required /></div>
            <div className="field"><label className="label" htmlFor="p-route">경로</label>
              <select id="p-route" name="route">{Object.entries(ROUTE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="field"><label className="label" htmlFor="p-date">주문일</label><input id="p-date" name="orderedAt" type="date" required /></div>
            <div className="field"><label className="label" htmlFor="p-qty">수량</label><input id="p-qty" name="qty" type="number" min={1} defaultValue={1} /></div>
            <div className="field"><label className="label" htmlFor="p-ml">병 용량</label>
              <select id="p-ml" name="ml"><option value={750}>750ml</option><option value={375}>375ml</option><option value={1500}>1.5L</option></select></div>
            <div className="field"><label className="label" htmlFor="p-cur">통화</label>
              <select id="p-cur" name="currency">{Object.keys(fx.rates).filter((c) => c !== "KRW").sort().map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="field"><label className="label" htmlFor="p-goods">물품 결제액 (전체)</label><input id="p-goods" name="goodsPaid" type="number" step="0.01" min={0} required /></div>
            <div className="field"><label className="label" htmlFor="p-ship">운임 결제액</label><input id="p-ship" name="shipPaid" type="number" step="0.01" min={0} defaultValue={0} /></div>
            <div className="field"><label className="label" htmlFor="p-tax">실제 낸 세금 (원)</label><input id="p-tax" name="taxPaid" type="number" min={0} required /></div>
          </div>
          <div><button className="btn">기록 추가</button></div>
        </form>
        {purchases.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>주문일</th><th>와인 · 판매처</th><th>경로</th><th className="r">결제</th><th className="r">실제 세금</th><th className="r">예상 세금</th><th className="r">차이</th><th></th></tr></thead>
              <tbody>
                {purchases.map((p) => {
                  const diff = p.estTax !== null ? p.taxPaid - p.estTax : null;
                  return (
                    <tr key={p.id}>
                      <td className="num small">{ymd(p.orderedAt)}</td>
                      <td>{p.wine?.nameKo ?? "목록 외 와인"} <span className="small muted">· {p.sellerName} · {p.qty}병</span></td>
                      <td className="small">{ROUTE_LABEL[p.route as keyof typeof ROUTE_LABEL] ?? p.route}</td>
                      <td className="r">{money(p.goodsPaid + p.shipPaid, p.currency)}</td>
                      <td className="r">{won(p.taxPaid)}</td>
                      <td className="r muted">{p.estTax !== null ? won(p.estTax) : "-"}</td>
                      <td className="r">{diff !== null && p.estTax ? `${diff >= 0 ? "+" : ""}${((diff / Math.max(1, p.estTax)) * 100).toFixed(1)}%` : "-"}</td>
                      <td><form action={deletePurchase}><input type="hidden" name="id" value={p.id} /><button className="btn ghost small">삭제</button></form></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
