import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { memberState } from "@/server/member";
import { ReviewForm } from "@/components/ReviewForm";
import { CommunityNav } from "@/components/CommunityNav";
import { ROUTE_LABEL, ROUTE_ORDER, type ChannelKey } from "@/lib/engine";
import { daysBetween } from "@/lib/community";

export const dynamic = "force-dynamic";
export const metadata = { title: "후기 쓰기" };

export default async function WritePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const here = `/community/write${sp.order ? `?order=${sp.order}` : sp.wine ? `?wine=${sp.wine}` : ""}`;
  const m = await memberState();
  if (m.need === "login") redirect(`/login?next=${encodeURIComponent(here)}`);
  if (!m.ok) redirect(`/verify?next=${encodeURIComponent(here)}`);

  let prefill;
  if (sp.order) {
    const o = await prisma.order.findFirst({
      where: { id: sp.order, userId: m.user!.id },
      include: { wine: true, seller: true, purchase: true, review: true, events: true },
    });
    if (o && !o.review) {
      const start = o.events.find((e) => e.status === "CONFIRMED")?.createdAt ?? o.createdAt;
      const end = o.deliveredAt ?? o.events.find((e) => e.status === "DELIVERED")?.createdAt;
      prefill = {
        orderId: o.id,
        wineLabel: o.wine.nameKo,
        routeLabel: ROUTE_LABEL[o.route as ChannelKey] ?? o.route,
        sellerLabel: o.seller.name,
        qty: o.qty,
        taxPaid: o.purchase?.taxPaid ?? o.actualTax ?? null,
        shippingDays: end ? daysBetween(start, end) : null,
      };
    }
  }
  const [wines, sellers] = await Promise.all([
    prisma.wine.findMany({ select: { id: true, nameKo: true, vintage: true }, orderBy: { nameKo: "asc" } }),
    prisma.seller.findMany({ where: { active: true }, select: { id: true, name: true, country: true }, orderBy: [{ country: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="stack-lg" style={{ maxWidth: 860 }}>
      <section className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 28 }}>직구 후기 쓰기</h1>
        <p className="lede">경로·실제 세금·배송일이 필수입니다. 이 세 가지가 다음 사람의 도착가 계산을 정확하게 만듭니다.</p>
        <CommunityNav current="write" />
      </section>
      <ReviewForm
        prefill={prefill}
        wineId={sp.wine}
        wines={wines.map((w) => ({ id: w.id, label: `${w.nameKo}${w.vintage ? ` ${w.vintage}` : ""}` }))}
        sellers={sellers.map((s) => ({ id: s.id, label: `${s.country} · ${s.name}` }))}
        routes={ROUTE_ORDER.map((r) => ({ id: r, label: ROUTE_LABEL[r] }))}
      />
    </div>
  );
}
