import { prisma } from "./db";
import { sendMail } from "./mail";
import { segmentRows, filterRows } from "./segments";
import { canSendMarketing } from "@/lib/consent";
import { adSubject, campaignProblems, inQuietHours, marketingFooter } from "@/lib/marketing";
import type { Segment } from "@/lib/segments";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export type Audience = { segment?: Segment; country?: string };

/** 받는 사람: 마케팅 동의 회원만 (+ 세그먼트·취향 산지 조건) */
export async function audience(a: Audience) {
  const { rows } = await segmentRows();
  return filterRows(rows, a.segment, true)
    .filter(({ u }) => canSendMarketing(u))
    .filter(({ u }) => !a.country || (u.tasteProfile?.countries ?? []).includes(a.country))
    .map(({ u }) => ({ id: u.id, email: u.email }));
}

export async function sendCampaign(c: { title: string; body: string; link?: string | null; createdBy: string } & Audience, now = new Date()) {
  const problems = campaignProblems(c);
  if (problems.length) return { ok: false as const, error: problems.join(" ") };
  if (inQuietHours(now)) return { ok: false as const, error: "밤 9시부터 아침 8시(KST)에는 홍보성 메일을 보내지 않습니다. 별도 야간 수신 동의를 받지 않았기 때문입니다." };
  const to = await audience(c);
  if (!to.length) return { ok: false as const, error: "보낼 대상이 없습니다. 마케팅 수신에 동의한 회원만 받을 수 있습니다." };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const camp = await prisma.marketingCampaign.create({
    data: { title: c.title, body: c.body, link: c.link || null, segment: c.segment ?? null, tasteMatch: c.country ?? null, recipients: to.length, createdBy: c.createdBy },
  });
  let sent = 0, failed = 0;
  const base = `${c.body.trim()}${c.link ? `\n\n${c.link}` : ""}`;
  for (const r of to) {
    // 보내는 순간에도 동의 상태를 다시 확인 (작성 중 철회한 회원 제외)
    const fresh = await prisma.user.findUnique({ where: { id: r.id }, select: { marketingConsentAt: true } });
    if (!canSendMarketing(fresh)) continue;
    try {
      // 받는 사람마다 로그인 없는 수신 거부 링크와 메일 앱의 '수신 거부' 버튼(List-Unsubscribe, RFC 8058)을 붙입니다.
      const unsub = unsubscribeUrl(appUrl, r.id);
      await sendMail(r.email, adSubject(c.title), `${base}${marketingFooter(appUrl, unsub)}`, {
        "List-Unsubscribe": `<${unsub.replace("/unsubscribe?", "/api/unsubscribe?")}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });
      sent++;
    } catch {
      failed++;
    }
  }
  await prisma.marketingCampaign.update({ where: { id: camp.id }, data: { sent, failed } });
  return { ok: true as const, sent, failed, recipients: to.length };
}
