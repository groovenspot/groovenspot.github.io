/**
 * 정보통신망법: 광고성 정보 수신에 동의한 사람에게 2년마다 동의 사실(동의 날짜·내용·철회 방법)을 알립니다.
 * 기준일은 마지막 동의 또는 마지막 안내 중 늦은 날이고, 넉넉하게 2주 먼저 보냅니다.
 */
export const NOTICE_INTERVAL_DAYS = 730;
export const NOTICE_LEAD_DAYS = 14;

export type ConsentNoticeFields = { marketingConsentAt: Date | null; marketingConsentNoticeAt: Date | null };

export function noticeDue(u: ConsentNoticeFields, now = new Date()) {
  if (!u.marketingConsentAt) return false;
  const base = u.marketingConsentNoticeAt && u.marketingConsentNoticeAt > u.marketingConsentAt ? u.marketingConsentNoticeAt : u.marketingConsentAt;
  return now.getTime() >= base.getTime() + (NOTICE_INTERVAL_DAYS - NOTICE_LEAD_DAYS) * 86400e3;
}

/** 이 날짜 이전에 동의(또는 안내)한 회원이 대상: DB 조회용 */
export const noticeCutoff = (now = new Date()) => new Date(now.getTime() - (NOTICE_INTERVAL_DAYS - NOTICE_LEAD_DAYS) * 86400e3);

const ymdKst = (d: Date) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);

export function noticeMail(consentAt: Date, unsubUrl: string, prefsUrl: string) {
  return {
    subject: "[셀러도어] 마케팅 정보 수신 동의 안내",
    text: [
      `회원님은 ${ymdKst(consentAt)}에 셀러도어의 마케팅 정보(신규 와인·이벤트 소개) 이메일 수신에 동의하셨습니다.`,
      "관련 법에 따라 2년마다 수신 동의 사실을 알려 드립니다. 동의를 유지하시려면 따로 하실 일은 없습니다.",
      "",
      `수신을 원하지 않으시면 여기서 바로 거부할 수 있습니다: ${unsubUrl}`,
      `또는 내 정보 화면에서 설정을 바꿀 수 있습니다: ${prefsUrl}`,
      "",
      "가격 알림·주문 상태 같은 서비스 알림은 이 동의와 상관없이 계속 받습니다.",
      "셀러도어는 와인을 판매하지 않습니다.",
    ].join("\n"),
  };
}
