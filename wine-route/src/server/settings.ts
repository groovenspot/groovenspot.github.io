import { FX_SOURCES, type FxSourceKey } from "@/lib/fxSources";
import { prisma } from "./db";
import { parseSegmentConfig } from "@/lib/segments";
import { BOARD_MODES, DEFAULT_COMMUNITY, type BoardMode, type CommunityConfig } from "@/lib/community";
import { DEFAULT_TAX, type TaxConfig } from "@/lib/tax";

export async function getTaxConfig(): Promise<TaxConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "tax" } });
  return { ...DEFAULT_TAX, ...((row?.value as Partial<TaxConfig> | null) ?? {}) };
}

export async function saveTaxConfig(cfg: TaxConfig) {
  await prisma.setting.upsert({ where: { key: "tax" }, update: { value: cfg }, create: { key: "tax", value: cfg } });
}

export type FxConfig = {
  source: FxSourceKey; // 주 환율 출처
  fallback: boolean; // 주 출처가 못 준 통화를 다른 출처로 보충
  maxJump: number; // 직전 값 대비 이 비율 넘게 변하면 반영하지 않음 (파싱 오류 방지)
};
// investing.com 은 서버 요청을 봇으로 막는 일이 잦아(403) 공식 공개 자료인 ECB 기준환율을 기본으로 씁니다.
export const DEFAULT_FX: FxConfig = { source: "ecb", fallback: true, maxJump: 0.1 };

export async function getFxConfig(): Promise<FxConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "fx" } });
  const v = (row?.value as (Partial<FxConfig> & { fallbackExim?: boolean }) | null) ?? {};
  return {
    source: FX_SOURCES.includes(v.source as FxSourceKey) ? (v.source as FxSourceKey) : DEFAULT_FX.source,
    fallback: v.fallback ?? v.fallbackExim ?? DEFAULT_FX.fallback, // 예전 설정(fallbackExim)도 읽습니다
    maxJump: typeof v.maxJump === "number" ? v.maxJump : DEFAULT_FX.maxJump,
  };
}

export async function saveFxConfig(cfg: FxConfig) {
  await prisma.setting.upsert({ where: { key: "fx" }, update: { value: cfg }, create: { key: "fx", value: cfg } });
}

/** 통화별 가장 최근 환율 (같은 날이면 가장 늦게 받은 값). */
export async function getFx(): Promise<{ rates: Record<string, number>; asOf: Date | null; source: string | null }> {
  const rows = await prisma.$queryRaw<{ currency: string; krw: number; fetchedAt: Date; source: string }[]>`
    SELECT DISTINCT ON (currency) currency, krw, "fetchedAt", source FROM "ExchangeRate" ORDER BY currency, "fetchedAt" DESC, date DESC`; // 출처마다 기준일 표기가 달라(ECB는 전 영업일) 가장 최근에 받은 값을 씁니다
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
  return { ...DEFAULT_COMMUNITY, ...v, points: { ...DEFAULT_COMMUNITY.points, ...(v.points ?? {}) }, costs: { ...DEFAULT_COMMUNITY.costs, ...(v.costs ?? {}) }, stage2: { ...DEFAULT_COMMUNITY.stage2, ...(v.stage2 ?? {}) }, boardMode: BOARD_MODES.includes(v.boardMode as BoardMode) ? (v.boardMode as BoardMode) : DEFAULT_COMMUNITY.boardMode };
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
