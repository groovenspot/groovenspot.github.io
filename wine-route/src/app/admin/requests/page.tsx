import Link from "next/link";
import { prisma } from "@/server/db";
import { setRequestGroupStatus } from "@/app/admin/actions";
import { groupRequests } from "@/lib/requests";
import { ymd } from "@/lib/format";

export const metadata = { title: "구해주세요 우선순위" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const showAll = sp.all === "1";
  const rows = await prisma.wineRequest.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
  const groups = groupRequests(rows).filter((g) => showAll || g.open > 0);
  return (
    <div className="stack-lg">
      <section className="stack">
        <h1 style={{ fontSize: 28 }}>구해주세요 우선순위</h1>
        <p className="small muted">셀러도어 목록에 없는 와인 요청 {rows.length.toLocaleString("ko-KR")}건을 비슷한 표기끼리 묶었습니다. 우선순위 = 요청한 사람 수 × 2 + 최근 30일 요청 수. 위에서부터 판매처를 찾아 목록에 추가하고, 수입 단계에서는 정식 수입 검토 목록으로 씁니다.</p>
        <nav className="seg"><Link href="/admin/requests" aria-current={!showAll ? "true" : undefined}>처리 대기 있는 묶음</Link><Link href="/admin/requests?all=1" aria-current={showAll ? "true" : undefined}>전체</Link></nav>
      </section>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>#</th><th>와인 (가장 많이 쓴 표기)</th><th className="r">요청</th><th className="r">요청자</th><th className="r">사진 경유</th><th>빈티지</th><th>최근</th><th>묶음 상태 바꾸기</th></tr></thead>
          <tbody>
            {groups.length ? groups.map((g, i) => (
              <tr key={g.key}>
                <td className="num">{i + 1}</td>
                <td>{g.label}{g.count > 1 && <span className="formula">비슷한 표기 {g.count}건 · 대기 {g.open}</span>}</td>
                <td className="r">{g.count}</td>
                <td className="r">{g.people}</td>
                <td className="r">{g.fromScan}</td>
                <td className="small num">{g.vintages.join(", ") || "-"}</td>
                <td className="small num">{ymd(g.latest)}</td>
                <td>
                  <form key={`${g.key}-${g.open}`} action={setRequestGroupStatus} className="row" style={{ flexWrap: "nowrap" }}>
                    <input type="hidden" name="ids" value={g.ids.join(",")} />
                    <select name="status" defaultValue={g.open ? "open" : "added"} aria-label="상태" style={{ width: 120 }}><option value="open">대기</option><option value="added">목록 추가함</option><option value="closed">종료</option></select>
                    <button className="btn ghost small">저장</button>
                  </form>
                </td>
              </tr>
            )) : <tr><td colSpan={8} className="muted">처리할 요청이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      <Link className="small" href="/admin/wines/new">와인 추가</Link>
    </div>
  );
}
