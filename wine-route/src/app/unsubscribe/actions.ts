"use server";
import { redirect } from "next/navigation";
import { withdrawByLink } from "@/server/unsubscribe";

export async function confirmUnsubscribe(fd: FormData) {
  const u = String(fd.get("u") ?? ""), t = String(fd.get("t") ?? "");
  const r = await withdrawByLink(u, t);
  redirect(`/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}&r=${r}`);
}
