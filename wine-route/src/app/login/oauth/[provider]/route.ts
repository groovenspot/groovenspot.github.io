import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, isProvider, providerConfigured, safeNext } from "@/lib/oauth";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
const OAUTH_COOKIE = "wr_oauth";

/** 소셜 로그인 시작: state 를 쿠키에 두고 카카오·네이버 동의 화면으로 보냅니다. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (!isProvider(provider) || !providerConfigured(provider)) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("지금은 쓸 수 없는 로그인 방법입니다.")}&next=${encodeURIComponent(next)}`, siteUrl()));
  }
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authorizeUrl(provider, siteUrl(), state));
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ p: provider, state, next }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/login/oauth", maxAge: 600,
  });
  return res;
}
