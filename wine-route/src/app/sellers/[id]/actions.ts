"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";

export async function saveReview(fd: FormData) {
  const sellerId = String(fd.get("sellerId"));
  const u = await requireUser(`/sellers/${sellerId}`);
  const rating = Math.min(5, Math.max(1, Math.round(Number(fd.get("rating")) || 0)));
  const shippingDays = Number(fd.get("shippingDays")) || null;
  const data = { rating, shippingDays, damaged: fd.get("damaged") === "on", comment: String(fd.get("comment") ?? "").slice(0, 1000) };
  await prisma.review.upsert({ where: { userId_sellerId: { userId: u.id, sellerId } }, update: data, create: { ...data, userId: u.id, sellerId } });
  revalidatePath(`/sellers/${sellerId}`);
}
