import { NextResponse, type NextRequest } from "next/server";
import { getUser, isAdminEmail } from "@/server/auth";
import { filterRows, segmentRows } from "@/server/segments";
import { SEGMENT_LABEL, SEGMENT_ORDER, type Segment } from "@/lib/segments";
import { BUDGET_LABEL } from "@/lib/taste";
import { toCsv } from "@/lib/csv";
import { ymd } from "@/lib/format";

export const dynamic = "force-dynamic";

/** 세그먼트 회원 목록 CSV (관리자 전용). 화면과 같은 조건(세그먼트·마케팅 동의)을 따릅니다. */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) return new NextResponse("forbidden", { status: 403 });
  const p = req.nextUrl.searchParams;
  const seg = SEGMENT_ORDER.find((s) => s === p.get("seg")) as Segment | undefined;
  const { rows } = await segmentRows();
  const shown = filterRows(rows, seg, p.get("consent") === "1");
  const csv = toCsv([
    ["이메일", "세그먼트", "확정 주문 수", "병 수", "병당 평균 도착가(원)", "마케팅 동의일", "취향 산지", "취향 종류", "예산", "가입일"],
    ...shown.map(({ u, r }) => [
      u.email, SEGMENT_LABEL[r.segment], r.orders, r.bottles, r.avgPerBottle ?? "",
      u.marketingConsentAt ? ymd(u.marketingConsentAt) : "", u.tasteProfile?.countries.join(" ") ?? "", u.tasteProfile?.types.join(" ") ?? "",
      u.tasteProfile?.budget ? BUDGET_LABEL[u.tasteProfile.budget] : "", ymd(u.createdAt),
    ]),
  ]);
  const name = `cellardoor-segment-${seg ?? "all"}${p.get("consent") === "1" ? "-consent" : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
