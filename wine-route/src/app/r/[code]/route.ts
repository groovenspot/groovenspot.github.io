import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";

/** 공유 카드 링크: 방문을 기록하고 공유자 코드를 30일 기억한 뒤 계산 화면으로 보냅니다. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const to = req.nextUrl.searchParams.get("to") ?? "/";
  const dest = to.startsWith("/") && !to.startsWith("//") ? to : "/";
  const valid = /^[A-Z2-9]{6}$/.test(code) && !!(await prisma.user.findUnique({ where: { refCode: code }, select: { id: true } }));
  const anonId = req.cookies.get("wr_anon")?.value ?? randomUUID();
  const res = NextResponse.redirect(new URL(dest, req.url));
  if (valid) {
    await prisma.refVisit.create({ data: { refCode: code, anonId, path: dest } });
    res.cookies.set("wr_ref", code, { httpOnly: true, sameSite: "lax", maxAge: 30 * 86400, path: "/" });
  }
  res.cookies.set("wr_anon", anonId, { httpOnly: true, sameSite: "lax", maxAge: 365 * 86400, path: "/" });
  return res;
}
