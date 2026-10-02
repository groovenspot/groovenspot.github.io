/** 공유 카드 문구와 추천 보상 규칙 */
import { adWordsFound } from "./alerts";

export type CardData = {
  kind: "wine" | "review" | "month";
  eyebrow: string; // 상단 작은 글씨
  title: string; // 와인 이름 또는 결산 제목
  subtitle: string; // 산지·빈티지
  krLabel: string;
  krValue: number | null; // 국내 추정가
  myLabel: string;
  myValue: number | null; // 직구 도착가
  saving: number | null; // 절약액 (양수면 직구가 쌈)
  routeLine: string; // 최적경로·배송일
  link: string; // 공유자 코드 포함
};

export const CARD_FOOTER = ["19세 미만 음주 금지", "셀러도어는 와인을 판매하지 않습니다. 가격은 계산 시점 추정치입니다."];

/** 카드에 들어갈 모든 문구가 광고 기준을 지키는지 */
export function cardWordingProblems(c: CardData) {
  return adWordsFound([c.eyebrow, c.title, c.subtitle, c.krLabel, c.myLabel, c.routeLine, ...CARD_FOOTER].join(" "));
}

/** 공유자 코드 (영문 대문자·숫자 6자, 헷갈리는 글자 제외) */
export function makeRefCode(rand: () => number = Math.random) {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => a[Math.floor(rand() * a.length)]).join("");
}

/** 가입 3명마다 프리미엄 1개월: 이번 가입으로 새로 도달한 구간 */
export const REFERRAL_STEP = 3;
export const referralMilestone = (signups: number) => (signups > 0 && signups % REFERRAL_STEP === 0 ? signups / REFERRAL_STEP : null);
