import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { memberState } from "@/server/member";
import { boardStatus } from "@/server/board";
import { CommunityNav } from "@/components/CommunityNav";
import { PostForm } from "@/components/BoardForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "자유게시판 글쓰기", robots: { index: false } };

export default async function BoardWrite({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const here = `/community/board/write${sp.wine ? `?wine=${sp.wine}` : ""}`;
  const m = await memberState();
  if (m.need === "login") redirect(`/login?next=${encodeURIComponent(here)}`);
  if (!m.ok) redirect(`/verify?next=${encodeURIComponent(here)}`);
  if (!(await boardStatus()).open) redirect("/community/board");
  const wines = await prisma.wine.findMany({ select: { id: true, nameKo: true, vintage: true }, orderBy: { nameKo: "asc" } });
  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 26 }}>자유게시판 글쓰기</h1>
        <CommunityNav current="board" />
      </section>
      <PostForm wines={wines.map((w) => ({ id: w.id, label: `${w.nameKo} ${w.vintage ?? "NV"}` }))} defaultWine={sp.wine} />
    </div>
  );
}
