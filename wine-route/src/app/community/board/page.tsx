import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { boardStatus, authorSelect } from "@/server/board";
import { memberState } from "@/server/member";
import { CommunityNav } from "@/components/CommunityNav";
import { BOARD_CATEGORIES, isBoardCategory } from "@/lib/community";
import { ymd } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "자유게시판" };

const PAGE = 30;
type SP = Promise<Record<string, string | undefined>>;

export default async function Board({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const st = await boardStatus();
  const cat = sp.c && isBoardCategory(sp.c) ? sp.c : null;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const where = { status: "PUBLISHED" as const, ...(cat ? { category: cat } : {}) };
  const [posts, total, m] = st.open
    ? await Promise.all([
        prisma.post.findMany({ where, include: { user: authorSelect, wine: { select: { id: true, nameKo: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
        prisma.post.count({ where }),
        memberState(),
      ])
    : [[], 0, await memberState()];
  const pages = Math.ceil(total / PAGE);
  const pct = (a: number, b: number) => `${Math.min(100, (a / Math.max(1, b)) * 100).toFixed(0)}%`;
  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ c: cat ?? undefined, page, ...patch })) if (v !== undefined && !(k === "page" && v === 1)) p.set(k, String(v));
    return `/community/board${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 8 }}>
        <div className="label">커뮤니티</div>
        <h1 style={{ fontSize: "clamp(22px,3.4vw,30px)" }}>자유게시판</h1>
        <p className="lede">직구 경험, 통관 질문, 와인 이야기를 나눕니다. 성인인증과 닉네임을 마친 회원만 글을 쓸 수 있습니다.</p>
        <CommunityNav current="board" />
      </section>

      {!st.open ? (
        <section className="box">
          <h2>아직 열리지 않았습니다</h2>
          {st.cfg.boardMode === "closed" ? (
            <p className="small muted">운영 사정으로 자유게시판을 잠시 닫았습니다. 직구 후기는 계속 쓸 수 있습니다.</p>
          ) : (
            <>
              <p className="small muted">직구 후기 {st.cfg.stage2.reviews.toLocaleString("ko-KR")}개와 성인인증 회원 {st.cfg.stage2.members.toLocaleString("ko-KR")}명이 모이면 자유게시판이 열립니다. 그 전까지는 실제 세금·배송 기록이 쌓이는 직구 후기에 집중합니다.</p>
              <div className="grid-2">
                <div className="stack" style={{ gap: 4 }}><span className="small">직구 후기 {st.published.toLocaleString("ko-KR")} / {st.cfg.stage2.reviews.toLocaleString("ko-KR")}</span><div className="meter"><i style={{ width: pct(st.published, st.cfg.stage2.reviews) }} /></div></div>
                <div className="stack" style={{ gap: 4 }}><span className="small">성인인증 회원 {st.members.toLocaleString("ko-KR")} / {st.cfg.stage2.members.toLocaleString("ko-KR")}</span><div className="meter"><i style={{ width: pct(st.members, st.cfg.stage2.members) }} /></div></div>
              </div>
            </>
          )}
          <div><Link className="btn ghost small" href="/community/write">직구 후기 쓰기</Link></div>
        </section>
      ) : (
        <>
          {sp.deleted === "1" && <div className="alert ok">글을 지웠습니다.</div>}
          <div className="row between">
            <nav className="seg" aria-label="말머리">
              <Link href={href({ c: undefined, page: 1 })} aria-current={!cat ? "true" : undefined}>전체</Link>
              {Object.entries(BOARD_CATEGORIES).map(([k, v]) => <Link key={k} href={href({ c: k, page: 1 })} aria-current={cat === k ? "true" : undefined}>{v}</Link>)}
            </nav>
            <Link className="btn small" href={m.ok ? "/community/board/write" : m.need === "login" ? "/login?next=/community/board/write" : "/verify?next=/community/board/write"}>글쓰기</Link>
          </div>
          {posts.length ? (
            <div className="table-wrap">
              <table className="data board">
                <thead><tr><th>말머리</th><th>제목</th><th>글쓴이</th><th className="r">날짜</th></tr></thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td><span className="chip">{BOARD_CATEGORIES[p.category as keyof typeof BOARD_CATEGORIES] ?? p.category}</span></td>
                      <td>
                        <Link href={`/community/board/${p.id}`}>{p.title}</Link>
                        {p.commentCount > 0 && <span className="small muted"> [{p.commentCount}]</span>}
                        {p.wine && <div className="small muted">{p.wine.nameKo}</div>}
                      </td>
                      <td className="small">{p.user.nickname}{p.user.founding ? " · 초기 회원" : ""}</td>
                      <td className="r small muted">{ymd(p.createdAt).slice(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="box"><p className="small muted">아직 글이 없습니다. 첫 글을 남겨 주세요.</p></div>}
          {pages > 1 && (
            <nav className="seg" aria-label="페이지">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => <Link key={n} href={href({ page: n })} aria-current={n === page ? "true" : undefined}>{n}</Link>)}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
