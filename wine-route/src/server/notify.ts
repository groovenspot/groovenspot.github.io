import { Prisma, type AlertChannel, type NotificationType, type User } from "@prisma/client";
import { prisma } from "./db";
import { sendMail } from "./mail";
import { alimtalkTemplate, sendGenericAlimtalk } from "./alimtalk";
import { adWordsFound, weekKey } from "@/lib/alerts";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export type NotifyInput = {
  user: Pick<User, "id" | "email" | "phone">;
  type: NotificationType;
  wineId?: string | null;
  title: string;
  body: string;
  link: string; // 사이트 안 경로 (/wines/...)
  dedupeKey: string;
  queue?: boolean; // true면 주간 묶음으로 미룸 (무료 회원)
  channel?: AlertChannel; // 미지정 시 카카오를 우선합니다.
};

/**
 * 알림 하나를 보냅니다. 같은 dedupeKey는 한 번만.
 * 카카오 알림톡(번호와 승인 템플릿이 있을 때) → 없으면 이메일.
 */
export type NotifyResult = { sent: boolean; duplicate?: boolean; queued?: boolean; error?: string };

export async function notify(n: NotifyInput): Promise<NotifyResult> {
  const bad = adWordsFound(`${n.title} ${n.body}`);
  if (bad.length) throw new Error(`알림 문구에 광고 금지 표현: ${bad.join(", ")}`);
  let row;
  try {
    row = await prisma.notification.create({
      data: { userId: n.user.id, type: n.type, wineId: n.wineId ?? null, title: n.title, body: n.body, link: n.link, dedupeKey: n.dedupeKey, channel: n.channel?.toLowerCase() ?? null, status: n.queue ? "QUEUED" : "SENT" },
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    const existing = await prisma.notification.findUnique({ where: { dedupeKey: n.dedupeKey } });
    if (!existing || existing.status !== "FAILED") return { sent: false, duplicate: true };
    // 실패한 알림은 다음 작업 실행에서 재시도합니다. 성공한 알림은 중복 발송하지 않습니다.
    const claimed = await prisma.notification.updateMany({ where: { id: existing.id, status: "FAILED" }, data: { status: n.queue ? "QUEUED" : "SENT", title: n.title, body: n.body, link: n.link } });
    if (!claimed.count) return { sent: false, duplicate: true };
    row = existing;
  }
  if (n.queue) return { sent: false, queued: true };
  return deliver(row.id, n.user, n.type, n.title, n.body, n.channel);
}

async function deliver(id: string, user: Pick<User, "email" | "phone">, type: string, title: string, body: string, channel?: AlertChannel): Promise<NotifyResult> {
  const link = `${appUrl()}/n/${id}`;
  const tpl = alimtalkTemplate(type);
  try {
    if (channel !== "EMAIL" && user.phone && tpl) {
      try {
        await sendGenericAlimtalk(user.phone, tpl, { title, body, link });
        await prisma.notification.update({ where: { id }, data: { status: "SENT", channel: "kakao", sentAt: new Date() } });
        return { sent: true };
      } catch {
        console.warn("alimtalk failed; retrying by email", id);
      }
    }
    await sendMail(user.email, `[셀러도어] ${title}`, `${body}\n\n${link}\n\n알림 설정: ${appUrl()}/me#watch`);
    await prisma.notification.update({ where: { id }, data: { status: "SENT", channel: "email", sentAt: new Date() } });
    return { sent: true };
  } catch (e) {
    await prisma.notification.update({ where: { id }, data: { status: "FAILED" } });
    console.error("notify failed", id, e);
    return { sent: false, error: (e as Error).message };
  }
}

/** 무료 회원 주간 묶음: 대기 중인 알림을 한 통으로 */
export async function sendDigests(now = new Date()) {
  const queued = await prisma.notification.findMany({ where: { status: "QUEUED" }, include: { user: true }, orderBy: { createdAt: "asc" } });
  const byUser = new Map<string, typeof queued>();
  for (const q of queued) byUser.set(q.userId, [...(byUser.get(q.userId) ?? []), q]);
  let sent = 0;
  for (const [, items] of byUser) {
    const user = items[0].user;
    const title = `이번 주 찜한 와인 소식 ${items.length}건`;
    const body = items.slice(0, 10).map((i) => `· ${i.title}`).join("\n") + (items.length > 10 ? `\n외 ${items.length - 10}건` : "");
    const r = await notify({ user, type: "DIGEST", title, body, link: "/me#watch", dedupeKey: `digest:${user.id}:${weekKey(now)}`, channel: items.every((i) => i.channel === "email") ? "EMAIL" : "KAKAO" });
    if (r.sent || r.duplicate) {
      const digest = await prisma.notification.findUnique({ where: { dedupeKey: `digest:${user.id}:${weekKey(now)}` } });
      // 같은 주 이미 보낸 묶음 뒤에 생긴 알림은 다음 주까지 대기시킵니다.
      const included = r.sent ? items : digest?.sentAt ? items.filter((i) => i.createdAt <= digest.createdAt) : [];
      if (included.length) await prisma.notification.updateMany({ where: { id: { in: included.map((i) => i.id) }, status: "QUEUED" }, data: { status: "SKIPPED", digestId: digest?.id } });
      if (r.sent) sent++;
    }
  }
  return `주간 묶음 ${sent}통 발송 (대기 알림 ${queued.length}건)`;
}
