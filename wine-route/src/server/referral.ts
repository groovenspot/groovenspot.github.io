import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { makeRefCode, referralMilestone } from "@/lib/share";

/** 공유자 코드를 처음 쓸 때 만듭니다. */
export async function ensureRefCode(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { refCode: true } });
  if (u.refCode) return u.refCode;
  for (let i = 0; i < 5; i++) {
    try {
      const code = makeRefCode();
      await prisma.user.updateMany({ where: { id: userId, refCode: null }, data: { refCode: code } });
      const saved = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { refCode: true } });
      if (saved.refCode) return saved.refCode;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  throw new Error("공유자 코드를 만들지 못했습니다");
}

/**
 * 공유 카드 링크로 들어와 가입한 회원을 공유자에게 연결합니다.
 * 가입 3명마다 공유자에게 프리미엄 1개월 (구매 기준 보상은 하지 않음).
 */
export async function attributeSignup(newUserId: string, refCode: string | undefined) {
  if (!refCode) return;
  const referrer = await prisma.user.findUnique({ where: { refCode } });
  if (!referrer || referrer.id === newUserId) return;
  await prisma.$transaction(async (tx) => {
    // 같은 공유자의 동시 가입도 순서대로 집계해 3명째 보상이 빠지지 않도록 합니다.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`referral:${referrer.id}`}))`;
    const linked = await tx.user.updateMany({ where: { id: newUserId, referredById: null }, data: { referredById: referrer.id } });
    if (!linked.count) return;
    const n = await tx.user.count({ where: { referredById: referrer.id } });
    const m = referralMilestone(n);
    if (!m) return;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${referrer.id}))`;
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${referrer.id} FOR UPDATE`;
    await tx.pointTx.create({ data: { userId: referrer.id, reason: "referral", refId: String(m), amount: 0, note: `공유 카드로 ${n}명 가입 · 프리미엄 1개월` } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: referrer.id } });
    const now = new Date();
    const until = new Date(user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now);
    until.setMonth(until.getMonth() + 1);
    await tx.user.update({ where: { id: referrer.id }, data: { premiumUntil: until } });
  });
}
