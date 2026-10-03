import { Prisma, type User } from "@prisma/client";
import { randomUUID } from "node:crypto";
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

function validateMonths(months: number) {
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new RangeError("프리미엄 기간은 1~120개월이어야 합니다.");
}

/** 모든 프리미엄 변경·교환이 같은 회원 잠금을 사용합니다. 잠금은 트랜잭션 종료 시 해제됩니다. */
async function lockUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}

/** 호출자의 원장·초대코드 변경과 함께 커밋할 수 있는 기간 연장. 동일 회원 잠금은 재진입 가능합니다. */
export async function extendPremiumInTransaction(tx: Prisma.TransactionClient, userId: string, months: number) {
  validateMonths(months);
  await lockUser(tx, userId);
  const u = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();
  const from = u.premiumUntil && u.premiumUntil > now ? u.premiumUntil : now;
  const until = new Date(from);
  until.setMonth(until.getMonth() + months);
  await tx.user.update({ where: { id: userId }, data: { premiumUntil: until } });
  return until;
}

/** 프리미엄 기간 연장 (남은 기간이 있으면 그 뒤로). 동시 연장도 모두 반영합니다. */
export async function extendPremium(userId: string, months: number) {
  validateMonths(months);
  return prisma.$transaction((tx) => extendPremiumInTransaction(tx, userId, months));
}

/** 같은 보상의 원장과 프리미엄을 한 번만, 함께 반영합니다. */
export async function awardPremiumOnce(userId: string, reason: string, refId: string, months: number, note?: string) {
  validateMonths(months);
  try {
    return await prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const previous = await tx.pointTx.findUnique({ where: { userId_reason_refId: { userId, reason, refId } } });
      if (previous) return { created: false as const, until: null };
      await tx.pointTx.create({ data: { userId, reason, refId, amount: 0, note } });
      const until = await extendPremiumInTransaction(tx, userId, months);
      return { created: true as const, until };
    });
  } catch (e) {
    // 다른 원장 지급 경로가 같은 고유 키를 먼저 쓴 경우도 중복 보상하지 않습니다.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { created: false as const, until: null };
    throw e;
  }
}

/** 포인트로 프리미엄 1개월. 잔액 확인·차감·기간 연장을 한 트랜잭션에서. */
export async function redeemPremium(userId: string) {
  const { costs } = await getCommunityConfig();
  const cost = costs.premiumMonth;
  if (!Number.isInteger(cost) || cost < 1 || cost > 2_147_483_647) {
    return { ok: false as const, error: "프리미엄 교환 비용 설정을 확인해 주세요." };
  }
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const sum = (await tx.pointTx.aggregate({ where: { userId }, _sum: { amount: true } }))._sum.amount ?? 0;
    if (sum < cost) return { ok: false as const, error: `포인트가 부족합니다. 프리미엄 1개월은 ${cost.toLocaleString("ko-KR")}P입니다.` };
    await tx.pointTx.create({ data: { userId, reason: "redeem_premium", refId: randomUUID(), amount: -cost, note: "프리미엄 1개월" } });
    const until = await extendPremiumInTransaction(tx, userId, 1);
    return { ok: true as const, until };
  });
}
