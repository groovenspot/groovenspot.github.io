"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { getTaxConfig } from "@/server/settings";
import { isPremium } from "@/server/points";
import type { FormState } from "@/app/actions";

export async function createAlert(_: FormState, fd: FormData): Promise<FormState> {
  const wineId = String(fd.get("wineId"));
  const qty = Math.min(24, Math.max(1, Number(fd.get("qty")) || 1));
  const bottleMl = Number(fd.get("ml")) || 750;
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/wines/${wineId}?qty=${qty}&ml=${bottleMl}`)}`);
  const target = Math.round(Number(fd.get("target")));
  if (!Number.isFinite(target) || target <= 0) return { error: "목표 병당 도착가를 원 단위로 입력해 주세요." };
  const channel = fd.get("channel") === "KAKAO" ? "KAKAO" : "EMAIL";
  const phone = String(fd.get("phone") ?? "").replace(/[^\d]/g, "");
  if (channel === "KAKAO" && !/^01\d{8,9}$/.test(phone) && !user.phone) return { error: "카카오 알림톡을 받을 휴대폰 번호를 입력해 주세요." };

  const existing = await prisma.priceAlert.findUnique({ where: { userId_wineId_qty_bottleMl: { userId: user.id, wineId, qty, bottleMl } } });
  if (!existing && !isPremium(user)) {
    const { freeAlertLimit } = await getTaxConfig();
    const n = await prisma.priceAlert.count({ where: { userId: user.id, active: true } });
    if (n >= freeAlertLimit) return { error: `무료 회원은 가격 알림을 ${freeAlertLimit}개까지 걸 수 있습니다. 내 알림에서 기존 알림을 정리하거나 프리미엄으로 바꿔 주세요.` };
  }
  if (channel === "KAKAO" && phone) await prisma.user.update({ where: { id: user.id }, data: { phone } });
  await prisma.priceAlert.upsert({
    where: { userId_wineId_qty_bottleMl: { userId: user.id, wineId, qty, bottleMl } },
    update: { targetPerBottle: target, channel, active: true, notifiedPrice: null },
    create: { userId: user.id, wineId, qty, bottleMl, targetPerBottle: target, channel },
  });
  revalidatePath("/me");
  return { ok: true, message: `병당 ${target.toLocaleString("ko-KR")}원 아래로 내려가면 ${channel === "KAKAO" ? "카카오 알림톡으로" : "이메일로"} 알려드립니다.` };
}
