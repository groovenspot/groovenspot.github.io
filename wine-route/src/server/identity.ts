import { createHash } from "node:crypto";

/**
 * 휴대폰 본인인증 (PortOne V2). 브라우저에서 PortOne.requestIdentityVerification으로 인증한 뒤
 * 서버가 결과를 조회해 생년월일을 확인합니다.
 * 환경 변수: NEXT_PUBLIC_PORTONE_STORE_ID, NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY, PORTONE_API_SECRET
 */
export const portoneConfigured = () => !!(process.env.PORTONE_API_SECRET && process.env.NEXT_PUBLIC_PORTONE_STORE_ID && process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY);

/** 개발용 생년월일 직접 입력 허용 여부 (운영에서는 절대 켜지 않음) */
export const devVerifyAllowed = () => !portoneConfigured() && (process.env.NODE_ENV !== "production" || process.env.ADULT_VERIFY_DEV === "1");

export async function fetchIdentity(identityVerificationId: string) {
  const res = await fetch(`https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`, {
    headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`본인인증 조회 실패 ${res.status}`);
  const j = (await res.json()) as { status?: string; verifiedCustomer?: { birthDate?: string; ci?: string; name?: string } };
  if (j.status !== "VERIFIED" || !j.verifiedCustomer?.birthDate) return null;
  return { birthDate: j.verifiedCustomer.birthDate, ciHash: j.verifiedCustomer.ci ? createHash("sha256").update(j.verifiedCustomer.ci).digest("hex") : null };
}
