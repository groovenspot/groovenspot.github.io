import { prisma } from "@/server/db";
import { fetchEximRates } from "@/lib/fx";
import { fetchInvestingRates, rejectJumps } from "@/lib/investing";
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

async function fromInvesting(maxJump: number) {
  const { rates, errors } = await fetchInvestingRates(FX_CURRENCIES);
  const prev = (await getFx()).rates;
  const { ok, rejected } = rejectJumps(rates, prev, maxJump);
  await save(ok, "investing", kstDay());
  const fails = { ...errors, ...rejected };
  const n = Object.keys(ok).length;
  if (!n) throw new Error(`investing.com에서 환율을 받지 못했습니다: ${Object.entries(fails).map(([c, m]) => `${c} ${m}`).join("; ")}`);
  return { n, fails };
}

async function fromExim() {
  const key = process.env.KOREAEXIM_API_KEY;
  if (!key) throw new Error("KOREAEXIM_API_KEY가 없습니다");
  const { date, rates } = await fetchEximRates(key);
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const picked = Object.fromEntries(FX_CURRENCIES.filter((c) => rates[c]).map((c) => [c, rates[c]]));
  await save(picked, "koreaexim", day);
  return Object.keys(picked).length;
}

/**
 * 설정한 출처에서 환율을 받아 바로 반영합니다.
 * investing.com이 실패한 통화는 수출입은행(키가 있으면)으로 채우고, 그것도 안 되면 직전 값을 유지합니다.
 */
export async function runFxJob() {
  const cfg = await getFxConfig();
  if (cfg.source === "koreaexim") return `수출입은행 환율 ${await fromExim()}개 통화 갱신`;

  let msg: string;
  try {
    const { n, fails } = await fromInvesting(cfg.maxJump);
    msg = `investing.com 환율 ${n}개 통화 반영`;
    const failed = Object.keys(fails);
    if (failed.length) {
      msg += ` · 실패 ${failed.map((c) => `${c}(${fails[c]})`).join(", ")}`;
      if (cfg.fallbackExim && process.env.KOREAEXIM_API_KEY) {
        const { rates, date } = await fetchEximRates(process.env.KOREAEXIM_API_KEY);
        const fill = Object.fromEntries(failed.filter((c) => rates[c]).map((c) => [c, rates[c]]));
        await save(fill, "koreaexim", new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())));
        if (Object.keys(fill).length) msg += ` → 수출입은행으로 ${Object.keys(fill).join(", ")} 보충`;
      }
    }
    return msg;
  } catch (e) {
    if (cfg.fallbackExim && process.env.KOREAEXIM_API_KEY) {
      const n = await fromExim();
      return `${(e as Error).message} → 수출입은행 환율 ${n}개 통화로 대체`;
    }
    throw e;
  }
}
