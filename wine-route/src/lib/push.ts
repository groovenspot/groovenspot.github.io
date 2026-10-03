/** 브라우저 푸시 (Web Push, VAPID). 키는 `npx web-push generate-vapid-keys` 로 만들고 환경변수에 넣습니다. */
export const pushPublicKey = () => process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || "";
export const pushConfigured = () => !!(process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY);

/** 알림에 담는 내용: 제목, 본문(최대 300자), 누르면 열 사이트 안 주소 */
export function pushPayload(title: string, body: string, url: string) {
  const safeUrl = url.startsWith("/") && !url.startsWith("//") ? url : "/";
  return JSON.stringify({ title: title.slice(0, 80), body: body.slice(0, 300), url: safeUrl });
}

/** 푸시 서비스가 '구독 없음'으로 답하면 구독을 지웁니다 (사용자가 브라우저에서 알림을 끔·만료) */
export const isGoneStatus = (status: number | undefined) => status === 404 || status === 410;
export const MAX_PUSH_FAILS = 5;

export type SubscriptionJson = { endpoint: string; keys: { p256dh: string; auth: string } };

export function parseSubscription(j: unknown): SubscriptionJson | null {
  const o = j as Partial<SubscriptionJson>;
  if (!o || typeof o.endpoint !== "string" || !/^https:\/\//.test(o.endpoint) || o.endpoint.length > 1000) return null;
  if (typeof o.keys?.p256dh !== "string" || typeof o.keys?.auth !== "string" || o.keys.p256dh.length > 200 || o.keys.auth.length > 100) return null;
  return { endpoint: o.endpoint, keys: { p256dh: o.keys.p256dh, auth: o.keys.auth } };
}
