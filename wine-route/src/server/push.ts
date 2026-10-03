import webpush from "web-push";
import { prisma } from "./db";
import { MAX_PUSH_FAILS, isGoneStatus, pushConfigured, pushPayload, pushPublicKey } from "@/lib/push";

let ready = false;
function setup() {
  if (ready) return true;
  if (!pushConfigured()) return false;
  webpush.setVapidDetails(process.env.WEB_PUSH_SUBJECT || `mailto:${(process.env.ADMIN_EMAILS ?? "admin@example.com").split(",")[0].trim()}`, pushPublicKey(), process.env.WEB_PUSH_PRIVATE_KEY!);
  ready = true;
  return true;
}

/**
 * 회원의 모든 브라우저 구독으로 보냅니다. 한 곳이라도 받으면 성공.
 * 404/410 은 구독을 지우고, 다른 실패가 여러 번 쌓이면 그 구독도 지웁니다.
 */
export async function sendPushToUser(userId: string, title: string, body: string, url: string, sendFn: typeof webpush.sendNotification = webpush.sendNotification) {
  if (!setup()) return { sent: 0, failed: 0, configured: false };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const payload = pushPayload(title, body, url);
  let sent = 0, failed = 0;
  for (const s of subs) {
    try {
      await sendFn({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 24 * 3600 });
      await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastOkAt: new Date(), failCount: 0 } });
      sent++;
    } catch (e) {
      failed++;
      const status = (e as { statusCode?: number }).statusCode;
      if (isGoneStatus(status) || s.failCount + 1 >= MAX_PUSH_FAILS) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      else await prisma.pushSubscription.update({ where: { id: s.id }, data: { failCount: { increment: 1 } } });
    }
  }
  return { sent, failed, configured: true };
}
