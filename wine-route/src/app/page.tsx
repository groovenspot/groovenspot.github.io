import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ensureWinePrices, searchWhere } from "@/server/winePrice";
import { ROUTE_LABEL, type ChannelKey } from "@/lib/engine";
import { WineCard } from "@/components/WineCard";
import { WaitlistForm } from "@/components/WaitlistForm";
import { won } from "@/lib/format";
import { getUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { cookies } from "next/headers";
import { RECENT_COOKIE, RECENT_MAX, inOrder, parseIds } from "@/lib/wineList";
import { clearRecent } from "@/app/compare/actions";
import { BUDGET_LABEL, isEmptyTaste, parseTaste, tasteScore, type TasteClean } from "@/lib/taste";

export const dynamic = "force-dynamic";

const PAGE = 24;
type SP = Promise<Record<string, string | undefined>>;

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const country = sp.country ?? "";
  const type = sp.type ?? "";
  const max = Number(sp.max) || 0;
  const exempt = sp.exempt === "1";
  const notKr = sp.notkr === "1"; // 국내 미유통(국내 판매가 없음) 와인만
  // 국내가가 없으면 절감액을 계산할 수 없으므로 미유통만 볼 때는 도착가 순이 기본
  const page = Math.max(1, Number(sp.page) || 1);

  // 취향 설문이 있는 회원은 '내 취향' 정렬과 추천을 씁니다 (설문은 선택, 비어 있으면 쓰지 않음)
  const user = await getUser();
  const profile = user ? await prisma.tasteProfile.findUnique({ where: { userId: user.id } }) : null;
  const taste: TasteClean | null = profile ? parseTaste({ countries: profile.countries, types: profile.types, budget: profile.budget }) : null;
  const hasTaste = !!taste && !isEmptyTaste(taste);
  const sort = sp.sort ?? (notKr ? "price" : "saving");

  // 목록·검색·정렬·페이지는 미리 계산한 최저 도착가(WinePrice)로 DB에서 처리합니다. 와인이 수천 개여도 화면당 쿼리 몇 번.
  await ensureWinePrices();
  const wineSelect = { id: true, name: true, nameKo: true, country: true, region: true, type: true, vintage: true, imageUrl: true } as const;
  const priceInclude = { wine: { select: wineSelect } } as const;
  const where: Prisma.WinePriceWhereInput = {
    ...searchWhere(q),
    ...(country || type ? { wine: { ...(country ? { country } : {}), ...(type ? { type } : {}) } } : {}),
    ...(exempt ? { exempt: true } : {}),
    ...(notKr ? { krPerBottle: null } : {}),
    ...(max ? { perBottle: { lte: max } } : {}),
  };
  const orderBy: Prisma.WinePriceOrderByWithRelationInput[] =
    sort === "price" ? [{ perBottle: { sort: "asc", nulls: "last" } }]
    : sort === "name" ? [{ wine: { nameKo: "asc" } }]
    : [{ saving: { sort: "desc", nulls: "last" } }, { perBottle: { sort: "asc", nulls: "last" } }];
  const filtering = q || country || type || max || exempt || notKr;
  const scoreOf = (r: { wine: { country: string; type: string }; perBottle: number | null }) => tasteScore(r.wine, r.perBottle, hasTaste ? taste : null);

  const [total, pageRows, facetCountries, facetTypes, nameRows, topRows] = await Promise.all([
    prisma.winePrice.count({ where }),
    // 취향 정렬은 점수를 DB 에서 매기기 어려워 조건에 맞는 것을 최대 2,000개 가져와 정렬합니다.
    sort === "taste" && hasTaste
      ? prisma.winePrice.findMany({ where, include: priceInclude, take: 2000 }).then((rows) =>
          rows.sort((a, b) => scoreOf(b) - scoreOf(a) || (a.perBottle ?? Infinity) - (b.perBottle ?? Infinity)).slice((page - 1) * PAGE, page * PAGE))
      : prisma.winePrice.findMany({ where, include: priceInclude, orderBy, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.wine.findMany({ distinct: ["country"], select: { country: true }, orderBy: { country: "asc" } }),
    prisma.wine.findMany({ distinct: ["type"], select: { type: true }, orderBy: { type: "asc" } }),
    prisma.wine.findMany({ select: { nameKo: true, name: true, producer: true, region: true }, take: 2000 }),
    prisma.winePrice.findMany({ where: { saving: { gt: 0 } }, include: priceInclude, orderBy: { saving: "desc" }, take: 10 }),
  ]);
  const countries = facetCountries.map((c) => c.country);
  const types = facetTypes.map((t) => t.type);
  const suggestions = [...new Set(nameRows.flatMap((w) => [w.nameKo, w.name, w.producer, w.region]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")).slice(0, 500);
  const shown = pageRows;
  const pages = Math.ceil(total / PAGE);

  const picks = hasTaste
    ? (await prisma.winePrice.findMany({
        where: { perBottle: { not: null }, wine: { OR: [{ country: { in: taste!.countries } }, { type: { in: taste!.types } }] } },
        include: priceInclude, orderBy: { saving: { sort: "desc", nulls: "last" } }, take: 200,
      })).filter((r) => scoreOf(r) > 0).sort((a, b) => scoreOf(b) - scoreOf(a) || (b.saving ?? -Infinity) - (a.saving ?? -Infinity)).slice(0, 6)
    : [];
  const tasteLine = hasTaste ? [taste!.countries.join("·"), taste!.types.join("·"), taste!.budget ? `병당 ${BUDGET_LABEL[taste!.budget]}` : ""].filter(Boolean).join(" / ") : "";

  const recentIds = parseIds((await cookies()).get(RECENT_COOKIE)?.value, RECENT_MAX);
  const recent = recentIds.length ? inOrder(recentIds, (await prisma.winePrice.findMany({ where: { wineId: { in: recentIds } }, include: priceInclude })).map((r) => ({ ...r, id: r.wineId }))) : [];
  const top = topRows;

  // 셀러도어 직구 후기 평점 (협찬 제외) · 화면에 나오는 와인만
  const shownIds = [...new Set([...shown, ...picks].map((r) => r.wineId))];
  const ratingRows = shownIds.length ? await prisma.directReview.groupBy({ by: ["wineId"], where: { wineId: { in: shownIds }, status: "PUBLISHED", sponsored: false }, _avg: { rating: true }, _count: true }) : [];
  const communityOf = (id: string) => {
    const r = ratingRows.find((x) => x.wineId === id);
    return r && r._avg.rating !== null ? { avg: r._avg.rating, n: r._count } : undefined;
  };

  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const all = { q, country, type, max: max || undefined, exempt: exempt ? "1" : undefined, notkr: notKr ? "1" : undefined, sort, page, ...patch };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    return `/?${p}`;
  };

  return (
    <div className="stack-lg">
      {sp.deleted === "1" && <div className="alert ok">탈퇴가 완료됐습니다. 그동안 셀러도어를 이용해 주셔서 고맙습니다.</div>}
      <section className="stack" style={{ gap: 8 }}>
        <div className="label">와인 직구 최적경로</div>
        <h1>
          이 와인, 한국에 <em>얼마에</em> 도착할까?
        </h1>
        <p className="lede">
          와이너리 직배송, 현지 리테일러, 배송대행지, 홍콩 경유. 네 경로의 운임과 관세·주세·교육세·부가세를 모두 더한 병당 도착가로 가장 싼 길을 찾아 드립니다.
        </p>
      </section>

      <form className="box" action="/" method="get" role="search">
        <div className="field">
          <label className="label" htmlFor="q">와인 검색</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="와인명·와이너리·산지·품종. 예: 샤블리, 리슬링, 샴페인" list="wine-names" autoComplete="off" />
          {/* 검색 자동완성: 한글·원어 이름, 생산자, 산지 (브라우저 기본 목록이라 스크립트 없이 동작) */}
          <datalist id="wine-names">
            {suggestions.map((v) => <option key={v} value={v} />)}
          </datalist>
        </div>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="country">국가</label>
            <select id="country" name="country" defaultValue={country}>
              <option value="">전체</option>
              {countries.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="type">종류</label>
            <select id="type" name="type" defaultValue={type}>
              <option value="">전체</option>
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="max">병당 도착가 상한(원)</label>
            <input id="max" name="max" type="number" min={0} step={10000} defaultValue={max || ""} placeholder="예: 100000" />
          </div>
          <div className="field">
            <label className="label" htmlFor="sort">정렬</label>
            <select id="sort" name="sort" defaultValue={sort}>
              <option value="saving">국내가 대비 절감액 큰 순</option>
              <option value="price">도착가 낮은 순</option>
              <option value="name">이름순</option>
              {hasTaste && <option value="taste">내 취향 맞춤</option>}
            </select>
          </div>
        </div>
        <div className="row between">
          <div className="row">
            <label className="check"><input type="checkbox" name="exempt" value="1" defaultChecked={exempt} /> 면세구간(1병·1L·150달러 이하)만 보기</label>
            <label className="check"><input type="checkbox" name="notkr" value="1" defaultChecked={notKr} /> 국내 미유통 와인만 보기</label>
          </div>
          <div className="row">
            {filtering ? <Link href="/" className="btn ghost">초기화</Link> : null}
            <button className="btn">검색</button>
          </div>
        </div>
      </form>

      {!filtering && recent.length > 0 && (
        <section className="stack" aria-labelledby="recent-h">
          <div className="row between">
            <h2 id="recent-h">최근 본 와인</h2>
            <form action={clearRecent} className="row" style={{ gap: 8 }}>
              <span className="small muted">이 브라우저에만 저장</span>
              <button className="btn ghost small">기록 지우기</button>
            </form>
          </div>
          <div className="recent-row">
            {recent.map(({ wine, perBottle }) => (
              <Link key={wine.id} href={`/wines/${wine.id}`} className="card recent">
                <span className="name">{wine.nameKo}</span>
                <span className="sub">{wine.country} · {wine.vintage ?? "NV"}</span>
                <span className="num">{perBottle !== null ? won(perBottle) : "—"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!filtering && picks.length > 0 && (
        <section className="stack">
          <div className="row between">
            <h2>내 취향에 맞는 와인</h2>
            <span className="small muted">취향 설문: {tasteLine} · <Link href="/me#preferences">바꾸기</Link></span>
          </div>
          <div className="cards">
            {picks.map((r) => <WineCard key={r.wineId} wine={r.wine} price={r} community={communityOf(r.wineId)} />)}
          </div>
        </section>
      )}
      {!filtering && user && !hasTaste && (
        <div className="box tight"><div className="row between"><span className="small">좋아하는 산지·종류와 예산을 알려주시면 취향에 맞는 와인을 먼저 보여드립니다.</span><Link className="btn ghost small" href="/me#preferences">취향 설문 (선택)</Link></div></div>
      )}

      {!filtering && top.length > 0 && (
        <section className="stack">
          <div className="row between">
            <h2>이번 주 절감 TOP {top.length}</h2>
            <span className="small muted">국내 판매가 대비 1병 도착가 기준</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>#</th><th>와인</th><th>최저 경로</th><th className="r">도착가</th><th className="r">국내가</th><th className="r">절감</th></tr>
              </thead>
              <tbody>
                {top.map(({ wine, route, perBottle, krPerBottle, saving }, i) => (
                  <tr key={wine.id}>
                    <td className="num">{i + 1}</td>
                    <td><Link href={`/wines/${wine.id}`}>{wine.nameKo}</Link></td>
                    <td className="small muted">{route ? ROUTE_LABEL[route as ChannelKey] : "-"}</td>
                    <td className="r">{won(perBottle!)}</td>
                    <td className="r muted">{won(krPerBottle!)}</td>
                    <td className="r pos">−{won(saving!)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="stack">
        <div className="row between">
          <h2>{filtering ? `검색 결과 ${total.toLocaleString("ko-KR")}개` : `전체 와인 ${total.toLocaleString("ko-KR")}개`}</h2>
          <span className="small muted">1병 · 750ml 기준</span>
        </div>
        {shown.length ? (
          <div className="cards">
            {shown.map((r) => <WineCard key={r.wineId} wine={r.wine} price={r} community={communityOf(r.wineId)} />)}
          </div>
        ) : (
          <div className="box">
            <p>조건에 맞는 와인이 없습니다.</p>
            <p className="small muted">찾는 와인이 목록에 없다면 <Link href="/calculator">직접 계산</Link>에서 판매처 가격과 운임으로 도착가를 계산해 보세요.</p>
          </div>
        )}
        {pages > 1 && (
          <nav className="seg" aria-label="페이지">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={qs({ page: n })} aria-current={n === page ? "true" : undefined}>{n}</Link>
            ))}
          </nav>
        )}
      </section>

      <section className="box grid-2" style={{ padding: 24 }} aria-labelledby="wl-h">
        <div className="stack">
          <div className="label">출시 알림</div>
          <h2 id="wl-h">원하는 와인이 목표가 아래로 내려가면 알려드립니다</h2>
          <p className="small muted">로그인하면 와인 상세 화면에서 바로 가격 알림을 걸 수 있습니다. 아직 목록에 없는 와인은 여기에 남겨 주세요. 등록 요청이 많은 와인부터 판매처를 추가합니다.</p>
        </div>
        <WaitlistForm />
      </section>
    </div>
  );
}
