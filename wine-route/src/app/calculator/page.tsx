import { Calculator } from "@/components/Calculator";
import { getFx, getTaxConfig } from "@/server/settings";
import { FX_SOURCE_LABEL, ymdhm } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "직접 계산" };

export default async function CalcPage() {
  const [tax, fx] = await Promise.all([getTaxConfig(), getFx()]);
  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 6 }}>
        <h1>도착가 직접 계산</h1>
        <p className="lede">목록에 없는 와인도 판매처에서 본 가격과 운임만 넣으면 세금까지 더한 한국 도착가를 계산합니다. 환율 {fx.asOf ? `${ymdhm(fx.asOf)} ${FX_SOURCE_LABEL[fx.source ?? ""] ?? ""}` : "-"} 기준.</p>
      </section>
      <Calculator tax={tax} fx={fx.rates} />
    </div>
  );
}
