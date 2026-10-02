import { prisma } from "./db";
import { kingScore } from "@/lib/community";

export function monthRange(offset = 0, now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600e3);
  const start = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + offset, 1) - 9 * 3600e3);
  const end = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + offset + 1, 1) - 9 * 3600e3);
  return { start, end, label: new Date(start.getTime() + 9 * 3600e3).toISOString().slice(0, 7) };
}

export async function monthKings(offset = 0) {
  const { start, end, label } = monthRange(offset);
  const rows = await prisma.directReview.findMany({
    where: { status: "PUBLISHED", createdAt: { gte: start, lt: end }, sponsored: false },
    select: { userId: true, proofStatus: true, helpfulCount: true, user: { select: { nickname: true } } },
  });
  const by = new Map<string, { userId: string; nickname: string; reviews: number; verified: number; helpful: number }>();
  for (const r of rows) {
    const x = by.get(r.userId) ?? { userId: r.userId, nickname: r.user.nickname ?? "탈퇴 회원", reviews: 0, verified: 0, helpful: 0 };
    x.reviews++;
    if (r.proofStatus === "APPROVED") x.verified++;
    x.helpful += r.helpfulCount;
    by.set(r.userId, x);
  }
  return { label, list: [...by.values()].map((x) => ({ ...x, score: kingScore(x) })).sort((a, b) => b.score - a.score || b.helpful - a.helpful).slice(0, 10) };
}
