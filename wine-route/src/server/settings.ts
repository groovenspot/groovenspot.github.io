import { prisma } from "./db";
import { parseSegmentConfig } from "@/lib/segments";
import { DEFAULT_COMMUNITY, type CommunityConfig } from "@/lib/community";
import { DEFAULT_TAX, type TaxConfig } from "@/lib/tax";

export async function getTaxConfig(): Promise<TaxConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "tax" } });
  return { ...DEFAULT_TAX, ...((row?.value as Partial<TaxConfig> | null) ?? {}) };
}

export async function saveTaxConfig(cfg: TaxConfig) {
  await prisma.setting.upsert({ where: { key: "tax" }, update: { value: cfg }, create: { key: "tax", value: cfg } });
}

export type FxConfig = {
  source: "investing" | "koreaexim"; // 환율 출처
  fallbackExim: boolean; // investing.com 실패 시 수출입은행으로 보충
  maxJump: number; // 직전 값 대비 이 비율 넘게 변하면 반영하지 않음 (파싱 오류 방지)
};
export const DEFAULT_FX: FxConfig = { source: "investing", fallbackExim: true, maxJump: 0.1 };

export async function getFxConfig(): Promise<FxConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "fx" } });
  return { ...DEFAULT_FX, ...((row?.value as Partial<FxConfig> | null) ?? {}) };
}

export async function saveFxConfig(cfg: FxConfig) {
  await prisma.setting.upsert({ where: { key: "fx" }, update: { value: cfg }, create: { key: "fx", value: cfg } });
}

/** 통화별 가장 최근 환율 (같은 날이면 가장 늦게 받은 값). */
export async function getFx(): Promise<{ rates: Record<string, number>; asOf: Date | null; source: string | null }> {
  const rows = await prisma.$queryRaw<{ currency: string; krw: number; fetchedAt: Date; source: string }[]>`
    SELECT DISTINCT ON (currency) currency, krw, "fetchedAt", source FROM "ExchangeRate" ORDER BY currency, date DESC, "fetchedAt" DESC`;
  const rates: Record<string, number> = { KRW: 1 };
  let asOf: Date | null = null;
  let source: string | null = null;
  for (const r of rows) {
    rates[r.currency] = r.krw;
    if (r.currency === "USD") {
      asOf = r.fetchedAt;
      source = r.source;
    }
  }
  return { rates, asOf, source };
}

export async function getCommunityConfig(): Promise<CommunityConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "community" } });
  const v = (row?.value as Partial<CommunityConfig> | null) ?? {};
  return { ...DEFAULT_COMMUNITY, ...v, points: { ...DEFAULT_COMMUNITY.points, ...(v.points ?? {}) }, costs: { ...DEFAULT_COMMUNITY.costs, ...(v.costs ?? {}) }, stage2: { ...DEFAULT_COMMUNITY.stage2, ...(v.stage2 ?? {}) } };
}

export async function saveCommunityConfig(cfg: CommunityConfig) {
  await prisma.setting.upsert({ where: { key: "community" }, update: { value: cfg }, create: { key: "community", value: cfg } });
}

export async function getSegmentConfig() {
  const row = await prisma.setting.findUnique({ where: { key: "segments" } });
  return parseSegmentConfig((row?.value as Record<string, unknown> | null) ?? null);
}

export async function saveSegmentConfig(cfg: ReturnType<typeof parseSegmentConfig>) {
  await prisma.setting.upsert({ where: { key: "segments" }, update: { value: cfg }, create: { key: "segments", value: cfg } });
}
