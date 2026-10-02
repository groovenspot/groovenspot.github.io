/** 한국수출입은행 현재환율 API (data=AP01). 매매기준율(deal_bas_r)을 씁니다. */
export type EximRow = { result: number; cur_unit: string; deal_bas_r: string };

export function parseExim(rows: EximRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r.result !== 1 || !r.cur_unit || !r.deal_bas_r) continue;
    const m = r.cur_unit.match(/^([A-Z]{3})(?:\((\d+)\))?$/);
    if (!m) continue;
    const per = m[2] ? Number(m[2]) : 1;
    const v = Number(r.deal_bas_r.replace(/,/g, ""));
    if (Number.isFinite(v) && v > 0) out[m[1]] = v / per;
  }
  return out;
}

export function yyyymmdd(d: Date) {
  const k = new Date(d.getTime() + 9 * 3600 * 1000); // KST
  return k.toISOString().slice(0, 10).replace(/-/g, "");
}

/** 주말·공휴일엔 빈 배열이 오므로 최대 7일 전까지 거슬러 올라갑니다. */
export async function fetchEximRates(apiKey: string, now = new Date(), fetchFn: typeof fetch = fetch) {
  for (let back = 0; back < 7; back++) {
    const d = new Date(now.getTime() - back * 86400000);
    const url = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${encodeURIComponent(apiKey)}&searchdate=${yyyymmdd(d)}&data=AP01`;
    const res = await fetchFn(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`수출입은행 API 응답 ${res.status}`);
    const rows = (await res.json()) as EximRow[];
    if (Array.isArray(rows) && rows.length) {
      if (rows[0].result !== 1) throw new Error(`수출입은행 API 오류 코드 ${rows[0].result}`);
      return { date: d, rates: parseExim(rows) };
    }
  }
  throw new Error("최근 7일간 환율 데이터가 없습니다");
}
