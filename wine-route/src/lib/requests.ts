/** 구해주세요 요청 묶기: 비슷한 표기(오타·대소문자·빈티지 차이)를 한 와인으로 모아 우선순위를 냅니다. */
import { dice, normalizeLabel, parseVintage } from "./match";

export type RequestRow = { id: string; text: string; userId: string | null; source: string; status: string; createdAt: Date };
export type RequestGroup = {
  key: string;
  label: string; // 가장 많이 쓰인 표기
  ids: string[];
  count: number;
  people: number; // 서로 다른 요청자 수 (비회원은 요청마다 1명으로 셈)
  fromScan: number;
  vintages: number[];
  open: number;
  latest: Date;
  score: number; // 우선순위 점수
};

export const SIMILAR = 0.72;

export function groupRequests(rows: RequestRow[], now = new Date()): RequestGroup[] {
  const groups: { norm: string; rows: RequestRow[] }[] = [];
  for (const r of rows) {
    const n = normalizeLabel(r.text);
    if (!n) continue;
    let g = groups.find((x) => x.norm === n || dice(x.norm, n) >= SIMILAR);
    if (!g) groups.push((g = { norm: n, rows: [] }));
    g.rows.push(r);
  }
  return groups
    .map((g) => {
      const texts = new Map<string, number>();
      for (const r of g.rows) texts.set(r.text.trim(), (texts.get(r.text.trim()) ?? 0) + 1);
      const label = [...texts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];
      const people = new Set(g.rows.map((r) => r.userId ?? `anon:${r.id}`)).size;
      const latest = new Date(Math.max(...g.rows.map((r) => r.createdAt.getTime())));
      const recent = g.rows.filter((r) => now.getTime() - r.createdAt.getTime() <= 30 * 86400e3).length;
      const vintages = [...new Set(g.rows.map((r) => parseVintage(r.text)).filter((v): v is number => v !== null))].sort();
      return {
        key: g.norm,
        label,
        ids: g.rows.map((r) => r.id),
        count: g.rows.length,
        people,
        fromScan: g.rows.filter((r) => r.source === "scan").length,
        vintages,
        open: g.rows.filter((r) => r.status === "open").length,
        latest,
        // 요청자 수가 가장 중요하고, 최근 30일 요청에 가중치
        score: people * 2 + recent,
      };
    })
    .sort((a, b) => b.score - a.score || b.latest.getTime() - a.latest.getTime());
}
