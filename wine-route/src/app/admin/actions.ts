"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Channel, CheckoutMode, OrderStatus, PriceSource } from "@prisma/client";
import { moveOrder } from "@/server/orders";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { getCommunityConfig, getTaxConfig, saveCommunityConfig, saveFxConfig, saveTaxConfig } from "@/server/settings";
import { award, extendPremium } from "@/server/points";
import { monthKings } from "@/server/ranking";
import { runJob, type JobName } from "@/jobs/run";
import { runCrawlJob } from "@/jobs/crawl";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOr = (fd: FormData, k: string, d: number) => {
  const v = Number(fd.get(k));
  return Number.isFinite(v) && str(fd, k) !== "" ? v : d;
};
const intOrNull = (fd: FormData, k: string) => (str(fd, k) === "" ? null : Math.round(Number(fd.get(k))));
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const list = (fd: FormData, k: string) => str(fd, k).split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

/* ---------- 작업 ---------- */
export async function runJobAction(fd: FormData) {
  await requireAdmin();
  const job = str(fd, "job") as JobName;
  const sellerId = str(fd, "sellerId");
  if (job === "crawl" && sellerId) await runCrawlJob(sellerId);
  else await runJob(job);
  revalidatePath("/admin", "layout");
}

/* ---------- 와인 ---------- */
function wineData(fd: FormData) {
  return {
    name: str(fd, "name"),
    nameKo: str(fd, "nameKo"),
    producer: str(fd, "producer"),
    country: str(fd, "country"),
    region: str(fd, "region"),
    type: str(fd, "type"),
    grape: str(fd, "grape"),
    vintage: intOrNull(fd, "vintage"),
    aliases: list(fd, "aliases"),
    krPrice: intOrNull(fd, "krPrice"),
    krPriceSrc: str(fd, "krPriceSrc") || null,
    rating: str(fd, "rating") ? Number(fd.get("rating")) : null,
    ratingSrc: str(fd, "ratingSrc") || null,
    notesKo: str(fd, "notesKo") || null,
  };
}

export async function saveWine(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const data = wineData(fd);
  if (!data.name || !data.nameKo || !data.country) throw new Error("원어명·한글명·국가는 필수입니다");
  const w = id ? await prisma.wine.update({ where: { id }, data }) : await prisma.wine.create({ data });
  revalidatePath("/admin/wines");
  redirect(`/admin/wines/${w.id}`);
}

export async function deleteWine(fd: FormData) {
  await requireAdmin();
  await prisma.wine.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/wines");
  redirect("/admin/wines");
}

/* ---------- 판매 정보 ---------- */
export async function saveOffer(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const wineId = str(fd, "wineId");
  const data = { url: str(fd, "url"), price: numOr(fd, "price", 0), bottleMl: numOr(fd, "bottleMl", 750), inStock: bool(fd, "inStock"), checkoutRef: str(fd, "checkoutRef") || null, checkedAt: new Date(), lastError: null };
  if (!data.url || data.price <= 0) throw new Error("URL과 가격을 입력해 주세요");
  if (id) await prisma.offer.update({ where: { id }, data });
  else await prisma.offer.upsert({ where: { wineId_sellerId_bottleMl: { wineId, sellerId: str(fd, "sellerId"), bottleMl: data.bottleMl } }, update: data, create: { ...data, wineId, sellerId: str(fd, "sellerId") } });
  revalidatePath(`/admin/wines/${wineId}`);
}

export async function deleteOffer(fd: FormData) {
  await requireAdmin();
  await prisma.offer.delete({ where: { id: str(fd, "id") } });
  revalidatePath(`/admin/wines/${str(fd, "wineId")}`);
}

/** CSV: wine_id,seller_id,url,price,bottle_ml,in_stock,checkout_ref (머리줄 필수, wine_id 대신 wine_name 가능) */
export async function importOffers(_: { message?: string; error?: string }, fd: FormData) {
  await requireAdmin();
  const text = str(fd, "csv");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { error: "머리줄과 데이터가 필요합니다" };
  const head = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (row: string[], k: string) => row[head.indexOf(k)]?.trim() ?? "";
  let ok = 0;
  const errors: string[] = [];
  for (const [i, line] of lines.slice(1).entries()) {
    const row = line.split(",");
    try {
      let wineId = col(row, "wine_id");
      if (!wineId && col(row, "wine_name")) {
        const w = await prisma.wine.findFirst({ where: { OR: [{ name: col(row, "wine_name") }, { nameKo: col(row, "wine_name") }] } });
        if (!w) throw new Error(`와인을 찾지 못했습니다: ${col(row, "wine_name")}`);
        wineId = w.id;
      }
      const sellerId = col(row, "seller_id");
      const price = Number(col(row, "price"));
      const bottleMl = Number(col(row, "bottle_ml")) || 750;
      const url = col(row, "url");
      if (!wineId || !sellerId || !url || !(price > 0)) throw new Error("wine_id, seller_id, url, price는 필수입니다");
      const inStock = !/^(0|false|n|no|품절)$/i.test(col(row, "in_stock"));
      const checkoutRef = head.includes("checkout_ref") ? col(row, "checkout_ref") || null : undefined;
      await prisma.offer.upsert({
        where: { wineId_sellerId_bottleMl: { wineId, sellerId, bottleMl } },
        update: { url, price, inStock, checkedAt: new Date(), lastError: null, ...(checkoutRef !== undefined ? { checkoutRef } : {}) },
        create: { wineId, sellerId, bottleMl, url, price, inStock, checkoutRef: checkoutRef ?? null },
      });
      ok++;
    } catch (e) {
      errors.push(`${i + 2}행: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  revalidatePath("/admin", "layout");
  return errors.length ? { error: `${ok}건 반영, ${errors.length}건 실패\n${errors.slice(0, 20).join("\n")}` } : { message: `${ok}건 반영했습니다` };
}

/* ---------- 셀러·배송대행지 ---------- */
export async function saveSeller(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const data = {
    name: str(fd, "name"),
    country: str(fd, "country"),
    channel: str(fd, "channel") as Channel,
    website: str(fd, "website"),
    shipsToKorea: bool(fd, "shipsToKorea"),
    currency: str(fd, "currency").toUpperCase(),
    shipBase: numOr(fd, "shipBase", 0),
    shipPerBottle: numOr(fd, "shipPerBottle", 0),
    daysMin: numOr(fd, "daysMin", 7),
    daysMax: numOr(fd, "daysMax", 14),
    insured: bool(fd, "insured"),
    affiliateTpl: str(fd, "affiliateTpl") || null,
    commissionRate: numOr(fd, "commissionRate", 7) / 100,
    priceSource: str(fd, "priceSource") as PriceSource,
    checkoutMode: (str(fd, "checkoutMode") || "PRODUCT_PAGE") as CheckoutMode,
    cartTpl: str(fd, "cartTpl") || null,
    active: bool(fd, "active"),
  };
  if (!data.name || !data.country || !/^[A-Z]{3}$/.test(data.currency)) throw new Error("이름·국가·통화(3자리)를 확인해 주세요");
  const s = id ? await prisma.seller.update({ where: { id }, data }) : await prisma.seller.create({ data });
  revalidatePath("/admin/sellers");
  redirect(`/admin/sellers/${s.id}`);
}

export async function saveForwarder(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const data = {
    name: str(fd, "name"),
    country: str(fd, "country"),
    website: str(fd, "website"),
    acceptsAlcohol: bool(fd, "acceptsAlcohol"),
    currency: str(fd, "currency").toUpperCase(),
    shipBase: numOr(fd, "shipBase", 0),
    shipPerBottle: numOr(fd, "shipPerBottle", 0),
    daysMin: numOr(fd, "daysMin", 10),
    daysMax: numOr(fd, "daysMax", 20),
    active: bool(fd, "active"),
  };
  if (id) await prisma.forwarder.update({ where: { id }, data });
  else await prisma.forwarder.create({ data });
  revalidatePath("/admin/sellers");
}

/* ---------- 설정 ---------- */
export async function saveTax(fd: FormData) {
  await requireAdmin();
  const cur = await getTaxConfig();
  const pctv = (k: string, d: number) => numOr(fd, k, d * 100) / 100;
  await saveTaxConfig({
    ...cur,
    dutyRate: pctv("dutyRate", cur.dutyRate),
    liquorRate: pctv("liquorRate", cur.liquorRate),
    eduRate: pctv("eduRate", cur.eduRate),
    vatRate: pctv("vatRate", cur.vatRate),
    exemptUsd: numOr(fd, "exemptUsd", cur.exemptUsd),
    exemptMaxMl: numOr(fd, "exemptMaxMl", cur.exemptMaxMl),
    minCollect: numOr(fd, "minCollect", cur.minCollect),
    ftaCountries: list(fd, "ftaCountries"),
    bulkWarnQty: numOr(fd, "bulkWarnQty", cur.bulkWarnQty),
    freeAlertLimit: numOr(fd, "freeAlertLimit", cur.freeAlertLimit),
  });
  revalidatePath("/", "layout");
}

export async function saveFx(fd: FormData) {
  await requireAdmin();
  await saveFxConfig({
    source: str(fd, "source") === "koreaexim" ? "koreaexim" : "investing",
    fallbackExim: bool(fd, "fallbackExim"),
    maxJump: Math.min(1, Math.max(0.01, numOr(fd, "maxJump", 10) / 100)),
  });
  revalidatePath("/admin/settings");
}

export async function setRate(fd: FormData) {
  await requireAdmin();
  const currency = str(fd, "currency").toUpperCase();
  const krw = Number(fd.get("krw"));
  if (!/^[A-Z]{3}$/.test(currency) || !(krw > 0)) throw new Error("통화와 환율을 확인해 주세요");
  const today = new Date(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10));
  await prisma.exchangeRate.upsert({ where: { currency_date: { currency, date: today } }, update: { krw, source: "manual", fetchedAt: new Date() }, create: { currency, krw, date: today, source: "manual" } });
  revalidatePath("/", "layout");
}

/* ---------- 회원 ---------- */
export async function setPlan(fd: FormData) {
  await requireAdmin();
  await prisma.user.update({ where: { id: str(fd, "id") }, data: { plan: str(fd, "plan") === "PREMIUM" ? "PREMIUM" : "FREE" } });
  revalidatePath("/admin/users");
}

/* ---------- 주문 ---------- */
export async function adminMoveOrder(fd: FormData) {
  await requireAdmin();
  await moveOrder(str(fd, "id"), str(fd, "to") as OrderStatus, "admin", {
    note: str(fd, "note") || undefined,
    orderRef: str(fd, "orderRef") || null,
    carrier: str(fd, "carrier") || null,
    trackingNo: str(fd, "trackingNo") || null,
  });
  revalidatePath("/admin/orders");
}

/* ---------- 커뮤니티 ---------- */
export async function approveProof(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const r = await prisma.directReview.update({ where: { id }, data: { proofStatus: "APPROVED", proofNote: null } });
  await prisma.proofFile.deleteMany({ where: { reviewId: id } }); // 개인정보가 담긴 사진은 확인 후 바로 삭제
  const cfg = await getCommunityConfig();
  await award(r.userId, "proof", id, cfg.points.proof, "통관 인증");
  revalidatePath("/admin/community");
}

export async function rejectProof(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  await prisma.directReview.update({ where: { id }, data: { proofStatus: "REJECTED", proofNote: str(fd, "note") || "확인할 수 없는 자료" } });
  await prisma.proofFile.deleteMany({ where: { reviewId: id } });
  revalidatePath("/admin/community");
}

export async function resolveReports(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const restore = str(fd, "action") === "restore";
  await prisma.$transaction([
    prisma.directReview.update({ where: { id }, data: { status: restore ? "PUBLISHED" : "DELETED" } }),
    prisma.report.updateMany({ where: { reviewId: id, resolvedAt: null }, data: { resolvedAt: new Date(), resolution: restore ? "restored" : "deleted" } }),
  ]);
  if (!restore) await prisma.proofFile.deleteMany({ where: { reviewId: id } });
  revalidatePath("/admin/community");
}

/** 대가성 후기 미표시 위반: 판매처 노출 중단 */
export async function suspendSeller(fd: FormData) {
  await requireAdmin();
  await prisma.seller.update({ where: { id: str(fd, "sellerId") }, data: { active: false } });
  revalidatePath("/admin/community");
}

export async function grantKings(fd: FormData) {
  await requireAdmin();
  const offset = Number(fd.get("offset")) || -1;
  const { label, list } = await monthKings(offset);
  for (const k of list.slice(0, 3)) {
    // 0P 기록을 지급 표시로 씁니다. 처음 기록될 때만 프리미엄을 줍니다.
    const { created } = await award(k.userId, "king", label, 0, `이달의 후기왕 ${label} · 프리미엄 1개월`, { bonus: false });
    if (created) await extendPremium(k.userId, 1);
  }
  revalidatePath("/admin/community");
}

export async function createInvite(fd: FormData) {
  await requireAdmin();
  const code = (str(fd, "code") || `CD${Math.random().toString(36).slice(2, 8)}`).toUpperCase();
  await prisma.inviteCode.create({ data: { code, note: str(fd, "note") || null, premiumMonths: numOr(fd, "premiumMonths", 6), maxUses: numOr(fd, "maxUses", 1) } });
  revalidatePath("/admin/community");
}

export async function adjustPoints(fd: FormData) {
  await requireAdmin();
  const u = await prisma.user.findUnique({ where: { email: str(fd, "email").toLowerCase() } });
  if (!u) throw new Error("회원을 찾을 수 없습니다");
  await prisma.pointTx.create({ data: { userId: u.id, amount: Math.round(numOr(fd, "amount", 0)), reason: "admin", refId: new Date().toISOString(), note: str(fd, "note") || "운영자 조정" } });
  revalidatePath("/admin/community");
}

export async function saveCommunity(fd: FormData) {
  await requireAdmin();
  const cur = await getCommunityConfig();
  await saveCommunityConfig({
    ...cur,
    bannedPatterns: str(fd, "bannedPatterns").split("\n").map((x) => x.trim()).filter(Boolean),
    bonusUntil: str(fd, "bonusUntil") || null,
    bonusMultiplier: numOr(fd, "bonusMultiplier", cur.bonusMultiplier),
    points: { review: numOr(fd, "pReview", cur.points.review), proof: numOr(fd, "pProof", cur.points.proof), helpful10: numOr(fd, "pHelpful", cur.points.helpful10), answer: cur.points.answer },
    costs: { premiumMonth: numOr(fd, "cPremium", cur.costs.premiumMonth), tasting: numOr(fd, "cTasting", cur.costs.tasting) },
    stage2: { reviews: numOr(fd, "s2Reviews", cur.stage2.reviews), members: numOr(fd, "s2Members", cur.stage2.members) },
  });
  revalidatePath("/", "layout");
}
