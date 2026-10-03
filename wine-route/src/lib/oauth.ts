/**
 * 소셜 로그인 (카카오·네이버) 설정과 응답 해석. 키가 있는 곳만 로그인 화면에 버튼이 보입니다.
 * 네트워크 호출은 src/server/oauth.ts 에 있고, 여기는 순수 함수입니다.
 */
export type ProviderKey = "kakao" | "naver";

export const PROVIDER_LABEL: Record<ProviderKey, string> = { kakao: "카카오", naver: "네이버" };

type ProviderDef = {
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope?: string;
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
  secretRequired: boolean;
};

export const PROVIDERS: Record<ProviderKey, ProviderDef> = {
  kakao: {
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    profileUrl: "https://kapi.kakao.com/v2/user/me",
    scope: "account_email",
    clientId: () => process.env.KAKAO_CLIENT_ID,
    clientSecret: () => process.env.KAKAO_CLIENT_SECRET, // 카카오는 '클라이언트 시크릿' 사용을 켠 경우에만
    secretRequired: false,
  },
  naver: {
    authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
    tokenUrl: "https://nid.naver.com/oauth2.0/token",
    profileUrl: "https://openapi.naver.com/v1/nid/me",
    clientId: () => process.env.NAVER_CLIENT_ID,
    clientSecret: () => process.env.NAVER_CLIENT_SECRET,
    secretRequired: true,
  },
};

export const isProvider = (p: string): p is ProviderKey => p === "kakao" || p === "naver";

export function providerConfigured(p: ProviderKey) {
  const d = PROVIDERS[p];
  return !!d.clientId() && (!d.secretRequired || !!d.clientSecret());
}

export const enabledProviders = (): ProviderKey[] => (["kakao", "naver"] as const).filter(providerConfigured);

export const redirectUri = (base: string, p: ProviderKey) => `${base}/login/oauth/${p}/callback`;

export function authorizeUrl(p: ProviderKey, base: string, state: string) {
  const d = PROVIDERS[p];
  const q = new URLSearchParams({ response_type: "code", client_id: d.clientId() ?? "", redirect_uri: redirectUri(base, p), state });
  if (d.scope) q.set("scope", d.scope);
  return `${d.authorizeUrl}?${q}`;
}

export type OAuthProfile = { providerId: string; email: string | null; emailVerified: boolean };

/** 카카오 /v2/user/me. 이메일은 '유효하고 인증된' 경우만 씁니다. */
export function parseKakao(j: unknown): OAuthProfile | null {
  const o = j as { id?: number | string; kakao_account?: { email?: string; is_email_valid?: boolean; is_email_verified?: boolean } };
  if (o?.id === undefined || o.id === null) return null;
  const a = o.kakao_account ?? {};
  const verified = !!a.email && a.is_email_valid === true && a.is_email_verified === true;
  return { providerId: String(o.id), email: a.email ?? null, emailVerified: verified };
}

/** 네이버 /v1/nid/me. 네이버 계정 이메일은 네이버가 확인한 주소로 봅니다. */
export function parseNaver(j: unknown): OAuthProfile | null {
  const o = j as { resultcode?: string; response?: { id?: string; email?: string } };
  if (o?.resultcode !== "00" || !o.response?.id) return null;
  return { providerId: o.response.id, email: o.response.email ?? null, emailVerified: !!o.response.email };
}

/** 로그인 후 돌아갈 주소: 같은 사이트 경로만 */
export function safeNext(n: unknown, d = "/me") {
  const s = String(n ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !/[\\\u0000-\u001f]/.test(s) ? s : d;
}
