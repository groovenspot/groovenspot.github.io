"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { compareMany, compareWine } from "@/server/compare";
import { getTaxConfig } from "@/server/settings";
import { isPremium } from "@/server/points";
import { fromText, recognize, type Recognized } from "@/server/recognize";
import { confident, matchWines } from "@/lib/match";
import { defaultTarget } from "@/lib/alerts";

export type ScanCandidate = { wineId: string; nameKo: string; name: string; vintage: number | null; score: number; perBottle: number | null; krPrice: number | null; route: string | null };
export type ScanItem = { scanId: string; read: Recognized; confident: boolean; candidates: ScanCandidate[] };
export type ScanState = { error?: string; items?: ScanItem[]; provider?: string };

const MAX = 6 * 1024 * 1024;

async function resolveItems(provider: string, items: Recognized[]): Promise<ScanItem[]> {
  const user = await getUser();
  const { items: all } = await compareMany({}, 1, 750);
  const wines = all.map((x) => x.wine);
  const out: ScanItem[] = [];
  for (const read of items) {
    const ms = matchWines(read.query, wines);
    const conf = confident(ms);
    const log = await prisma.scanLog.create({
      data: { userId: user?.id ?? null, provider, extracted: read, topWineId: ms[0]?.wine.id ?? null, confidence: ms[0]?.score ?? 0 },
    });
    out.push({
      scanId: log.id,
      read,
      confident: conf,
      candidates: ms.map((m) => {
        const c = all.find((x) => x.wine.id === m.wine.id)!;
        return {
          wineId: m.wine.id, nameKo: c.wine.nameKo, name: c.wine.name, vintage: c.wine.vintage, score: Math.round(m.score * 100) / 100,
          perBottle: c.result.best ? Math.round(c.result.best.perBottle) : null, krPrice: c.wine.krPrice, route: c.result.best?.channel ?? null,
        };
      }),
    });
  }
  return out;
}

/** 사진 인식. 사진은 저장하지 않고 인식이 끝나면 버립니다. */
export async function scanPhoto(_: ScanState, fd: FormData): Promise<ScanState> {
  const file = fd.get("photo");
  if (!(file instanceof File) || !file.size) return { error: "사진을 골라 주세요." };
  if (file.size > MAX) return { error: "사진이 너무 큽니다. 6MB 이하로 찍어 주세요." };
  try {
    const { provider, items } = await recognize(new Uint8Array(await file.arrayBuffer()), file.type);
    if (!items.length) return { error: "글자를 읽지 못했습니다. 라벨이 화면에 꽉 차게, 밝은 곳에서 다시 찍어 주세요.", provider };
    return { items: await resolveItems(provider, items), provider };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** 사진 인식이 안 될 때: 라벨 글자를 직접 입력 */
export async function scanText(_: ScanState, fd: FormData): Promise<ScanState> {
  const text = String(fd.get("text") ?? "").trim().slice(0, 300);
  if (text.length < 3) return { error: "라벨에 적힌 생산자나 와인 이름을 입력해 주세요." };
  return { items: await resolveItems("text", [fromText(text)]), provider: "text" };
}

/** 사용자가 고른 와인 기록 (첫 후보 정답률, 틀린 매칭 수정 데이터) */
export async function resolveScan(scanId: string, chosenWineId: string | null) {
  const s = await prisma.scanLog.findUnique({ where: { id: scanId } });
  if (!s || s.resolvedAt) return;
  const user = await getUser();
  if (s.userId !== null && s.userId !== user?.id) return;
  await prisma.scanLog.update({ where: { id: scanId }, data: { chosenWineId, correct: chosenWineId !== null && chosenWineId === s.topWineId, resolvedAt: new Date() } });
}

/** 결과 화면의 찜하기: 목표가는 지금 도착가의 90% */
export async function quickWatch(scanId: string, wineId: string): Promise<{ ok?: boolean; error?: string; login?: boolean }> {
  const user = await getUser();
  if (!user) return { login: true };
  const comparison = await compareWine(wineId, 1, 750);
  if (!comparison) return { error: "와인 정보를 찾을 수 없습니다. 다시 검색해 주세요." };
  const perBottle = comparison.result.best?.perBottle ?? null;
  const exists = await prisma.priceAlert.findUnique({ where: { userId_wineId_qty_bottleMl: { userId: user.id, wineId, qty: 1, bottleMl: 750 } } });
  if (!exists?.active && !isPremium(user)) {
    const { freeAlertLimit } = await getTaxConfig();
    if ((await prisma.priceAlert.count({ where: { userId: user.id, active: true } })) >= freeAlertLimit) {
      if (!user.hitWatchLimitAt) await prisma.user.update({ where: { id: user.id }, data: { hitWatchLimitAt: new Date() } });
      return { error: `무료 회원은 ${freeAlertLimit}개까지 찜할 수 있습니다.` };
    }
  }
  await prisma.priceAlert.upsert({
    where: { userId_wineId_qty_bottleMl: { userId: user.id, wineId, qty: 1, bottleMl: 750 } },
    update: { active: true, ...(exists?.active ? {} : { notifiedPrice: null }) },
    create: { userId: user.id, wineId, qty: 1, bottleMl: 750, targetPerBottle: perBottle ? defaultTarget(perBottle) : 50000, channel: user.phone ? "KAKAO" : "EMAIL", source: "scan" },
  });
  await resolveScan(scanId, wineId);
  revalidatePath("/me");
  return { ok: true };
}

/** 목록에 없는 와인: 구해주세요 (미수입 와인 수요 리스트) */
export async function requestWine(scanId: string | null, text: string) {
  const user = await getUser();
  const name = text.trim().slice(0, 300);
  if (name.length < 3) return { error: "찾는 와인 이름을 3자 이상 입력해 주세요." };
  await resolveScan(scanId ?? "", null).catch(() => {});
  await prisma.wineRequest.create({ data: { userId: user?.id ?? null, text: name, source: scanId ? "scan" : "manual", scanId } });
  return { ok: true };
}
