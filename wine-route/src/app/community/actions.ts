"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { memberState } from "@/server/member";
import { getCommunityConfig } from "@/server/settings";
import { extendPremiumInTransaction, redeemPremium } from "@/server/points";
import { devVerifyAllowed, fetchIdentity, portoneConfigured } from "@/server/identity";
import { findBanned, helpfulMilestone, isAdult, pointMultiplier, REPORT_REASONS, validNickname } from "@/lib/community";
import { getTaxConfig, getFx } from "@/server/settings";
import { calcTax } from "@/lib/tax";

type S = { ok?: boolean; error?: string; message?: string };
const safeNext = (n: unknown, d = "/community") => {
  const s = String(n ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !/[\\\u0000-\u001f]/.test(s) ? s : d;
};

/* ---------- 성인인증·닉네임 ---------- */
async function markAdult(userId: string, birthDate: string, ciHash: string | null): Promise<S> {
  if (!isAdult(birthDate)) return { error: "만 19세 이상만 커뮤니티에 가입할 수 있습니다." };
  if (ciHash) {
    const other = await prisma.user.findFirst({ where: { ciHash, NOT: { id: userId } } });
    if (other) return { error: "이미 다른 계정으로 본인인증을 마쳤습니다. 한 사람당 계정 하나만 쓸 수 있습니다." };
  }
  try {
    await prisma.user.update({ where: { id: userId }, data: { adultVerifiedAt: new Date(), birthDate, ciHash } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "이미 다른 계정으로 본인인증을 마쳤습니다. 한 사람당 계정 하나만 쓸 수 있습니다." };
    throw e;
  }
  return { ok: true };
}

export async function verifyWithPortone(identityVerificationId: string): Promise<S> {
  const u = await requireUser("/verify");
  if (!portoneConfigured()) return { error: "본인인증이 설정되지 않았습니다." };
  const r = await fetchIdentity(identityVerificationId);
  if (!r) return { error: "본인인증이 완료되지 않았습니다. 다시 시도해 주세요." };
  const res = await markAdult(u.id, r.birthDate, r.ciHash);
  if (res.ok) revalidatePath("/verify");
  return res;
}

export async function verifyDev(_: S, fd: FormData): Promise<S> {
  const u = await requireUser("/verify");
  if (!devVerifyAllowed()) return { error: "개발용 인증은 사용할 수 없습니다." };
  const res = await markAdult(u.id, String(fd.get("birthDate") ?? ""), null);
  if (res.ok) revalidatePath("/verify");
  return res;
}

export async function saveNickname(_: S, fd: FormData): Promise<S> {
  const u = await requireUser("/verify");
  const { bannedPatterns } = await getCommunityConfig();
  const nick = String(fd.get("nickname") ?? "").trim();
  const err = validNickname(nick, bannedPatterns);
  if (err) return { error: err };
  try {
    await prisma.user.update({ where: { id: u.id }, data: { nickname: nick } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "이미 쓰는 닉네임입니다." };
    throw e;
  }
  revalidatePath("/", "layout");
  const next = safeNext(fd.get("next"), "");
  if (next) redirect(next);
  return { ok: true, message: "닉네임을 저장했습니다." };
}

/* ---------- 후기 ---------- */
const MAX_PROOF = 8 * 1024 * 1024;
const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];

export async function createReview(_: S, fd: FormData): Promise<S> {
  const m = await memberState();
  if (!m.ok || !m.user) return { error: "성인인증과 닉네임 설정 후 후기를 쓸 수 있습니다." };
  const user = m.user;
  const cfg = await getCommunityConfig();

  const orderId = String(fd.get("orderId") ?? "") || null;
  const order = orderId ? await prisma.order.findFirst({ where: { id: orderId, userId: user.id }, include: { review: true } }) : null;
  if (orderId && !order) return { error: "주문을 찾을 수 없습니다." };
  if (order && order.status !== "DELIVERED") return { error: "수령 완료한 주문에만 후기를 연결할 수 있습니다." };
  if (order?.review) return { error: "이 주문에는 이미 후기를 썼습니다." };

  const wineId = order?.wineId ?? String(fd.get("wineId") ?? "");
  const wine = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!wine) return { error: "와인을 골라 주세요." };
  const route = order?.route ?? String(fd.get("route") ?? "");
  if (!["WINERY_DIRECT", "EXPORT_RETAILER", "FORWARDER", "HK_RETAILER"].includes(route)) return { error: "구매 경로를 골라 주세요." };
  const sellerId = order?.sellerId ?? (String(fd.get("sellerId") ?? "") || null);
  if (sellerId) {
    const seller = await prisma.seller.findUnique({ where: { id: sellerId }, select: { channel: true } });
    const expected = route === "FORWARDER" ? "LOCAL_SHOP" : route;
    if (!seller || seller.channel !== expected) return { error: "구매 경로에 맞는 판매처를 골라 주세요." };
  }
  const qty = order?.qty ?? (String(fd.get("qty") ?? "").trim() === "" ? 1 : Number(fd.get("qty")));
  const bottleMl = order?.bottleMl ?? (String(fd.get("ml") ?? "").trim() === "" ? 750 : Number(fd.get("ml")));
  if (!Number.isInteger(qty) || qty < 1 || qty > 24) return { error: "구매 수량은 1~24병의 정수로 입력해 주세요." };
  if (!Number.isInteger(bottleMl) || bottleMl < 100 || bottleMl > 3000) return { error: "병 용량은 100~3,000ml의 정수로 입력해 주세요." };
  const num = (k: string) => (String(fd.get(k) ?? "").trim() === "" ? NaN : Number(fd.get(k)));
  const taxPaid = num("taxPaid");
  const shippingDays = num("shippingDays");
  const rating = num("rating");
  const cardPaid = num("cardPaidKrw");
  const oneLiner = String(fd.get("oneLiner") ?? "").trim();
  if (!Number.isInteger(taxPaid) || taxPaid < 0 || taxPaid > 100_000_000) return { error: "실제 낸 세금을 원 단위로 입력해 주세요. 세금이 없었다면 0." };
  if (!Number.isInteger(shippingDays) || shippingDays < 1 || shippingDays > 120) return { error: "주문부터 받기까지 걸린 날수를 입력해 주세요." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "별점을 골라 주세요." };
  if (String(fd.get("cardPaidKrw") ?? "").trim() !== "" && (!Number.isInteger(cardPaid) || cardPaid < 0 || cardPaid > 100_000_000)) return { error: "카드 청구액은 원 단위 금액으로 입력해 주세요." };
  if (oneLiner.length < 5 || oneLiner.length > 100) return { error: "한 줄 평은 5~100자로 써 주세요." };
  const banned = findBanned(oneLiner, cfg.bannedPatterns);
  if (banned) return { error: `'${banned}' 같은 표현은 쓸 수 없습니다. 커뮤니티 안에서의 판매·양도·나눔·공동구매 모집은 금지입니다.` };

  // 같은 조건의 예상 세금 (주문에서 왔으면 이동 당시 예상치)
  let estTax: number | null = order?.estTax ?? null;
  if (estTax === null && Number.isFinite(cardPaid) && cardPaid > 0) {
    const [tax, fx] = await Promise.all([getTaxConfig(), getFx()]);
    const usd = fx.rates.USD;
    if (usd) estTax = calcTax({ cif: cardPaid, goodsUsdPerBottle: cardPaid / qty / usd, qty, bottleMl, fta: route !== "HK_RETAILER" && tax.ftaCountries.includes(wine.country) }, tax).pay;
  }

  const file = fd.get("proof");
  let proof: { mime: string; data: Uint8Array<ArrayBuffer> } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PROOF) return { error: "인증 사진은 8MB 이하로 올려 주세요." };
    if (!PROOF_TYPES.includes(file.type)) return { error: "인증 자료는 JPG·PNG·WEBP·HEIC 사진이나 PDF만 올릴 수 있습니다." };
    proof = { mime: file.type, data: new Uint8Array(await file.arrayBuffer()) };
  }

  const got = Math.round(cfg.points.review * pointMultiplier(cfg));
  let review;
  try {
    review = await prisma.$transaction(async (tx) => {
      const created = await tx.directReview.create({ data: {
      userId: user.id,
      wineId,
      sellerId,
      orderId: order?.id ?? null,
      route,
      qty,
      bottleMl,
      taxPaid,
      estTax,
      cardPaidKrw: Number.isFinite(cardPaid) && cardPaid > 0 ? cardPaid : null,
      shippingDays,
      damaged: fd.get("damaged") === "on",
      rating,
      oneLiner,
      sponsored: fd.get("sponsored") === "on",
      proofStatus: proof ? "PENDING" : "NONE",
      ...(proof ? { proof: { create: proof } } : {}),
      } });
      await tx.pointTx.create({ data: { userId: user.id, reason: "review", refId: created.id, amount: got, note: `후기: ${wine.nameKo}` } });
      return created;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "이 주문에는 이미 후기를 썼습니다." };
    throw e;
  }
  revalidatePath("/community");
  revalidatePath(`/wines/${wineId}`);
  redirect(`/community?written=${review.id}&p=${got}`);
}

export async function deleteMyReview(fd: FormData) {
  const u = await requireUser("/community");
  const id = String(fd.get("id"));
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DirectReview" WHERE id = ${id} FOR UPDATE`;
    await tx.directReview.updateMany({ where: { id, userId: u.id }, data: { status: "DELETED" } });
    await tx.proofFile.deleteMany({ where: { reviewId: id, review: { userId: u.id } } });
  });
  revalidatePath("/community");
}

export async function toggleHelpful(fd: FormData) {
  const m = await memberState();
  if (!m.ok || !m.user) redirect("/verify?next=/community");
  const reviewId = String(fd.get("id"));
  const userId = m.user.id;
  const cfg = await getCommunityConfig();
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DirectReview" WHERE id = ${reviewId} FOR UPDATE`;
    const r = await tx.directReview.findUnique({ where: { id: reviewId } });
    if (!r || r.status !== "PUBLISHED" || r.userId === userId) return;
    const key = { reviewId_userId: { reviewId, userId } };
    const had = await tx.helpful.findUnique({ where: key });
    if (had) await tx.helpful.delete({ where: key });
    else await tx.helpful.create({ data: { reviewId, userId } });
    const count = await tx.helpful.count({ where: { reviewId } });
    await tx.directReview.update({ where: { id: reviewId }, data: { helpfulCount: count } });
    const ms = had ? null : helpfulMilestone(count);
    if (ms && !r.sponsored) {
      // 같은 10개 구간을 취소·재클릭으로 다시 넘겨도 보상은 한 번만 지급합니다.
      await tx.pointTx.createMany({ data: [{ userId: r.userId, reason: "helpful10", refId: `${reviewId}:${ms}`, amount: Math.round(cfg.points.helpful10 * pointMultiplier(cfg)), note: `도움됨 ${count}개` }], skipDuplicates: true });
    }
  });
  revalidatePath("/community");
}

/** 신고: 접수 즉시 숨기고 운영자가 확인 후 복구하거나 삭제합니다. */
export async function reportReview(fd: FormData) {
  const m = await memberState();
  if (!m.ok || !m.user) redirect("/verify?next=/community");
  const userId = m.user.id;
  const reviewId = String(fd.get("id"));
  const reason = String(fd.get("reason") ?? "");
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DirectReview" WHERE id = ${reviewId} FOR UPDATE`;
    const r = await tx.directReview.findUnique({ where: { id: reviewId } });
    if (!r || r.status === "DELETED" || r.userId === userId) return;
    await tx.report.upsert({ where: { reviewId_userId: { reviewId, userId } }, update: { reason, resolvedAt: null, resolution: null }, create: { reviewId, userId, reason } });
    await tx.directReview.updateMany({ where: { id: reviewId, status: "PUBLISHED" }, data: { status: "HIDDEN" } });
  });
  revalidatePath("/community");
}

/* ---------- 포인트·초대 ---------- */
export async function redeemPremiumAction(_: S): Promise<S> {
  const u = await requireUser("/me");
  const r = await redeemPremium(u.id);
  revalidatePath("/me");
  return r.ok ? { ok: true, message: `프리미엄을 ${r.until.toISOString().slice(0, 10)}까지 연장했습니다.` } : { error: r.error };
}

export async function applyInvite(_: S, fd: FormData): Promise<S> {
  const u = await requireUser("/me");
  if (u.inviteCode) return { error: "초대 코드는 한 번만 쓸 수 있습니다." };
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${u.id}))`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: u.id } });
    if (user.inviteCode) return { error: "초대 코드는 한 번만 쓸 수 있습니다." };
    const inv = await tx.inviteCode.findUnique({ where: { code } });
    if (!inv || inv.uses >= inv.maxUses || !Number.isInteger(inv.premiumMonths) || inv.premiumMonths < 1 || inv.premiumMonths > 120) return { error: "쓸 수 없는 초대 코드입니다." };
    const n = await tx.inviteCode.updateMany({ where: { code, uses: { lt: inv.maxUses } }, data: { uses: { increment: 1 } } });
    if (!n.count) return { error: "쓸 수 없는 초대 코드입니다." };
    await tx.user.update({ where: { id: u.id }, data: { inviteCode: code, founding: true } });
    const until = await extendPremiumInTransaction(tx, u.id, inv.premiumMonths);
    return { until, months: inv.premiumMonths };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/me");
  return { ok: true, message: `초기 회원으로 등록됐습니다. 프리미엄 ${result.months}개월 (${result.until.toISOString().slice(0, 10)}까지)` };
}
