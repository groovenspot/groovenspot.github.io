import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { compareWine } from "@/server/compare";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { cookies } from "next/headers";
import { TaxBreakdown } from "@/components/TaxBreakdown";
import { AlertForm } from "@/components/AlertForm";
import { alimtalkTemplate } from "@/server/alimtalk";
import { ReviewCard, reviewInclude } from "@/components/ReviewCard";
import { defaultTarget } from "@/lib/alerts";
import { FX_SOURCE_LABEL, money, sizeLabel, won, ymd, ymdhm } from "@/lib/format";
import { ROUTE_LABEL, type Candidate } from "@/lib/engine";
import { PriceHistory } from "@/components/PriceHistory";
import { RecentViewMark } from "@/components/RecentViewMark";
import { fillDays } from "@/lib/history";
import { COMPARE_COOKIE, COMPARE_MAX, parseIds } from "@/lib/wineList";
import { addToCompare } from "@/app/compare/actions";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

const HISTORY_DAYS = 90;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params;
  const d = await compareWine(id, 1, 750);
  if (!d) return { title: "와인" };
  const { wine, result } = d;
  const b = result.best;
  const price = b ? `1병 직구 도착가 ${won(b.perBottle)}(세금·운임 포함, ${ROUTE_LABEL[b.channel]})` : "직구 판매처 확인 중";
  const saving = result.savingPerBottle !== null && result.savingPerBottle > 0 ? `, 국내가보다 ${won(result.savingPerBottle)} 저렴` : wine.krPrice === null ? ", 국내 미수입" : "";
  const description = `${wine.nameKo} (${wine.name} ${wine.vintage ?? "NV"}) · ${wine.country} ${wine.region}. ${price}${saving}. 경로 4가지의 관세·주세·교육세·부가세를 모두 더해 비교합니다.`;
  return {
    title: wine.nameKo,
    description,
    alternates: { canonical: `/wines/${id}` },
    openGraph: { type: "website", title: `${wine.nameKo} 직구 도착가`, description, url: `/wines/${id}` },
  };
}

export default async function WinePage({ params, searchParams }: P) {
  const { id } = await params;
  const sp = await searchParams;
  const qty = Math.min(24, Math.max(1, Math.floor(Number(sp.qty) || 1)));
  const ml = Number(sp.ml) || 750;
  const data = await compareWine(id, qty, ml);
  if (!data) notFound();
  const { wine, result, ctx } = data;
  const user = await getUser();
  const anonId = (await cookies()).get("wr_anon")?.value ?? null;
  void prisma.wineView.create({ data: { wineId: id, anonId } }).catch(() => {});

  const sizes = [...new Set(wine.offers.map((o) => o.bottleMl))].sort((a, b) => a - b);
  const all = result.routes.flatMap((r) => r.candidates);
  const sel: Candidate | undefined = all.find((c) => `${c.channel}:${c.offerId}` === sp.sel) ?? result.best;
  const live = result.routes.filter((r) => r.available).sort((a, b) => a.best!.perBottle - b.best!.perBottle);
  const off = result.routes.filter((r) => !r.available);
  const max = Math.max(1, ...live.map((r) => r.best!.perBottle));

  const sellerIds = [...new Set(all.map((c) => c.sellerId))];
  const [trust, reviews] = await Promise.all([
    prisma.directReview.groupBy({ by: ["sellerId"], where: { sellerId: { in: sellerIds }, status: "PUBLISHED", sponsored: false }, _avg: { rating: true }, _count: true }),
    prisma.directReview.findMany({ where: { wineId: id, status: "PUBLISHED" }, include: reviewInclude, orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }], take: 30 }),
  ]);
  // 통관 인증 후기를 먼저
  reviews.sort((a, b) => Number(b.proofStatus === "APPROVED") - Number(a.proofStatus === "APPROVED"));
  const trustOf = (sid: string) => trust.find((t) => t.sellerId === sid);
  // 경로별 실측 (협찬 제외)
  const measured = (route: string) => {
    const rs = reviews.filter((r) => r.route === route && !r.sponsored);
    if (!rs.length) return null;
    const days = rs.reduce((a, r) => a + r.shippingDays, 0) / rs.length;
    const errs = rs.filter((r) => r.estTax).map((r) => (r.taxPaid - r.estTax!) / r.estTax!);
    return { n: rs.length, days, err: errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null };
  };
  const liked = user ? new Set((await prisma.helpful.findMany({ where: { userId: user.id, reviewId: { in: reviews.map((r) => r.id) } } })).map((h) => h.reviewId)) : new Set<string>();
  const [historyRows, compareIds] = await Promise.all([
    prisma.watchPrice.findMany({ where: { wineId: id, qty, bottleMl: ml, day: { gte: new Date(Date.now() - HISTORY_DAYS * 86400e3) } }, select: { day: true, perBottle: true } }),
    cookies().then((c) => parseIds(c.get(COMPARE_COOKIE)?.value, COMPARE_MAX)),
  ]);
  const kstToday = new Date(Date.now() + 9 * 3600e3);
  const cells = fillDays(historyRows, HISTORY_DAYS, kstToday);
  const inCompare = compareIds.includes(id);
  const existing = user ? await prisma.priceAlert.findUnique({ where: { userId_wineId_qty_bottleMl: { userId: user.id, wineId: id, qty, bottleMl: ml } } }) : null;

  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const allp = { qty, ml, sel: sp.sel, ...patch };
    for (const [k, v] of Object.entries(allp)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/wines/${id}?${p}`;
  };
  const goHref = (c: Candidate) => `/order/${c.offerId}?qty=${qty}&route=${c.channel}`;

  return (
    <div className="stack-lg">
      <RecentViewMark wineId={id} />
      <section className="stack" style={{ gap: 6 }}>
        <div className="label">
          <Link href="/" style={{ textDecoration: "none" }}>와인 찾기</Link> · {wine.country} · {wine.region}
        </div>
        <h1 style={{ fontSize: "clamp(22px,3.4vw,30px)" }}>{wine.nameKo}</h1>
        <p className="muted">{wine.name} {wine.vintage ?? "NV"} · {wine.producer} · {wine.grape || wine.type}</p>
        <div className="row" style={{ gap: 6 }}>
          <span className="chip">{wine.type}</span>
          <span className={`chip ${result.ftaOrigin ? "ok" : "warn"}`}>{result.ftaOrigin ? `${wine.country} · 한국과 FTA` : `${wine.country} · FTA 미적용`}</span>
          {wine.krPrice === null && <span className="chip">국내 미수입</span>}
          {wine.rating && <span className="chip">평점 {wine.rating}점{wine.ratingSrc ? ` · ${wine.ratingSrc}` : ""}</span>}
        </div>
      </section>

      <div className="grid-side">
        <div className="stack-lg">
          <section className="box">
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div className="stack" style={{ gap: 8 }}>
                <span className="label">수량</span>
                <nav className="seg" aria-label="수량">
                  {[1, 2, 3, 6, 12].map((n) => (
                    <Link key={n} href={href({ qty: n, sel: undefined })} aria-current={n === qty ? "true" : undefined}>{n}병</Link>
                  ))}
                </nav>
              </div>
              {sizes.length > 1 && (
                <div className="stack" style={{ gap: 8 }}>
                  <span className="label">병 용량</span>
                  <nav className="seg" aria-label="용량">
                    {sizes.map((s) => (
                      <Link key={s} href={href({ ml: s, sel: undefined })} aria-current={s === ml ? "true" : undefined}>{sizeLabel(s)}</Link>
                    ))}
                  </nav>
                </div>
              )}
            </div>
            <div className="row between" style={{ alignItems: "flex-end", gap: 16 }}>
              <div>
                <div className="label">최저 경로 병당 도착가{result.best ? ` · ${result.routes.find((r) => r.best === result.best)?.label}` : ""}</div>
                <div className="big">{result.best ? <>{Math.round(result.best.perBottle).toLocaleString("ko-KR")}<small>원</small></> : "—"}</div>
              </div>
              <div className="small" style={{ textAlign: "right" }}>
                {result.krPerBottle !== null && result.savingPerBottle !== null ? (
                  <>
                    <div className="label">국내 판매가 대비 (병당)</div>
                    <div>
                      <span className={`num ${result.savingPerBottle >= 0 ? "pos" : "neg"}`}>{result.savingPerBottle >= 0 ? "−" : "+"}{won(Math.abs(result.savingPerBottle))}</span>
                      <span className="muted"> · 국내가 {won(result.krPerBottle)}</span>
                    </div>
                    {qty > 1 && <div className="muted">{qty}병 합계 {result.savingPerBottle >= 0 ? "절감" : "추가"} {won(Math.abs(result.savingPerBottle * qty))}</div>}
                  </>
                ) : (
                  <>
                    <div className="label">국내 판매가</div>
                    <div>국내 미수입 · 직구로만 구할 수 있습니다</div>
                  </>
                )}
              </div>
            </div>
            {result.warnings.map((w) => <div key={w} className="alert">{w}</div>)}
            <div className="row">
              {result.best && <Link className="btn ghost small" href={`/share?kind=wine&wine=${id}&qty=${qty}&ml=${ml}`}>카드로 저장</Link>}
              {inCompare ? (
                <Link className="btn ghost small" href="/compare">비교함에 담김 · 비교 보기</Link>
              ) : (
                <form action={addToCompare}>
                  <input type="hidden" name="wineId" value={id} />
                  <input type="hidden" name="back" value={`/wines/${id}`} />
                  <button className="btn ghost small">비교에 담기</button>
                </form>
              )}
            </div>
            {sp.cmp === "1" && inCompare && <div className="alert ok">비교함에 담았습니다 ({compareIds.length}/{COMPARE_MAX}). <Link href="/compare">나란히 비교하기</Link></div>}
            {!ctx.fx.asOf && <div className="alert bad">환율 정보가 없어 일부 경로를 계산하지 못했습니다.</div>}
          </section>

          <section className="stack">
            <h2>경로 비교</h2>
            <div className="routes">
              {live.map((r) => {
                const c = r.best!;
                const t = trustOf(c.sellerId);
                const selected = sel && sel.channel === r.channel;
                const showing = selected ? sel! : c;
                return (
                  <div key={r.channel} className={`route${selected ? " sel" : ""}`}>
                    <div className="name">
                      {r.label}
                      {c === result.best && <span className="chip best">최저</span>}
                      {showing.tax.exempt ? (
                        <span className="chip ok">1병 면세구간</span>
                      ) : (
                        <span className={`chip ${showing.tax.fta ? "ok" : "warn"}`}>{showing.tax.fta ? "FTA 관세 0%" : `관세 ${Math.round(ctx.tax.dutyRate * 100)}%`}</span>
                      )}
                      {showing.insured && <span className="chip">파손 보험</span>}
                    </div>
                    <div className="price">
                      <span className="num">{won(showing.perBottle)}</span>
                      <span className="small muted">{qty > 1 ? `${qty}병 ${won(showing.total)}` : "병당"}</span>
                    </div>
                    <div className="meta">
                      {showing.sellerName}
                      {showing.forwarder ? ` → ${showing.forwarder.name}` : ""}
                      {t ? ` · 후기 ${t._avg.rating?.toFixed(1)}점(${t._count})` : ""} · {showing.daysMin}~{showing.daysMax}일 · 물품 {money(showing.unitPrice, showing.currency)}/병 · 운임 {won(showing.shipKrw)} · 세금 {won(showing.tax.pay)} · 가격 확인 {ymd(showing.checkedAt)}
                    </div>
                    {(() => {
                      const ms = measured(r.channel);
                      return ms ? (
                        <div className="meta" style={{ gridColumn: "1 / 3" }}>
                          <span className="chip ok">실측</span> 직구 후기 {ms.n}건 · 실제 배송 평균 {Math.round(ms.days)}일{ms.err !== null ? ` · 실제 세금이 예상보다 평균 ${ms.err >= 0 ? "+" : ""}${(ms.err * 100).toFixed(0)}%` : ""}
                        </div>
                      ) : null;
                    })()}
                    <div className="bar"><i style={{ width: `${((showing.perBottle / max) * 100).toFixed(1)}%` }} /></div>
                    <div className="actions">
                      <Link className="btn small" href={goHref(showing)}>이 경로로 주문하기</Link>
                      {!selected && <Link className="btn ghost small" href={href({ sel: `${c.channel}:${c.offerId}` })} scroll={false}>세금 내역</Link>}
                      <Link className="small muted" href={`/sellers/${showing.sellerId}`}>판매처 정보·후기</Link>
                      {showing.forwarder && <Link className="small muted" href={`/consolidate?f=${showing.forwarder.id}&q_${showing.offerId}=${qty}`}>다른 와인과 합배송 견적</Link>}
                      {r.candidates.length > 1 && (
                        <details style={{ width: "100%" }}>
                          <summary className="small muted">다른 판매처 {r.candidates.length - 1}곳</summary>
                          <div className="table-wrap" style={{ marginTop: 8 }}>
                            <table className="data">
                              <tbody>
                                {r.candidates.map((x) => (
                                  <tr key={x.offerId + (x.forwarder?.id ?? "")}>
                                    <td>{x.sellerName}{x.forwarder ? ` → ${x.forwarder.name}` : ""}</td>
                                    <td className="r">{won(x.perBottle)}</td>
                                    <td className="r"><Link href={href({ sel: `${x.channel}:${x.offerId}` })} scroll={false}>세금 내역</Link></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
              {off.map((r) => (
                <div key={r.channel} className="route off">
                  <div className="name">{r.label}<span className="chip">이용 불가</span></div>
                  <div className="meta">{r.reason}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="box" id="history">
            <h2>도착가 추이</h2>
            <PriceHistory cells={cells} krPrice={result.krPerBottle} />
          </section>

          <section className="stack" id="reviews">
            <div className="row between">
              <h2>직구 후기 {reviews.length ? reviews.length : ""}</h2>
              <Link className="btn ghost small" href={`/community/write?wine=${id}`}>후기 쓰기</Link>
            </div>
            {reviews.length ? reviews.slice(0, 5).map((rv) => <ReviewCard key={rv.id} r={rv} viewerId={user?.id} liked={liked.has(rv.id)} showWine={false} />) : (
              <div className="box"><p className="small muted">아직 이 와인을 직구한 후기가 없습니다. 직구했다면 실제 낸 세금과 배송일을 남겨 주세요. 다음 사람의 도착가가 정확해집니다.</p></div>
            )}
            {reviews.length > 5 && <Link className="small" href={`/community`}>후기 더 보기</Link>}
          </section>

          {wine.notesKo && (
            <section className="box tight">
              <h2>테이스팅 노트</h2>
              <p>{wine.notesKo}</p>
            </section>
          )}
        </div>

        <aside className="stack-lg">
          <section className="box">
            <div className="row between">
              <h2>세금 내역</h2>
              {sel && <span className={`chip ${sel.tax.exempt || sel.tax.fta ? "ok" : "warn"}`}>{sel.tax.exempt ? "1병 면세구간" : sel.tax.fta ? "FTA 원산지 구매" : "제3국 구매"}</span>}
            </div>
            {sel ? (
              <>
                <div className="label">{result.routes.find((r) => r.channel === sel.channel)?.label} · {sel.sellerName}{qty > 1 ? ` · ${qty}병 합산` : ""}</div>
                <TaxBreakdown goodsKrw={sel.goodsKrw} shipKrw={sel.shipKrw} tax={sel.tax} total={sel.total} qty={qty} dutyRate={ctx.tax.dutyRate} taxConfig={ctx.tax} />
                <p className="small muted">환율 {ctx.fx.asOf ? `${ymdhm(ctx.fx.asOf)} ${FX_SOURCE_LABEL[ctx.fx.source ?? ""] ?? ""}` : "-"} 기준 · 실제 세금은 관세청 주간 과세환율로 계산됩니다.</p>
              </>
            ) : (
              <p className="muted">이용 가능한 경로가 없습니다.</p>
            )}
          </section>

          <section className="box" id="alerts">
            <h2>{existing?.active ? "찜한 와인" : "찜하고 알림 받기"}</h2>
            <p className="small muted">{qty}병 · {sizeLabel(ml)} 기준 병당 도착가가 목표가 이하가 되면 알려드립니다. 목표가 기본값은 지금 도착가의 90%입니다.</p>
            <AlertForm wineId={id} qty={qty} ml={ml} suggested={result.best ? defaultTarget(result.best.perBottle) : 0} loggedIn={!!user} phone={user?.phone ?? null} existingTarget={existing?.active ? existing.targetPerBottle : null} existingChannel={existing?.channel} kakaoConfigured={!!alimtalkTemplate("TARGET")} />
          </section>

          <section className="box">
            <h2>주문 전 체크리스트</h2>
            <ul className="list">
              <li>개인통관고유부호를 판매처 주문서에 입력하세요. 수령인 이름·휴대폰 번호와 일치해야 합니다.</li>
              <li>배송지는 영문 주소로 적습니다.</li>
              <li>같은 판매자에게 같은 날 산 물품은 합산과세됩니다. 주문을 나눠도 세금은 줄지 않습니다.</li>
              <li>세금은 통관 때 오는 납부 안내에 따라 수령인이 냅니다.</li>
              <li>결제는 해외 판매처에서 직접 합니다. 셀러도어는 대금을 받지 않습니다.</li>
            </ul>
            <Link href="/guide" className="small">통관 가이드 전체 보기</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
