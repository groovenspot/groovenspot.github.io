"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { FIRST_GUIDE_SEEN_COOKIE, firstPurchaseHref, firstPurchaseProgress, firstPurchaseSelection, hasEnglishDeliveryAddress } from "@/lib/first-purchase";
import { loadGuideContext } from "./context";

export async function saveGuideStep(_: { ok?: boolean; error?: string }, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const selection = firstPurchaseSelection({ offerId: fd.get("offerId"), qty: fd.get("qty"), route: fd.get("route") });
  const href = firstPurchaseHref(selection);
  const user = await requireUser(href);
  const step = Number(fd.get("step"));
  if (![2, 3, 4, 5].includes(step)) return { error: "확인할 단계를 다시 선택해 주세요." };
  const context = await loadGuideContext(selection);
  if (!context) return { error: "선택한 와인을 찾을 수 없습니다. 경로 비교에서 다시 선택해 주세요." };
  const guide = await prisma.firstPurchaseGuide.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  const registered = await prisma.order.findFirst({ where: { userId: user.id, status: { not: "CANCELLED" }, trackingRegisteredAt: { not: null }, trackingNo: { not: null } }, select: { id: true } });
  const progress = firstPurchaseProgress(user, guide, !!registered, context.routeKey);
  if (!progress.done.slice(0, step - 1).every(Boolean)) return { error: "앞의 준비 단계를 먼저 완료해 주세요. 완료한 항목은 계속 저장됩니다." };
  if (fd.get("confirmed") !== "on") return { error: "내용을 확인한 뒤 체크해 주세요." };
  if (step === 4 && !hasEnglishDeliveryAddress(user)) return { error: "영문 이름·주소·도시·우편번호·휴대폰을 먼저 저장해 주세요." };
  if (step === 5 && (selection.offerId && !context.candidate || selection.route === "FORWARDER" && !context.forwarder))
    return { error: "경로 비교에서 이용 가능한 판매처와 배송대행지를 먼저 선택해 주세요." };
  const updated = await prisma.firstPurchaseGuide.update({
    where: { userId: user.id },
    data: step === 2 ? { pcccIssued: true } : step === 3 ? { cardChecked: true } : step === 4 ? { addressConfirmed: true } : { preparedRoutes: [...new Set([...guide.preparedRoutes, context.routeKey])] },
  });
  if (!updated.completedAt && firstPurchaseProgress(user, updated, !!registered).completed)
    await prisma.firstPurchaseGuide.update({ where: { userId: user.id }, data: { completedAt: new Date() } });
  (await cookies()).set(FIRST_GUIDE_SEEN_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 180 * 86400 });
  revalidatePath("/guide/first");
  revalidatePath("/me");
  return { ok: true };
}
