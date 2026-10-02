import { prisma } from "@/server/db";
import { fetchEximRates } from "@/lib/fx";

const WANT = ["USD", "EUR", "AUD", "NZD", "HKD", "GBP", "CHF", "JPY", "CAD"];

export async function runFxJob() {
  const key = process.env.KOREAEXIM_API_KEY;
  if (!key) throw new Error("KOREAEXIM_API_KEY가 없습니다");
  const { date, rates } = await fetchEximRates(key);
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  let n = 0;
  for (const cur of WANT) {
    const krw = rates[cur];
    if (!krw) continue;
    await prisma.exchangeRate.upsert({
      where: { currency_date: { currency: cur, date: day } },
      update: { krw, source: "koreaexim" },
      create: { currency: cur, krw, date: day, source: "koreaexim" },
    });
    n++;
  }
  return `${day.toISOString().slice(0, 10)} 환율 ${n}개 통화 갱신`;
}
