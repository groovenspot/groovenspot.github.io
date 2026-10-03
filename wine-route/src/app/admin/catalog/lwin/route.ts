import { NextResponse, type NextRequest } from "next/server";
import { getUser, isAdminEmail } from "@/server/auth";
import { audited } from "@/server/audit";
import { upsertLwin } from "@/server/catalog";
import { csvObjects } from "@/lib/csvParse";
import { mapLwinRows } from "@/lib/lwin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** LWIN 목록 CSV 올리기 (수십 MB 라 서버 액션 대신 일반 요청으로 받습니다) */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "관리자만 올릴 수 있습니다" }, { status: 403 });
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/catalog/import?${q}#lwin`, req.url), 303);
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) return back(`lwinError=${encodeURIComponent("CSV 파일을 골라 주세요")}`);
  if (file.size > 200 * 1024 * 1024) return back(`lwinError=${encodeURIComponent("200MB 이하 파일만 올릴 수 있습니다")}`);
  const summary = new FormData();
  summary.set("file", `${file.name} (${file.size}B)`);
  try {
    const n = await audited(user.email, "uploadLwin", summary, async () => {
      const { header, rows } = csvObjects(await file.text());
      const mapped = mapLwinRows(header, rows);
      if (mapped.missing.length) throw new Error(`LWIN 파일 머리줄에 ${mapped.missing.join(", ")} 열이 없습니다. Liv-ex 에서 받은 엑셀을 CSV 로 저장해 올려 주세요.`);
      const saved = await upsertLwin(mapped.rows);
      return { saved, skipped: mapped.skipped };
    });
    return back(`lwinSaved=${n.saved}&lwinSkipped=${n.skipped}`);
  } catch (e) {
    return back(`lwinError=${encodeURIComponent((e as Error).message.slice(0, 300))}`);
  }
}
