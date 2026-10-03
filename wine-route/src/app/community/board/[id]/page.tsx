import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { boardStatus, authorSelect } from "@/server/board";
import { CommunityNav } from "@/components/CommunityNav";
import { CommentForm } from "@/components/BoardForms";
import { BoardReport } from "@/components/BoardReport";
import { deleteMyComment, deleteMyPost } from "../actions";
import { BOARD_CATEGORIES } from "@/lib/community";
import { ymdhm } from "@/lib/format";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.post.findFirst({ where: { id, status: "PUBLISHED" }, select: { title: true, body: true } });
  return p ? { title: p.title, description: p.body.slice(0, 120) } : { title: "자유게시판", robots: { index: false } };
}

export default async function PostPage({ params, searchParams }: P) {
  const { id } = await params;
  const sp = await searchParams;
  const st = await boardStatus();
  if (!st.open) notFound();
  const post = await prisma.post.findUnique({
    where: { id },
    include: { user: authorSelect, wine: { select: { id: true, nameKo: true } }, comments: { where: { status: "PUBLISHED" }, include: { user: authorSelect }, orderBy: { createdAt: "asc" } } },
  });
  if (!post || post.status === "DELETED") notFound();
  const user = await getUser();
  const mine = user?.id === post.userId;
  // 신고로 숨긴 글은 글쓴이에게만 보입니다.
  if (post.status === "HIDDEN" && !mine) {
    return (
      <div className="stack-lg">
        <CommunityNav current="board" />
        <div className="box">
          <p>{sp.reported === "1" ? "신고를 접수했습니다. 운영자가 확인할 때까지 이 글은 숨겨집니다." : "신고로 숨겨진 글입니다. 운영자가 확인하고 있습니다."}</p>
          <Link className="small" href="/community/board">목록으로</Link>
        </div>
      </div>
    );
  }
  const back = `/community/board/${post.id}`;
  const canWrite = !!user?.adultVerifiedAt && !!user?.nickname;

  return (
    <div className="stack-lg">
      <CommunityNav current="board" />
      {sp.reported === "1" && <div className="alert ok">신고를 접수했습니다. 운영자가 확인할 때까지 숨겨집니다.</div>}
      <article className="box">
        <div className="row" style={{ gap: 6 }}>
          <span className="chip">{BOARD_CATEGORIES[post.category as keyof typeof BOARD_CATEGORIES] ?? post.category}</span>
          {post.status === "HIDDEN" && <span className="chip warn">신고로 숨김 · 운영자 확인 중</span>}
        </div>
        <h1 style={{ fontSize: 24 }}>{post.title}</h1>
        <div className="small muted">{post.user.nickname}{post.user.founding ? " · 초기 회원" : ""} · {ymdhm(post.createdAt)}{post.wine && <> · <Link href={`/wines/${post.wine.id}`}>{post.wine.nameKo}</Link></>}</div>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{post.body}</div>
        <div className="row between">
          {mine ? (
            <form action={deleteMyPost}><input type="hidden" name="id" value={post.id} /><button className="btn ghost small">글 지우기</button></form>
          ) : user ? <BoardReport targetType="post" targetId={post.id} back={back} /> : <span />}
          <Link className="small" href="/community/board">목록으로</Link>
        </div>
      </article>

      <section className="stack" aria-labelledby="comments-h">
        <h2 id="comments-h">댓글 {post.comments.length}</h2>
        {post.comments.map((c) => (
          <div key={c.id} className="box tight">
            <div className="small muted">{c.user.nickname} · {ymdhm(c.createdAt)}</div>
            <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{c.body}</div>
            {user?.id === c.userId ? (
              <form action={deleteMyComment}><input type="hidden" name="id" value={c.id} /><button className="btn ghost small">지우기</button></form>
            ) : user ? <BoardReport targetType="comment" targetId={c.id} back={back} /> : null}
          </div>
        ))}
        {post.status === "PUBLISHED" && (canWrite ? <CommentForm postId={post.id} /> : (
          <p className="small muted">{user ? <Link href={`/verify?next=${encodeURIComponent(back)}`}>성인인증과 닉네임 설정</Link> : <Link href={`/login?next=${encodeURIComponent(back)}`}>로그인</Link>} 후 댓글을 달 수 있습니다.</p>
        ))}
      </section>
    </div>
  );
}
