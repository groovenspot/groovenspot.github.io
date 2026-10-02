import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { moveOrder } from "@/server/orders";
import { parsePostbackStatus } from "@/lib/order";

export const dynamic = "force-dynamic";

/**
 * 제휴사·판매처 포스트백. 제휴 링크·장바구니 링크의 {clickId}를 넘겨 두면 주문 진행 때마다 호출됩니다.
 * GET /api/postback?secret=...&click=<clickId>&status=confirmed|shipped|delivered|cancelled
 *     &order=<주문번호>&amount=<금액>&currency=EUR&commission=<수수료>&carrier=<택배사>&tracking=<운송장>
 * status를 빼면 confirmed로 봅니다.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (!process.env.POSTBACK_SECRET || p.get("secret") !== process.env.POSTBACK_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const clickId = p.get("click") ?? "";
  const click = await prisma.clickLog.findUnique({ where: { id: clickId }, include: { order: true } });
  if (!click) return NextResponse.json({ error: "unknown click" }, { status: 404 });
  const status = parsePostbackStatus(p.get("status"));
  if (!status) return NextResponse.json({ error: "unknown status" }, { status: 400 });

  if (status !== "CANCELLED") {
    const num = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined);
    const data = { orderRef: p.get("order") ?? undefined, amount: num("amount"), currency: p.get("currency")?.toUpperCase(), commission: num("commission") };
    await prisma.conversion.upsert({ where: { clickId }, update: data, create: { clickId, ...data } });
  } else {
    await prisma.conversion.deleteMany({ where: { clickId } });
  }

  let moved = false;
  if (click.order) {
    const r = await moveOrder(click.order.id, status, "seller", { orderRef: p.get("order"), carrier: p.get("carrier"), trackingNo: p.get("tracking") });
    moved = r.ok;
  }
  return NextResponse.json({ ok: true, order: click.order?.id ?? null, moved });
}
