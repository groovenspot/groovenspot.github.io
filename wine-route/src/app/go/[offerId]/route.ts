import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { compareWine } from "@/server/compare";
import { shipperOf } from "@/server/shipper";
import { buildCheckoutUrl, safeHttpUrl } from "@/lib/checkout";

/**
 * 판매처 결제 화면으로 이동: 클릭을 기록하고, 로그인한 손님은 주문 추적을 시작한 뒤,
 * 판매처 방식에 맞춰 장바구니 담기·주문 정보 미리 채우기를 한 URL로 보냅니다.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { seller: true } });
  if (!offer) return NextResponse.redirect(new URL("/", req.url));

  const qty = Math.min(24, Math.max(1, Number(req.nextUrl.searchParams.get("qty")) || 1));
  const route = req.nextUrl.searchParams.get("route") ?? offer.seller.channel;
  const data = await compareWine(offer.wineId, qty, offer.bottleMl);
  const cand = data?.result.routes.flatMap((r) => r.candidates).find((c) => c.offerId === offerId && c.channel === route);

  const user = await getUser();
  const anonId = req.cookies.get("wr_anon")?.value ?? randomUUID();
  const click = await prisma.clickLog.create({
    data: { offerId, wineId: offer.wineId, userId: user?.id, anonId, route, qty, estPerBottle: Math.round(cand?.perBottle ?? 0) },
  });
  if (user) {
    await prisma.order.create({
      data: {
        userId: user.id,
        clickId: click.id,
        wineId: offer.wineId,
        sellerId: offer.sellerId,
        route,
        qty,
        bottleMl: offer.bottleMl,
        estTotal: Math.round(cand?.total ?? 0),
        estTax: Math.round(cand?.tax.pay ?? 0),
        events: { create: { status: "CLICKED", by: "system" } },
      },
    });
  }

  // 배송대행지 경로는 배대지 주소로 받아야 하므로 한국 주소를 미리 채우지 않습니다.
  const shipper = user && route !== "FORWARDER" ? shipperOf(user) : user ? { email: user.email } : null;
  const { url } = buildCheckoutUrl({
    mode: offer.seller.checkoutMode,
    productUrl: offer.url,
    website: offer.seller.website,
    checkoutRef: offer.checkoutRef,
    cartTpl: offer.seller.cartTpl,
    affiliateTpl: offer.seller.affiliateTpl,
    qty,
    clickId: click.id,
    shipper,
  });
  const dest = safeHttpUrl(url);
  if (!dest) return NextResponse.redirect(new URL(`/wines/${offer.wineId}`, req.url));
  const res = NextResponse.redirect(dest, 302);
  res.headers.set("Referrer-Policy", "no-referrer");
  res.cookies.set("wr_anon", anonId, { httpOnly: true, sameSite: "lax", maxAge: 365 * 86400, path: "/" });
  return res;
}
