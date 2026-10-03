"use client";

import { useActionState, useState } from "react";
import { keepFormSubmit } from "@/components/useKeepForm";
import { confirmDelivery, recordShipmentStep, refreshTracking, registerTracking } from "@/app/tracking/actions";
import { normalizeCarrierCode, SHIPMENT_LABEL, SHIPMENT_STAGES } from "@/lib/tracking";

type ActionState = { ok?: boolean; error?: string; message?: string };
type Stage = (typeof SHIPMENT_STAGES)[number];

const CARRIERS = [
  ["DHL", "DHL"], ["FEDEX", "FedEx"], ["UPS", "UPS"], ["EMS", "우체국 EMS"], ["OTHER", "기타 운송사"],
] as const;
const DOMESTIC_CARRIERS = [
  ["CJ", "CJ대한통운"], ["HANJIN", "한진택배"], ["LOTTE", "롯데택배"],
  ["POST", "우체국택배"], ["LOGEN", "로젠택배"], ["OTHER", "기타 택배사"],
] as const;

function carrierValue(value: string | null, options: readonly (readonly [string, string])[]) {
  if (!value) return "";
  const code = normalizeCarrierCode(value, options === DOMESTIC_CARRIERS);
  return options.some(([id]) => id === code) ? code : "OTHER";
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="alert bad" role="alert">{state.error}</p>;
  if (state.ok || state.message) return <p className="alert ok" role="status">{state.message ?? "저장했습니다."}</p>;
  return null;
}

export function TrackingRegistrationForm({ id, v }: {
  id: string;
  v: {
    carrier: string | null; trackingNo: string | null; customsNo: string | null; customsYear: number | null;
    domesticCarrier: string | null; domesticTrackingNo: string | null;
  };
}) {
  const [state, action, pending] = useActionState(registerTracking, {} as ActionState);
  const existing = !!v.trackingNo;
  return (
    <form onSubmit={keepFormSubmit(action)} className="box" id="tracking-register">
      <input type="hidden" name="id" value={id} />
      <h2>{existing ? "운송장 정보 수정" : "운송장 등록"}</h2>
      <p className="small muted">판매처의 발송 메일에서 운송사와 운송장 번호를 확인해 주세요. 개인통관고유부호는 입력하지 않습니다.</p>
      <div className="form-grid">
        <div className="field">
          <label className="label" htmlFor="tracking-carrier">해외 운송사 *</label>
          <select id="tracking-carrier" name="carrier" required defaultValue={carrierValue(v.carrier, CARRIERS)}>
            <option value="" disabled>운송사 선택</option>
            {CARRIERS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="tracking-number">해외 운송장 번호 *</label>
          <input id="tracking-number" name="trackingNo" required maxLength={80} defaultValue={v.trackingNo ?? ""} placeholder="발송 메일의 운송장 번호" autoComplete="off" />
        </div>
      </div>
      <details open={!!(v.customsNo || v.domesticTrackingNo)}>
        <summary className="small">통관·국내 배송 정보 (선택)</summary>
        <div className="stack tracking-detail-fields">
          <p className="small muted">통관 조회용 H B/L 번호가 해외 운송장과 다를 때만 별도로 입력하세요. 국내 운송장이 발급되면 택배사와 번호를 함께 입력할 수 있습니다.</p>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="tracking-customs">통관 조회 번호 (H B/L)</label>
              <input id="tracking-customs" name="customsNo" maxLength={80} defaultValue={v.customsNo ?? ""} autoComplete="off" />
            </div>
            <div className="field">
              <label className="label" htmlFor="tracking-customs-year">화물 입항 연도</label>
              <input id="tracking-customs-year" name="customsYear" type="number" min={2000} max={new Date().getFullYear() + 1} step={1} defaultValue={v.customsYear ?? new Date().getFullYear()} />
            </div>
            <div className="field">
              <label className="label" htmlFor="tracking-domestic-carrier">국내 택배사</label>
              <select id="tracking-domestic-carrier" name="domesticCarrier" defaultValue={carrierValue(v.domesticCarrier, DOMESTIC_CARRIERS)}>
                <option value="">아직 모름</option>
                {DOMESTIC_CARRIERS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="tracking-domestic-number">국내 운송장 번호</label>
              <input id="tracking-domestic-number" name="domesticTrackingNo" maxLength={80} defaultValue={v.domesticTrackingNo ?? ""} autoComplete="off" />
            </div>
          </div>
        </div>
      </details>
      <Feedback state={state} />
      <div><button className="btn" disabled={pending}>{pending ? "저장하는 중…" : existing ? "운송장 정보 저장" : "등록하고 추적 시작"}</button></div>
    </form>
  );
}

export function RefreshTrackingForm({ id, configured }: { id: string; configured: boolean }) {
  const [state, action, pending] = useActionState(refreshTracking, {} as ActionState);
  return (
    <form onSubmit={keepFormSubmit(action)} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="id" value={id} />
      <div><button className="btn ghost small" disabled={pending || !configured}>{pending ? "조회하는 중…" : configured ? "배송·통관 정보 새로고침" : "자동 조회 준비 중"}</button></div>
      <Feedback state={state} />
    </form>
  );
}

export function ShipmentStepForm({ id, currentStage, actualTax }: { id: string; currentStage: Stage | null; actualTax: number | null }) {
  const [state, action, pending] = useActionState(recordShipmentStep, {} as ActionState);
  const currentIndex = currentStage ? SHIPMENT_STAGES.indexOf(currentStage) : -1;
  const options = SHIPMENT_STAGES.filter((stage, index) => stage !== "DELIVERED" && index >= currentIndex);
  const [selected, setSelected] = useState<Stage>(options[0] ?? "INTERNATIONAL");
  if (!options.length) return null;
  return (
    <form onSubmit={keepFormSubmit(action)} className="box">
      <input type="hidden" name="id" value={id} />
      <h2>직접 확인한 단계 기록</h2>
      <p className="small muted">운송사 조회나 안내 메일로 확인한 내용만 기록해 주세요. 자동 조회와 구분해 &lsquo;내 확인&rsquo;으로 표시합니다.</p>
      <div className="form-grid">
        <div className="field">
          <label className="label" htmlFor="tracking-stage">확인한 단계</label>
          <select id="tracking-stage" name="stage" value={selected} onChange={(e) => setSelected(e.target.value as Stage)}>
            {options.map((stage) => <option key={stage} value={stage}>{SHIPMENT_LABEL[stage]}</option>)}
          </select>
        </div>
        {selected === "TAX_NOTICE" && (
          <div className="field">
            <label className="label" htmlFor="tracking-notice-tax">고지된 세금 (원) *</label>
            <input id="tracking-notice-tax" name="actualTax" type="number" required min={0} max={100000000} step={1} defaultValue={actualTax ?? ""} placeholder="세금이 없으면 0" />
          </div>
        )}
      </div>
      <Feedback state={state} />
      <div><button className="btn ghost" disabled={pending}>{pending ? "기록하는 중…" : "확인한 단계 저장"}</button></div>
    </form>
  );
}

export function DeliveryConfirmationForm({ id, actualTax, delivered }: { id: string; actualTax: number | null; delivered: boolean }) {
  const [state, action, pending] = useActionState(confirmDelivery, {} as ActionState);
  return (
    <form onSubmit={keepFormSubmit(action)} className="box">
      <input type="hidden" name="id" value={id} />
      <h2>{delivered ? "실제 낸 세금 확인" : "와인을 받으셨나요?"}</h2>
      <p className="small muted">실제 납부한 세금을 저장하면 후기의 경로·세금·배송일이 자동으로 채워집니다. 면세였다면 0원을 입력해 주세요.</p>
      <div className="field">
        <label className="label" htmlFor="tracking-paid-tax">실제 낸 세금 (원) *</label>
        <input id="tracking-paid-tax" name="taxPaid" type="number" required min={0} max={100000000} step={1} defaultValue={actualTax ?? ""} placeholder="실제 납부한 전체 세금" />
      </div>
      <Feedback state={state} />
      <div><button className="btn" disabled={pending}>{pending ? "저장하는 중…" : delivered ? "실제 세금 저장" : "수령 완료·세금 저장"}</button></div>
    </form>
  );
}
