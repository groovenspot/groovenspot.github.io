import { prisma } from "@/server/db";
import { syncOrderTracking } from "@/server/tracking";
import { TRACKING_SYNC_COOLDOWN_MS, trackingConfigured } from "@/lib/tracking";

/** A bounded batch avoids carrier bursts. Schedule every 10–15 minutes; each order also has its own cooldown. */
export async function runTrackingJob() {
  if (!trackingConfigured()) return "배송 추적 API 미설정 · 운송사/관세청 조회와 직접 단계 등록을 이용해 주세요.";
  const orders = await prisma.order.findMany({
    where: {
      trackingNo: { not: null }, status: { notIn: ["CANCELLED", "DELIVERED"] },
      OR: [{ trackingSyncedAt: null }, { trackingSyncedAt: { lt: new Date(Date.now() - TRACKING_SYNC_COOLDOWN_MS) } }],
    },
    orderBy: [{ trackingSyncedAt: "asc" }, { createdAt: "asc" }], take: 20, select: { id: true },
  });
  let synced = 0;
  let failed = 0;
  for (const order of orders) {
    const result = await syncOrderTracking(order.id);
    if (result.ok) synced++;
    else if (result.error !== "cooldown" && result.error !== "terminal_order") failed++;
  }
  return `배송 추적 ${orders.length}건 확인 · 갱신 ${synced} · 재시도 필요 ${failed}`;
}
