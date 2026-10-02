/** 알림 규칙 (순수 함수) */

export const DROP_RATIO = 0.05;

/** 직전 대비 5% 이상 하락 */
export function isDrop(prev: number | null | undefined, now: number | null | undefined, ratio = DROP_RATIO) {
  return !!prev && !!now && (prev - now) / prev >= ratio;
}

/** 살 수 있는 경로가 없다가 생김 */
export const isRestock = (prevAvailable: boolean | null | undefined, nowAvailable: boolean) => prevAvailable === false && nowAvailable;

/** 찜 기본 목표가: 현재 도착가의 90%, 천 원 단위 내림 */
export const defaultTarget = (perBottle: number) => Math.max(1000, Math.floor((perBottle * 0.9) / 1000) * 1000);

/** 오늘 환율이 최근 30일(오늘 제외) 최저 이하인가. 비교할 날이 20일 미만이면 판단하지 않음 */
export function isFxLow(history: { day: Date; krw: number }[], today: { day: Date; krw: number }, minDays = 20) {
  const from = today.day.getTime() - 30 * 86400e3;
  const prev = history.filter((h) => h.day.getTime() < today.day.getTime() && h.day.getTime() >= from);
  if (prev.length < minDays) return false;
  return today.krw <= Math.min(...prev.map((h) => h.krw));
}

/** KST 기준 주 시작(월요일) 날짜 문자열 — 주간 묶음 중복 방지 키 */
export function weekKey(d = new Date()) {
  const k = new Date(d.getTime() + 9 * 3600e3);
  const dow = (k.getUTCDay() + 6) % 7;
  const mon = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - dow));
  return mon.toISOString().slice(0, 10);
}

/** 주류 광고 기준상 알림·공유 카드에 쓰지 않는 표현 */
export const AD_BANNED = ["최저가", "최저 가격", "할인", "폭탄", "특가", "땡처리", "파격", "세일", "떨이"];
export const adWordsFound = (text: string) => AD_BANNED.filter((w) => text.includes(w));

/** 30일 가격 선 (SVG path). null은 끊어서 그립니다. */
export function sparkPath(values: (number | null)[], w: number, h: number, pad = 2) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return "";
  const min = Math.min(...nums), max = Math.max(...nums);
  const span = max - min || 1;
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) return void (pen = false);
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    d += `${pen ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    pen = true;
  });
  return d;
}
