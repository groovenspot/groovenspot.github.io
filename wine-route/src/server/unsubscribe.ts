import { prisma } from "./db";
import { consentChange } from "@/lib/consent";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

/** 서명이 맞으면 마케팅 수신 동의를 철회합니다. 이미 철회했으면 그대로 둡니다. */
export async function withdrawByLink(userId: string, token: string): Promise<"done" | "already" | "invalid"> {
  if (!userId || !token || !verifyUnsubscribe(userId, token)) return "invalid";
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { marketingConsentAt: true } });
  if (!u) return "invalid";
  if (!u.marketingConsentAt) return "already";
  await prisma.user.update({ where: { id: userId }, data: consentChange(false) });
  return "done";
}
