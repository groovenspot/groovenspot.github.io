import Link from "next/link";
import { WineThumb } from "@/components/WineThumb";
import { prisma } from "@/server/db";
import { lwinSearch } from "@/server/catalog";
import { createWineFromCatalog, crawlCatalogNow, ignoreCatalog, linkCatalog } from "@/app/admin/actions";
import { matchWines } from "@/lib/match";
import { cleanWineName } from "@/lib/crawl/catalog";
import { WINE_TYPES } from "@/lib/wineCsv";
import { money, sizeLabel, ymd, ymdhm } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "카탈로그 수집" };

const PAGE = 20;

export default async function AdminCatalog({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = ["new", "linked", "ignored"].includes(sp.status ?? "") ? sp.status! : "new";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const where = { status, ...(sp.seller ? { sellerId: sp.seller } : {}) };
  const [sellers, runs, items, total, counts, wines, lwinCount, wineCount] = await Promise.all([
    prisma.seller.findMany({ where: { OR: [{ crawlConsentAt: { not: null } }, { NOT: { catalogUrls: { isEmpty: true } } }] }, orderBy: { name: "asc" } }),
    prisma.crawlRun.findMany({ where: { kind: "catalog" }, orderBy: { startedAt: "desc" }, take: 50 }),
    prisma.catalogItem.findMany({ where, include: { seller: true }, orderBy: [{ suggestScore: "desc" }, { lastSeenAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE }),
    prisma.catalogItem.count({ where }),
    prisma.catalogItem.groupBy({ by: ["status"], _count: true }),
    prisma.wine.findMany({ select: { id: true, name: true, nameKo: true, producer: true, vintage: true, aliases: true } }),
    prisma.lwinRef.count(),
    prisma.wine.count(),
  ]);
  const lastRun = (sid: string) => runs.find((r) => r.sellerId === sid);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const lwinFor = lwinCount ? await Promise.all(items.map((it) => lwinSearch(`${it.brand ?? ""} ${cleanWineName(it.name)}`.trim(), 5))) : items.map(() => []);
  const pages = Math.ceil(total / PAGE);
  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, seller: sp.seller, page, ...patch })) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    return `/admin/catalog?${p}`;
  };

  return (
    <div className="stack-lg">
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>카탈로그 수집</h1>
        <div className="row"><span className="small muted">와인 {wineCount.toLocaleString("ko-KR")}개 · LWIN {lwinCount.toLocaleString("ko-KR")}개</span><Link className="btn ghost small" href="/admin/catalog/import">와인 CSV · LWIN 가져오기</Link></div>
      </div>
      <p className="small muted">수집 허락을 확인한 판매처의 목록 페이지에서 상품을 찾아 이 대기열에 넣습니다. 기존 와인에 연결하거나 새 와인으로 등록하면 판매 정보가 생기고, 그 뒤 가격은 기존 가격 수집이 갱신합니다.</p>

      <section className="stack">
        <h2>판매처</h2>
        {sellers.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>판매처</th><th>수집 허락</th><th>목록 주소</th><th>마지막 수집</th><th></th></tr></thead>
              <tbody>
                {sellers.map((s) => {
                  const r = lastRun(s.id);
                  return (
                    <tr key={s.id}>
                      <td><Link href={`/admin/sellers/${s.id}`}>{s.name}</Link><div className="small muted">{s.country} · {s.currency}</div></td>
                      <td className="small">{s.crawlConsentAt ? <>{ymd(s.crawlConsentAt)}<div className="muted">{s.crawlConsentNote}</div></> : <span className="chip warn">허락 확인 전 · 수집 안 함</span>}</td>
                      <td className="small">{s.catalogUrls.length}개</td>
                      <td className="small">{r ? <><span className={`chip ${r.status === "ok" ? "ok" : r.status === "failed" ? "bad" : "warn"}`}>{r.status}</span> {ymdhm(r.startedAt)}<div className="muted" style={{ maxWidth: 420 }}>{r.message}</div></> : "-"}</td>
                      <td>{s.crawlConsentAt && s.catalogUrls.length > 0 && <form action={crawlCatalogNow}><input type="hidden" name="sellerId" value={s.id} /><button className="btn ghost small">지금 수집 (30개)</button></form>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="small muted">판매처 화면에서 목록 주소와 수집 허락 확인일을 넣으면 여기에 나옵니다.</p>}
      </section>

      <section className="stack">
        <div className="row between">
          <nav className="seg" aria-label="상태">
            <Link href={href({ status: "new", page: 1 })} aria-current={status === "new" ? "true" : undefined}>대기 {count("new")}</Link>
            <Link href={href({ status: "linked", page: 1 })} aria-current={status === "linked" ? "true" : undefined}>연결함 {count("linked")}</Link>
            <Link href={href({ status: "ignored", page: 1 })} aria-current={status === "ignored" ? "true" : undefined}>제외 {count("ignored")}</Link>
          </nav>
          <form className="row" action="/admin/catalog" method="get">
            <input type="hidden" name="status" value={status} />
            <select name="seller" defaultValue={sp.seller ?? ""} aria-label="판매처"><option value="">모든 판매처</option>{sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <button className="btn ghost small">보기</button>
          </form>
        </div>
        {!items.length && <p className="small muted">{status === "new" ? "대기 중인 상품이 없습니다." : "상품이 없습니다."}</p>}
        {items.map((it, i) => {
          const matches = matchWines(`${it.brand ?? ""} ${it.name}`, wines, 5);
          const lw = lwinFor[i];
          return (
            <div key={it.id} className="box tight">
              <div className="row between" style={{ alignItems: "flex-start" }}>
                {it.image && <WineThumb src={it.image} type="" alt="" />}
                <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <b>{it.name}</b>
                  <span className="small muted">{it.brand ?? "브랜드 없음"} · {it.seller.name} · {it.price ? money(it.price, it.currency ?? it.seller.currency) : "가격 없음"} · {sizeLabel(it.bottleMl)}{it.vintage ? ` · ${it.vintage}` : ""}{!it.inStock ? " · 품절" : ""}{it.gtin ? ` · GTIN ${it.gtin}` : ""}</span>
                  <a className="small" href={it.url} target="_blank" rel="noopener noreferrer">판매처 상품 페이지</a>
                </div>
                {it.suggestScore !== null && status === "new" && <span className={`chip ${it.suggestScore >= 0.75 ? "ok" : ""}`}>자동 매칭 {Math.round(it.suggestScore * 100)}%</span>}
                {it.currency && it.currency !== it.seller.currency && <span className="chip bad">통화 {it.currency} ≠ 판매처 {it.seller.currency}</span>}
              </div>
              {status === "new" && (
                <div className="stack" style={{ gap: 8 }}>
                  {matches.length > 0 && (
                    <form action={linkCatalog} className="row">
                      <input type="hidden" name="itemId" value={it.id} />
                      {/* 75% 미만은 다른 생산자·빈티지일 수 있어 미리 고르지 않고 직접 고르게 합니다 */}
                      <select name="wineId" required defaultValue={matches[0].score >= 0.75 ? matches[0].wine.id : ""} aria-label="연결할 와인" style={{ flex: "1 1 280px" }}>
                        {matches[0].score < 0.75 && <option value="" disabled>후보를 확인하고 고르세요 (확실하지 않음)</option>}
                        {matches.map((m) => <option key={m.wine.id} value={m.wine.id}>{m.wine.nameKo} · {m.wine.name} {m.wine.vintage ?? "NV"} ({Math.round(m.score * 100)}%){it.vintage && m.wine.vintage && it.vintage !== m.wine.vintage ? " · 빈티지 다름" : ""}</option>)}
                      </select>
                      <button className="btn small">이 와인에 연결</button>
                    </form>
                  )}
                  <details>
                    <summary className="small">새 와인으로 등록</summary>
                    <form action={createWineFromCatalog} className="stack" style={{ marginTop: 8 }}>
                      <input type="hidden" name="itemId" value={it.id} />
                      {lw.length > 0 && (
                        <div className="field"><label className="label" htmlFor={`lw-${it.id}`}>LWIN (고르면 생산자·산지·종류를 그 값으로 채움)</label>
                          <select id={`lw-${it.id}`} name="lwin" defaultValue=""><option value="">고르지 않음</option>{lw.map((r) => <option key={r.lwin} value={r.lwin}>{r.lwin} · {r.displayName}</option>)}</select></div>
                      )}
                      <div className="form-grid">
                        <div className="field"><label className="label" htmlFor={`n-${it.id}`}>원어명</label><input id={`n-${it.id}`} name="name" defaultValue={cleanWineName(it.name)} /></div>
                        <div className="field"><label className="label" htmlFor={`k-${it.id}`}>한글명 *</label><input id={`k-${it.id}`} name="nameKo" required /></div>
                        <div className="field"><label className="label" htmlFor={`p-${it.id}`}>생산자</label><input id={`p-${it.id}`} name="producer" defaultValue={it.brand ?? ""} /></div>
                        <div className="field"><label className="label" htmlFor={`c-${it.id}`}>원산지 국가 (한글)</label><input id={`c-${it.id}`} name="country" defaultValue={it.seller.country === "홍콩" ? "" : it.seller.country} /></div>
                        <div className="field"><label className="label" htmlFor={`r-${it.id}`}>산지</label><input id={`r-${it.id}`} name="region" /></div>
                        <div className="field"><label className="label" htmlFor={`t-${it.id}`}>종류</label><select id={`t-${it.id}`} name="type" defaultValue=""><option value="">LWIN 값 또는 레드</option>{WINE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                        <div className="field"><label className="label" htmlFor={`v-${it.id}`}>빈티지</label><input id={`v-${it.id}`} name="vintage" type="number" defaultValue={it.vintage ?? ""} /></div>
                        <div className="field"><label className="label" htmlFor={`g-${it.id}`}>품종</label><input id={`g-${it.id}`} name="grape" /></div>
                      </div>
                      <div><button className="btn small">등록하고 연결</button></div>
                    </form>
                  </details>
                  <form action={ignoreCatalog}><input type="hidden" name="itemId" value={it.id} /><button className="btn ghost small">와인이 아님 · 제외</button></form>
                </div>
              )}
            </div>
          );
        })}
        {pages > 1 && <nav className="seg" aria-label="페이지">{Array.from({ length: Math.min(pages, 30) }, (_, i) => i + 1).map((n) => <Link key={n} href={href({ page: n })} aria-current={n === page ? "true" : undefined}>{n}</Link>)}</nav>}
      </section>
    </div>
  );
}
