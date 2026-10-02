import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { getUser, isAdminEmail } from "@/server/auth";

export const dynamic = "force-dynamic";

/** 인증 사진: 운영자와 작성자만 볼 수 있습니다. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  const user = await getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });
  const f = await prisma.proofFile.findUnique({ where: { reviewId }, include: { review: { select: { userId: true } } } });
  if (!f || (f.review.userId !== user.id && !isAdminEmail(user.email))) return new NextResponse("not found", { status: 404 });
  return new NextResponse(Buffer.from(f.data), {
    headers: { "Content-Type": f.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
  });
}
