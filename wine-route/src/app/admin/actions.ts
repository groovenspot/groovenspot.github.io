"use server";
import { parseSegmentConfig, SEGMENT_ORDER } from "@/lib/segments";
import { sendCampaign } from "@/server/marketing";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Channel, CheckoutMode, OrderStatus, PriceSource } from "@prisma/client";
import { moveOrder } from "@/server/orders";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { saveSegmentConfig, getCommunityConfig, getTaxConfig, saveCommunityConfig, saveFxConfig, saveTaxConfig } from "@/server/settings";
import { extendPremiumInTransaction } from "@/server/points";
import { BOARD_MODES, pointMultiplier, type BoardMode } from "@/lib/community";
import { monthKings } from "@/server/ranking";
import { notifyAllocation, notifyNewVintage } from "@/jobs/alerts";
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
  if (!id) await notifyNewVintage(w.id); // 같은 와인의 다른 빈티지를 찜한 프리미엄 회원에게
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
    minBottles: Math.max(1, Math.round(numOr(fd, "minBottles", 1))),
    shipCountries: list(fd, "shipCountries"),
    shipMethod: str(fd, "shipMethod") || null,
    cooAvailable: bool(fd, "cooAvailable"),
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
    consolidateFee: Math.max(0, numOr(fd, "consolidateFee", 0)),
    handlingPerPackage: Math.max(0, numOr(fd, "handlingPerPackage", 0)),
    maxBottles: Math.min(60, Math.max(1, Math.floor(numOr(fd, "maxBottles", 12)))),
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
    cooExemptUsd: numOr(fd, "cooExemptUsd", cur.cooExemptUsd),
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
  const cfg = await getCommunityConfig();
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DirectReview" WHERE id = ${id} FOR UPDATE`;
    const r = await tx.directReview.findUnique({ where: { id }, include: { proof: { select: { id: true } } } });
    if (!r || r.status === "DELETED" || r.proofStatus !== "PENDING" || !r.proof) return;
    await tx.directReview.update({ where: { id }, data: { proofStatus: "APPROVED", proofNote: null } });
    await tx.proofFile.deleteMany({ where: { reviewId: id } });
    await tx.pointTx.createMany({ data: [{ userId: r.userId, reason: "proof", refId: id, amount: Math.round(cfg.points.proof * pointMultiplier(cfg)), note: "통관 인증" }], skipDuplicates: true });
  });
  revalidatePath("/admin/community");
  revalidatePath("/community", "layout");
}

export async function rejectProof(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DirectReview" WHERE id = ${id} FOR UPDATE`;
    const r = await tx.directReview.findUnique({ where: { id } });
    if (!r || r.status === "DELETED" || r.proofStatus !== "PENDING") return;
    await tx.directReview.update({ where: { id }, data: { proofStatus: "REJECTED", proofNote: str(fd, "note").slice(0, 500) || "확인할 수 없는 자료" } });
    await tx.proofFile.deleteMany({ where: { reviewId: id } });
  });
  revalidatePath("/admin/community");
}

export async function resolveReports(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const restore = str(fd, "action") === "restore";
  if (!["restore", "delete"].includes(str(fd, "action"))) return;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DirectReview" WHERE id = ${id} FOR UPDATE`;
    const r = await tx.directReview.findUnique({ where: { id } });
    if (!r || r.status !== "HIDDEN") return;
    await tx.directReview.update({ where: { id }, data: { status: restore ? "PUBLISHED" : "DELETED" } });
    await tx.report.updateMany({ where: { reviewId: id, resolvedAt: null }, data: { resolvedAt: new Date(), resolution: restore ? "restored" : "deleted" } });
    if (!restore) await tx.proofFile.deleteMany({ where: { reviewId: id } });
  });
  revalidatePath("/admin/community");
  revalidatePath("/community", "layout");
}

/** 자유게시판 신고 처리: 숨긴 글·댓글을 복구하거나 삭제합니다. */
export async function resolveBoardReports(fd: FormData) {
  await requireAdmin();
  const targetType = str(fd, "targetType"), targetId = str(fd, "targetId"), action = str(fd, "action");
  if (!["post", "comment"].includes(targetType) || !["restore", "delete"].includes(action)) return;
  const status = action === "restore" ? "PUBLISHED" : "DELETED";
  await prisma.$transaction(async (tx) => {
    if (targetType === "post") {
      await tx.post.updateMany({ where: { id: targetId, status: "HIDDEN" }, data: { status } });
    } else {
      const c = await tx.postComment.findUnique({ where: { id: targetId } });
      if (!c || c.status !== "HIDDEN") return;
      await tx.postComment.update({ where: { id: targetId }, data: { status } });
      await tx.post.update({ where: { id: c.postId }, data: { commentCount: await tx.postComment.count({ where: { postId: c.postId, status: "PUBLISHED" } }) } });
    }
    await tx.postReport.updateMany({ where: { targetType, targetId, resolvedAt: null }, data: { resolvedAt: new Date(), resolution: action === "restore" ? "restored" : "deleted" } });
  });
  revalidatePath("/admin/community");
  revalidatePath("/community/board", "layout");
}

/** 대가성 후기 미표시 위반: 판매처 노출 중단 */
export async function suspendSeller(fd: FormData) {
  await requireAdmin();
  await prisma.seller.update({ where: { id: str(fd, "sellerId") }, data: { active: false } });
  revalidatePath("/admin/community");
}

export async function grantKings(fd: FormData) {
  await requireAdmin();
  const offset = str(fd, "offset") === "" ? -1 : Number(fd.get("offset"));
  if (!Number.isInteger(offset) || offset > -1 || offset < -120) throw new Error("종료된 월의 후기왕만 보상할 수 있습니다.");
  const { label, list } = await monthKings(offset);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`community-kings:${label}`}))`;
    const granted = await tx.pointTx.findMany({ where: { reason: "king", refId: label }, select: { userId: true } });
    const awarded = new Set(granted.map((g) => g.userId));
    // 월별 최대 3명을 고정하고, 모든 지급 기록과 기간 연장을 함께 커밋합니다.
    const winners = list.slice(0, 3).filter((k) => !awarded.has(k.userId)).slice(0, Math.max(0, 3 - granted.length)).sort((a, b) => a.userId.localeCompare(b.userId));
    for (const k of winners) {
      await tx.pointTx.create({ data: { userId: k.userId, reason: "king", refId: label, amount: 0, note: `이달의 후기왕 ${label} · 프리미엄 1개월` } });
      await extendPremiumInTransaction(tx, k.userId, 1);
    }
  });
  revalidatePath("/admin/community");
}

export async function createInvite(fd: FormData) {
  await requireAdmin();
  const code = (str(fd, "code") || `CD${Math.random().toString(36).slice(2, 8)}`).toUpperCase();
  const premiumMonths = numOr(fd, "premiumMonths", 6), maxUses = numOr(fd, "maxUses", 1);
  if (!/^[A-Z0-9_-]{3,32}$/.test(code) || !Number.isInteger(premiumMonths) || premiumMonths < 1 || premiumMonths > 120 || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100_000) throw new Error("초대 코드, 기간, 사용 횟수를 확인해 주세요.");
  await prisma.inviteCode.create({ data: { code, note: str(fd, "note").slice(0, 300) || null, premiumMonths, maxUses } });
  revalidatePath("/admin/community");
}

export async function adjustPoints(fd: FormData) {
  await requireAdmin();
  const u = await prisma.user.findUnique({ where: { email: str(fd, "email").toLowerCase() } });
  if (!u) throw new Error("회원을 찾을 수 없습니다");
  const amount = numOr(fd, "amount", 0);
  if (!Number.isInteger(amount) || Math.abs(amount) > 100_000_000) throw new Error("포인트는 정수로 입력해 주세요.");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${u.id}))`;
    await tx.pointTx.create({ data: { userId: u.id, amount, reason: "admin", refId: crypto.randomUUID(), note: str(fd, "note").slice(0, 500) || "운영자 조정" } });
  });
  revalidatePath("/admin/community");
}

export async function saveCommunity(fd: FormData) {
  await requireAdmin();
  const cur = await getCommunityConfig();
  const next = {
    ...cur,
    bannedPatterns: str(fd, "bannedPatterns").split("\n").map((x) => x.trim()).filter(Boolean),
    bonusUntil: str(fd, "bonusUntil") || null,
    bonusMultiplier: numOr(fd, "bonusMultiplier", cur.bonusMultiplier),
    points: { review: numOr(fd, "pReview", cur.points.review), proof: numOr(fd, "pProof", cur.points.proof), helpful10: numOr(fd, "pHelpful", cur.points.helpful10), answer: cur.points.answer },
    costs: { premiumMonth: numOr(fd, "cPremium", cur.costs.premiumMonth), tasting: numOr(fd, "cTasting", cur.costs.tasting) },
    stage2: { reviews: numOr(fd, "s2Reviews", cur.stage2.reviews), members: numOr(fd, "s2Members", cur.stage2.members) },
    boardMode: BOARD_MODES.includes(str(fd, "boardMode") as BoardMode) ? (str(fd, "boardMode") as BoardMode) : cur.boardMode,
  };
  const nonnegativeInteger = (v: number) => Number.isInteger(v) && v >= 0 && v <= 1_000_000;
  if (!Object.values(next.points).every(nonnegativeInteger)
    || !Number.isFinite(next.bonusMultiplier) || next.bonusMultiplier < 1 || next.bonusMultiplier > 10
    || !Number.isInteger(next.costs.premiumMonth) || next.costs.premiumMonth < 1 || next.costs.premiumMonth > 100_000_000
    || !Number.isInteger(next.costs.tasting) || next.costs.tasting < 0 || next.costs.tasting > 100_000_000
    || !Object.values(next.stage2).every((v) => Number.isInteger(v) && v > 0 && v <= 1_000_000)) throw new Error("포인트·비용·단계 기준은 유효한 정수, 배수는 1~10으로 입력해 주세요.");
  if (next.bonusUntil) {
    const date = new Date(`${next.bonusUntil}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next.bonusUntil) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== next.bonusUntil) throw new Error("포인트 배수 종료 날짜를 확인해 주세요.");
  }
  if (next.bannedPatterns.length > 100 || next.bannedPatterns.some((p) => p.length > 500)) throw new Error("금지 표현은 100개 이하, 각 500자 이하로 입력해 주세요.");
  try { next.bannedPatterns.forEach((p) => new RegExp(p, "i")); }
  catch { throw new Error("금지 표현에 잘못된 정규식이 있습니다."); }
  await saveCommunityConfig(next);
  revalidatePath("/", "layout");
}

/* ---------- 와이너리 배정 오픈 ---------- */
export async function openAllocation(fd: FormData) {
  await requireAdmin();
  const producer = str(fd, "producer");
  const note = str(fd, "note");
  if (!producer || !note) throw new Error("생산자와 안내 문구를 입력해 주세요");
  const a = await prisma.allocationOpen.create({ data: { producer, note, url: str(fd, "url") || null } });
  await notifyAllocation(a.id);
  revalidatePath("/admin/growth");
}

/* ---------- 사진 검색·구해주세요 ---------- */
/** 사용자가 고친 매칭을 와인의 검색 보정 표기로 추가 (다음 인식부터 반영) */
export async function addScanAlias(fd: FormData) {
  await requireAdmin();
  const wineId = str(fd, "wineId");
  const alias = str(fd, "alias").slice(0, 120);
  const w = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!w || !alias || w.aliases.includes(alias)) return;
  await prisma.wine.update({ where: { id: wineId }, data: { aliases: [...w.aliases, alias] } });
  revalidatePath("/admin/growth");
}

export async function setRequestStatus(fd: FormData) {
  await requireAdmin();
  await prisma.wineRequest.update({ where: { id: str(fd, "id") }, data: { status: str(fd, "status") } });
  revalidatePath("/admin/growth");
}

/* ---------- 세그먼트 기준값 ---------- */
export async function saveSegments(fd: FormData) {
  await requireAdmin();
  await saveSegmentConfig(parseSegmentConfig(Object.fromEntries(["premiumPerBottle", "repeatOrders", "bulkQty", "bulkOrders"].map((k) => [k, fd.get(k)]))));
  revalidatePath("/admin/segments");
}

/* ---------- 홍보 발송 (마케팅 동의 회원만) ---------- */
export async function sendMarketing(_: { ok?: boolean; error?: string; message?: string }, fd: FormData) {
  const admin = await requireAdmin();
  if (fd.get("confirm") !== "on") return { error: "받는 사람 수와 내용을 확인했다는 칸을 체크해 주세요." };
  const seg = SEGMENT_ORDER.find((s) => s === str(fd, "segment"));
  const r = await sendCampaign({ title: str(fd, "title"), body: str(fd, "body"), link: str(fd, "link") || null, segment: seg, country: str(fd, "country") || undefined, createdBy: admin.email });
  revalidatePath("/admin/marketing");
  return r.ok ? { ok: true, message: `${r.recipients}명 중 ${r.sent}명에게 보냈습니다${r.failed ? `, 실패 ${r.failed}명` : ""}.` } : { error: r.error };
}

/** 비슷한 요청 묶음 전체의 상태를 한 번에 */
export async function setRequestGroupStatus(fd: FormData) {
  await requireAdmin();
  const ids = str(fd, "ids").split(",").filter(Boolean).slice(0, 500);
  const status = ["open", "added", "closed"].includes(str(fd, "status")) ? str(fd, "status") : "open";
  await prisma.wineRequest.updateMany({ where: { id: { in: ids } }, data: { status } });
  revalidatePath("/admin/requests");
}

/* ---------- 제휴 수수료 정산 ---------- */
export async function saveStatement(fd: FormData) {
  await requireAdmin();
  const sellerId = str(fd, "sellerId");
  const month = str(fd, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("월 형식이 아닙니다");
  const status = ["pending", "invoiced", "paid", "disputed"].includes(str(fd, "status")) ? str(fd, "status") : "pending";
  const prev = await prisma.commissionStatement.findUnique({ where: { sellerId_month: { sellerId, month } } });
  const now = new Date();
  const data = {
    status,
    paidAmount: str(fd, "paidAmount") ? Number(fd.get("paidAmount")) : null,
    note: str(fd, "note") || null,
    invoicedAt: status === "invoiced" || status === "paid" ? prev?.invoicedAt ?? now : prev?.invoicedAt ?? null,
    paidAt: status === "paid" ? prev?.paidAt ?? now : null,
  };
  await prisma.commissionStatement.upsert({ where: { sellerId_month: { sellerId, month } }, update: data, create: { sellerId, month, ...data } });
  revalidatePath("/admin/commissions");
}
