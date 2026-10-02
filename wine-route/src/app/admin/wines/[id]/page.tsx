import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { WineForm } from "@/components/admin/WineForm";
import { deleteOffer, deleteWine, saveOffer } from "@/app/admin/actions";
import { ymd } from "@/lib/format";

export default async function EditWine({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [wine, sellers] = await Promise.all([
    prisma.wine.findUnique({ where: { id }, include: { offers: { include: { seller: true }, orderBy: [{ bottleMl: "asc" }, { price: "asc" }] } } }),
    prisma.seller.findMany({ orderBy: [{ country: "asc" }, { name: "asc" }] }),
  ]);
  if (!wine) notFound();
  return (
    <div className="stack-lg">
      <div className="row between">
        <h1 style={{ fontSize: 26 }}>{wine.nameKo}</h1>
        <div className="row">
          <Link className="btn ghost small" href={`/wines/${wine.id}`}>사용자 화면 보기</Link>
          <form action={deleteWine}><input type="hidden" name="id" value={wine.id} /><button className="btn danger small">와인 삭제</button></form>
        </div>
      </div>
      <WineForm wine={wine} />
      <section className="stack">
        <h2>판매 정보 {wine.offers.length}건</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>셀러</th><th>용량</th><th>가격</th><th>재고</th><th>URL</th><th>확인</th><th></th></tr></thead>
            <tbody>
              {wine.offers.map((o) => (
                <tr key={o.id}>
                  <td className="small">{o.seller.name}<div className="muted">{o.seller.channel} · {o.seller.currency}</div></td>
                  <td colSpan={5}>
                    <form action={saveOffer} className="row" style={{ flexWrap: "nowrap" }}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="wineId" value={wine.id} />
                      <input name="bottleMl" type="number" defaultValue={o.bottleMl} style={{ width: 80 }} aria-label="용량 ml" />
                      <input name="price" type="number" step="0.01" defaultValue={o.price} style={{ width: 100 }} aria-label="가격" />
                      <label className="check small"><input type="checkbox" name="inStock" defaultChecked={o.inStock} />재고</label>
                      <input name="url" defaultValue={o.url} style={{ minWidth: 200 }} aria-label="상품 URL" />
                      <button className="btn ghost small">저장</button>
                    </form>
                    {o.lastError && <div className="small neg">수집 오류: {o.lastError}</div>}
                  </td>
                  <td className="small num">{ymd(o.checkedAt)}</td>
                  <td><form action={deleteOffer}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="wineId" value={wine.id} /><button className="btn ghost small">삭제</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={saveOffer} className="box">
          <h3>판매 정보 추가</h3>
          <input type="hidden" name="wineId" value={wine.id} />
          <div className="form-grid">
            <div className="field"><label className="label" htmlFor="o-seller">셀러</label>
              <select id="o-seller" name="sellerId" required>{sellers.map((s) => <option key={s.id} value={s.id}>{s.country} · {s.name} ({s.currency})</option>)}</select></div>
            <div className="field"><label className="label" htmlFor="o-price">병당 가격 (셀러 통화)</label><input id="o-price" name="price" type="number" step="0.01" required /></div>
            <div className="field"><label className="label" htmlFor="o-ml">용량 (ml)</label><input id="o-ml" name="bottleMl" type="number" defaultValue={750} /></div>
            <div className="field"><label className="label" htmlFor="o-url">상품 URL</label><input id="o-url" name="url" type="url" required /></div>
          </div>
          <label className="check"><input type="checkbox" name="inStock" defaultChecked /> 재고 있음</label>
          <div><button className="btn">추가</button></div>
        </form>
      </section>
    </div>
  );
}
