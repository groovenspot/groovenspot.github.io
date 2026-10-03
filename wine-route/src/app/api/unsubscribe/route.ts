import { NextResponse, type NextRequest } from "next/server";
import { withdrawByLink } from "@/server/unsubscribe";

export const dynamic = "force-dynamic";

/** 메일 앱의 '수신 거부' 버튼 (List-Unsubscribe-Post: One-Click, RFC 8058): 확인 없이 바로 처리 */
export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "", t = req.nextUrl.searchParams.get("t") ?? "";
  const r = await withdrawByLink(u, t);
  return NextResponse.json({ ok: r !== "invalid", result: r }, { status: r === "invalid" ? 400 : 200 });
}

/** 주소창으로 열면 확인 화면으로 */
export function GET(req: NextRequest) {
  const url = new URL("/unsubscribe", req.url);
  url.search = req.nextUrl.search;
  return NextResponse.redirect(url);
}
