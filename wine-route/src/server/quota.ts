import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./db";
import { decideScan, scanLimits, type ScanDecision } from "@/lib/quota";

/** 접속지(IP) 해시. 원래 주소는 저장하지 않습니다. 프록시 뒤에서는 첫 번째 X-Forwarded-For 를 씁니다. */
export async function clientIpHash() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  return createHash("sha256").update(`${process.env.SESSION_SECRET ?? "dev-secret"}:ip:${ip}`).digest("hex").slice(0, 32);
}

/** 한도를 확인하고, 통과하면 사용 1회를 기록합니다 (인식 결과와 상관없이 API 호출 1회로 셈). */
export async function takeScanQuota(userId: string | null): Promise<ScanDecision> {
  const ipHash = await clientIpHash();
  const now = Date.now();
  const day = new Date(now - 86400e3), minute = new Date(now - 60e3);
  const [userDay, ipDay, ipMinute, globalDay] = await Promise.all([
    userId ? prisma.scanQuota.count({ where: { userId, createdAt: { gt: day } } }) : Promise.resolve(0),
    prisma.scanQuota.count({ where: { ipHash, createdAt: { gt: day } } }),
    prisma.scanQuota.count({ where: { ipHash, createdAt: { gt: minute } } }),
    prisma.scanQuota.count({ where: { createdAt: { gt: day } } }),
  ]);
  const d = decideScan({ member: !!userId, userDay, ipDay, ipMinute, globalDay }, scanLimits());
  if (d.ok) await prisma.scanQuota.create({ data: { userId, ipHash } });
  return d;
}
