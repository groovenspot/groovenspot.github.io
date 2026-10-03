import type { Wine } from "@prisma/client";
import { saveWine } from "@/app/admin/actions";

export function WineForm({ wine }: { wine?: Wine }) {
  const f = (k: keyof Wine) => (wine?.[k] ?? "") as string | number;
  return (
    <form action={saveWine} className="box">
      {wine && <input type="hidden" name="id" value={wine.id} />}
      <div className="form-grid">
        <div className="field"><label className="label" htmlFor="w-name">원어명 *</label><input id="w-name" name="name" required defaultValue={f("name")} /></div>
        <div className="field"><label className="label" htmlFor="w-nameKo">한글명 *</label><input id="w-nameKo" name="nameKo" required defaultValue={f("nameKo")} /></div>
        <div className="field"><label className="label" htmlFor="w-producer">생산자</label><input id="w-producer" name="producer" defaultValue={f("producer")} /></div>
        <div className="field"><label className="label" htmlFor="w-country">원산지 국가 * (한글)</label><input id="w-country" name="country" required defaultValue={f("country")} placeholder="프랑스" /></div>
        <div className="field"><label className="label" htmlFor="w-region">산지</label><input id="w-region" name="region" defaultValue={f("region")} /></div>
        <div className="field"><label className="label" htmlFor="w-type">종류</label>
          <select id="w-type" name="type" defaultValue={f("type") || "레드"}>{["레드", "화이트", "스파클링", "로제", "디저트", "주정강화"].map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><label className="label" htmlFor="w-grape">품종</label><input id="w-grape" name="grape" defaultValue={f("grape")} /></div>
        <div className="field"><label className="label" htmlFor="w-vintage">빈티지 (NV는 비움)</label><input id="w-vintage" name="vintage" type="number" defaultValue={f("vintage")} /></div>
        <div className="field"><label className="label" htmlFor="w-kr">국내가 (원, 750ml, 미수입은 비움)</label><input id="w-kr" name="krPrice" type="number" defaultValue={f("krPrice")} /></div>
        <div className="field"><label className="label" htmlFor="w-krsrc">국내가 출처</label><input id="w-krsrc" name="krPriceSrc" defaultValue={f("krPriceSrc")} /></div>
        <div className="field"><label className="label" htmlFor="w-rating">평점 (100점)</label><input id="w-rating" name="rating" type="number" step="0.1" defaultValue={f("rating")} /></div>
        <div className="field"><label className="label" htmlFor="w-ratingsrc">평점 출처 (평점을 넣으면 필수)</label><input id="w-ratingsrc" name="ratingSrc" defaultValue={f("ratingSrc")} /></div>
        <div className="field"><label className="label" htmlFor="w-lwin">LWIN 코드 (7자리, 선택)</label><input id="w-lwin" name="lwin" inputMode="numeric" maxLength={7} defaultValue={f("lwin")} /></div>
      </div>
      <div className="field"><label className="label" htmlFor="w-aliases">검색 보정 표기 (쉼표 구분)</label><input id="w-aliases" name="aliases" defaultValue={wine?.aliases.join(", ") ?? ""} placeholder="예: 페브르, Fevre" /></div>
      <div className="field"><label className="label" htmlFor="w-notes">한국어 테이스팅 노트</label><textarea id="w-notes" name="notesKo" defaultValue={f("notesKo")} /></div>
      <div className="field"><label className="label" htmlFor="w-notessrc">노트 출처 (노트를 넣으면 필수 · 다른 서비스의 글을 옮겨 오지 마세요)</label><input id="w-notessrc" name="notesSrc" defaultValue={f("notesSrc")} placeholder="생산자 공식 자료 / 셀러도어 작성" /></div>
      <div><button className="btn">저장</button></div>
    </form>
  );
}
