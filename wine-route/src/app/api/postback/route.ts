import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * 제휴사 전환 포스트백. 제휴 링크의 {clickId}를 sub ID로 넘겨 두면 주문 확정 시 호출됩니다.
 * GET /api/postback?secret=...&click=<clickId>&order=<주문번호>&amount=<금액>&currency=EUR&commission=<수수료>
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (!process.env.POSTBACK_SECRET || p.get("secret") !== process.env.POSTBACK_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const clickId = p.get("click") ?? "";
  const click = await prisma.clickLog.findUnique({ where: { id: clickId } });
  if (!click) return NextResponse.json({ error: "unknown click" }, { status: 404 });
  const num = (k: string) => (p.get(k) ? Number(p.get(k)) : null);
  const data = { orderRef: p.get("order"), amount: num("amount"), currency: p.get("currency")?.toUpperCase() ?? null, commission: num("commission") };
  await prisma.conversion.upsert({ where: { clickId }, update: data, create: { clickId, ...data } });
  return NextResponse.json({ ok: true });
}
