import Link from "next/link";
import { prisma } from "@/server/db";
import { saveForwarder } from "@/app/admin/actions";
import { money } from "@/lib/format";
import type { Forwarder } from "@prisma/client";

function ForwarderRow({ f }: { f?: Forwarder }) {
  return (
    <form action={saveForwarder} className="row" style={{ flexWrap: "wrap", padding: "8px 12px", borderBottom: "1px solid var(--line)" }}>
      {f && <input type="hidden" name="id" value={f.id} />}
      <input name="name" defaultValue={f?.name} placeholder="이름" required style={{ width: 180 }} aria-label="이름" />
      <input name="country" defaultValue={f?.country} placeholder="국가" required style={{ width: 90 }} aria-label="국가" />
      <input name="website" defaultValue={f?.website} placeholder="웹사이트" style={{ width: 160 }} aria-label="웹사이트" />
      <input name="currency" defaultValue={f?.currency ?? "EUR"} maxLength={3} style={{ width: 64 }} aria-label="통화" />
      <input name="shipBase" type="number" step="0.01" defaultValue={f?.shipBase} placeholder="기본료" style={{ width: 80 }} aria-label="기본료" />
      <input name="shipPerBottle" type="number" step="0.01" defaultValue={f?.shipPerBottle} placeholder="병당" style={{ width: 80 }} aria-label="병당 요금" />
      <input name="daysMin" type="number" defaultValue={f?.daysMin ?? 10} style={{ width: 60 }} aria-label="최소 일수" />
      <input name="daysMax" type="number" defaultValue={f?.daysMax ?? 20} style={{ width: 60 }} aria-label="최대 일수" />
      <input name="handlingPerPackage" type="number" step="0.01" min={0} defaultValue={f?.handlingPerPackage ?? 0} title="입고 소포당 처리비" style={{ width: 80 }} aria-label="소포당 처리비" />
      <input name="consolidateFee" type="number" step="0.01" min={0} defaultValue={f?.consolidateFee ?? 0} title="합포장 수수료 (상자당, 소포 2개 이상)" style={{ width: 80 }} aria-label="합포장 수수료" />
      <input name="maxBottles" type="number" min={1} max={60} defaultValue={f?.maxBottles ?? 12} title="한 상자 최대 병 수" style={{ width: 60 }} aria-label="상자당 최대 병" />
      <label className="check small"><input type="checkbox" name="acceptsAlcohol" defaultChecked={f?.acceptsAlcohol} />주류 접수</label>
      <label className="check small"><input type="checkbox" name="active" defaultChecked={f?.active ?? true} />사용</label>
      <button className="btn ghost small">{f ? "저장" : "추가"}</button>
    </form>
  );
}

export default async function AdminSellers() {
  const [sellers, forwarders] = await Promise.all([
    prisma.seller.findMany({ include: { _count: { select: { offers: true, reviews: true } } }, orderBy: [{ country: "asc" }, { name: "asc" }] }),
    prisma.forwarder.findMany({ orderBy: { country: "asc" } }),
  ]);
  return (
    <div className="stack-lg">
      <section className="stack">
        <div className="row between">
          <h1 style={{ fontSize: 28 }}>셀러 {sellers.length}곳</h1>
          <Link className="btn" href="/admin/sellers/new">셀러 등록</Link>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>셀러</th><th>국가</th><th>경로</th><th>운임 (기본 + 병당)</th><th>수집</th><th className="r">판매</th><th>상태</th></tr></thead>
            <tbody>
              {sellers.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/admin/sellers/${s.id}`}>{s.name}</Link></td>
                  <td className="small">{s.country}</td>
                  <td className="small">{s.channel}</td>
                  <td className="small num">{money(s.shipBase, s.currency)} + {money(s.shipPerBottle, s.currency)}</td>
                  <td className="small">{s.priceSource === "JSONLD" ? "크롤링" : "수동"}</td>
                  <td className="r">{s._count.offers}</td>
                  <td>{!s.active ? <span className="chip">숨김</span> : s.shipsToKorea ? <span className="chip ok">한국 발송</span> : <span className="chip warn">발송 안 함</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="stack">
        <h2>배송대행지 {forwarders.length}곳</h2>
        <p className="small muted">배송대행지 경로는 원산지 국가 판매처 가격 + 판매처→배대지 운임 + 배대지→한국 운임으로 계산합니다. 주류를 접수하지 않는 곳은 경로에서 빠집니다. 칸 순서: 기본료(상자당), 병당, 최소·최대 일수, 소포당 처리비, 합포장 수수료(상자당, 소포 2개 이상일 때), 한 상자 최대 병 수. 뒤의 세 값은 <a href="/consolidate">합배송 견적</a>에만 씁니다.</p>
        <div className="table-wrap">
          {forwarders.map((f) => <ForwarderRow key={f.id} f={f} />)}
          <ForwarderRow />
        </div>
      </section>
    </div>
  );
}
