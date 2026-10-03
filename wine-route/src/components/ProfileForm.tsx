"use client";
import { keepFormSubmit } from "@/components/useKeepForm";
import { useActionState, useState } from "react";
import { saveProfile } from "@/app/me/actions";
import { AddressSearch } from "@/components/AddressSearch";

type P = {
  next?: string;
  v: { firstNameEn: string; lastNameEn: string; address1En: string; address2En: string; cityEn: string; provinceEn: string; zip: string; phone: string; pcccMasked: string; pcccInNote: boolean };
};

export function ProfileForm({ v, next }: P) {
  const [state, action, pending] = useActionState(saveProfile, {} as { ok?: boolean; error?: string });
  const [address, setAddress] = useState({ address1En: v.address1En, cityEn: v.cityEn, provinceEn: v.provinceEn, zip: v.zip });
  const [storePccc, setStorePccc] = useState(!!v.pcccMasked);
  const [clearPccc, setClearPccc] = useState(false);
  return (
    <form onSubmit={keepFormSubmit(action)} className="box">
      {next && <input type="hidden" name="next" value={next} />}
      <AddressSearch onSelect={setAddress} />
      <div className="form-grid">
        <div className="field"><label className="label" htmlFor="pf-first">이름 (영문)</label><input id="pf-first" name="firstNameEn" defaultValue={v.firstNameEn} placeholder="Gildong" autoComplete="given-name" /></div>
        <div className="field"><label className="label" htmlFor="pf-last">성 (영문)</label><input id="pf-last" name="lastNameEn" defaultValue={v.lastNameEn} placeholder="Hong" autoComplete="family-name" /></div>
        <div className="field"><label className="label" htmlFor="pf-phone">휴대폰</label><input id="pf-phone" name="phone" defaultValue={v.phone} placeholder="01012345678" inputMode="numeric" autoComplete="tel" /></div>
        <div className="field"><label className="label" htmlFor="pf-zip">우편번호</label><input id="pf-zip" name="zip" value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} placeholder="06134" inputMode="numeric" autoComplete="postal-code" /></div>
      </div>
      <div className="field"><label className="label" htmlFor="pf-a1">주소 1 (영문 도로명주소)</label><input id="pf-a1" name="address1En" value={address.address1En} onChange={(e) => setAddress({ ...address, address1En: e.target.value })} placeholder="12, Teheran-ro 5-gil, Gangnam-gu" autoComplete="address-line1" /></div>
      <div className="form-grid">
        <div className="field"><label className="label" htmlFor="pf-a2">주소 2 (동·호수)</label><input id="pf-a2" name="address2En" defaultValue={v.address2En} placeholder="101-1203" autoComplete="address-line2" /></div>
        <div className="field"><label className="label" htmlFor="pf-city">도시</label><input id="pf-city" name="cityEn" value={address.cityEn} onChange={(e) => setAddress({ ...address, cityEn: e.target.value })} placeholder="Seoul" autoComplete="address-level2" /></div>
        <div className="field"><label className="label" htmlFor="pf-prov">시·도</label><input id="pf-prov" name="provinceEn" value={address.provinceEn} onChange={(e) => setAddress({ ...address, provinceEn: e.target.value })} placeholder="Seoul" autoComplete="address-level1" /></div>
      </div>
      <p className="small muted">영문 주소는 도로명주소 안내시스템(juso.go.kr)의 영문주소 검색으로 확인할 수 있습니다.</p>
      <label className="check"><input type="checkbox" name="storePccc" checked={storePccc} onChange={(e) => setStorePccc(e.target.checked)} /> 개인통관고유부호를 암호화해 저장할게요 (선택)</label>
      <div className="field">
        <label className="label" htmlFor="pf-pccc">개인통관고유부호 {v.pcccMasked && <span className="muted">· 저장됨 {v.pcccMasked}</span>}</label>
        <input id="pf-pccc" name="pccc" placeholder={v.pcccMasked ? "바꿀 때만 입력" : "P123456789012"} autoComplete="off" disabled={!storePccc || clearPccc} />
      </div>
      <div className="row">
        <label className="check"><input type="checkbox" name="pcccInNote" defaultChecked={v.pcccInNote} disabled={clearPccc || !storePccc} /> 판매처 결제 화면의 주문 메모에 통관부호 넣기</label>
        {v.pcccMasked && <label className="check small"><input type="checkbox" name="clearPccc" checked={clearPccc} onChange={(e) => setClearPccc(e.target.checked)} /> 저장된 통관부호 지우기</label>}
      </div>
      <p className="small muted">저장은 선택입니다. 저장하지 않으면 판매처·배송대행지에 직접 입력하세요. 저장에 동의한 통관부호는 암호화하며, 주문 메모 전달에 동의한 경우에만 판매처에 전달합니다. 저장 선택을 해제하거나 지우기를 체크한 뒤 저장하면 기존 번호도 삭제됩니다.</p>
      <div className="row">
        <button className="btn" disabled={pending}>{pending ? "저장하는 중…" : "주문서 정보 저장"}</button>
        {state.ok && <span className="small pos">저장했습니다.</span>}
        {state.error && <span className="small neg">{state.error}</span>}
      </div>
    </form>
  );
}
