import Link from "next/link";
import { prisma } from "@/server/db";
import { won } from "@/lib/format";

export default async function AdminWines() {
  const wines = await prisma.wine.findMany({ include: { _count: { select: { offers: true, alerts: true } } }, orderBy: { nameKo: "asc" } });
  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>와인 {wines.length}종</h1>
        <Link className="btn" href="/admin/wines/new">와인 추가</Link>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>와인</th><th>국가 · 산지</th><th>종류</th><th className="r">국내가</th><th className="r">판매 정보</th><th className="r">알림</th></tr></thead>
          <tbody>
            {wines.map((w) => (
              <tr key={w.id}>
                <td><Link href={`/admin/wines/${w.id}`}>{w.nameKo}</Link><div className="small muted">{w.name} {w.vintage ?? "NV"}</div></td>
                <td className="small">{w.country} · {w.region}</td>
                <td className="small">{w.type}</td>
                <td className="r">{w.krPrice ? won(w.krPrice) : "미수입"}</td>
                <td className="r">{w._count.offers}</td>
                <td className="r">{w._count.alerts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
