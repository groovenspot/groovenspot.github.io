import { prisma } from "@/server/db";
import { consultationRetentionDays } from "@/lib/consultation";

/** 만료 대화는 조회에서 제외되며, 이 작업이 저장된 기록도 삭제합니다. */
export async function runConsultationCleanup() {
  const now = new Date();
  const days = consultationRetentionDays();
  const before = new Date(now.getTime() - days * 86400e3);
  const [conversations, usage] = await prisma.$transaction([
    prisma.consultation.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.consultationDailyUsage.deleteMany({ where: { day: { lt: before } } }),
  ]);
  return `만료 상담 ${conversations.count}건 · 지난 상담 이용량 ${usage.count}건 삭제`;
}
