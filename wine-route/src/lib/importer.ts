/**
 * 수입업자 기준 원가·세금 계산 (수입 확장 검토용).
 * 와인 수입 세금: 관세(FTA 0% 또는 15%) → 주세 30%((과세가격+관세) 기준) → 교육세(주세의 10%) → 부가세 10%.
 * 부가세는 매입세액 공제 대상이라 원가에서 빼고 따로 보여줍니다. 실제 신고 전 관세사 확인이 필요합니다.
 */
import type { TaxConfig } from "./tax";

export type ImporterInput = {
  bottles: number; // 수입 병수
  fobPerBottle: number; // 병당 FOB (판매처 통화)
  fx: number; // 1단위당 원
  freightKrw: number; // 해상·항공 운임 전체 (원)
  insuranceRate: number; // 적하보험료율 (FOB+운임 대비, 예: 0.003)
  fta: boolean;
  brokerFeeKrw: number; // 통관 수수료 전체
  inspectionKrw: number; // 수입식품 검사·신고 비용 전체
  labelPerBottle: number; // 한글 표시사항 라벨 작업 (원/병)
  otherKrw: number; // 창고·내륙 운송 등 기타 전체
  marginRate: number; // 원가 대비 희망 마진율 (예: 0.3)
};

export type ImporterResult = {
  cif: number; // 과세가격 전체
  duty: number;
  liquor: number;
  edu: number;
  vat: number; // 수입 부가세 (공제 대상, 원가 제외)
  taxPerBottle: number; // 관세+주세+교육세 병당
  costTotal: number; // 원가 전체 (부가세 제외)
  costPerBottle: number;
  pricePerBottle: number; // 희망 마진 반영 공급가 (부가세 별도)
  priceWithVat: number; // 공급가 + 부가세 10%
  breakdown: { label: string; total: number }[];
};

export function importerCost(i: ImporterInput, cfg: Pick<TaxConfig, "dutyRate" | "liquorRate" | "eduRate" | "vatRate">): ImporterResult {
  const n = Math.max(1, Math.floor(i.bottles));
  const f = Math.floor;
  const fob = i.fobPerBottle * n * i.fx;
  const insurance = f((fob + i.freightKrw) * Math.max(0, i.insuranceRate));
  const cif = f(fob + i.freightKrw + insurance);
  const duty = i.fta ? 0 : f(cif * cfg.dutyRate);
  const liquor = f((cif + duty) * cfg.liquorRate);
  const edu = f(liquor * cfg.eduRate);
  const vat = f((cif + duty + liquor + edu) * cfg.vatRate);
  const label = f(i.labelPerBottle * n);
  const costTotal = cif + duty + liquor + edu + i.brokerFeeKrw + i.inspectionKrw + label + i.otherKrw;
  const costPerBottle = costTotal / n;
  const pricePerBottle = Math.ceil((costPerBottle * (1 + Math.max(0, i.marginRate))) / 100) * 100;
  return {
    cif, duty, liquor, edu, vat,
    taxPerBottle: (duty + liquor + edu) / n,
    costTotal, costPerBottle, pricePerBottle,
    priceWithVat: Math.round(pricePerBottle * (1 + cfg.vatRate)),
    breakdown: [
      { label: "물품가 (FOB)", total: f(fob) },
      { label: "운임", total: i.freightKrw },
      { label: "적하보험", total: insurance },
      { label: "관세", total: duty },
      { label: "주세", total: liquor },
      { label: "교육세", total: edu },
      { label: "통관 수수료", total: i.brokerFeeKrw },
      { label: "수입식품 검사·신고", total: i.inspectionKrw },
      { label: "한글 라벨", total: label },
      { label: "기타 (창고·내륙 운송)", total: i.otherKrw },
    ],
  };
}
