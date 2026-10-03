/** 취향 설문 (선택). 소득·자산은 묻지 않고 산지·종류·병당 예산 구간만 받습니다. */
export const BUDGET_BANDS = [
  { id: "U50", label: "5만원 미만" },
  { id: "50_100", label: "5만~10만원" },
  { id: "100_200", label: "10만~20만원" },
  { id: "O200", label: "20만원 이상" },
] as const;

export type BudgetId = (typeof BUDGET_BANDS)[number]["id"];
export const BUDGET_LABEL: Record<string, string> = Object.fromEntries(BUDGET_BANDS.map((b) => [b.id, b.label]));

export const TASTE_MAX_ITEMS = 8;
const MAX_LEN = 30;

export type TasteInput = { countries?: string[]; types?: string[]; budget?: string | null };
export type TasteClean = { countries: string[]; types: string[]; budget: BudgetId | null };

const clean = (list: string[] | undefined) => {
  const seen = new Set<string>();
  for (const raw of list ?? []) {
    const v = String(raw).trim().slice(0, MAX_LEN);
    if (v) seen.add(v);
    if (seen.size >= TASTE_MAX_ITEMS) break;
  }
  return [...seen];
};

/** 허용된 값만 남깁니다. allowed가 있으면 목록에 있는 산지·종류만 통과합니다. */
export function parseTaste(input: TasteInput, allowed?: { countries?: string[]; types?: string[] }): TasteClean {
  const keep = (list: string[], ok?: string[]) => (ok ? list.filter((v) => ok.includes(v)) : list);
  const budget = BUDGET_BANDS.find((b) => b.id === input.budget)?.id ?? null;
  return {
    countries: keep(clean(input.countries), allowed?.countries),
    types: keep(clean(input.types), allowed?.types),
    budget,
  };
}

export const isEmptyTaste = (t: TasteClean) => t.countries.length === 0 && t.types.length === 0 && t.budget === null;

/** 예산 구간의 병당 도착가 범위 (원) */
export const BUDGET_RANGE: Record<BudgetId, [number, number]> = {
  U50: [0, 50_000],
  "50_100": [50_000, 100_000],
  "100_200": [100_000, 200_000],
  O200: [200_000, Infinity],
};

/**
 * 취향 점수: 좋아하는 산지 +2, 종류 +2, 병당 도착가가 예산 구간 안 +1.
 * 0이면 취향과 무관. 설문이 비어 있으면 모두 0.
 */
export function tasteScore(w: { country: string; type: string }, perBottle: number | null, t: TasteClean | null) {
  if (!t) return 0;
  let s = 0;
  if (t.countries.includes(w.country)) s += 2;
  if (t.types.includes(w.type)) s += 2;
  if (t.budget && perBottle !== null) {
    const [lo, hi] = BUDGET_RANGE[t.budget];
    if (perBottle >= lo && perBottle < hi) s += 1;
  }
  return s;
}
