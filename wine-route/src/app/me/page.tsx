import Link from "next/link";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { getTaxConfig, getFx } from "@/server/settings";
import { ROUTE_LABEL } from "@/lib/engine";
import { money, sizeLabel, won, ymd } from "@/lib/format";
import { addPurchase, customerOrderStep, deleteAlert, deletePurchase, markDelivered, toggleAlert } from "./actions";
import { ProfileForm } from "@/components/ProfileForm";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { PROVIDER_LABEL, enabledProviders, type ProviderKey } from "@/lib/oauth";
import { removePushDevice, unlinkOAuth } from "./actions";
import { PushToggle } from "@/components/PushToggle";
import { pushConfigured, pushPublicKey } from "@/lib/push";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { Spark } from "@/components/Spark";
import { compareLoaded, loadContext } from "@/server/compare";
import { InviteForm, RedeemButton } from "@/components/PointsPanel";
import { balance, isPremium } from "@/server/points";
import { getCommunityConfig } from "@/server/settings";
import { decrypt } from "@/server/crypto";
import { maskPccc, ORDER_LABEL } from "@/lib/order";
import { SHIPMENT_STAGES, SHIPMENT_LABEL, shipmentStageForOrder } from "@/lib/tracking";

export const dynamic = "force-dynamic";
export const metadata = { title: "내 알림·기록" };

export default async function Me({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const profileNext = sp.next && !/[\\\x00-\x1f]/.test(sp.next) && (sp.next.startsWith("/order/") || sp.next === "/guide/first" || sp.next.startsWith("/guide/first?")) ? sp.next : undefined;
  const user = await requireUser(profileNext ? `/me?next=${encodeURIComponent(profileNext)}#profile` : "/me");
  const oauthAccounts = await prisma.oAuthAccount.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  const pushDevices = await prisma.pushSubscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, userAgent: true, lastOkAt: true, createdAt: true } });
  const inbox = await prisma.notification.findMany({ where: { userId: user.id, status: { in: ["SENT", "QUEUED"] } }, orderBy: { createdAt: "desc" }, take: 30 });
  const [orders, alerts, purchases, wines, tax, fx] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, include: { wine: true, seller: true, review: { select: { id: true } }, events: { orderBy: { createdAt: "asc" } }, shipmentEvents: { orderBy: { occurredAt: "asc" } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.priceAlert.findMany({ where: { userId: user.id }, include: { wine: true }, orderBy: { createdAt: "desc" } }),
    prisma.purchase.findMany({ where: { userId: user.id }, include: { wine: true }, orderBy: { orderedAt: "desc" } }),
    prisma.wine.findMany({ select: { id: true, nameKo: true }, orderBy: { nameKo: "asc" } }),
    getTaxConfig(),
    getFx(),
  ]);
  const [taste, wineFacets] = await Promise.all([
    prisma.tasteProfile.findUnique({ where: { userId: user.id } }),
    prisma.wine.findMany({ select: { country: true, type: true }, distinct: ["country", "type"] }),
  ]);
  const tasteCountries = [...new Set(wineFacets.map((w) => w.country))].sort();
  const tasteTypes = [...new Set(wineFacets.map((w) => w.type))].sort();
  const activeCount = alerts.filter((a) => a.active).length;
  const [points, ledger, ccfg] = await Promise.all([
    balance(user.id),
    prisma.pointTx.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    getCommunityConfig(),
  ]);
  const premium = isPremium(user);
  // 찜한 와인의 지금 도착가와 30일 기록
  const keys = [...new Set(alerts.map((a) => `${a.wineId}|${a.qty}|${a.bottleMl}`))];
  const livePrice = new Map<string, number | null>();
  if (keys.length) {
    const ctx = await loadContext();
    const ws = await prisma.wine.findMany({ where: { id: { in: alerts.map((a) => a.wineId) } }, include: { offers: { include: { seller: true } } } });
    for (const k of keys) {
      const [wid, q, ml] = k.split("|");
      const w = ws.find((x) => x.id === wid);
      const r = w ? compareLoaded(w, Number(q), Number(ml), ctx) : null;
      livePrice.set(k, r?.best ? Math.round(r.best.perBottle) : null);
    }
  }
  const since = new Date(Date.now() - 30 * 86400e3);
  const rows = keys.length ? await prisma.watchPrice.findMany({ where: { wineId: { in: alerts.map((a) => a.wineId) }, day: { gte: since } }, orderBy: { day: "asc" } }) : [];
  const history = new Map<string, (number | null)[]>();
  for (const r of rows) {
    const k = `${r.wineId}|${r.qty}|${r.bottleMl}`;
    history.set(k, [...(history.get(k) ?? []), r.perBottle]);
  }

  return (
    <div className="stack-lg">
      <section className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>내 찜·주문·기록</h1>
          <p className="muted small">{user.email}{user.nickname ? ` · ${user.nickname}` : ""} · {premium ? `프리미엄 회원 (알림 무제한${user.premiumUntil && user.plan !== "PREMIUM" ? `, ${ymd(user.premiumUntil)}까지` : ""})` : `무료 회원 (알림 ${activeCount}/${tax.freeAlertLimit})`}{user.founding ? " · 초기 회원" : ""}</p>
        </div>
      </section>

      <section className="box tight"><div className="row between"><span>처음 직구하나요? 준비부터 운송장 등록까지 6단계로 확인하세요.</span><Link className="btn ghost small" href="/guide/first">첫 직구 도우미</Link></div></section>

      <section className="stack" id="orders">
        <h2>내 주문</h2>
        {orders.length ? orders.map((o) => {
          const current = shipmentStageForOrder(o.status, o.shipmentStage);
          const timestamps = new Map<string, Date>();
          for (const e of o.shipmentEvents) if (!timestamps.has(e.stage)) timestamps.set(e.stage, e.occurredAt);
          const start = o.events.find((e) => e.status === "CONFIRMED")?.createdAt ?? o.createdAt;
          const estimated = (days: number) => new Date(start.getTime() + days * 86400e3);
          return (
            <div key={o.id} className="box">
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div className="stack" style={{ gap: 2 }}>
                  <Link href={`/wines/${o.wineId}?qty=${o.qty}&ml=${o.bottleMl}`}><b>{o.wine.nameKo}</b></Link>
                  <span className="small muted">{o.seller.name} · {ROUTE_LABEL[o.route as keyof typeof ROUTE_LABEL] ?? o.route} · {o.qty}병 · 예상 도착가 {won(o.estTotal)} (세금 약 {won(o.estTax)}){o.orderRef ? ` · 주문번호 ${o.orderRef}` : ""}</span>
                </div>
                {o.status === "CANCELLED" ? <span className="chip bad">취소</span> : <span className={`chip ${o.status === "DELIVERED" ? "ok" : "best"}`}>{current ? SHIPMENT_LABEL[current] : ORDER_LABEL[o.status]}</span>}
              </div>
              {o.status !== "CANCELLED" && (
                <ol className="seg" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {SHIPMENT_STAGES.map((st) => (
                    <li key={st} aria-current={current === st ? "step" : undefined} className={`chip ${timestamps.has(st) ? "ok" : ""} ${current === st ? "best" : ""}`}>{SHIPMENT_LABEL[st]}{timestamps.get(st) ? ` ${ymd(timestamps.get(st)!).slice(5)}` : ""}</li>
                  ))}
                </ol>
              )}
              {o.status !== "CANCELLED" && <p className="small muted">{o.status === "DELIVERED" ? `수령 ${o.deliveredAt ? ymd(o.deliveredAt) : "완료"}` : o.estimatedDeliveryAt ? `예상 도착일 ${ymd(o.estimatedDeliveryAt)} (배송 조회 기준)` : `예상 도착 ${ymd(estimated(o.seller.daysMin))}~${ymd(estimated(o.seller.daysMax))} (판매처 안내 기준)`}{o.trackingNo ? ` · ${o.carrier ?? ""} ${o.trackingNo}` : " · 운송장 미등록"}</p>}
              {o.actualTax !== null && <p className="small">{o.status === "DELIVERED" ? "확인한 세금" : "고지 세금"} {won(o.actualTax)} · 예상 대비 {o.actualTax - o.estTax >= 0 ? "+" : "−"}{won(Math.abs(o.actualTax - o.estTax))}</p>}
              <div className="row"><Link className="btn ghost small" href={`/tracking/${o.id}`}>{o.trackingNo ? "통관·배송 한 화면으로 보기" : "운송장 등록·배송 확인"}</Link></div>
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
                    <input name="taxPaid" type="number" min={0} defaultValue={o.actualTax ?? ""} required placeholder="실제 낸 세금 (원)" style={{ width: 170 }} aria-label="실제 낸 세금" />
                    <button className="btn small">받았어요</button>
                  </form>
                )}
              </div>
            </div>
          );
        }) : <div className="box"><p className="muted">아직 주문이 없습니다. 와인 상세에서 &lsquo;이 경로로 주문하기&rsquo;를 누르면 여기서 진행 상황을 볼 수 있습니다.</p></div>}
      </section>

      <section className="box tight">
        <div className="row between">
          <span>이번 달 직구로 아낀 금액을 카드 한 장으로</span>
          <Link className="btn ghost small" href="/share?kind=month">월간 결산 카드</Link>
        </div>
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
          next={profileNext}
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

      <section className="stack" id="preferences">
        <h2>수신·취향 설정</h2>
        <PreferencesPanel
          marketing={!!user.marketingConsentAt}
          marketingUpdated={user.marketingConsentUpdatedAt ? ymd(user.marketingConsentUpdatedAt) : null}
          taste={taste ? { countries: taste.countries, types: taste.types, budget: taste.budget } : null}
          countries={tasteCountries}
          types={tasteTypes}
        />
      </section>

      <section className="stack" id="watch">
        <div className="row between">
          <h2>찜한 와인 {alerts.length ? alerts.length : ""}</h2>
          <span className="small muted">{premium ? "프리미엄: 찜 무제한 · 모든 알림 즉시" : `무료: 찜 ${activeCount}/${tax.freeAlertLimit} · 가격 하락은 주 1회 묶음`}</span>
        </div>
        {alerts.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>와인</th><th className="r">지금 도착가</th><th className="r">목표가</th><th className="r">남은 금액</th><th>최근 30일</th><th>상태</th><th></th></tr></thead>
              <tbody>
                {alerts.map((a) => {
                  const now = livePrice.get(`${a.wineId}|${a.qty}|${a.bottleMl}`) ?? null;
                  const hist = history.get(`${a.wineId}|${a.qty}|${a.bottleMl}`) ?? [];
                  return (
                    <tr key={a.id}>
                      <td><Link href={`/wines/${a.wineId}?qty=${a.qty}&ml=${a.bottleMl}`}>{a.wine.nameKo}</Link><div className="small muted">{a.qty}병 · {sizeLabel(a.bottleMl)} · {a.channel === "KAKAO" ? "알림톡" : "이메일"}</div></td>
                      <td className="r">{now !== null ? won(now) : <span className="muted">품절</span>}</td>
                      <td className="r">{won(a.targetPerBottle)}</td>
                      <td className="r">{now === null ? "-" : now <= a.targetPerBottle ? <span className="pos">도달</span> : won(now - a.targetPerBottle)}</td>
                      <td><Spark values={hist} target={a.targetPerBottle} /></td>
                      <td>{a.active ? <span className="chip ok">알림 켜짐</span> : <span className="chip">꺼짐</span>}{a.notifiedAt && <div className="small muted">{ymd(a.notifiedAt)} 알림</div>}</td>
                      <td className="row" style={{ flexWrap: "nowrap" }}>
                        <form action={toggleAlert}><input type="hidden" name="id" value={a.id} /><button className="btn ghost small">{a.active ? "끄기" : "켜기"}</button></form>
                        <form action={deleteAlert}><input type="hidden" name="id" value={a.id} /><button className="btn ghost small">삭제</button></form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="box"><p className="muted">아직 찜한 와인이 없습니다. 와인 상세에서 &lsquo;찜하고 알림 받기&rsquo;를 누르면 목표가 도달, 가격 하락을 알려드립니다.</p></div>
        )}
        <details className="box tight">
          <summary className="small">알림 종류 (무료·프리미엄)</summary>
          <table className="taxtable" style={{ marginTop: 8 }}>
            <tbody>
              <tr><td>목표가 도달</td><td>무료 찜 {tax.freeAlertLimit}개까지 · 프리미엄 무제한</td></tr>
              <tr><td>가격 하락 (직전 대비 5% 이상)</td><td>무료 주 1회 묶음 · 프리미엄 즉시</td></tr>
              <tr><td>재입고·신규 빈티지</td><td>프리미엄 즉시</td></tr>
              <tr><td>와이너리 배정 판매 시작</td><td>프리미엄 즉시</td></tr>
              <tr><td>유로·달러 30일 저점</td><td>프리미엄 즉시</td></tr>
            </tbody>
          </table>
        </details>
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
      <section className="stack" id="inbox">
        <div className="row between">
          <h2>받은 알림</h2>
          <span className="small muted">최근 30건 · 메일·알림톡으로 보낸 내용을 여기서도 볼 수 있습니다</span>
        </div>
        {inbox.length ? (
          <ul className="inbox">
            {inbox.map((n) => (
              <li key={n.id} className={n.clickedAt ? "read" : ""}>
                <a href={`/n/${n.id}`}>
                  <span className="row between" style={{ gap: 8 }}>
                    <b>{n.title}</b>
                    <span className="small muted nowrap">{ymd(n.createdAt)}{n.status === "QUEUED" ? " · 주간 묶음 대기" : n.channel === "kakao" ? " · 알림톡" : n.channel === "push" ? " · 브라우저 알림" : " · 메일"}</span>
                  </span>
                  <span className="small muted" style={{ whiteSpace: "pre-line" }}>{n.body}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : <p className="small muted">아직 받은 알림이 없습니다. 와인을 찜하면 목표가 도달·가격 하락을 알려드립니다.</p>}
      </section>

      <section className="stack" id="push">
        <h2>브라우저 알림</h2>
        {pushConfigured() ? (
          <>
            <p className="small muted">메일 대신 이 기기 화면으로 목표가 도달·가격 하락 알림을 받습니다. 보내지 못하면 메일로 대신 보냅니다.</p>
            <PushToggle publicKey={pushPublicKey()} />
            {pushDevices.length > 0 && (
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {pushDevices.map((d) => (
                  <li key={d.id}>
                    <form action={removePushDevice} className="row" style={{ gap: 6 }}>
                      <input type="hidden" name="id" value={d.id} />
                      <span>{deviceLabel(d.userAgent)} · 등록 {ymd(d.createdAt)}{d.lastOkAt ? ` · 마지막 수신 ${ymd(d.lastOkAt)}` : ""}</span>
                      <button className="btn ghost small">삭제</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : <p className="small muted">브라우저 알림은 아직 준비 중입니다. 지금은 메일·알림톡으로 보내드립니다.</p>}
      </section>

      <section className="stack" id="account">
        <h2>계정</h2>
        {sp.linked === "1" && <div className="alert ok">소셜 계정을 연결했습니다. 다음부터 그 계정으로도 로그인할 수 있습니다.</div>}
        {(oauthAccounts.length > 0 || enabledProviders().length > 0) && (
          <div className="box tight">
            <span className="label">로그인 방법</span>
            <div className="row" style={{ gap: 8 }}>
              <span className="chip">이메일 코드 · {user.email}</span>
              {oauthAccounts.map((a) => (
                <form key={a.id} action={unlinkOAuth} className="row" style={{ gap: 4 }}>
                  <input type="hidden" name="id" value={a.id} />
                  <span className="chip ok">{PROVIDER_LABEL[a.provider as ProviderKey] ?? a.provider} 연결됨</span>
                  <button className="btn ghost small">연결 해제</button>
                </form>
              ))}
              {enabledProviders().filter((p) => !oauthAccounts.some((a) => a.provider === p)).map((p) => (
                <a key={p} className="btn ghost small" href={`/login/oauth/${p}?next=/me`}>{PROVIDER_LABEL[p]} 계정 연결</a>
              ))}
            </div>
            <span className="small muted">소셜 계정을 해제해도 이메일 코드로 계속 로그인할 수 있습니다.</span>
          </div>
        )}
        <div className="box tight">
          <div className="row between">
            <span>셀러도어가 보관 중인 내 데이터를 파일(JSON)로 받습니다.</span>
            <a className="btn ghost small" href="/me/export">내 데이터 내려받기</a>
          </div>
        </div>
        <details className="box">
          <summary className="small">회원 탈퇴</summary>
          <DeleteAccountForm email={user.email} />
        </details>
      </section>
    </div>
  );
}

function deviceLabel(ua: string | null) {
  if (!ua) return "알 수 없는 기기";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "기기";
  const br = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "삼성 인터넷" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "브라우저";
  return `${os} ${br}`;
}
