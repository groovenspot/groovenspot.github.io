/**
 * 비슷한 와인: 같은 종류 중에서 산지가 같으면 3점, 품종이 같으면 2점, 나라가 같으면 1점.
 * 점수가 같으면 도착가가 싼 순. 살 수 있는 경로가 없는 와인은 뺍니다.
 */
type W = { id: string; type: string; region: string; grape: string; country: string };

export function similarityScore(base: W, w: W) {
  if (w.id === base.id || w.type !== base.type) return 0;
  const grape = (s: string) => s.trim().toLowerCase();
  return (w.region === base.region ? 3 : 0) + (grape(base.grape) && grape(w.grape) === grape(base.grape) ? 2 : 0) + (w.country === base.country ? 1 : 0);
}

export function rankSimilar<T extends { wine: W; perBottle: number | null }>(base: W, items: T[], limit = 4): (T & { score: number })[] {
  return items
    .map((it) => ({ ...it, score: similarityScore(base, it.wine) }))
    .filter((it) => it.score > 0 && it.perBottle !== null)
    .sort((a, b) => b.score - a.score || a.perBottle! - b.perBottle!)
    .slice(0, limit);
}
