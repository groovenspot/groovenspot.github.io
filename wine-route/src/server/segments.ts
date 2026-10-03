import { prisma } from "./db";
import { getSegmentConfig } from "./settings";
import { COUNTED_STATUSES, classify, type Segment, type SegmentOrder } from "@/lib/segments";

export const SEGMENT_MAX_USERS = 5000;

/** 회원별 세그먼트 계산 (최근 가입 순, 최대 5,000명) */
export async function segmentRows() {
  const [cfg, users, orders] = await Promise.all([
    getSegmentConfig(),
    prisma.user.findMany({
      select: { id: true, email: true, createdAt: true, marketingConsentAt: true, tasteProfile: { select: { countries: true, types: true, budget: true } } },
      orderBy: { createdAt: "desc" },
      take: SEGMENT_MAX_USERS,
    }),
    prisma.order.findMany({ where: { status: { in: [...COUNTED_STATUSES] } }, select: { userId: true, qty: true, estTotal: true } }),
  ]);
  const byUser = new Map<string, SegmentOrder[]>();
  for (const o of orders) byUser.set(o.userId, [...(byUser.get(o.userId) ?? []), { qty: o.qty, estTotal: o.estTotal }]);
  return { cfg, users, rows: users.map((u) => ({ u, r: classify(byUser.get(u.id) ?? [], cfg) })) };
}

export type SegmentRow = Awaited<ReturnType<typeof segmentRows>>["rows"][number];
export const filterRows = (rows: SegmentRow[], seg?: Segment, consentOnly?: boolean) =>
  rows.filter(({ u, r }) => (!seg || r.segment === seg) && (!consentOnly || u.marketingConsentAt));
