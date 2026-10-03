/** 홍보성 발송 규칙 (정보통신망법상 광고성 정보 전송 기준을 따르도록) */
import { adWordsFound } from "./alerts";

/** 제목 앞 (광고) 표기 */
export const adSubject = (title: string) => (title.trim().startsWith("(광고)") ? title.trim() : `(광고) ${title.trim()}`);

/** KST 21시~다음 날 8시는 별도 야간 동의 없이 보내지 않습니다. */
export function inQuietHours(now = new Date()) {
  const h = new Date(now.getTime() + 9 * 3600e3).getUTCHours();
  return h >= 21 || h < 8;
}

/** 본문 하단 고정 문구: 보낸 곳, 수신 거부 방법 */
export const marketingFooter = (appUrl: string) =>
  `\n\n—\n셀러도어 · 이 메일은 마케팅 수신에 동의한 회원에게 보냅니다.\n수신 거부: ${appUrl}/me#preferences 에서 마케팅 수신 동의를 끄면 됩니다.\n셀러도어는 와인을 판매하지 않습니다. 19세 미만 음주 금지.`;

export function campaignProblems(c: { title: string; body: string }) {
  const p: string[] = [];
  if (c.title.trim().length < 2 || c.title.length > 80) p.push("제목은 2~80자로 써 주세요.");
  if (c.body.trim().length < 10 || c.body.length > 3000) p.push("본문은 10~3,000자로 써 주세요.");
  const bad = adWordsFound(`${c.title} ${c.body}`);
  if (bad.length) p.push(`주류 광고 기준상 쓰지 않는 표현: ${bad.join(", ")}`);
  return p;
}
