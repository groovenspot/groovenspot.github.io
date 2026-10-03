import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { compareLoaded, loadContext } from "@/server/compare";
import { COMPARE_COOKIE, COMPARE_MAX, inOrder, parseIds } from "@/lib/wineList";
import { ROUTE_LABEL, ROUTE_ORDER } from "@/lib/engine";
import { won } from "@/lib/format";
import { addToCompare, clearCompare, removeFromCompare } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "와인 나란히 비교", robots: { index: false } };

type SP = Promise<Record<string, string | undefined>>;

export default async function ComparePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  // ?ids= 로 받은 공유 링크는 보기 전용, 아니면 이 브라우저의 비교함
  const shared = sp.ids !== undefined;
  const ids = parseIds(shared ? sp.ids : (await cookies()).get(COMPARE_COOKIE)?.value, COMPARE_MAX);
  const ctx = await loadContext();
  const [rows, all, reviewCounts] = await Promise.all([
    ids.length ? prisma.wine.findMany({ where: { id: { in: ids } }, include: { offers: { include: { seller: true } } } }) : Promise.resolve([]),
    prisma.wine.findMany({ select: { id: true, nameKo: true, vintage: true }, orderBy: { nameKo: "asc" } }),
    ids.length ? prisma.directReview.groupBy({ by: ["wineId"], where: { wineId: { in: ids }, status: "PUBLISHED", sponsored: false }, _count: true, _avg: { rating: true } }) : Promise.resolve([]),
  ]);
  const wines = inOrder(ids, rows).map((w) => ({ w, r: compareLoaded(w, 1, 750, ctx) }));
  const prices = wines.map(({ r }) => (r.best ? r.best.perBottle : Infinity));
  const cheapest = Math.min(...prices);
  const savings = wines.map(({ r }) => r.savingPerBottle ?? -Infinity);
  const biggest = Math.max(...savings);
  const reviewsOf = (id: string) => reviewCounts.find((x) => x.wineId === id)?._count ?? 0;
  const ratingOf = (id: string) => reviewCounts.find((x) => x.wineId === id)?._avg.rating ?? null;
  const shareHref = `/compare?ids=${ids.join(",")}`;

  const row = (label: string, cells: React.ReactNode[]) => (
    <tr><th scope="row">{label}</th>{cells.map((c, i) => <td key={i}>{c}</td>)}</tr>
  );

  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 6 }}>
        <div className="label">와인 나란히 비교</div>
        <h1 style={{ fontSize: "clamp(22px,3.4vw,30px)" }}>{shared ? "공유받은 비교" : "비교함"}</h1>
        <p className="muted small">와인 {COMPARE_MAX}개까지 1병·750ml 도착가와 경로를 한 표로 봅니다. 비교함은 이 브라우저에만 저장됩니다.</p>
      </section>

      {wines.length === 0 ? (
        <div className="box">
          <p>비교함이 비어 있습니다.</p>
          <p className="small muted">와인 상세 화면의 '비교에 담기'를 누르거나 아래에서 고르세요.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data compare">
            <thead>
              <tr>
                <th></th>
                {wines.map(({ w }) => (
                  <th key={w.id} style={{ minWidth: 180 }}>
                    <Link href={`/wines/${w.id}`}>{w.nameKo}</Link>
                    <div className="small muted" style={{ fontWeight: 400 }}>{w.name} {w.vintage ?? "NV"}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {row("병당 최저 도착가", wines.map(({ r }, i) => r.best ? <span className={`num${prices[i] === cheapest && wines.length > 1 ? " pos" : ""}`}><b>{won(r.best.perBottle)}</b>{prices[i] === cheapest && wines.length > 1 ? " · 가장 쌈" : ""}</span> : <span className="muted">판매처 없음</span>))}
              {row("최저 경로", wines.map(({ r }) => r.best ? `${ROUTE_LABEL[r.best.channel]} · ${r.best.daysMin}~${r.best.daysMax}일` : "-"))}
              {row("국내 판매가", wines.map(({ r }) => r.krPerBottle !== null ? won(r.krPerBottle) : <span className="muted">국내 미수입</span>))}
              {row("국내가 대비", wines.map(({ r }, i) => r.savingPerBottle !== null ? <span className={`num ${r.savingPerBottle >= 0 ? "pos" : "neg"}`}>{r.savingPerBottle >= 0 ? "−" : "+"}{won(Math.abs(r.savingPerBottle))}{savings[i] === biggest && wines.length > 1 && biggest > 0 ? " · 가장 많이 아낌" : ""}</span> : "-"))}
              {row("세금 구간", wines.map(({ r }) => r.best ? (r.best.tax.exempt ? <span className="chip ok">1병 면세구간</span> : r.best.tax.fta ? <span className="chip ok">FTA 관세 0%</span> : <span className="chip warn">관세 부과</span>) : "-"))}
              {ROUTE_ORDER.map((ch) => row(ROUTE_LABEL[ch], wines.map(({ r }) => {
                const rt = r.routes.find((x) => x.channel === ch);
                return rt?.available && rt.best ? <span className="num">{won(rt.best.perBottle)}</span> : <span className="small muted">이용 불가</span>;
              })))}
              {row("국가 · 산지", wines.map(({ w }) => `${w.country} · ${w.region}`))}
              {row("종류 · 품종", wines.map(({ w }) => `${w.type}${w.grape ? ` · ${w.grape}` : ""}`))}
              {row("평점", wines.map(({ w }) => w.rating ? `${w.rating}점${w.ratingSrc ? ` (${w.ratingSrc})` : ""}` : "-"))}
              {row("직구 후기", wines.map(({ w }) => reviewsOf(w.id) ? <Link href={`/wines/${w.id}#reviews`}>{reviewsOf(w.id)}건 · ★ {ratingOf(w.id)?.toFixed(1)}</Link> : "-"))}
              {!shared && row("", wines.map(({ w }) => (
                <form action={removeFromCompare}><input type="hidden" name="wineId" value={w.id} /><button className="btn ghost small">빼기</button></form>
              )))}
            </tbody>
          </table>
        </div>
      )}

      {shared ? (
        <div className="row"><Link className="btn ghost small" href="/compare">내 비교함 보기</Link></div>
      ) : (
        <section className="box">
          <form action={addToCompare} className="row">
            <label className="label" htmlFor="add-wine">와인 추가</label>
            <select id="add-wine" name="wineId" required defaultValue="" style={{ flex: "1 1 240px" }}>
              <option value="" disabled>와인을 고르세요</option>
              {all.filter((w) => !ids.includes(w.id)).map((w) => <option key={w.id} value={w.id}>{w.nameKo} {w.vintage ?? "NV"}</option>)}
            </select>
            <button className="btn small">담기</button>
          </form>
          {ids.length >= COMPARE_MAX && <p className="small muted">{COMPARE_MAX}개가 가득 차면 가장 먼저 담은 와인이 빠집니다.</p>}
          {wines.length > 0 && (
            <div className="row">
              {wines.length > 1 && <Link className="btn ghost small" href={shareHref}>공유용 링크 열기</Link>}
              <form action={clearCompare}><button className="btn ghost small">비교함 비우기</button></form>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
