import { Prisma, type User } from "@prisma/client";
import { prisma } from "./db";
import { getCommunityConfig } from "./settings";
import { pointMultiplier } from "@/lib/community";

/** 포인트 지급. 같은 (회원, 사유, 대상)은 한 번만. 후기 관련 지급에는 오픈 이벤트 배수를 적용합니다. */
export async function award(userId: string, reason: string, refId: string, base: number, note?: string, opts: { bonus?: boolean } = {}) {
  const cfg = await getCommunityConfig();
  const amount = Math.round(base * (opts.bonus === false ? 1 : pointMultiplier(cfg)));
  try {
    await prisma.pointTx.create({ data: { userId, reason, refId, amount, note } });
    return { created: true, amount };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { created: false, amount: 0 }; // 이미 지급
    throw e;
  }
}

export async function balance(userId: string) {
  const r = await prisma.pointTx.aggregate({ where: { userId }, _sum: { amount: true } });
  return r._sum.amount ?? 0;
}

export const isPremium = (u: Pick<User, "plan" | "premiumUntil">, now = new Date()) => u.plan === "PREMIUM" || (!!u.premiumUntil && u.premiumUntil > now);

/** 프리미엄 기간 연장 (남은 기간이 있으면 그 뒤로) */
export async function extendPremium(userId: string, months: number) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const from = u.premiumUntil && u.premiumUntil > new Date() ? u.premiumUntil : new Date();
  const until = new Date(from);
  until.setMonth(until.getMonth() + months);
  await prisma.user.update({ where: { id: userId }, data: { premiumUntil: until } });
  return until;
}

/** 포인트로 프리미엄 1개월. 잔액 확인과 차감을 한 트랜잭션에서. */
export async function redeemPremium(userId: string) {
  const { costs } = await getCommunityConfig();
  const ok = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const sum = (await tx.pointTx.aggregate({ where: { userId }, _sum: { amount: true } }))._sum.amount ?? 0;
    if (sum < costs.premiumMonth) return false;
    await tx.pointTx.create({ data: { userId, reason: "redeem_premium", refId: new Date().toISOString(), amount: -costs.premiumMonth, note: "프리미엄 1개월" } });
    return true;
  });
  if (!ok) return { ok: false as const, error: `포인트가 부족합니다. 프리미엄 1개월은 ${costs.premiumMonth.toLocaleString("ko-KR")}P입니다.` };
  const until = await extendPremium(userId, 1);
  return { ok: true as const, until };
}
