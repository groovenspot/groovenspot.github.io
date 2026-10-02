/**
 * investing.com 통화쌍 페이지(예: /currencies/usd-krw)에서 현재가를 읽습니다.
 * 공식 API가 없어 페이지 HTML을 파싱하므로, 사이트 구조가 바뀌면 파서를 고쳐야 합니다.
 */
export const INVESTING_BASE = "https://www.investing.com/currencies";

/** 통화 → investing.com 페이지 경로와 1단위 환산 배수 */
export const INVESTING_PAIRS: Record<string, { slug: string; per: number }> = {
  USD: { slug: "usd-krw", per: 1 },
  EUR: { slug: "eur-krw", per: 1 },
  AUD: { slug: "aud-krw", per: 1 },
  NZD: { slug: "nzd-krw", per: 1 },
  HKD: { slug: "hkd-krw", per: 1 },
  GBP: { slug: "gbp-krw", per: 1 },
  CHF: { slug: "chf-krw", per: 1 },
  CAD: { slug: "cad-krw", per: 1 },
  JPY: { slug: "jpy-krw", per: 1 },
};

const toNum = (s: string) => Number(s.replace(/,/g, ""));

/** 여러 방식으로 현재가를 찾습니다. 못 찾으면 null. */
export function parseInvestingPrice(html: string): number | null {
  const candidates: (string | undefined)[] = [
    // 1) 현재 화면: <div data-test="instrument-price-last">1,390.50</div>
    html.match(/data-test=["']instrument-price-last["'][^>]*>\s*([\d,]+(?:\.\d+)?)\s*</)?.[1],
    // 2) Next.js 초기 데이터 안의 instrument.price.last
    html.match(/"price"\s*:\s*\{[^{}]*?"last"\s*:\s*"?([\d.]+)"?/)?.[1],
    // 3) 예전 화면: <span id="last_last">1,390.50</span>
    html.match(/id=["']last_last["'][^>]*>\s*([\d,]+(?:\.\d+)?)\s*</)?.[1],
  ];
  for (const c of candidates) {
    if (!c) continue;
    const v = toNum(c);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
};

export type InvestingResult = { rates: Record<string, number>; errors: Record<string, string> };

export async function fetchInvestingRates(currencies: string[], fetchFn: typeof fetch = fetch, delayMs = 800): Promise<InvestingResult> {
  const rates: Record<string, number> = {};
  const errors: Record<string, string> = {};
  for (const [i, cur] of currencies.entries()) {
    const pair = INVESTING_PAIRS[cur];
    if (!pair) {
      errors[cur] = "지원하지 않는 통화";
      continue;
    }
    try {
      const res = await fetchFn(`${INVESTING_BASE}/${pair.slug}`, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 403 ? " (봇 차단)" : ""}`);
      const v = parseInvestingPrice(await res.text());
      if (v === null) throw new Error("페이지에서 현재가를 찾지 못했습니다 (사이트 구조 변경 가능성)");
      rates[cur] = v / pair.per;
    } catch (e) {
      errors[cur] = (e as Error).message;
    }
    if (delayMs && i < currencies.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return { rates, errors };
}

/** 직전 값 대비 급변(파싱 오류 의심)을 걸러냅니다. */
export function rejectJumps(next: Record<string, number>, prev: Record<string, number>, maxJump: number) {
  const ok: Record<string, number> = {};
  const rejected: Record<string, string> = {};
  for (const [cur, v] of Object.entries(next)) {
    const p = prev[cur];
    if (p && Math.abs(v - p) / p > maxJump) rejected[cur] = `직전 ${p} 대비 ${(((v - p) / p) * 100).toFixed(1)}% 변동이라 반영하지 않았습니다`;
    else ok[cur] = v;
  }
  return { ok, rejected };
}
