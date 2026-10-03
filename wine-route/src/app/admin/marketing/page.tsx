import Link from "next/link";
import { prisma } from "@/server/db";
import { audience } from "@/server/marketing";
import { MarketingForm } from "@/components/admin/MarketingForm";
import { inQuietHours } from "@/lib/marketing";
import { SEGMENT_LABEL, SEGMENT_ORDER, type Segment } from "@/lib/segments";
import { ymdhm } from "@/lib/format";

export const metadata = { title: "홍보 발송" };

export default async function MarketingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const segment = SEGMENT_ORDER.find((s) => s === sp.seg) as Segment | undefined;
  const country = sp.country ?? "";
  const [to, countries, campaigns, consented] = await Promise.all([
    audience({ segment, country: country || undefined }),
    prisma.wine.findMany({ distinct: ["country"], select: { country: true }, orderBy: { country: "asc" } }),
    prisma.marketingCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.user.count({ where: { marketingConsentAt: { not: null } } }),
  ]);
  return (
    <div className="stack-lg">
      <section className="stack">
        <h1 style={{ fontSize: 28 }}>홍보 발송</h1>
        <p className="small muted">신규 와인 소개 같은 홍보성 메일은 마케팅 수신에 동의한 회원({consented.toLocaleString("ko-KR")}명)에게만 보냅니다. 가격 알림·주문 상태는 서비스 알림이라 여기서 보내지 않습니다.</p>
        <form className="box tight" method="get">
          <div className="form-grid">
            <div className="field"><label className="label" htmlFor="mk-seg">세그먼트</label>
              <select id="mk-seg" name="seg" defaultValue={segment ?? ""}><option value="">동의 회원 전체</option>{SEGMENT_ORDER.map((s) => <option key={s} value={s}>{SEGMENT_LABEL[s]}</option>)}</select></div>
            <div className="field"><label className="label" htmlFor="mk-country">취향 설문 산지</label>
              <select id="mk-country" name="country" defaultValue={country}><option value="">조건 없음</option>{countries.map((c) => <option key={c.country}>{c.country}</option>)}</select></div>
          </div>
          <div className="row"><button className="btn ghost small">받는 사람 다시 세기</button><span className="small">받는 사람 <b className="num">{to.length.toLocaleString("ko-KR")}명</b></span></div>
        </form>
      </section>
      <MarketingForm segment={segment ?? ""} country={country} count={to.length} quiet={inQuietHours()} />
      <section className="stack">
        <h2>보낸 기록</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>보낸 시각</th><th>제목</th><th>대상</th><th className="r">보냄 / 대상</th><th>보낸 사람</th></tr></thead>
            <tbody>
              {campaigns.length ? campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="num small">{ymdhm(c.createdAt)}</td>
                  <td>{c.title}</td>
                  <td className="small">{c.segment ? SEGMENT_LABEL[c.segment as Segment] : "동의 회원 전체"}{c.tasteMatch ? ` · ${c.tasteMatch}` : ""}</td>
                  <td className="r">{c.sent} / {c.recipients}{c.failed ? <span className="neg"> (실패 {c.failed})</span> : ""}</td>
                  <td className="small">{c.createdBy}</td>
                </tr>
              )) : <tr><td colSpan={5} className="muted">아직 보낸 홍보 메일이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
        <Link className="small" href="/admin/segments?consent=1">세그먼트별 동의 회원 보기</Link>
      </section>
    </div>
  );
}
