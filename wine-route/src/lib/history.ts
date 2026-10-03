/** 와인 상세의 도착가 추이: 날짜별 기록을 빈 날 포함 일 단위 칸으로 펼칩니다. */
export type DayPrice = { day: Date; perBottle: number | null };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function fillDays(rows: DayPrice[], days: number, today: Date): { day: string; value: number | null }[] {
  const m = new Map(rows.map((r) => [iso(r.day), r.perBottle]));
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Array.from({ length: days }, (_, i) => {
    const day = iso(new Date(end - (days - 1 - i) * 86400e3));
    return { day, value: m.has(day) ? m.get(day)! : null };
  });
}

export type HistoryStats = { min: number; max: number; minDay: string; first: number; last: number; changePct: number; points: number };

export function historyStats(cells: { day: string; value: number | null }[]): HistoryStats | null {
  const pts = cells.filter((c): c is { day: string; value: number } => c.value !== null);
  if (pts.length < 2) return null;
  let lo = pts[0];
  for (const p of pts) if (p.value < lo.value) lo = p;
  const first = pts[0].value, last = pts[pts.length - 1].value;
  return {
    min: lo.value, max: Math.max(...pts.map((p) => p.value)), minDay: lo.day,
    first, last, changePct: first ? Math.round(((last - first) / first) * 1000) / 10 : 0, points: pts.length,
  };
}
