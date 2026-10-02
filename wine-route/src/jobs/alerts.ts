import { prisma } from "@/server/db";
import { compareLoaded, loadContext } from "@/server/compare";
import { sendMail } from "@/server/mail";
import { alimtalkConfigured, sendPriceAlimtalk } from "@/server/alimtalk";
import { won } from "@/lib/format";

/**
 * 가격 알림: 병당 도착가가 목표가 이하로 내려가면 알립니다.
 * 같은 가격으로 반복 발송하지 않고, 지난 알림보다 더 내려갔을 때만 다시 보냅니다.
 */
export async function runAlertsJob() {
  const ctx = await loadContext();
  const alerts = await prisma.priceAlert.findMany({
    where: { active: true },
    include: { user: true, wine: { include: { offers: { include: { seller: true } } } } },
  });
  const base = process.env.APP_URL ?? "http://localhost:3000";
  let sent = 0;
  let failed = 0;
  for (const a of alerts) {
    const r = compareLoaded(a.wine, a.qty, a.bottleMl, ctx);
    const price = r.best ? Math.round(r.best.perBottle) : null;
    const hit = price !== null && price <= a.targetPerBottle && (a.notifiedPrice === null || price < a.notifiedPrice);
    if (hit) {
      const link = `${base}/wines/${a.wineId}?qty=${a.qty}&ml=${a.bottleMl}`;
      try {
        if (a.channel === "KAKAO" && a.user.phone && alimtalkConfigured()) {
          await sendPriceAlimtalk(a.user.phone, { wine: a.wine.nameKo, price: won(price), target: won(a.targetPerBottle), link });
        } else {
          await sendMail(
            a.user.email,
            `[와인루트] ${a.wine.nameKo} 도착가가 목표가 아래로 내려갔습니다`,
            `${a.wine.nameKo} (${a.qty}병) 병당 도착가 ${won(price)} · 목표 ${won(a.targetPerBottle)}\n최저 경로: ${r.best!.sellerName}\n${link}`,
          );
        }
        await prisma.priceAlert.update({ where: { id: a.id }, data: { lastPrice: price, notifiedPrice: price, notifiedAt: new Date() } });
        sent++;
      } catch (e) {
        failed++;
        console.error("alert send failed", a.id, e);
        await prisma.priceAlert.update({ where: { id: a.id }, data: { lastPrice: price } });
      }
    } else {
      // 목표가 위로 다시 올라가면 다음 하락 때 또 알릴 수 있게 초기화
      const reset = price !== null && price > a.targetPerBottle ? { notifiedPrice: null } : {};
      await prisma.priceAlert.update({ where: { id: a.id }, data: { lastPrice: price, ...reset } });
    }
  }
  return `알림 ${alerts.length}건 확인, 발송 ${sent}건${failed ? `, 실패 ${failed}건` : ""}`;
}
