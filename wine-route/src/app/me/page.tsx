import Link from "next/link";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { getTaxConfig, getFx } from "@/server/settings";
import { ROUTE_LABEL } from "@/lib/engine";
import { money, sizeLabel, won, ymd } from "@/lib/format";
import { addPurchase, customerOrderStep, deleteAlert, deletePurchase, markDelivered, toggleAlert } from "./actions";
import { ProfileForm } from "@/components/ProfileForm";
import { InviteForm, RedeemButton } from "@/components/PointsPanel";
import { balance, isPremium } from "@/server/points";
import { getCommunityConfig } from "@/server/settings";
import { decrypt } from "@/server/crypto";
import { maskPccc, ORDER_FLOW, ORDER_LABEL } from "@/lib/order";

export const dynamic = "force-dynamic";
export const metadata = { title: "내 알림·기록" };

export default async function Me({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/me");
  const [orders, alerts, purchases, wines, tax, fx] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, include: { wine: true, seller: true, review: { select: { id: true } }, events: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.priceAlert.findMany({ where: { userId: user.id }, include: { wine: true }, orderBy: { createdAt: "desc" } }),
    prisma.purchase.findMany({ where: { userId: user.id }, include: { wine: true }, orderBy: { orderedAt: "desc" } }),
    prisma.wine.findMany({ select: { id: true, nameKo: true }, orderBy: { nameKo: "asc" } }),
    getTaxConfig(),
    getFx(),
  ]);
  const activeCount = alerts.filter((a) => a.active).length;
  const [points, ledger, ccfg] = await Promise.all([
    balance(user.id),
    prisma.pointTx.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    getCommunityConfig(),
  ]);
  const premium = isPremium(user);

  return (
    <div className="stack-lg">
      <section className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>내 알림·기록</h1>
          <p className="muted small">{user.email}{user.nickname ? ` · ${user.nickname}` : ""} · {premium ? `프리미엄 회원 (알림 무제한${user.premiumUntil && user.plan !== "PREMIUM" ? `, ${ymd(user.premiumUntil)}까지` : ""})` : `무료 회원 (알림 ${activeCount}/${tax.freeAlertLimit})`}{user.founding ? " · 초기 회원" : ""}</p>
        </div>
      </section>

      <section className="stack" id="orders">
        <h2>내 주문</h2>
        {orders.length ? orders.map((o) => {
          const done = new Map(o.events.map((e) => [e.status, e.createdAt]));
          const idx = ORDER_FLOW.indexOf(o.status as (typeof ORDER_FLOW)[number]);
          return (
            <div key={o.id} className="box">
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div className="stack" style={{ gap: 2 }}>
                  <Link href={`/wines/${o.wineId}?qty=${o.qty}&ml=${o.bottleMl}`}><b>{o.wine.nameKo}</b></Link>
                  <span className="small muted">{o.seller.name} · {o.qty}병 · 예상 도착가 {won(o.estTotal)} (세금 약 {won(o.estTax)}){o.orderRef ? ` · 주문번호 ${o.orderRef}` : ""}</span>
                </div>
                {o.status === "CANCELLED" ? <span className="chip bad">취소</span> : <span className={`chip ${o.status === "DELIVERED" ? "ok" : "best"}`}>{ORDER_LABEL[o.status]}</span>}
              </div>
              {o.status !== "CANCELLED" && (
                <ol className="seg" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {ORDER_FLOW.map((st, i) => (
                    <li key={st} className={`chip ${i <= idx ? "ok" : ""}`}>{ORDER_LABEL[st]}{done.get(st) ? ` ${ymd(done.get(st)!).slice(5)}` : ""}</li>
                  ))}
                </ol>
              )}
              {o.trackingNo && <p className="small">운송장 {o.carrier ? `${o.carrier} ` : ""}<span className="num">{o.trackingNo}</span> · 통관 진행은 <a href="https://unipass.customs.go.kr/csp/index.do" target="_blank" rel="noopener">관세청 유니패스</a>에서 조회할 수 있습니다.</p>}
              <div className="row">
                {o.status === "CLICKED" && (
                  <>
                    <form action={customerOrderStep} className="row">
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="to" value="CONFIRMED" />
                      <input name="orderRef" placeholder="판매처 주문번호 (선택)" style={{ width: 190 }} aria-label="판매처 주문번호" />
                      <button className="btn small">결제 완료했어요</button>
                    </form>
                    <form action={customerOrderStep}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="to" value="CANCELLED" /><button className="btn ghost small">주문 안 함</button></form>
                  </>
                )}
                {(o.status === "CONFIRMED" || o.status === "SHIPPED") && (
                  <form action={customerOrderStep}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="to" value="CUSTOMS" /><button className="btn ghost small">세금 납부 안내를 받았어요 (통관 중)</button></form>
                )}
                {o.status === "DELIVERED" && !o.review && (
                  <Link className="btn small" href={`/community/write?order=${o.id}`}>후기 쓰고 {ccfg.points.review.toLocaleString("ko-KR")}P 받기</Link>
                )}
                {o.review && <span className="chip ok">후기 작성함</span>}
                {["CONFIRMED", "SHIPPED", "CUSTOMS"].includes(o.status) && (
                  <form action={markDelivered} className="row">
                    <input type="hidden" name="id" value={o.id} />
                    <input name="taxPaid" type="number" min={0} required placeholder="실제 낸 세금 (원)" style={{ width: 170 }} aria-label="실제 낸 세금" />
                    <button className="btn small">받았어요</button>
                  </form>
                )}
              </div>
            </div>
          );
        }) : <div className="box"><p className="muted">아직 주문이 없습니다. 와인 상세에서 &lsquo;이 경로로 주문하기&rsquo;를 누르면 여기서 진행 상황을 볼 수 있습니다.</p></div>}
      </section>

      <section className="stack" id="points">
        <h2>포인트</h2>
        <div className="box">
          <div className="row between">
            <div className="stack" style={{ gap: 2 }}>
              <span className="label">보유 포인트</span>
              <span className="num" style={{ fontSize: 26 }}>{points.toLocaleString("ko-KR")}P</span>
            </div>
            <RedeemButton cost={ccfg.costs.premiumMonth} balance={points} />
          </div>
          <p className="small muted">직구 후기 {ccfg.points.review}P, 통관 인증 +{ccfg.points.proof}P, 도움됨 10개마다 +{ccfg.points.helpful10}P. 포인트는 프리미엄 구독에만 쓰고, 와인 값으로는 쓸 수 없습니다. 오프라인 시음회 참가권({ccfg.costs.tasting.toLocaleString("ko-KR")}P)은 3단계에서 열립니다.</p>
          {!user.nickname && <p className="small"><Link href="/verify?next=/me">커뮤니티 가입</Link>(성인인증·닉네임) 후 후기를 쓸 수 있습니다.</p>}
          {ledger.length > 0 && (
            <details>
              <summary className="small muted">적립·사용 내역</summary>
              <table className="taxtable" style={{ marginTop: 8 }}>
                <tbody>
                  {ledger.map((t) => <tr key={t.id}><td>{ymd(t.createdAt)} · {t.note ?? t.reason}</td><td className={t.amount >= 0 ? "pos" : "neg"}>{t.amount >= 0 ? "+" : ""}{t.amount.toLocaleString("ko-KR")}P</td></tr>)}
                </tbody>
              </table>
            </details>
          )}
          {user.inviteCode ? (
            <p className="small pos">초기 회원 (초대 코드 {user.inviteCode}){user.premiumUntil ? ` · 프리미엄 ${ymd(user.premiumUntil)}까지` : ""}</p>
          ) : (
            <div className="row"><span className="small muted">초대 코드가 있나요?</span><InviteForm /></div>
          )}
        </div>
      </section>

      <section className="stack" id="profile">
        <h2>주문서 정보</h2>
        <p className="small muted">한 번 저장하면 판매처 결제 화면에 미리 채우거나 복사해서 붙여넣을 수 있습니다. 가격 알림톡도 이 휴대폰 번호로 갑니다.</p>
        <ProfileForm
          next={sp.next}
          v={{
            firstNameEn: user.firstNameEn ?? "",
            lastNameEn: user.lastNameEn ?? "",
            address1En: user.address1En ?? "",
            address2En: user.address2En ?? "",
            cityEn: user.cityEn ?? "",
            provinceEn: user.provinceEn ?? "",
            zip: user.zip ?? "",
            phone: user.phone ?? "",
            pcccMasked: maskPccc(decrypt(user.pcccEnc)),
            pcccInNote: user.pcccInNote,
          }}
        />
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
