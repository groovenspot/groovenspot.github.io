import Link from "next/link";
import { prisma } from "@/server/db";
import { getCommunityConfig } from "@/server/settings";
import { monthKings, monthRange } from "@/server/ranking";
import { adjustPoints, approveProof, createInvite, grantKings, rejectProof, resolveReports, saveCommunity, suspendSeller } from "@/app/admin/actions";
import { ROUTE_LABEL, type ChannelKey } from "@/lib/engine";
import { won, ymd } from "@/lib/format";

export default async function AdminCommunity() {
  const cfg = await getCommunityConfig();
  const { start, end } = monthRange(0);
  const receivedOrders = { status: "DELIVERED" as const, deliveredAt: { gte: start, lt: end } };
  const [monthReviews, delivered, reviewedDelivered, published, members, pending, hidden, invites, lastKings, granted] = await Promise.all([
    prisma.directReview.count({ where: { createdAt: { gte: start, lt: end }, status: { not: "DELETED" } } }),
    prisma.order.count({ where: receivedOrders }),
    prisma.order.count({ where: { ...receivedOrders, review: { is: { status: { not: "DELETED" } } } } }),
    prisma.directReview.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count({ where: { adultVerifiedAt: { not: null } } }),
    prisma.directReview.findMany({ where: { proofStatus: "PENDING", status: { not: "DELETED" } }, include: { user: true, wine: true, proof: { select: { mime: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.directReview.findMany({ where: { status: "HIDDEN" }, include: { user: true, wine: true, seller: true, reports: { where: { resolvedAt: null } } }, orderBy: { updatedAt: "asc" } }),
    prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    monthKings(-1),
    prisma.pointTx.findMany({ where: { reason: "king", refId: monthRange(-1).label } }),
  ]);
  const rate = delivered ? reviewedDelivered / delivered : null;
  const stage2Ready = published >= cfg.stage2.reviews && members >= cfg.stage2.members;
  const pct = (a: number, b: number) => `${Math.min(100, (a / Math.max(1, b)) * 100).toFixed(0)}%`;

  return (
    <div className="stack-lg">
      <h1 style={{ fontSize: 28 }}>커뮤니티 운영</h1>

      <div className="grid-4">
        <div className="box tight stat"><span className="label">이달 신규 후기</span><span className="v">{monthReviews}</span><span className="small muted">1단계 KPI</span></div>
        <div className="box tight stat"><span className="label">수령 주문 후기 작성률</span><span className="v">{rate !== null ? `${(rate * 100).toFixed(0)}%` : "-"}</span><span className="small muted">이달 수령 주문 {delivered}건 중 후기 {reviewedDelivered}건 · 삭제 후기 제외</span></div>
        <div className="box tight stat"><span className="label">인증 확인 대기</span><span className="v">{pending.length}</span><span className="small muted">통관 내역 사진</span></div>
        <div className="box tight stat"><span className="label">신고로 숨긴 후기</span><span className="v">{hidden.length}</span><span className="small muted">복구 또는 삭제 필요</span></div>
      </div>

      <section className="box">
        <div className="row between">
          <h2>2단계 열기 기준</h2>
          {stage2Ready ? <span className="chip ok">기준 도달 · 마이 셀러·구해주세요·등급 개발 시작</span> : <span className="chip">진행 중</span>}
        </div>
        <p className="small muted">날짜가 아니라 후기 수와 회원 수로 다음 단계를 엽니다. 기준값은 아래 설정에서 바꿀 수 있습니다 (가안).</p>
        <div className="grid-2">
          <div className="stack" style={{ gap: 4 }}><span className="small">공개 후기 {published.toLocaleString("ko-KR")} / {cfg.stage2.reviews.toLocaleString("ko-KR")}</span><div className="meter"><i style={{ width: pct(published, cfg.stage2.reviews) }} /></div></div>
          <div className="stack" style={{ gap: 4 }}><span className="small">성인인증 회원 {members.toLocaleString("ko-KR")} / {cfg.stage2.members.toLocaleString("ko-KR")}</span><div className="meter"><i style={{ width: pct(members, cfg.stage2.members) }} /></div></div>
        </div>
      </section>

      <section className="stack">
        <h2>통관 인증 확인 {pending.length}건</h2>
        <p className="small muted">사진의 세금·날짜가 후기 내용과 맞는지 확인합니다. 승인하거나 반려하면 사진은 바로 지워집니다.</p>
        {pending.length ? pending.map((r) => (
          <div key={r.id} className="box">
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div className="stack" style={{ gap: 2 }}>
                <b>{r.wine.nameKo}</b>
                <span className="small muted">{r.user.nickname} · {ROUTE_LABEL[r.route as ChannelKey]} · {r.qty}병 · 세금 {won(r.taxPaid)}{r.estTax ? ` (예상 ${won(r.estTax)})` : ""} · 배송 {r.shippingDays}일 · {ymd(r.createdAt)}</span>
                <span className="small">{r.oneLiner}</span>
              </div>
            </div>
            {r.proof?.mime === "application/pdf" ? <a href={`/api/proof/${r.id}`} target="_blank" rel="noopener">PDF 열기</a> : r.proof ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={`/api/proof/${r.id}`} alt="통관 내역 인증 자료" style={{ maxHeight: 360, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 8, alignSelf: "flex-start" }} />
            ) : <span className="small muted">사진 없음</span>}
            <div className="row">
              <form action={approveProof}><input type="hidden" name="id" value={r.id} /><button className="btn small">인증 승인 (+{cfg.points.proof}P)</button></form>
              <form action={rejectProof} className="row"><input type="hidden" name="id" value={r.id} /><input name="note" placeholder="반려 사유" style={{ width: 200 }} aria-label="반려 사유" /><button className="btn ghost small">반려</button></form>
            </div>
          </div>
        )) : <p className="small muted">대기 중인 인증이 없습니다.</p>}
      </section>

      <section className="stack">
        <h2>신고로 숨긴 후기 {hidden.length}건</h2>
        {hidden.length ? hidden.map((r) => (
          <div key={r.id} className="box tight">
            <b>{r.wine.nameKo}</b>
            <span className="small muted">{r.user.nickname} · {r.seller?.name ?? "판매처 미기재"} · {r.sponsored ? "협찬 표시함" : "협찬 표시 없음"}</span>
            <p>{r.oneLiner}</p>
            <div className="row" style={{ gap: 6 }}>{r.reports.map((rp) => <span key={rp.id} className="chip warn">{rp.reason}</span>)}</div>
            <div className="row">
              <form action={resolveReports}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="restore" /><button className="btn ghost small">문제없음 · 복구</button></form>
              <form action={resolveReports}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="delete" /><button className="btn danger small">삭제</button></form>
              {r.sellerId && <form action={suspendSeller}><input type="hidden" name="sellerId" value={r.sellerId} /><button className="btn ghost small">대가성 후기 미표시 확인 · 판매처 노출 중단</button></form>}
            </div>
          </div>
        )) : <p className="small muted">숨긴 후기가 없습니다.</p>}
      </section>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="box">
          <h2>지난달 후기왕 · {lastKings.label}</h2>
          {lastKings.list.length ? (
            <ol className="list">{lastKings.list.slice(0, 3).map((k) => <li key={k.userId}>{k.nickname} <span className="small muted">{k.score}점</span>{granted.some((g) => g.userId === k.userId) && <span className="chip ok" style={{ marginLeft: 6 }}>지급함</span>}</li>)}</ol>
          ) : <p className="small muted">지난달 후기가 없습니다.</p>}
          <form action={grantKings}><input type="hidden" name="offset" value="-1" /><button className="btn small" disabled={!lastKings.list.length}>상위 3명에게 프리미엄 1개월 지급</button></form>
          <p className="small muted">같은 달에 두 번 눌러도 한 번만 지급됩니다.</p>
        </section>

        <section className="box">
          <h2>초기 회원 초대 코드</h2>
          <p className="small muted">오픈 전 후기 100개 확보용. 직구 경험자·동호회 운영자에게 나눠 줍니다. 코드를 쓰면 초기 회원 배지와 프리미엄이 붙습니다.</p>
          <form action={createInvite} className="row">
            <input name="code" placeholder="코드 (비우면 자동)" style={{ width: 150 }} aria-label="코드" />
            <input name="note" placeholder="메모 (예: 동호회 A)" style={{ width: 150 }} aria-label="메모" />
            <input name="premiumMonths" type="number" defaultValue={6} style={{ width: 70 }} aria-label="프리미엄 개월" />
            <input name="maxUses" type="number" defaultValue={1} style={{ width: 70 }} aria-label="사용 횟수" />
            <button className="btn ghost small">만들기</button>
          </form>
          {invites.length > 0 && (
            <table className="taxtable"><tbody>{invites.map((i) => <tr key={i.code}><td><span className="num">{i.code}</span> <span className="small muted">{i.note ?? ""} · {i.premiumMonths}개월</span></td><td>{i.uses}/{i.maxUses}</td></tr>)}</tbody></table>
          )}
        </section>
      </div>

      <section className="box">
        <h2>설정</h2>
        <form action={saveCommunity} className="stack">
          <div className="form-grid">
            <div className="field"><label className="label" htmlFor="c-bonus">포인트 배수 기간 (이 날짜까지)</label><input id="c-bonus" name="bonusUntil" type="date" defaultValue={cfg.bonusUntil ?? ""} /></div>
            <div className="field"><label className="label" htmlFor="c-mult">배수</label><input id="c-mult" name="bonusMultiplier" type="number" step="0.5" defaultValue={cfg.bonusMultiplier} /></div>
            <div className="field"><label className="label" htmlFor="c-pr">기본 후기 P</label><input id="c-pr" name="pReview" type="number" defaultValue={cfg.points.review} /></div>
            <div className="field"><label className="label" htmlFor="c-pp">통관 인증 P</label><input id="c-pp" name="pProof" type="number" defaultValue={cfg.points.proof} /></div>
            <div className="field"><label className="label" htmlFor="c-ph">도움됨 10개 P</label><input id="c-ph" name="pHelpful" type="number" defaultValue={cfg.points.helpful10} /></div>
            <div className="field"><label className="label" htmlFor="c-cp">프리미엄 1개월 (P)</label><input id="c-cp" name="cPremium" type="number" defaultValue={cfg.costs.premiumMonth} /></div>
            <div className="field"><label className="label" htmlFor="c-ct">시음회 참가권 (P, 3단계)</label><input id="c-ct" name="cTasting" type="number" defaultValue={cfg.costs.tasting} /></div>
            <div className="field"><label className="label" htmlFor="c-s2r">2단계 기준 후기 수</label><input id="c-s2r" name="s2Reviews" type="number" defaultValue={cfg.stage2.reviews} /></div>
            <div className="field"><label className="label" htmlFor="c-s2m">2단계 기준 회원 수</label><input id="c-s2m" name="s2Members" type="number" defaultValue={cfg.stage2.members} /></div>
          </div>
          <div className="field">
            <label className="label" htmlFor="c-ban">금지 표현 (한 줄에 하나, 정규식)</label>
            <textarea id="c-ban" name="bannedPatterns" className="num" style={{ minHeight: 200 }} defaultValue={cfg.bannedPatterns.join("\n")} />
          </div>
          <div><button className="btn">설정 저장</button></div>
        </form>
      </section>

      <section className="box">
        <h2>포인트 조정</h2>
        <p className="small muted">부정 적립 회수(음수) 또는 이벤트 지급. 모든 조정은 원장에 남습니다.</p>
        <form action={adjustPoints} className="row">
          <input name="email" type="email" placeholder="회원 이메일" required style={{ width: 220 }} aria-label="회원 이메일" />
          <input name="amount" type="number" placeholder="+500 / -300" required style={{ width: 120 }} aria-label="포인트" />
          <input name="note" placeholder="사유" style={{ width: 200 }} aria-label="사유" />
          <button className="btn ghost small">조정</button>
        </form>
        <Link className="small" href="/community/rules">공개 운영 정책 보기</Link>
      </section>
    </div>
  );
}
