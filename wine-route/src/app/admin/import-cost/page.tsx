import { getFx, getTaxConfig } from "@/server/settings";
import { ImporterCalc } from "@/components/admin/ImporterCalc";

export const metadata = { title: "수입 원가 계산" };

export default async function ImportCost() {
  const [tax, fx] = await Promise.all([getTaxConfig(), getFx()]);
  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 28 }}>수입업자 기준 원가 계산</h1>
        <p className="lede">수입 확장(기획안 3~4단계) 검토용입니다. 구해주세요 상위 와인을 정식 수입하면 병당 원가와 공급가가 얼마인지, 직구 도착가와 비교해 봅니다. 셀러도어는 현재 수입·판매를 하지 않습니다.</p>
      </section>
      <ImporterCalc tax={tax} fx={fx.rates} />
    </div>
  );
}
