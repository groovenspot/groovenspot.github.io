import type { MetadataRoute } from "next";
import { prisma } from "@/server/db";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 공개 화면만: 정적 안내 화면, 와인 상세, 판매처 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [wines, sellers] = await Promise.all([
    prisma.wine.findMany({ select: { id: true, updatedAt: true } }),
    prisma.seller.findMany({ select: { id: true, updatedAt: true } }),
  ]);
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/calculator`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/consolidate`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/guide`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guide/first`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/community`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/community/board`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/community/ranking`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${base}/community/rules`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/scan`, changeFrequency: "monthly", priority: 0.4 },
  ];
  return [
    ...pages,
    ...wines.map((w) => ({ url: `${base}/wines/${w.id}`, lastModified: w.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...sellers.map((s) => ({ url: `${base}/sellers/${s.id}`, lastModified: s.updatedAt, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
