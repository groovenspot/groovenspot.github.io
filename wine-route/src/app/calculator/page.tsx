import Link from "next/link";
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
      <p className="small muted">한 나라의 여러 판매처에서 산 와인을 배송대행지에서 한 상자로 묶어 받을 계획이면 <Link href="/consolidate">합배송 견적</Link>에서 따로 살 때와 비교해 보세요.</p>
    </div>
  );
}
