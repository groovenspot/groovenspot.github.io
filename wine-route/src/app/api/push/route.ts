import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { sendPushToUser } from "@/server/push";
import { parseSubscription, pushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

/** 이 브라우저 구독 저장 (로그인 회원). body = PushSubscription.toJSON() */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "브라우저 알림이 설정되지 않았습니다" }, { status: 503 });
  const sub = parseSubscription(await req.json().catch(() => null));
  if (!sub) return NextResponse.json({ error: "구독 정보가 올바르지 않습니다" }, { status: 400 });
  if ((await prisma.pushSubscription.count({ where: { userId: user.id } })) >= 10) return NextResponse.json({ error: "기기는 10개까지 등록할 수 있습니다. 내 정보에서 정리해 주세요." }, { status: 400 });
  const data = { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null, failCount: 0 };
  await prisma.pushSubscription.upsert({ where: { endpoint: sub.endpoint }, update: data, create: { endpoint: sub.endpoint, ...data } });
  return NextResponse.json({ ok: true });
}

/** 이 브라우저 구독 해제 */
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
  return NextResponse.json({ ok: true });
}

/** 시험 알림: PUT */
export async function PUT() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const r = await sendPushToUser(user.id, "셀러도어 알림 시험", "이 기기에서 가격 알림을 받을 수 있습니다.", "/me#push");
  return NextResponse.json(r);
}
