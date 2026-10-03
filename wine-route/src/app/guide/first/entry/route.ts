import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { FIRST_GUIDE_SEEN_COOKIE, firstPurchaseHref, firstPurchaseSelection } from "@/lib/first-purchase";

/** Remember the first invitation so returning to an order never traps a customer. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const selection = firstPurchaseSelection({ offerId: p.get("offerId"), qty: p.get("qty"), route: p.get("route") });
  const user = await getUser();
  if (user) await prisma.firstPurchaseGuide.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  const res = NextResponse.redirect(new URL(firstPurchaseHref(selection), req.url));
  res.cookies.set(FIRST_GUIDE_SEEN_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 180 * 86400 });
  return res;
}
