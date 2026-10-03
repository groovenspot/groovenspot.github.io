/**
 * 쿠키에 담는 와인 id 목록 (비교함, 최근 본 와인).
 * 회원 데이터가 아니라 이 브라우저에만 남는 편의 기능이라 DB에 쓰지 않습니다.
 */
export const COMPARE_COOKIE = "wr_cmp";
export const RECENT_COOKIE = "wr_recent";
export const COMPARE_MAX = 3;
export const RECENT_MAX = 8;

const ID = /^[a-z0-9_-]{1,40}$/i;

export function parseIds(raw: string | null | undefined, max: number): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const s of raw.split(",")) {
    const id = s.trim();
    if (ID.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

/** 비교함: 뒤에 붙이고, 가득 차면 가장 먼저 담은 것을 뺍니다. */
export function addCompare(list: string[], id: string, max = COMPARE_MAX): string[] {
  if (!ID.test(id)) return list;
  const next = [...list.filter((x) => x !== id), id];
  return next.slice(-max);
}

/** 최근 본 와인: 방금 본 것을 맨 앞으로. */
export function pushRecent(list: string[], id: string, max = RECENT_MAX): string[] {
  if (!ID.test(id)) return list;
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

export const removeId = (list: string[], id: string) => list.filter((x) => x !== id);

/** 조회한 순서를 지켜 DB 결과를 다시 줄 세웁니다 (없어진 와인은 빠짐). */
export function inOrder<T extends { id: string }>(ids: string[], rows: T[]): T[] {
  const m = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => m.get(id)).filter((r): r is T => !!r);
}
