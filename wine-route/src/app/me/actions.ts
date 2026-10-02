"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { getFx, getTaxConfig } from "@/server/settings";
import { calcTax } from "@/lib/tax";
import { normalizePccc } from "@/lib/order";
import { encrypt } from "@/server/crypto";
import { moveOrder } from "@/server/orders";

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

/* ---------- 주문서 정보 ---------- */
export async function saveProfile(_: { ok?: boolean; error?: string }, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const u = await requireUser();
  const t = (k: string, max = 120) => String(fd.get(k) ?? "").trim().slice(0, max) || null;
  const ascii = (v: string | null) => !v || /^[\x20-\x7E]+$/.test(v);
  const data = {
    firstNameEn: t("firstNameEn", 60),
    lastNameEn: t("lastNameEn", 60),
    address1En: t("address1En"),
    address2En: t("address2En"),
    cityEn: t("cityEn", 60),
    provinceEn: t("provinceEn", 60),
    zip: t("zip", 10),
    pcccInNote: fd.get("pcccInNote") === "on",
  };
  if (![data.firstNameEn, data.lastNameEn, data.address1En, data.address2En, data.cityEn, data.provinceEn].every(ascii))
    return { error: "이름과 주소는 영문으로 입력해 주세요. 해외 판매처 주문서는 한글을 받지 않는 경우가 많습니다." };
  if (data.zip && !/^\d{5}$/.test(data.zip)) return { error: "우편번호는 숫자 5자리입니다." };
  const phone = String(fd.get("phone") ?? "").replace(/\D/g, "");
  if (phone && !/^01\d{8,9}$/.test(phone)) return { error: "휴대폰 번호를 확인해 주세요. 예: 01012345678" };
  const rawPccc = String(fd.get("pccc") ?? "").trim();
  let pcccEnc: string | null | undefined = undefined; // undefined = 그대로 둠
  if (rawPccc) {
    const p = normalizePccc(rawPccc);
    if (!p) return { error: "개인통관고유부호는 P로 시작하는 13자리입니다. 예: P123456789012" };
    pcccEnc = encrypt(p);
  } else if (fd.get("clearPccc") === "on") pcccEnc = null;
  await prisma.user.update({ where: { id: u.id }, data: { ...data, phone: phone || null, ...(pcccEnc !== undefined ? { pcccEnc } : {}) } });
  revalidatePath("/me");
  const next = String(fd.get("next") ?? "");
  if (next.startsWith("/order/")) redirect(next);
  return { ok: true };
}

/* ---------- 내 주문 ---------- */
export async function customerOrderStep(fd: FormData) {
  const u = await requireUser();
  const id = String(fd.get("id"));
  const to = String(fd.get("to"));
  if (!["CONFIRMED", "CUSTOMS", "CANCELLED"].includes(to)) return;
  const o = await prisma.order.findFirst({ where: { id, userId: u.id } });
  if (!o) return;
  await moveOrder(o.id, to as "CONFIRMED" | "CUSTOMS" | "CANCELLED", "customer", { orderRef: String(fd.get("orderRef") ?? "").trim() || null });
  revalidatePath("/me");
}

export async function markDelivered(fd: FormData) {
  const u = await requireUser();
  const o = await prisma.order.findFirst({ where: { id: String(fd.get("id")), userId: u.id }, include: { seller: true } });
  if (!o) return;
  const taxPaid = Math.round(Number(fd.get("taxPaid")));
  if (!Number.isFinite(taxPaid) || taxPaid < 0) return;
  const r = await moveOrder(o.id, "DELIVERED", "customer", { note: `실제 세금 ${taxPaid.toLocaleString("ko-KR")}원` });
  if (!r.ok) return;
  // 도착가 오차 검증용 구매 기록을 자동으로 남깁니다.
  const p = await prisma.purchase.create({
    data: {
      userId: u.id,
      wineId: o.wineId,
      sellerName: o.seller.name,
      route: o.route,
      qty: o.qty,
      goodsPaid: Math.max(0, o.estTotal - o.estTax),
      shipPaid: 0,
      currency: "KRW",
      taxPaid,
      estTax: o.estTax,
      orderedAt: o.createdAt,
    },
  });
  await prisma.order.update({ where: { id: o.id }, data: { purchaseId: p.id } });
  revalidatePath("/me");
}
