import { prisma } from "@/server/db";
import { fetchEximRates } from "@/lib/fx";
import { fetchInvestingRates } from "@/lib/investing";
import { collectRates, fetchEcbRates, fetchErApiRates, sourceOrder, type FxFetch, type FxSourceKey } from "@/lib/fxSources";
import { FX_SOURCE_LABEL } from "@/lib/format";
import { refreshQuietly } from "@/server/winePrice";
import { getFx, getFxConfig } from "@/server/settings";

export const FX_CURRENCIES = ["USD", "EUR", "AUD", "NZD", "HKD", "GBP", "CHF", "JPY", "CAD"];

const kstDay = (d = new Date()) => new Date(new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10));

async function save(rates: Record<string, number>, source: string, day: Date) {
  const now = new Date();
  for (const [currency, krw] of Object.entries(rates)) {
    await prisma.exchangeRate.upsert({
      where: { currency_date: { currency, date: day } },
      update: { krw, source, fetchedAt: now },
      create: { currency, krw, date: day, source, fetchedAt: now },
    });
  }
}

async function load(source: FxSourceKey): Promise<FxFetch> {
  if (source === "ecb") return fetchEcbRates();
  if (source === "erapi") return fetchErApiRates();
  if (source === "koreaexim") {
    const key = process.env.KOREAEXIM_API_KEY;
    if (!key) throw new Error("KOREAEXIM_API_KEY 없음");
    const { date, rates } = await fetchEximRates(key);
    return { rates, date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) };
  }
  const { rates, errors } = await fetchInvestingRates(FX_CURRENCIES);
  if (!Object.keys(rates).length) throw new Error(Object.entries(errors).map(([c, m]) => `${c} ${m}`).join("; ") || "응답 없음");
  return { rates, date: kstDay() };
}

/**
 * 설정한 주 출처에서 환율을 받아 바로 반영합니다. '보충'을 켜 두면 못 받은 통화를
 * ECB → ExchangeRate-API → 수출입은행(키가 있으면) 순서로 채우고, 그래도 없으면 직전 값을 유지합니다.
 */
export async function runFxJob() {
  const cfg = await getFxConfig();
  const prev = (await getFx()).rates;
  const { runs, missing } = await collectRates(sourceOrder(cfg.source, cfg.fallback), FX_CURRENCIES, load, prev, cfg.maxJump, (src, rates, day) => save(rates, src, day));
  const saved = runs.flatMap((r) => r.saved);
  const parts = runs.map((r) => {
    const label = FX_SOURCE_LABEL[r.source] ?? r.source;
    if (r.error) return `${label} 실패(${r.error.slice(0, 120)})`;
    const rej = Object.entries(r.rejected).map(([c, m]) => `${c} ${m}`);
    return `${label} ${r.saved.length}개${rej.length ? ` · 급변 제외 ${rej.join(", ")}` : ""}`;
  });
  const msg = `환율 ${saved.length}/${FX_CURRENCIES.length}개 통화 반영: ${parts.join(" → ")}${missing.length ? ` · 못 받은 통화(직전 값 유지) ${missing.join(", ")}` : ""}`;
  if (!saved.length) throw new Error(msg);
  await refreshQuietly();
  return msg;
}
