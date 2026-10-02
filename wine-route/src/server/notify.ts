import { Prisma, type NotificationType, type User } from "@prisma/client";
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
      data: { userId: n.user.id, type: n.type, wineId: n.wineId ?? null, title: n.title, body: n.body, link: n.link, dedupeKey: n.dedupeKey, status: n.queue ? "QUEUED" : "SENT" },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { sent: false, duplicate: true };
    throw e;
  }
  if (n.queue) return { sent: false, queued: true };
  return deliver(row.id, n.user, n.type, n.title, n.body);
}

async function deliver(id: string, user: Pick<User, "email" | "phone">, type: string, title: string, body: string): Promise<NotifyResult> {
  const link = `${appUrl()}/n/${id}`;
  const tpl = alimtalkTemplate(type);
  try {
    if (user.phone && tpl) {
      await sendGenericAlimtalk(user.phone, tpl, { title, body, link });
      await prisma.notification.update({ where: { id }, data: { channel: "kakao", sentAt: new Date() } });
    } else {
      await sendMail(user.email, `[셀러도어] ${title}`, `${body}\n\n${link}\n\n알림 설정: ${appUrl()}/me#watch`);
      await prisma.notification.update({ where: { id }, data: { channel: "email", sentAt: new Date() } });
    }
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
    const r = await notify({ user, type: "DIGEST", title, body, link: "/me#watch", dedupeKey: `digest:${user.id}:${weekKey(now)}` });
    if (r.sent || r.duplicate) {
      const digest = await prisma.notification.findUnique({ where: { dedupeKey: `digest:${user.id}:${weekKey(now)}` } });
      await prisma.notification.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { status: "SKIPPED", digestId: digest?.id } });
      if (r.sent) sent++;
    }
  }
  return `주간 묶음 ${sent}통 발송 (대기 알림 ${queued.length}건)`;
}
