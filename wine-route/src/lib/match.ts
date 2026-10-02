/**
 * 라벨 글자 → 셀러도어 와인 목록 매칭. OCR 오타에 강하도록 글자 3-gram 유사도를 씁니다.
 */
import { fold } from "./search";

const NOISE = /\b(appellation|controlee|controlee|controlled|origine|protegee|mis en bouteille|au domaine|au chateau|produce of|product of|contains sulfites|alc|vol|ml|cl|wine|vin|vino|wein)\b/gi;

export function normalizeLabel(s: string) {
  return fold(s.replace(NOISE, " ").replace(/\b(19|20)\d{2}\b/g, " "));
}

function grams(s: string) {
  const t = `  ${s} `;
  const m = new Map<string, number>();
  for (let i = 0; i < t.length - 2; i++) {
    const g = t.slice(i, i + 3);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Dice 계수 (0~1) */
export function dice(a: string, b: string) {
  if (!a || !b) return 0;
  const A = grams(a), B = grams(b);
  let inter = 0, na = 0, nb = 0;
  for (const v of A.values()) na += v;
  for (const v of B.values()) nb += v;
  for (const [g, v] of A) inter += Math.min(v, B.get(g) ?? 0);
  return (2 * inter) / (na + nb);
}

/** 후보 쪽 문자열이 질의에 얼마나 들어 있는지 (라벨엔 다른 글자가 많으므로 포함도도 봄) */
function containment(query: string, cand: string) {
  const Q = grams(query), C = grams(cand);
  let inter = 0, nc = 0;
  for (const [g, v] of C) {
    nc += v;
    inter += Math.min(v, Q.get(g) ?? 0);
  }
  return nc ? inter / nc : 0;
}

export type MatchWine = { id: string; name: string; nameKo: string; producer: string; vintage: number | null; aliases: string[] };
export type MatchResult = { wine: MatchWine; score: number };

export function parseVintage(text: string): number | null {
  const ys = [...text.matchAll(/\b(19[5-9]\d|20[0-4]\d)\b/g)].map((m) => Number(m[1]));
  const now = new Date().getFullYear();
  const ok = ys.filter((y) => y <= now);
  return ok.length ? ok[0] : null;
}

/** 사진 속 가격 (원). 가장 그럴듯한 하나: '원'·'₩'·'KRW'가 붙은 값을 우선, 없으면 천 단위 쉼표 숫자 */
export function parsePriceKrw(text: string): number | null {
  const tagged = [...text.matchAll(/(?:₩|KRW)\s*([\d,]{4,})|([\d,]{4,})\s*원/g)].map((m) => Number((m[1] ?? m[2]).replace(/,/g, "")));
  const plain = [...text.matchAll(/\b(\d{1,3}(?:,\d{3})+)\b/g)].map((m) => Number(m[1].replace(/,/g, "")));
  const pick = [...tagged, ...plain].find((v) => v >= 5000 && v <= 50_000_000);
  return pick ?? null;
}

export function matchWines(text: string, wines: MatchWine[], limit = 3): MatchResult[] {
  const q = normalizeLabel(text);
  if (q.length < 3) return [];
  const vintage = parseVintage(text);
  return wines
    .map((w) => {
      const forms = [`${w.producer} ${w.name}`, w.name, w.nameKo, ...w.aliases].map(normalizeLabel).filter(Boolean);
      const base = Math.max(...forms.map((f) => Math.max(dice(q, f), containment(q, f) * 0.9)));
      const v = vintage && w.vintage ? (vintage === w.vintage ? 0.08 : -0.05) : 0;
      return { wine: w, score: Math.max(0, Math.min(1, base + v)) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 첫 후보를 바로 보여줘도 되는가 */
export function confident(r: MatchResult[]) {
  if (!r.length) return false;
  const gap = r.length > 1 ? r[0].score - r[1].score : r[0].score;
  return r[0].score >= 0.55 && gap >= 0.08;
}
