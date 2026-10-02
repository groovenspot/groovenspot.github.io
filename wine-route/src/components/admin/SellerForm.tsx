import type { Seller } from "@prisma/client";
import { saveSeller } from "@/app/admin/actions";

const CHANNELS: [string, string][] = [
  ["WINERY_DIRECT", "와이너리 직배송"],
  ["EXPORT_RETAILER", "현지 수출 리테일러"],
  ["LOCAL_SHOP", "현지 내수 판매처 (배송대행지 경로)"],
  ["HK_RETAILER", "홍콩 경유 리테일러"],
];

export function SellerForm({ seller }: { seller?: Seller }) {
  const s = seller;
  return (
    <form action={saveSeller} className="box">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="form-grid">
        <div className="field"><label className="label" htmlFor="s-name">이름 *</label><input id="s-name" name="name" required defaultValue={s?.name} /></div>
        <div className="field"><label className="label" htmlFor="s-country">소재국 * (한글)</label><input id="s-country" name="country" required defaultValue={s?.country} placeholder="프랑스 / 홍콩" /></div>
        <div className="field"><label className="label" htmlFor="s-channel">경로</label>
          <select id="s-channel" name="channel" defaultValue={s?.channel ?? "EXPORT_RETAILER"}>{CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label className="label" htmlFor="s-cur">판매 통화 *</label><input id="s-cur" name="currency" required maxLength={3} defaultValue={s?.currency ?? "EUR"} /></div>
        <div className="field"><label className="label" htmlFor="s-web">웹사이트</label><input id="s-web" name="website" type="url" defaultValue={s?.website} /></div>
        <div className="field"><label className="label" htmlFor="s-base">운임 기본료 (주문당)</label><input id="s-base" name="shipBase" type="number" step="0.01" defaultValue={s?.shipBase ?? 0} /></div>
        <div className="field"><label className="label" htmlFor="s-per">운임 병당 (750ml 환산)</label><input id="s-per" name="shipPerBottle" type="number" step="0.01" defaultValue={s?.shipPerBottle ?? 0} /></div>
        <div className="field"><label className="label" htmlFor="s-dmin">배송 최소 일수</label><input id="s-dmin" name="daysMin" type="number" defaultValue={s?.daysMin ?? 7} /></div>
        <div className="field"><label className="label" htmlFor="s-dmax">배송 최대 일수</label><input id="s-dmax" name="daysMax" type="number" defaultValue={s?.daysMax ?? 14} /></div>
        <div className="field"><label className="label" htmlFor="s-comm">제휴 수수료율 (%)</label><input id="s-comm" name="commissionRate" type="number" step="0.1" defaultValue={((s?.commissionRate ?? 0.07) * 100).toFixed(1)} /></div>
        <div className="field"><label className="label" htmlFor="s-src">가격 수집 방식</label>
          <select id="s-src" name="priceSource" defaultValue={s?.priceSource ?? "MANUAL"}><option value="MANUAL">수동·CSV</option><option value="JSONLD">상품 페이지 크롤링 (JSON-LD)</option></select></div>
      </div>
      <div className="form-grid">
        <div className="field"><label className="label" htmlFor="s-co">결제 화면 여는 방식</label>
          <select id="s-co" name="checkoutMode" defaultValue={s?.checkoutMode ?? "PRODUCT_PAGE"}>
            <option value="PRODUCT_PAGE">상품 페이지로 이동</option>
            <option value="SHOPIFY_CART">Shopify 장바구니 (담기 + 배송지 미리 채움)</option>
            <option value="CART_TEMPLATE">장바구니 URL 템플릿</option>
          </select></div>
      </div>
      <div className="field"><label className="label" htmlFor="s-cart">장바구니 URL 템플릿 (템플릿 방식일 때: {"{url} {ref} {qty} {clickId} {email} {note}"})</label><input id="s-cart" name="cartTpl" defaultValue={s?.cartTpl ?? ""} placeholder="https://shop.example/cart/add?sku={ref}&qty={qty}&sub={clickId}" /></div>
      <p className="small muted">Shopify 방식은 판매 정보마다 상품 variant ID를 넣어야 장바구니에 담깁니다. 없으면 상품 페이지로 이동합니다. 포스트백에 {"{clickId}"}를 넘겨 받으면 주문 확정·발송이 손님에게 자동으로 알려집니다.</p>
      <div className="field"><label className="label" htmlFor="s-aff">제휴 링크 템플릿 ({"{url}"}, {"{clickId}"} 치환)</label><input id="s-aff" name="affiliateTpl" defaultValue={s?.affiliateTpl ?? ""} placeholder="{url}?ref=cellardoor&sub={clickId}" /></div>
      <div className="row">
        <label className="check"><input type="checkbox" name="shipsToKorea" defaultChecked={s?.shipsToKorea ?? true} /> 한국 발송</label>
        <label className="check"><input type="checkbox" name="insured" defaultChecked={s?.insured} /> 파손 보험</label>
        <label className="check"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} /> 노출</label>
      </div>
      <div><button className="btn">저장</button></div>
    </form>
  );
}
