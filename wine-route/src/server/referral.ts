import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { award, extendPremium } from "./points";
import { makeRefCode, referralMilestone } from "@/lib/share";

/** 공유자 코드를 처음 쓸 때 만듭니다. */
export async function ensureRefCode(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { refCode: true } });
  if (u.refCode) return u.refCode;
  for (let i = 0; i < 5; i++) {
    try {
      const code = makeRefCode();
      await prisma.user.update({ where: { id: userId }, data: { refCode: code } });
      return code;
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
  await prisma.user.update({ where: { id: newUserId }, data: { referredById: referrer.id } });
  const n = await prisma.user.count({ where: { referredById: referrer.id } });
  const m = referralMilestone(n);
  if (m) {
    const { created } = await award(referrer.id, "referral", String(m), 0, `공유 카드로 ${n}명 가입 · 프리미엄 1개월`, { bonus: false });
    if (created) await extendPremium(referrer.id, 1);
  }
}
