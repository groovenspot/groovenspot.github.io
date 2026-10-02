"use server";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";

export async function logShare(e: { kind: string; format: string; action: "save" | "share"; wineId?: string }) {
  if (!["wine", "review", "month"].includes(e.kind) || !["story", "square"].includes(e.format)) return;
  const user = await getUser();
  await prisma.shareEvent.create({
    data: { userId: user?.id ?? null, anonId: (await cookies()).get("wr_anon")?.value ?? null, kind: e.kind, format: e.format, action: e.action, wineId: e.wineId ?? null },
  });
}
