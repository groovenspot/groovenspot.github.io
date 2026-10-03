"use server";
import { DEMO_BLOCKED, isDemo } from "@/lib/demo";
import { prisma } from "@/server/db";
import { normEmail, validEmail } from "@/server/auth";

export type FormState = { ok?: boolean; error?: string; message?: string; limit?: boolean };

export async function joinWaitlist(_: FormState, fd: FormData): Promise<FormState> {
  if (isDemo()) return { error: DEMO_BLOCKED };
  const email = normEmail(String(fd.get("email") ?? ""));
  if (!validEmail(email)) return { error: "이메일 주소 형식을 확인해 주세요." };
  if (fd.get("agree") !== "on") return { error: "출시 알림을 위한 이메일 수집에 동의해야 등록할 수 있습니다." };
  const target = Number(fd.get("target")) || null;
  const data = { wish: String(fd.get("wish") ?? "").slice(0, 120) || null, target, purpose: String(fd.get("purpose") ?? "") || null };
  await prisma.waitlist.upsert({ where: { email }, update: data, create: { email, ...data } });
  return { ok: true, message: "대기자로 등록했습니다. 출시되면 이 이메일로 알려드릴게요." };
}
