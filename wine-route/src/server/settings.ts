import { prisma } from "./db";
import { DEFAULT_TAX, type TaxConfig } from "@/lib/tax";

export async function getTaxConfig(): Promise<TaxConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "tax" } });
  return { ...DEFAULT_TAX, ...((row?.value as Partial<TaxConfig> | null) ?? {}) };
}

export async function saveTaxConfig(cfg: TaxConfig) {
  await prisma.setting.upsert({ where: { key: "tax" }, update: { value: cfg }, create: { key: "tax", value: cfg } });
}

/** 통화별 가장 최근 환율. */
export async function getFx(): Promise<{ rates: Record<string, number>; asOf: Date | null }> {
  const rows = await prisma.$queryRaw<{ currency: string; krw: number; date: Date }[]>`
    SELECT DISTINCT ON (currency) currency, krw, date FROM "ExchangeRate" ORDER BY currency, date DESC`;
  const rates: Record<string, number> = { KRW: 1 };
  let asOf: Date | null = null;
  for (const r of rows) {
    rates[r.currency] = r.krw;
    if (r.currency === "USD") asOf = r.date;
  }
  return { rates, asOf };
}
