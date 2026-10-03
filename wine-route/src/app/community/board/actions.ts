"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { memberState } from "@/server/member";
import { boardStatus } from "@/server/board";
import { requireUser } from "@/server/auth";
import { BOARD_LIMITS, REPORT_REASONS, validateComment, validatePost } from "@/lib/community";

type S = { error?: string };
const dayAgo = () => new Date(Date.now() - 86400e3);

async function writer(): Promise<{ userId: string; patterns: string[] } | { error: string }> {
  const m = await memberState();
  if (!m.ok || !m.user) return { error: "성인인증과 닉네임 설정 후 글을 쓸 수 있습니다." };
  const st = await boardStatus();
  if (!st.open) return { error: "자유게시판이 아직 열리지 않았습니다." };
  return { userId: m.user.id, patterns: st.cfg.bannedPatterns };
}

export async function createPost(_: S, fd: FormData): Promise<S> {
  const w = await writer();
  if ("error" in w) return w;
  const input = { category: String(fd.get("category") ?? ""), title: String(fd.get("title") ?? ""), body: String(fd.get("body") ?? "") };
  const bad = validatePost(input, w.patterns);
  if (bad) return { error: bad };
  if ((await prisma.post.count({ where: { userId: w.userId, createdAt: { gt: dayAgo() } } })) >= BOARD_LIMITS.postsPerDay) return { error: `글은 하루 ${BOARD_LIMITS.postsPerDay}개까지 쓸 수 있습니다.` };
  const wineId = String(fd.get("wineId") ?? "") || null;
  if (wineId && !(await prisma.wine.findUnique({ where: { id: wineId }, select: { id: true } }))) return { error: "와인을 다시 골라 주세요." };
  const post = await prisma.post.create({ data: { userId: w.userId, category: input.category, title: input.title.trim(), body: input.body.trim(), wineId } });
  revalidatePath("/community/board");
  redirect(`/community/board/${post.id}`);
}

export async function createComment(_: S, fd: FormData): Promise<S> {
  const w = await writer();
  if ("error" in w) return w;
  const postId = String(fd.get("postId") ?? "");
  const body = String(fd.get("body") ?? "");
  const bad = validateComment(body, w.patterns);
  if (bad) return { error: bad };
  if ((await prisma.postComment.count({ where: { userId: w.userId, createdAt: { gt: dayAgo() } } })) >= BOARD_LIMITS.commentsPerDay) return { error: `댓글은 하루 ${BOARD_LIMITS.commentsPerDay}개까지 쓸 수 있습니다.` };
  const ok = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Post" WHERE id = ${postId} FOR UPDATE`;
    const post = await tx.post.findUnique({ where: { id: postId } });
    if (!post || post.status !== "PUBLISHED") return false;
    await tx.postComment.create({ data: { postId, userId: w.userId, body: body.trim() } });
    await tx.post.update({ where: { id: postId }, data: { commentCount: await tx.postComment.count({ where: { postId, status: "PUBLISHED" } }) } });
    return true;
  });
  if (!ok) return { error: "댓글을 달 수 없는 글입니다." };
  revalidatePath(`/community/board/${postId}`);
  revalidatePath("/community/board");
  return {};
}

export async function deleteMyPost(fd: FormData) {
  const u = await requireUser("/community/board");
  await prisma.post.updateMany({ where: { id: String(fd.get("id") ?? ""), userId: u.id }, data: { status: "DELETED" } });
  revalidatePath("/community/board");
  redirect("/community/board?deleted=1");
}

export async function deleteMyComment(fd: FormData) {
  const u = await requireUser("/community/board");
  const id = String(fd.get("id") ?? "");
  const c = await prisma.postComment.findFirst({ where: { id, userId: u.id } });
  if (!c) return;
  await prisma.$transaction(async (tx) => {
    await tx.postComment.update({ where: { id }, data: { status: "DELETED" } });
    await tx.post.update({ where: { id: c.postId }, data: { commentCount: await tx.postComment.count({ where: { postId: c.postId, status: "PUBLISHED" } }) } });
  });
  revalidatePath(`/community/board/${c.postId}`);
}

/** 신고: 접수 즉시 숨기고 운영자가 복구 또는 삭제합니다 (후기 신고와 같은 방식). */
export async function reportBoard(fd: FormData) {
  const m = await memberState();
  const back = String(fd.get("back") ?? "/community/board");
  if (!m.ok || !m.user) redirect(`/verify?next=${encodeURIComponent(back.startsWith("/community/board") ? back : "/community/board")}`);
  const userId = m.user!.id;
  const targetType = String(fd.get("targetType") ?? "");
  const targetId = String(fd.get("targetId") ?? "");
  const reason = String(fd.get("reason") ?? "");
  if (!["post", "comment"].includes(targetType) || !(REPORT_REASONS as readonly string[]).includes(reason)) return;
  await prisma.$transaction(async (tx) => {
    const target = targetType === "post" ? await tx.post.findUnique({ where: { id: targetId } }) : await tx.postComment.findUnique({ where: { id: targetId } });
    if (!target || target.status === "DELETED" || target.userId === userId) return;
    await tx.postReport.upsert({
      where: { targetType_targetId_userId: { targetType, targetId, userId } },
      update: { reason, resolvedAt: null, resolution: null },
      create: { targetType, targetId, userId, reason },
    });
    if (targetType === "post") await tx.post.updateMany({ where: { id: targetId, status: "PUBLISHED" }, data: { status: "HIDDEN" } });
    else {
      const c = target as { postId: string };
      await tx.postComment.updateMany({ where: { id: targetId, status: "PUBLISHED" }, data: { status: "HIDDEN" } });
      await tx.post.update({ where: { id: c.postId }, data: { commentCount: await tx.postComment.count({ where: { postId: c.postId, status: "PUBLISHED" } }) } });
    }
  });
  revalidatePath("/community/board");
  redirect(back.startsWith("/community/board") ? `${back.split("?")[0]}?reported=1` : "/community/board");
}
