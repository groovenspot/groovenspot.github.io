/** 병 사진 주소: https 만 (http 판매처 사진은 혼합 콘텐츠로 막히므로 받지 않습니다). 비우면 null. */
export function cleanImageUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let u: URL;
  try { u = new URL(s); } catch { throw new Error("사진 주소가 올바르지 않습니다"); }
  if (u.protocol !== "https:") throw new Error("사진 주소는 https:// 로 시작해야 합니다");
  if (u.href.length > 1000) throw new Error("사진 주소가 너무 깁니다");
  return u.href;
}

/** 사진이 없을 때 자리 표시 색 (종류별) */
export const TYPE_TINT: Record<string, string> = { 레드: "#7b2335", 화이트: "#d8c27a", 스파클링: "#c9b46a", 로제: "#e3a0a6", 디저트: "#b9822f", 주정강화: "#6b3a26" };
