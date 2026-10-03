import Link from "next/link";
import { prisma } from "@/server/db";
import { adminMoveOrder } from "@/app/admin/actions";
import { ORDER_FLOW, ORDER_LABEL, type OrderStatusKey } from "@/lib/order";
import { won, ymdhm } from "@/lib/format";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = sp.status as OrderStatusKey | undefined;
  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: status ? { status } : {},
      include: { user: true, wine: true, seller: true, events: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const all: OrderStatusKey[] = [...ORDER_FLOW, "CANCELLED"];
  return (
    <div className="stack-lg">
      <h1 style={{ fontSize: 28 }}>주문 진행</h1>
      <p className="small muted">손님이 판매처 결제 화면으로 넘어간 주문입니다. 판매처 포스트백이 오면 상태가 자동으로 바뀌고, 포스트백이 없는 판매처는 여기서 직접 바꿀 수 있습니다. 판매처·관리자가 바꾸면 손님에게 알림이 갑니다.</p>
      <nav className="seg" aria-label="상태">
        <Link href="/admin/orders" aria-current={!status ? "true" : undefined}>전체 {counts.reduce((a, c) => a + c._count, 0)}</Link>
        {all.map((s) => <Link key={s} href={`/admin/orders?status=${s}`} aria-current={status === s ? "true" : undefined}>{ORDER_LABEL[s]} {n(s)}</Link>)}
      </nav>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>최근 변경</th><th>손님</th><th>와인 · 판매처</th><th className="r">예상 도착가</th><th>상태</th><th>상태 변경</th></tr></thead>
          <tbody>
            {orders.length ? orders.map((o) => (
              <tr key={o.id}>
                <td className="num small">{ymdhm(o.updatedAt)}<div className="muted">{o.events[0]?.by === "seller" ? "판매처" : o.events[0]?.by === "customer" ? "손님" : o.events[0]?.by === "admin" ? "관리자" : "시스템"}</div></td>
                <td className="small">{o.user.email}</td>
                <td><Link href={`/admin/wines/${o.wineId}`}>{o.wine.nameKo}</Link><div className="small muted">{o.seller.name} · {o.qty}병{o.orderRef ? ` · #${o.orderRef}` : ""}{o.trackingNo ? ` · 운송장 ${o.trackingNo}` : ""}</div></td>
                <td className="r">{won(o.estTotal)}</td>
                <td><span className={`chip ${o.status === "CANCELLED" ? "bad" : o.status === "DELIVERED" ? "ok" : "best"}`}>{ORDER_LABEL[o.status]}</span></td>
                <td>
                  {o.status !== "DELIVERED" && o.status !== "CANCELLED" && (
                    <form key={`${o.id}-${o.status}-${o.trackingNo}`} action={adminMoveOrder} className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                      <input type="hidden" name="id" value={o.id} />
                      <select name="to" defaultValue={ORDER_FLOW[ORDER_FLOW.indexOf(o.status) + 1]} aria-label="새 상태" style={{ width: 110 }}>
                        {all.filter((s) => s === "CANCELLED" || ORDER_FLOW.indexOf(s) > ORDER_FLOW.indexOf(o.status)).map((s) => <option key={s} value={s}>{ORDER_LABEL[s]}</option>)}
                      </select>
                      <input name="trackingNo" placeholder="운송장" defaultValue={o.trackingNo ?? ""} style={{ width: 120 }} aria-label="운송장 번호" />
                      <button className="btn ghost small">변경</button>
                    </form>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan={6} className="muted">주문이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
