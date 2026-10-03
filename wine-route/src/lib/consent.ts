/**
 * 마케팅 수신 동의. 서비스 이용에 필요한 알림(가격 알림, 주문 상태)은 이 동의와 무관하고,
 * 신규 와인 소개 같은 홍보성 발송만 이 동의가 있어야 합니다.
 * 동의를 철회하면 marketingConsentAt은 null이 되고, 변경 시각은 marketingConsentUpdatedAt에 남습니다.
 */
export type ConsentFields = { marketingConsentAt: Date | null };

export const canSendMarketing = (u: ConsentFields | null | undefined) => !!u?.marketingConsentAt;

export function consentChange(on: boolean, now = new Date()) {
  return { marketingConsentAt: on ? now : null, marketingConsentUpdatedAt: now };
}
