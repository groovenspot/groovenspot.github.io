/**
 * 키 없이 받는 환율 출처와, 여러 출처를 차례로 써서 필요한 통화를 채우는 순서 처리.
 * - ECB: 유럽중앙은행 기준환율 (영업일 하루 한 번, 16:00 CET 무렵). 공식 공개 자료, 출처 표시 조건으로 재사용 가능.
 * - ExchangeRate-API (open.er-api.com): 무료 공개 엔드포인트, 하루 한 번 갱신. 출처 표시 필요.
 * 값은 모두 '외화 1단위당 원'으로 바꿔 돌려줍니다.
 */
export const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
export const ERAPI_URL = "https://open.er-api.com/v6/latest/USD";

export type FxFetch = { rates: Record<string, number>; date: Date };

const utcDay = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

/** ECB XML: EUR 1 = rate 외화. 원화 환율 = KRW 값 / 그 통화 값 */
export function parseEcb(xml: string): FxFetch | null {
  const time = xml.match(/<Cube\s+time=['"](\d{4})-(\d{2})-(\d{2})['"]/);
  const per: Record<string, number> = { EUR: 1 };
  for (const m of xml.matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) {
    const v = Number(m[2]);
    if (Number.isFinite(v) && v > 0) per[m[1]] = v;
  }
  if (!time || !per.KRW) return null;
  const rates: Record<string, number> = {};
  for (const [cur, v] of Object.entries(per)) if (cur !== "KRW") rates[cur] = Math.round((per.KRW / v) * 10000) / 10000;
  return { rates, date: utcDay(+time[1], +time[2], +time[3]) };
}

/** open.er-api.com: USD 기준 rates. 원화 환율 = KRW / 그 통화 */
export function parseErApi(j: unknown): FxFetch | null {
  const o = j as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
  if (o?.result !== "success" || !o.rates?.KRW) return null;
  const rates: Record<string, number> = {};
  for (const [cur, v] of Object.entries(o.rates)) if (cur !== "KRW" && Number.isFinite(v) && v > 0) rates[cur] = Math.round((o.rates.KRW / v) * 10000) / 10000;
  const t = new Date(((o.time_last_update_unix ?? Date.now() / 1000) * 1000) + 9 * 3600e3); // KST 날짜
  return { rates, date: utcDay(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()) };
}

export async function fetchEcbRates(fetchFn: typeof fetch = fetch): Promise<FxFetch> {
  const res = await fetchFn(ECB_URL, { signal: AbortSignal.timeout(10000), headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`ECB HTTP ${res.status}`);
  const r = parseEcb(await res.text());
  if (!r) throw new Error("ECB 응답 형식이 바뀌었습니다");
  return r;
}

export async function fetchErApiRates(fetchFn: typeof fetch = fetch): Promise<FxFetch> {
  const res = await fetchFn(ERAPI_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ExchangeRate-API HTTP ${res.status}`);
  const r = parseErApi(await res.json());
  if (!r) throw new Error("ExchangeRate-API 응답 형식이 바뀌었습니다");
  return r;
}

export type FxSourceKey = "ecb" | "erapi" | "investing" | "koreaexim";
export const FX_SOURCES: FxSourceKey[] = ["ecb", "erapi", "investing", "koreaexim"];
/** 주 출처가 못 채운 통화를 채우는 순서. investing.com 은 봇 차단이 잦아 주 출처로 고른 때만 씁니다. */
export const FALLBACK_ORDER: FxSourceKey[] = ["ecb", "erapi", "koreaexim"];

export function sourceOrder(primary: FxSourceKey, fallback: boolean): FxSourceKey[] {
  return fallback ? [primary, ...FALLBACK_ORDER.filter((s) => s !== primary)] : [primary];
}

export type SourceRun = { source: FxSourceKey; saved: string[]; error?: string; rejected: Record<string, string> };

/**
 * 출처를 차례로 불러 아직 못 받은 통화만 채웁니다. 직전 값보다 급변한 값은 버립니다(파싱 오류 방지).
 * save 는 출처별로 받은 값을 저장하는 콜백입니다.
 */
export async function collectRates(
  order: FxSourceKey[],
  wanted: string[],
  load: (s: FxSourceKey) => Promise<FxFetch>,
  prev: Record<string, number>,
  maxJump: number,
  save: (s: FxSourceKey, rates: Record<string, number>, date: Date) => Promise<void>,
): Promise<{ runs: SourceRun[]; missing: string[] }> {
  let missing = [...wanted];
  const runs: SourceRun[] = [];
  for (const source of order) {
    if (!missing.length) break;
    let got: FxFetch;
    try {
      got = await load(source);
    } catch (e) {
      runs.push({ source, saved: [], error: (e as Error).message, rejected: {} });
      continue;
    }
    const picked: Record<string, number> = {};
    const rejected: Record<string, string> = {};
    for (const cur of missing) {
      const v = got.rates[cur];
      if (!v) continue;
      const p = prev[cur];
      if (p && Math.abs(v - p) / p > maxJump) rejected[cur] = `직전 ${p} 대비 ${(((v - p) / p) * 100).toFixed(1)}% 변동`;
      else picked[cur] = v;
    }
    if (Object.keys(picked).length) await save(source, picked, got.date);
    runs.push({ source, saved: Object.keys(picked), rejected });
    missing = missing.filter((c) => !(c in picked));
  }
  return { runs, missing };
}
