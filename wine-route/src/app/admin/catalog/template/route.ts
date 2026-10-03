import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { toCsv } from "@/lib/csv";
import { WINE_CSV_HEADER } from "@/lib/wineCsv";

/** 와인 CSV 양식 (머리줄 + 예시 한 줄) */
export async function GET() {
  await requireAdmin();
  const csv = toCsv([
    WINE_CSV_HEADER,
    ["Chablis Premier Cru Montmains", "샤블리 프리미에 크뤼 몽맹", "Domaine Example", "프랑스", "샤블리", "화이트", "샤르도네", 2022, 89000, "국내 수입사 소비자가", "", "", "몽맹|Montmains", "", "", ""],
  ]);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="cellardoor-wines-template.csv"' } });
}
