"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { memberState } from "@/server/member";
import { getCommunityConfig } from "@/server/settings";
import { award, extendPremium, redeemPremium } from "@/server/points";
import { devVerifyAllowed, fetchIdentity, portoneConfigured } from "@/server/identity";
import { findBanned, helpfulMilestone, isAdult, REPORT_REASONS, validNickname } from "@/lib/community";
import { getTaxConfig, getFx } from "@/server/settings";
import { calcTax } from "@/lib/tax";

type S = { ok?: boolean; error?: string; message?: string };
const safeNext = (n: unknown, d = "/community") => {
  const s = String(n ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : d;
};

/* ---------- 성인인증·닉네임 ---------- */
async function markAdult(userId: string, birthDate: string, ciHash: string | null): Promise<S> {
  if (!isAdult(birthDate)) return { error: "만 19세 이상만 커뮤니티에 가입할 수 있습니다." };
  if (ciHash) {
    const other = await prisma.user.findFirst({ where: { ciHash, NOT: { id: userId } } });
    if (other) return { error: "이미 다른 계정으로 본인인증을 마쳤습니다. 한 사람당 계정 하나만 쓸 수 있습니다." };
  }
  await prisma.user.update({ where: { id: userId }, data: { adultVerifiedAt: new Date(), birthDate, ciHash } });
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
  if (order?.review) return { error: "이 주문에는 이미 후기를 썼습니다." };

  const wineId = order?.wineId ?? String(fd.get("wineId") ?? "");
  const wine = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!wine) return { error: "와인을 골라 주세요." };
  const route = order?.route ?? String(fd.get("route") ?? "");
  if (!["WINERY_DIRECT", "EXPORT_RETAILER", "FORWARDER", "HK_RETAILER"].includes(route)) return { error: "구매 경로를 골라 주세요." };
  const sellerId = order?.sellerId ?? (String(fd.get("sellerId") ?? "") || null);
  const qty = order?.qty ?? Math.max(1, Math.min(24, Number(fd.get("qty")) || 1));
  const bottleMl = order?.bottleMl ?? (Number(fd.get("ml")) || 750);
  const num = (k: string) => (String(fd.get(k) ?? "").trim() === "" ? NaN : Number(fd.get(k)));
  const taxPaid = Math.round(num("taxPaid"));
  const shippingDays = Math.round(num("shippingDays"));
  const rating = Math.round(num("rating"));
  const cardPaid = num("cardPaidKrw");
  const oneLiner = String(fd.get("oneLiner") ?? "").trim();
  if (!Number.isFinite(taxPaid) || taxPaid < 0) return { error: "실제 낸 세금을 원 단위로 입력해 주세요. 세금이 없었다면 0." };
  if (!Number.isFinite(shippingDays) || shippingDays < 1 || shippingDays > 120) return { error: "주문부터 받기까지 걸린 날수를 입력해 주세요." };
  if (!(rating >= 1 && rating <= 5)) return { error: "별점을 골라 주세요." };
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

  const review = await prisma.directReview.create({
    data: {
      userId: user.id,
      wineId,
      sellerId,
      orderId: order?.id ?? null,
      route,
      qty,
      bottleMl,
      taxPaid,
      estTax,
      cardPaidKrw: Number.isFinite(cardPaid) && cardPaid > 0 ? Math.round(cardPaid) : null,
      shippingDays,
      damaged: fd.get("damaged") === "on",
      rating,
      oneLiner,
      sponsored: fd.get("sponsored") === "on",
      proofStatus: proof ? "PENDING" : "NONE",
      ...(proof ? { proof: { create: proof } } : {}),
    },
  });
  const { amount: got } = await award(user.id, "review", review.id, cfg.points.review, `후기: ${wine.nameKo}`);
  revalidatePath("/community");
  revalidatePath(`/wines/${wineId}`);
  redirect(`/community?written=${review.id}&p=${got}`);
}

export async function deleteMyReview(fd: FormData) {
  const u = await requireUser("/community");
  await prisma.directReview.updateMany({ where: { id: String(fd.get("id")), userId: u.id }, data: { status: "DELETED" } });
  await prisma.proofFile.deleteMany({ where: { reviewId: String(fd.get("id")), review: { userId: u.id } } });
  revalidatePath("/community");
}

export async function toggleHelpful(fd: FormData) {
  const m = await memberState();
  if (!m.ok || !m.user) redirect("/verify?next=/community");
  const reviewId = String(fd.get("id"));
  const r = await prisma.directReview.findUnique({ where: { id: reviewId } });
  if (!r || r.status !== "PUBLISHED" || r.userId === m.user.id) return;
  const key = { reviewId_userId: { reviewId, userId: m.user.id } };
  const had = await prisma.helpful.findUnique({ where: key });
  if (had) {
    await prisma.$transaction([prisma.helpful.delete({ where: key }), prisma.directReview.update({ where: { id: reviewId }, data: { helpfulCount: { decrement: 1 } } })]);
  } else {
    const [, upd] = await prisma.$transaction([
      prisma.helpful.create({ data: { reviewId, userId: m.user.id } }),
      prisma.directReview.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } }),
    ]);
    const ms = helpfulMilestone(upd.helpfulCount);
    if (ms) {
      const cfg = await getCommunityConfig();
      await award(r.userId, "helpful10", `${reviewId}:${ms}`, cfg.points.helpful10, `도움됨 ${upd.helpfulCount}개`);
    }
  }
  revalidatePath("/community");
}

/** 신고: 접수 즉시 숨기고 운영자가 확인 후 복구하거나 삭제합니다. */
export async function reportReview(fd: FormData) {
  const u = await requireUser("/community");
  const reviewId = String(fd.get("id"));
  const reason = String(fd.get("reason") ?? "");
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return;
  const r = await prisma.directReview.findUnique({ where: { id: reviewId } });
  if (!r || r.userId === u.id) return;
  await prisma.report.upsert({ where: { reviewId_userId: { reviewId, userId: u.id } }, update: { reason }, create: { reviewId, userId: u.id, reason } });
  await prisma.directReview.updateMany({ where: { id: reviewId, status: "PUBLISHED" }, data: { status: "HIDDEN" } });
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
  const inv = await prisma.inviteCode.findUnique({ where: { code } });
  if (!inv || inv.uses >= inv.maxUses) return { error: "쓸 수 없는 초대 코드입니다." };
  const n = await prisma.inviteCode.updateMany({ where: { code, uses: { lt: inv.maxUses } }, data: { uses: { increment: 1 } } });
  if (!n.count) return { error: "쓸 수 없는 초대 코드입니다." };
  await prisma.user.update({ where: { id: u.id }, data: { inviteCode: code, founding: true } });
  const until = await extendPremium(u.id, inv.premiumMonths);
  revalidatePath("/me");
  return { ok: true, message: `초기 회원으로 등록됐습니다. 프리미엄 ${inv.premiumMonths}개월 (${until.toISOString().slice(0, 10)}까지)` };
}
