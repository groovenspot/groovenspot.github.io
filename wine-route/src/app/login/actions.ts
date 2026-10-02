"use server";
import { redirect } from "next/navigation";
import { requestLoginCode, verifyLoginCode } from "@/server/auth";

const safeNext = (n: unknown) => {
  const s = String(n ?? "/me");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/me";
};

export async function sendCode(fd: FormData) {
  const next = safeNext(fd.get("next"));
  const r = await requestLoginCode(String(fd.get("email") ?? ""));
  if (!r.ok) redirect(`/login?error=${encodeURIComponent(r.error)}&next=${encodeURIComponent(next)}`);
  redirect(`/login?step=code&email=${encodeURIComponent(r.email)}&next=${encodeURIComponent(next)}`);
}

export async function checkCode(fd: FormData) {
  const next = safeNext(fd.get("next"));
  const email = String(fd.get("email") ?? "");
  const r = await verifyLoginCode(email, String(fd.get("code") ?? ""));
  if (!r.ok) redirect(`/login?step=code&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}&error=${encodeURIComponent(r.error)}`);
  redirect(next);
}
