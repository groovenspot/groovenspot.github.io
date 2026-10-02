"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { getFx, getTaxConfig } from "@/server/settings";
import { calcTax } from "@/lib/tax";

export async function updatePhone(fd: FormData) {
  const u = await requireUser();
  const phone = String(fd.get("phone") ?? "").replace(/\D/g, "");
  await prisma.user.update({ where: { id: u.id }, data: { phone: /^01\d{8,9}$/.test(phone) ? phone : null } });
  revalidatePath("/me");
}

export async function toggleAlert(fd: FormData) {
  const u = await requireUser();
  const id = String(fd.get("id"));
  const a = await prisma.priceAlert.findFirst({ where: { id, userId: u.id } });
  if (!a) return;
  if (!a.active && u.plan === "FREE") {
    const { freeAlertLimit } = await getTaxConfig();
    if ((await prisma.priceAlert.count({ where: { userId: u.id, active: true } })) >= freeAlertLimit) return;
  }
  await prisma.priceAlert.update({ where: { id }, data: { active: !a.active } });
  revalidatePath("/me");
}

export async function deleteAlert(fd: FormData) {
  const u = await requireUser();
  await prisma.priceAlert.deleteMany({ where: { id: String(fd.get("id")), userId: u.id } });
  revalidatePath("/me");
}

export async function addPurchase(fd: FormData) {
  const u = await requireUser();
  const qty = Math.max(1, Number(fd.get("qty")) || 1);
  const goodsPaid = Number(fd.get("goodsPaid")) || 0;
  const shipPaid = Number(fd.get("shipPaid")) || 0;
  const currency = String(fd.get("currency") ?? "EUR");
  const route = String(fd.get("route") ?? "EXPORT_RETAILER");
  const wineId = String(fd.get("wineId") ?? "") || null;
  const taxPaid = Math.round(Number(fd.get("taxPaid")) || 0);
  const ml = Number(fd.get("ml")) || 750;
  const orderedAt = new Date(String(fd.get("orderedAt") || new Date().toISOString().slice(0, 10)));
  if (!goodsPaid) return;

  // 같은 조건의 예상 세금을 함께 저장해 도착가 오차를 측정합니다.
  const [tax, fx] = await Promise.all([getTaxConfig(), getFx()]);
  const wine = wineId ? await prisma.wine.findUnique({ where: { id: wineId } }) : null;
  const rate = fx.rates[currency];
  let estTax: number | null = null;
  if (rate && fx.rates.USD) {
    const fta = route !== "HK_RETAILER" && (!wine || tax.ftaCountries.includes(wine.country));
    estTax = calcTax({ cif: (goodsPaid + shipPaid) * rate, goodsUsdPerBottle: (goodsPaid / qty) * rate / fx.rates.USD, qty, bottleMl: ml, fta }, tax).pay;
  }
  await prisma.purchase.create({
    data: { userId: u.id, wineId, sellerName: String(fd.get("sellerName") ?? "").slice(0, 100) || "미입력", route, qty, goodsPaid, shipPaid, currency, taxPaid, estTax, orderedAt },
  });
  revalidatePath("/me");
}

export async function deletePurchase(fd: FormData) {
  const u = await requireUser();
  await prisma.purchase.deleteMany({ where: { id: String(fd.get("id")), userId: u.id } });
  revalidatePath("/me");
}
