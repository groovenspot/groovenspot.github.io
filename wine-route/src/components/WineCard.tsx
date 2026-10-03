import Link from "next/link";
import type { Comparison } from "@/lib/engine";
import { won } from "@/lib/format";

type W = { id: string; nameKo: string; name: string; country: string; region: string; type: string; vintage: number | null };

/** community = 셀러도어 직구 후기 평점 (협찬 제외) */
export function WineCard({ wine, result, community }: { wine: W; result: Comparison; community?: { avg: number; n: number } }) {
  const b = result.best;
  return (
    <Link href={`/wines/${wine.id}`} className="card">
      <span className="name">{wine.nameKo}</span>
      <span className="sub">
        {wine.name}
        {wine.vintage ? ` ${wine.vintage}` : " NV"}
      </span>
      <span className="sub">
        {wine.country} · {wine.region} · {wine.type}
      </span>
      <div className="row" style={{ gap: 6 }}>
        {b?.tax.exempt && <span className="chip ok">1병 면세구간</span>}
        {result.krPerBottle === null && <span className="chip">국내 미수입</span>}
        {!result.ftaOrigin && <span className="chip warn">FTA 미적용 원산지</span>}
        {community && community.n > 0 && <span className="chip" title="셀러도어 직구 후기 평점">★ {community.avg.toFixed(1)} · 후기 {community.n}</span>}
      </div>
      <div className="price">
        <span className="small muted">{b ? `1병 최저 · ${b.channel === "HK_RETAILER" ? "홍콩 경유" : b.sellerCountry}` : "판매처 없음"}</span>
        <span className="stack" style={{ gap: 0, alignItems: "flex-end" }}>
          <span className="num" style={{ fontSize: 17 }}>{b ? won(b.perBottle) : "—"}</span>
          {result.savingPerBottle !== null && (
            <span className={`num small ${result.savingPerBottle >= 0 ? "pos" : "neg"}`}>
              국내가 대비 {result.savingPerBottle >= 0 ? "−" : "+"}
              {won(Math.abs(result.savingPerBottle))}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
