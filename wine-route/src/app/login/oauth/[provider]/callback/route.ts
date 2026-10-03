import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getUser, startSession } from "@/server/auth";
import { fetchProfile, resolveOAuthUser } from "@/server/oauth";
import { isProvider, providerConfigured, safeNext } from "@/lib/oauth";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
const OAUTH_COOKIE = "wr_oauth";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** 카카오·네이버가 돌려보낸 곳: state 확인 → 프로필 → 회원 연결 → 세션 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const jar = await cookies();
  let saved: { p?: string; state?: string; next?: string } = {};
  try { saved = JSON.parse(jar.get(OAUTH_COOKIE)?.value ?? "{}"); } catch { saved = {}; }
  jar.delete({ name: OAUTH_COOKIE, path: "/login/oauth" });
  const next = safeNext(saved.next);
  const fail = (msg: string): never => redirect(`/login?error=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`);

  const sp = req.nextUrl.searchParams;
  if (!isProvider(provider) || !providerConfigured(provider)) fail("지금은 쓸 수 없는 로그인 방법입니다.");
  if (sp.get("error")) fail("소셜 로그인을 취소했습니다.");
  const state = sp.get("state") ?? "", code = sp.get("code") ?? "";
  if (!code || !saved.state || saved.p !== provider || !same(state, saved.state)) fail("로그인 요청이 만료됐습니다. 다시 시도해 주세요.");

  let profile = null;
  try { profile = await fetchProfile(provider as "kakao" | "naver", code, state, siteUrl()); } catch (e) { console.error("oauth", e); }
  if (!profile) fail("소셜 계정 정보를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.");

  const current = await getUser();
  const r = await resolveOAuthUser(provider as "kakao" | "naver", profile!, current?.id ?? null);
  if (!r.ok) fail(r.error);
  if (r.ok && !current) await startSession(r.userId);
  redirect(r.ok && current ? "/me?linked=1#account" : next);
}
