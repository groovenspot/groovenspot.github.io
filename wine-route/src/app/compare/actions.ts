"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COMPARE_COOKIE, COMPARE_MAX, RECENT_COOKIE, addCompare, parseIds, removeId } from "@/lib/wineList";

const opts = { httpOnly: true, sameSite: "lax" as const, maxAge: 30 * 86400, path: "/" };

async function save(ids: string[]) {
  const jar = await cookies();
  if (ids.length) jar.set(COMPARE_COOKIE, ids.join(","), opts);
  else jar.delete(COMPARE_COOKIE);
}

async function current() {
  return parseIds((await cookies()).get(COMPARE_COOKIE)?.value, COMPARE_MAX);
}

/** 와인 상세·비교 화면의 '비교에 담기'. back 이 있으면 그 화면으로 돌아갑니다. */
export async function addToCompare(fd: FormData) {
  const id = String(fd.get("wineId") ?? "");
  await save(addCompare(await current(), id));
  revalidatePath("/", "layout");
  const back = String(fd.get("back") ?? "");
  redirect(back.startsWith("/wines/") ? `${back}${back.includes("?") ? "&" : "?"}cmp=1` : "/compare");
}

export async function removeFromCompare(fd: FormData) {
  await save(removeId(await current(), String(fd.get("wineId") ?? "")));
  revalidatePath("/", "layout");
  redirect("/compare");
}

export async function clearCompare() {
  await save([]);
  revalidatePath("/", "layout");
  redirect("/compare");
}

export async function clearRecent() {
  (await cookies()).delete(RECENT_COOKIE);
  revalidatePath("/");
  redirect("/");
}
