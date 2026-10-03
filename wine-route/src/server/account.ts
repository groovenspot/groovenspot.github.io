import { prisma } from "./db";
import { decrypt } from "./crypto";

/**
 * 회원 탈퇴: 개인 데이터를 지우고, 통계용 기록(클릭·사진 검색·공유·구해주세요)은 회원과의 연결만 끊어 남깁니다.
 * 주문·찜·후기·포인트·상담·취향 설문·세션은 회원 삭제와 함께 지워집니다 (DB cascade).
 */
export async function deleteAccount(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!u) return false;
  await prisma.$transaction([
    prisma.shareEvent.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.scanLog.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.wineRequest.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.updateMany({ where: { referredById: userId }, data: { referredById: null } }),
    prisma.waitlist.deleteMany({ where: { email: u.email } }),
    prisma.loginCode.deleteMany({ where: { email: u.email } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  return true;
}

/** 내 데이터 내려받기: 회원이 볼 수 있는 본인 기록 전부 (JSON) */
export async function exportAccount(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      orders: { include: { events: true, wine: { select: { nameKo: true } }, seller: { select: { name: true } } } },
      alerts: { include: { wine: { select: { nameKo: true } } } },
      purchases: true,
      reviews: { select: { id: true, wineId: true, route: true, qty: true, taxPaid: true, shippingDays: true, damaged: true, rating: true, oneLiner: true, sponsored: true, status: true, proofStatus: true, createdAt: true } },
      points: true,
      notifications: { select: { type: true, title: true, body: true, channel: true, status: true, sentAt: true, clickedAt: true, createdAt: true } },
      consultations: { select: { question: true, answer: true, aiUsed: true, helpful: true, createdAt: true, expiresAt: true } },
      tasteProfile: true,
      firstPurchaseGuide: true,
    },
  });
  const { pcccEnc, ciHash, ...rest } = u;
  void ciHash;
  return {
    exportedAt: new Date().toISOString(),
    note: "셀러도어가 보관 중인 회원님의 데이터입니다. 개인통관고유부호는 복호화해 포함했습니다. 안전한 곳에 보관하세요.",
    account: { ...rest, pccc: decrypt(pcccEnc) },
  };
}
