"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { confirmReceived } from "@/server/orders";
import { recordManualShipmentStage, syncOrderTracking } from "@/server/tracking";
import { firstPurchaseProgress } from "@/lib/first-purchase";
import { normalizeCarrierCode, SHIPMENT_STAGES, trackingNumberSchema } from "@/lib/tracking";

type State = { ok?: boolean; error?: string; message?: string };
const optionalNumber = z.union([trackingNumberSchema, z.literal("")]).transform((v) => v || null);
const registration = z.object({
  carrier: z.enum(["DHL", "FEDEX", "UPS", "EMS", "OTHER"]),
  trackingNo: trackingNumberSchema,
  customsNo: optionalNumber,
  customsYear: z.string().regex(/^$|^20\d{2}$/).transform((v) => v ? Number(v) : null),
  domesticCarrier: z.enum(["", "CJ", "HANJIN", "LOTTE", "POST", "EMS", "LOGEN", "OTHER"]).transform((v) => v || null),
  domesticTrackingNo: optionalNumber,
});

function invalidate(id: string) {
  revalidatePath("/me");
  revalidatePath(`/tracking/${id}`);
  revalidatePath("/guide/first");
  revalidatePath("/admin/growth");
}

async function completeGuide(userId: string) {
  const [user, guide, tracked] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.firstPurchaseGuide.findUnique({ where: { userId } }),
    prisma.order.count({ where: { userId, status: { not: "CANCELLED" }, trackingRegisteredAt: { not: null }, trackingNo: { not: null } } }),
  ]);
  if (guide && !guide.completedAt && firstPurchaseProgress(user, guide, tracked > 0).completed) {
    await prisma.firstPurchaseGuide.updateMany({ where: { userId, completedAt: null }, data: { completedAt: new Date() } });
  }
}

export async function registerTracking(_: State, fd: FormData): Promise<State> {
  const id = String(fd.get("id") ?? "");
  const user = await requireUser(`/tracking/${encodeURIComponent(id)}`);
  const parsed = registration.safeParse(Object.fromEntries(["carrier", "trackingNo", "customsNo", "customsYear", "domesticCarrier", "domesticTrackingNo"].map((k) => [k, String(fd.get(k) ?? "").trim()])));
  if (!parsed.success) return { error: "운송사와 운송장 번호를 확인해 주세요. 번호는 영문·숫자·공백·하이픈으로 80자까지 입력할 수 있습니다." };
  const data = parsed.data;
  if (data.customsYear && data.customsYear > new Date().getUTCFullYear() + 1) return { error: "통관 조회 연도를 확인해 주세요." };
  if (!!data.domesticCarrier !== !!data.domesticTrackingNo) return { error: "국내 운송사와 운송장 번호를 함께 입력해 주세요." };
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} AND "userId" = ${user.id} FOR UPDATE`;
    const order = await tx.order.findFirst({ where: { id, userId: user.id }, include: { _count: { select: { shipmentEvents: true } } } });
    if (!order) return { error: "주문을 찾을 수 없습니다." };
    if (order.status === "CANCELLED" || order.status === "DELIVERED") return { error: "진행 중인 주문에만 운송장을 등록할 수 있습니다." };
    const changed = !!order.trackingNo && (order.trackingNo !== data.trackingNo || normalizeCarrierCode(order.carrier) !== data.carrier);
    if (changed && order._count.shipmentEvents) return { error: "배송 기록이 있는 운송장은 직접 교체할 수 없습니다. 번호 정정은 운영자에게 문의해 주세요." };
    await tx.order.update({ where: { id }, data: { ...data, trackingRegisteredAt: order.trackingRegisteredAt ?? new Date(), ...(changed ? { trackingSyncedAt: null, trackingUpdatedAt: null } : {}), trackingError: null } });
    return { ok: true };
  });
  if (!result.ok) return result;
  await completeGuide(user.id);
  invalidate(id);
  return { ok: true, message: "운송장을 저장했습니다. 배송 상태를 갱신하거나 공식 조회를 이용해 주세요." };
}

const trackingErrors: Record<string, string> = {
  not_configured: "자동 조회가 아직 연결되지 않았습니다. 공식 조회 링크나 직접 단계 확인을 이용해 주세요.",
  cooldown: "방금 조회했습니다. 5분 후 다시 갱신할 수 있습니다.",
  no_tracking: "운송장 번호를 먼저 등록해 주세요.",
  terminal_order: "취소되거나 수령 완료한 주문입니다.",
  not_found: "주문을 찾을 수 없습니다.",
  identity_mismatch: "배송 조회 결과의 운송장이 일치하지 않습니다. 등록 번호를 확인해 주세요.",
  invalid_response: "배송 조회 결과를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  provider_unavailable: "배송 조회 서비스에 연결하지 못했습니다. 공식 조회를 이용하거나 나중에 다시 시도해 주세요.",
};

export async function refreshTracking(_: State, fd: FormData): Promise<State> {
  const id = String(fd.get("id") ?? "");
  const user = await requireUser(`/tracking/${encodeURIComponent(id)}`);
  if (!await prisma.order.findFirst({ where: { id, userId: user.id }, select: { id: true } })) return { error: "주문을 찾을 수 없습니다." };
  const result = await syncOrderTracking(id);
  invalidate(id);
  return result.ok ? { ok: true, message: "배송 상태를 갱신했습니다." } : { error: trackingErrors[result.error] ?? trackingErrors.provider_unavailable };
}

export async function recordShipmentStep(_: State, fd: FormData): Promise<State> {
  const id = String(fd.get("id") ?? "");
  const user = await requireUser(`/tracking/${encodeURIComponent(id)}`);
  const stage = z.enum(SHIPMENT_STAGES).safeParse(fd.get("stage"));
  if (!stage.success || stage.data === "DELIVERED") return { error: "배송 단계를 확인해 주세요. 수령 확인은 아래 받았어요 버튼으로 할 수 있습니다." };
  const o = await prisma.order.findFirst({ where: { id, userId: user.id } });
  if (!o || o.status === "CANCELLED" || o.status === "DELIVERED" || o.status === "CLICKED") return { error: "먼저 내 주문에서 결제 완료를 확인해 주세요." };
  const raw = String(fd.get("actualTax") ?? "").trim();
  if (stage.data === "TAX_NOTICE" && !/^\d+$/.test(raw)) return { error: "세금 고지액을 입력해 주세요. 0원도 기록할 수 있습니다." };
  const actualTax = raw ? Number(raw) : undefined;
  if (actualTax !== undefined && (!Number.isSafeInteger(actualTax) || actualTax < 0 || actualTax > 100_000_000)) return { error: "세금은 0~100,000,000원 사이 정수로 입력해 주세요." };
  const r = await recordManualShipmentStage(id, stage.data, "customer", { actualTax, note: "수령인이 배송 단계를 직접 확인했습니다." });
  invalidate(id);
  return r.ok ? { ok: true, message: "확인한 단계를 기록했습니다." } : { error: "이 단계는 기록할 수 없습니다. 현재 상태를 확인해 주세요." };
}

export async function confirmDelivery(_: State, fd: FormData): Promise<State> {
  const id = String(fd.get("id") ?? "");
  const user = await requireUser(`/tracking/${encodeURIComponent(id)}`);
  const raw = String(fd.get("taxPaid") ?? "").trim();
  if (!/^\d+$/.test(raw)) return { error: "실제 낸 세금을 입력해 주세요. 0원도 기록할 수 있습니다." };
  const result = await confirmReceived(id, user.id, Number(raw));
  invalidate(id);
  return result.ok ? { ok: true, message: "수령과 실제 세금을 기록했습니다. 후기 작성 시 자동으로 채워집니다." } : result;
}
