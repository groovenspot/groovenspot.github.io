/**
 * 한국 개인 수입(자가사용) 와인 세금 계산.
 * 세율은 코드에 두지 않고 TaxConfig로 받습니다. 관리자 화면에서 바꿀 수 있습니다.
 */
export type TaxConfig = {
  dutyRate: number; // 관세 (비FTA·제3국 구매)
  liquorRate: number; // 주세 (종가세)
  eduRate: number; // 교육세 (주세 대비)
  vatRate: number; // 부가세
  exemptUsd: number; // 1병 면세구간 물품가 상한 (USD)
  exemptMaxMl: number; // 1병 면세구간 용량 상한 (ml)
  minCollect: number; // 세액 합계가 이 금액 미만이면 징수 면제 (원)
  ftaCountries: string[]; // 한국과 FTA로 와인 관세가 0%인 원산지
  bulkWarnQty: number; // 이 수량 이상이면 자가사용 범위 경고
  freeAlertLimit: number; // 무료 회원 가격 알림 개수 상한
  retailerMarkupHint: number; // 데이터 없는 경로 추정용 (표시만)
};

export const DEFAULT_TAX: TaxConfig = {
  dutyRate: 0.15,
  liquorRate: 0.3,
  eduRate: 0.1,
  vatRate: 0.1,
  exemptUsd: 150,
  exemptMaxMl: 1000,
  minCollect: 10000,
  ftaCountries: ["프랑스", "이탈리아", "스페인", "독일", "포르투갈", "오스트리아", "헝가리", "그리스", "미국", "칠레", "호주", "뉴질랜드", "캐나다", "영국"],
  bulkWarnQty: 6,
  freeAlertLimit: 3,
  retailerMarkupHint: 0.1,
};

export type TaxInput = {
  cif: number; // 과세가격 (원) = 물품가 + 한국까지 국제운임
  goodsUsdPerBottle: number; // 병당 물품가 (USD)
  qty: number;
  bottleMl: number;
  fta: boolean; // 원산지 국가에서 구매해 FTA 관세 0%를 받을 수 있는지
};

export type TaxResult = {
  cif: number;
  exempt: boolean; // 1병 면세구간 (관세·부가세 면제)
  fta: boolean;
  duty: number;
  liquor: number;
  edu: number;
  vat: number;
  sum: number; // 계산된 세액 합계
  waived: boolean; // 소액 징수 면제
  pay: number; // 실제 납부액
  rate: number; // 과세가격 대비 세액 비율
};

export function isExemptBand(goodsUsdPerBottle: number, qty: number, bottleMl: number, cfg: TaxConfig) {
  return qty === 1 && bottleMl <= cfg.exemptMaxMl && goodsUsdPerBottle <= cfg.exemptUsd;
}

export function calcTax(input: TaxInput, cfg: TaxConfig = DEFAULT_TAX): TaxResult {
  const cif = Math.floor(input.cif);
  const exempt = isExemptBand(input.goodsUsdPerBottle, input.qty, input.bottleMl, cfg);
  const f = Math.floor;
  let duty = 0;
  let vat = 0;
  let liquor: number;
  let edu: number;
  if (exempt) {
    liquor = f(cif * cfg.liquorRate);
    edu = f(liquor * cfg.eduRate);
  } else {
    duty = input.fta ? 0 : f(cif * cfg.dutyRate);
    liquor = f((cif + duty) * cfg.liquorRate);
    edu = f(liquor * cfg.eduRate);
    vat = f((cif + duty + liquor + edu) * cfg.vatRate);
  }
  const sum = duty + liquor + edu + vat;
  const waived = sum < cfg.minCollect;
  return {
    cif,
    exempt,
    fta: input.fta,
    duty,
    liquor,
    edu,
    vat,
    sum,
    waived,
    pay: waived ? 0 : sum,
    rate: cif > 0 ? sum / cif : 0,
  };
}
