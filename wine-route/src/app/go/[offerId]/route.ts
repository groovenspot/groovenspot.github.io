import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { compareWine } from "@/server/compare";

/** 판매처 이동: 클릭을 기록하고 제휴 링크로 보냅니다. */
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

  const tpl = offer.seller.affiliateTpl;
  const target = tpl ? tpl.replace("{url}", offer.url).replace("{clickId}", click.id) : offer.url;
  let dest: URL;
  try {
    dest = new URL(target);
    if (dest.protocol !== "https:" && dest.protocol !== "http:") throw new Error("bad protocol");
  } catch {
    return NextResponse.redirect(new URL(`/wines/${offer.wineId}`, req.url));
  }
  const res = NextResponse.redirect(dest, 302);
  res.cookies.set("wr_anon", anonId, { httpOnly: true, sameSite: "lax", maxAge: 365 * 86400, path: "/" });
  return res;
}
