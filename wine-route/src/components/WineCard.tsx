import Link from "next/link";
import { won } from "@/lib/format";
import { WineThumb } from "./WineThumb";

type W = { id: string; nameKo: string; name: string; country: string; region: string; type: string; vintage: number | null; imageUrl?: string | null };
/** 미리 계산한 1병·750ml 최저 도착가 요약 (WinePrice) */
export type CardPrice = { perBottle: number | null; route: string | null; sellerCountry: string | null; exempt: boolean; krPerBottle: number | null; saving: number | null; ftaOrigin: boolean };

/** community = 셀러도어 직구 후기 평점 (협찬 제외) */
export function WineCard({ wine, price: p, community }: { wine: W; price: CardPrice; community?: { avg: number; n: number } }) {
  return (
    <Link href={`/wines/${wine.id}`} className="card">
      <div className="card-head">
        <WineThumb src={wine.imageUrl} type={wine.type} alt="" />
        <span className="stack" style={{ gap: 4 }}>
          <span className="name">{wine.nameKo}</span>
          <span className="sub">
            {wine.name}
            {wine.vintage ? ` ${wine.vintage}` : " NV"}
          </span>
          <span className="sub">
            {wine.country} · {wine.region} · {wine.type}
          </span>
        </span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        {p.exempt && <span className="chip ok">1병 면세구간</span>}
        {p.krPerBottle === null && <span className="chip">국내 미수입</span>}
        {!p.ftaOrigin && <span className="chip warn">FTA 미적용 원산지</span>}
        {community && community.n > 0 && <span className="chip" title="셀러도어 직구 후기 평점">★ {community.avg.toFixed(1)} · 후기 {community.n}</span>}
      </div>
      <div className="price">
        <span className="small muted">{p.perBottle !== null ? `1병 최저 · ${p.route === "HK_RETAILER" ? "홍콩 경유" : p.sellerCountry ?? ""}` : "판매처 없음"}</span>
        <span className="stack" style={{ gap: 0, alignItems: "flex-end" }}>
          <span className="num" style={{ fontSize: 17 }}>{p.perBottle !== null ? won(p.perBottle) : "—"}</span>
          {p.saving !== null && (
            <span className={`num small ${p.saving >= 0 ? "pos" : "neg"}`}>
              국내가 대비 {p.saving >= 0 ? "−" : "+"}
              {won(Math.abs(p.saving))}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
