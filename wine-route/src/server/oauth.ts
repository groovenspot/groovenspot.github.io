import { prisma } from "./db";
import { createUser, normEmail, validEmail } from "./auth";
import { PROVIDERS, parseKakao, parseNaver, redirectUri, type OAuthProfile, type ProviderKey } from "@/lib/oauth";

/** 인가 코드 → 액세스 토큰 → 프로필 */
export async function fetchProfile(p: ProviderKey, code: string, state: string, base: string): Promise<OAuthProfile | null> {
  const d = PROVIDERS[p];
  const body = new URLSearchParams({ grant_type: "authorization_code", client_id: d.clientId() ?? "", redirect_uri: redirectUri(base, p), code });
  const secret = d.clientSecret();
  if (secret) body.set("client_secret", secret);
  if (p === "naver") body.set("state", state);
  const tok = await fetch(d.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body, signal: AbortSignal.timeout(8000) });
  if (!tok.ok) return null;
  const accessToken = ((await tok.json()) as { access_token?: string }).access_token;
  if (!accessToken) return null;
  const me = await fetch(d.profileUrl, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(8000) });
  if (!me.ok) return null;
  const j = await me.json();
  return p === "kakao" ? parseKakao(j) : parseNaver(j);
}

export type LinkResult =
  | { ok: true; userId: string; created: boolean; linked: boolean }
  | { ok: false; error: string };

/**
 * 소셜 계정을 회원에 붙입니다.
 * 1) 이미 연결된 소셜 계정 → 그 회원  2) 로그인 중이면 지금 회원에 연결  3) 인증된 같은 이메일 회원에 연결  4) 새로 가입
 * 인증되지 않은 이메일로는 기존 계정에 붙이지 않습니다(남의 계정 가로채기 방지).
 */
export async function resolveOAuthUser(provider: ProviderKey, profile: OAuthProfile, currentUserId: string | null): Promise<LinkResult> {
  const key = { provider_providerId: { provider, providerId: profile.providerId } };
  const existing = await prisma.oAuthAccount.findUnique({ where: key });
  if (existing) {
    if (currentUserId && existing.userId !== currentUserId) return { ok: false, error: "이 소셜 계정은 이미 다른 셀러도어 계정에 연결돼 있습니다." };
    return { ok: true, userId: existing.userId, created: false, linked: false };
  }
  const email = profile.email && validEmail(normEmail(profile.email)) ? normEmail(profile.email) : null;
  if (currentUserId) {
    await prisma.oAuthAccount.create({ data: { provider, providerId: profile.providerId, userId: currentUserId, email } });
    return { ok: true, userId: currentUserId, created: false, linked: true };
  }
  if (!email || !profile.emailVerified) return { ok: false, error: "이메일 제공에 동의하고, 소셜 계정에 인증된 이메일이 있어야 가입할 수 있습니다. 이메일 코드로 로그인해 주세요." };
  const byEmail = await prisma.user.findUnique({ where: { email } });
  const user = byEmail ?? (await createUser(email));
  await prisma.oAuthAccount.create({ data: { provider, providerId: profile.providerId, userId: user.id, email } });
  return { ok: true, userId: user.id, created: !byEmail, linked: !!byEmail };
}
