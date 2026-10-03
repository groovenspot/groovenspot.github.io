import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 로그인 없이 쓰는 수신 거부 링크. 회원 id 에 서버 비밀값 서명을 붙여 남이 다른 회원을 거부시키지 못하게 합니다.
 * 링크 자체는 만료되지 않습니다(오래된 메일에서도 거부할 수 있어야 함).
 */
const secret = () => process.env.SESSION_SECRET ?? "dev-secret";

export const unsubscribeToken = (userId: string) => createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("base64url").slice(0, 32);

export function verifyUnsubscribe(userId: string, token: string) {
  const a = Buffer.from(unsubscribeToken(userId)), b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unsubscribeUrl = (appUrl: string, userId: string) => `${appUrl}/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
