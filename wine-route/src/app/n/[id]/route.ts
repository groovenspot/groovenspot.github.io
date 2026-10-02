import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";

/** 알림 링크: 클릭을 기록하고 원래 화면으로 보냅니다. 주간 묶음 클릭은 묶인 알림에도 기록합니다. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) return NextResponse.redirect(new URL("/", req.url));
  const now = new Date();
  await prisma.notification.updateMany({ where: { OR: [{ id }, { digestId: id }], clickedAt: null }, data: { clickedAt: now } });
  const dest = n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : "/";
  const sep = dest.includes("?") ? "&" : "?";
  return NextResponse.redirect(new URL(`${dest}${dest.includes("#") ? "" : `${sep}from=alert`}`, req.url));
}
