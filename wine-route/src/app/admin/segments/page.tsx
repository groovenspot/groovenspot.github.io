import Link from "next/link";
import { SEGMENT_LABEL, SEGMENT_ORDER, SEGMENT_USE, type Segment } from "@/lib/segments";
import { filterRows, segmentRows, SEGMENT_MAX_USERS as MAX_USERS } from "@/server/segments";
import { saveSegments } from "@/app/admin/actions";
import { BUDGET_LABEL } from "@/lib/taste";
import { won, ymd } from "@/lib/format";

export const metadata = { title: "회원 세그먼트" };

const SHOW = 200;
type SP = Promise<Record<string, string | undefined>>;

export default async function SegmentsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const seg = SEGMENT_ORDER.find((s) => s === sp.seg) as Segment | undefined;
  const consentOnly = sp.consent === "1";

  const { cfg, users, rows } = await segmentRows();
  const counts = new Map<Segment, { all: number; consent: number }>();
  for (const s of SEGMENT_ORDER) counts.set(s, { all: 0, consent: 0 });
  for (const { u, r } of rows) {
    const c = counts.get(r.segment)!;
    c.all += 1;
    if (u.marketingConsentAt) c.consent += 1;
  }

  const shown = filterRows(rows, seg, consentOnly);
  const href = (patch: { seg?: Segment; consent?: boolean }) => {
    const p = new URLSearchParams();
    const nextSeg = "seg" in patch ? patch.seg : seg;
    const nextConsent = "consent" in patch ? patch.consent : consentOnly;
    if (nextSeg) p.set("seg", nextSeg);
    if (nextConsent) p.set("consent", "1");
    const q = p.toString();
    return q ? `/admin/segments?${q}` : "/admin/segments";
  };

  return (
    <div className="stack-lg">
      <section className="stack">
        <h1 style={{ fontSize: 28 }}>회원 세그먼트</h1>
        <p className="small muted">
          확정 주문(주문 확정·발송·통관·도착)의 병당 도착가와 구매 횟수로 나눕니다. 소득·자산은 쓰지 않습니다. 기준은 초기 가설입니다:
          병당 {won(cfg.premiumPerBottle)} 이상을 {cfg.repeatOrders}회 이상 구매하면 고급 컬렉터, {cfg.repeatOrders}회 이상이면 취향 수집가,
          한 주문 {cfg.bulkQty}병 이상이 {cfg.bulkOrders}회 이상이면 다량 구매입니다. 첫 분기 주문 분포를 보고 아래에서 조정하세요.
        </p>
        <details className="box tight">
          <summary className="small">기준값 바꾸기</summary>
          <form action={saveSegments} className="stack" style={{ marginTop: 8 }}>
            <div className="form-grid">
              <div className="field"><label className="label" htmlFor="sg-p">고급 컬렉터 병당 도착가 (원)</label><input id="sg-p" name="premiumPerBottle" type="number" min={10000} step={10000} defaultValue={cfg.premiumPerBottle} /></div>
              <div className="field"><label className="label" htmlFor="sg-r">반복 구매 기준 (확정 주문 수)</label><input id="sg-r" name="repeatOrders" type="number" min={2} defaultValue={cfg.repeatOrders} /></div>
              <div className="field"><label className="label" htmlFor="sg-bq">다량 주문 기준 (한 주문 병수)</label><input id="sg-bq" name="bulkQty" type="number" min={2} defaultValue={cfg.bulkQty} /></div>
              <div className="field"><label className="label" htmlFor="sg-bo">다량 구매 기준 (다량 주문 횟수)</label><input id="sg-bo" name="bulkOrders" type="number" min={1} defaultValue={cfg.bulkOrders} /></div>
            </div>
            <div><button className="btn small">기준값 저장</button></div>
          </form>
        </details>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>세그먼트</th><th className="r">회원</th><th className="r">마케팅 동의</th><th>활용</th></tr></thead>
            <tbody>
              {SEGMENT_ORDER.map((s) => (
                <tr key={s}>
                  <td><Link href={href({ seg: s })}>{SEGMENT_LABEL[s]}</Link></td>
                  <td className="r num">{counts.get(s)!.all.toLocaleString("ko-KR")}</td>
                  <td className="r num">{counts.get(s)!.consent.toLocaleString("ko-KR")}</td>
                  <td className="small muted">{SEGMENT_USE[s]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length >= MAX_USERS && <p className="small muted">회원이 {MAX_USERS.toLocaleString("ko-KR")}명 이상이라 최근 가입자 {MAX_USERS.toLocaleString("ko-KR")}명까지만 집계했습니다.</p>}
      </section>

      <section className="stack">
        <div className="row between">
          <h2>{seg ? SEGMENT_LABEL[seg] : "전체"} {shown.length.toLocaleString("ko-KR")}명{shown.length > SHOW ? ` 중 ${SHOW}명 표시` : ""}</h2>
          <div className="row">
            <Link className={`btn small ${consentOnly ? "" : "ghost"}`} href={href({ consent: !consentOnly })}>{consentOnly ? "마케팅 동의 회원만 보는 중" : "마케팅 동의 회원만 보기"}</Link>
            {(seg || consentOnly) && <Link className="btn ghost small" href="/admin/segments">초기화</Link>}
            <a className="btn ghost small" href={`/admin/segments/export${href({}).replace("/admin/segments", "")}`}>CSV 내보내기</a>
          </div>
        </div>
        <p className="small muted">홍보성 안내는 마케팅 동의 회원에게만 보낼 수 있습니다. 가격 알림과 주문 상태 안내는 서비스 알림이라 동의와 무관합니다.</p>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>이메일</th><th>세그먼트</th><th className="r">확정 주문</th><th className="r">병당 평균 도착가</th><th>마케팅</th><th>취향 설문</th><th>가입일</th></tr></thead>
            <tbody>
              {shown.slice(0, SHOW).map(({ u, r }) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td><span className={`chip ${r.segment === "PREMIUM" ? "best" : ""}`}>{SEGMENT_LABEL[r.segment]}</span></td>
                  <td className="r num">{r.orders}</td>
                  <td className="r num">{r.avgPerBottle === null ? "-" : won(r.avgPerBottle)}</td>
                  <td>{u.marketingConsentAt ? <span className="chip ok">동의 {ymd(u.marketingConsentAt)}</span> : <span className="small muted">미동의</span>}</td>
                  <td className="small">
                    {u.tasteProfile
                      ? [u.tasteProfile.countries.join("·"), u.tasteProfile.types.join("·"), u.tasteProfile.budget ? BUDGET_LABEL[u.tasteProfile.budget] : ""].filter(Boolean).join(" / ") || "-"
                      : <span className="muted">-</span>}
                  </td>
                  <td className="num small">{ymd(u.createdAt)}</td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={7} className="muted">조건에 맞는 회원이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
