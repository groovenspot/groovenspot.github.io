import Link from "next/link";
import { prisma } from "@/server/db";
import { runJobAction } from "@/app/admin/actions";
import { ymd } from "@/lib/format";

export default async function CrawlPage() {
  const [sellers, errors, stale] = await Promise.all([
    prisma.seller.findMany({ where: { active: true }, include: { crawlRuns: { orderBy: { startedAt: "desc" }, take: 1 }, _count: { select: { offers: true } } }, orderBy: { name: "asc" } }),
    prisma.offer.findMany({ where: { lastError: { not: null } }, include: { wine: true, seller: true }, take: 50 }),
    prisma.offer.count({ where: { checkedAt: { lt: new Date(Date.now() - 8 * 86400e3) } } }),
  ]);
  return (
    <div className="stack-lg">
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>가격 수집 상태</h1>
        <form action={runJobAction}><input type="hidden" name="job" value="crawl" /><button className="btn">전체 수집 실행</button></form>
      </div>
      {stale > 0 && <div className="alert">8일 넘게 가격을 확인하지 않은 판매 정보가 {stale}건 있습니다. 상세 화면에 확인 날짜가 표시됩니다.</div>}
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>셀러</th><th>방식</th><th>최근 실행</th><th>결과</th><th className="r">판매 정보</th><th></th></tr></thead>
          <tbody>
            {sellers.map((s) => {
              const r = s.crawlRuns[0];
              return (
                <tr key={s.id}>
                  <td><Link href={`/admin/sellers/${s.id}`}>{s.name}</Link></td>
                  <td className="small">{s.priceSource === "JSONLD" ? "크롤링" : "수동·CSV"}</td>
                  <td className="small num">{r ? r.startedAt.toISOString().slice(0, 16).replace("T", " ") : "-"}</td>
                  <td>{r ? <><span className={`chip ${r.status === "ok" ? "ok" : r.status === "partial" ? "warn" : r.status === "failed" ? "bad" : ""}`}>{r.status}</span> <span className="small muted">갱신 {r.updated} · 실패 {r.failed}</span></> : "-"}</td>
                  <td className="r">{s._count.offers}</td>
                  <td>{s.priceSource === "JSONLD" && <form action={runJobAction}><input type="hidden" name="job" value="crawl" /><input type="hidden" name="sellerId" value={s.id} /><button className="btn ghost small">실행</button></form>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="stack">
        <h2>수집 오류 {errors.length}건</h2>
        {errors.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>와인</th><th>셀러</th><th>오류</th><th>마지막 성공</th></tr></thead>
              <tbody>
                {errors.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/wines/${o.wineId}`}>{o.wine.nameKo}</Link></td>
                    <td className="small">{o.seller.name}</td>
                    <td className="small neg">{o.lastError}</td>
                    <td className="small num">{ymd(o.checkedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted small">오류가 없습니다.</p>}
      </section>
    </div>
  );
}
