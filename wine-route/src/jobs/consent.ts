import { prisma } from "@/server/db";
import { sendMail } from "@/server/mail";
import { noticeCutoff, noticeDue, noticeMail } from "@/lib/consentNotice";
import { unsubscribeUrl } from "@/lib/unsubscribe";

const BATCH = 500;

/**
 * 마케팅 수신 동의 2년 안내 (정보통신망법). 매일 한 번, 기준일이 다가온 회원에게 안내 메일을 보내고 보낸 날을 남깁니다.
 * 동의를 철회한 회원과 이미 최근에 안내한 회원은 건너뜁니다.
 */
export async function runConsentNotices(now = new Date()) {
  const cutoff = noticeCutoff(now);
  const users = await prisma.user.findMany({
    where: {
      marketingConsentAt: { not: null, lte: cutoff },
      OR: [{ marketingConsentNoticeAt: null }, { marketingConsentNoticeAt: { lte: cutoff } }],
    },
    select: { id: true, email: true, marketingConsentAt: true, marketingConsentNoticeAt: true },
    orderBy: { marketingConsentAt: "asc" },
    take: BATCH,
  });
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  let sent = 0, failed = 0;
  for (const u of users) {
    if (!noticeDue(u, now)) continue;
    const m = noticeMail(u.marketingConsentAt!, unsubscribeUrl(appUrl, u.id), `${appUrl}/me#preferences`);
    try {
      await sendMail(u.email, m.subject, m.text);
      await prisma.user.update({ where: { id: u.id }, data: { marketingConsentNoticeAt: now } });
      sent++;
    } catch (e) {
      console.error("consent notice", u.id, e);
      failed++;
    }
  }
  return `수신 동의 2년 안내 ${sent}건${failed ? ` · 실패 ${failed}건` : ""}${users.length === BATCH ? " · 남은 대상은 다음 실행에" : ""}`;
}
