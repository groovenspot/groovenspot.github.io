import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * 서버 상태 확인 (배포 서비스·모니터링용). 비밀값 없이 볼 수 있으므로 상태만 알려 줍니다.
 * DB 가 응답하지 않으면 503. 환율이 오래됐으면 ok 는 유지하고 경고만 붙입니다.
 */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const fx = await prisma.exchangeRate.findFirst({ orderBy: { fetchedAt: "desc" }, select: { fetchedAt: true } }).catch(() => null);
  const fxAgeMin = fx ? Math.round((Date.now() - fx.fetchedAt.getTime()) / 60e3) : null;
  return NextResponse.json(
    { ok: true, db: "up", dbMs: Date.now() - started, fxAgeMin, warnings: fxAgeMin === null ? ["환율 기록 없음"] : fxAgeMin > 180 ? ["환율이 3시간 넘게 갱신되지 않음"] : [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
