import { DEFAULT_TAX, type TaxConfig, type TaxResult } from "@/lib/tax";
import { pct, won } from "@/lib/format";

export function TaxBreakdown({ goodsKrw, shipKrw, tax, total, qty, dutyRate, taxConfig = DEFAULT_TAX }: { goodsKrw: number; shipKrw: number; tax: TaxResult; total: number; qty: number; dutyRate: number; taxConfig?: TaxConfig }) {
  const x = tax;
  const rows: [string, string | null, string, string?][] = [
    ["물품가", null, won(goodsKrw), "sub"],
    ["국제운임", null, won(shipKrw), "sub"],
    ["과세가격", "물품가 + 국제운임 (원 미만 절사)", won(x.cif)],
    ["관세", x.exempt ? "1병 면세구간 면제" : x.fta ? "FTA 원산지 구매 0%" : `과세가격 × ${Math.round(dutyRate * 100)}%`, won(x.duty)],
    ["주세", `${x.exempt || x.fta ? "과세가격" : "(과세가격 + 관세)"} × ${pct(taxConfig.liquorRate)}`, won(x.liquor)],
    ["교육세", `주세 × ${pct(taxConfig.eduRate)}`, won(x.edu)],
    ["부가세", x.exempt ? "1병 면세구간 면제" : `(과세가격 + 관세 + 주세 + 교육세) × ${pct(taxConfig.vatRate)}`, won(x.vat)],
    ["세금 합계", `과세가격 대비 ${pct(x.rate)}${x.waived ? ` · ${won(taxConfig.minCollect)} 미만이라 징수 면제` : ""}`, x.waived ? `0원 (${won(x.sum)} 면제)` : won(x.sum)],
  ];
  return (
    <table className="taxtable">
      <tbody>
        {rows.map(([l, f, v, cls]) => (
          <tr key={l} className={cls}>
            <td>{l}{f && <span className="formula">{f}</span>}</td>
            <td>{v}</td>
          </tr>
        ))}
        <tr className="total">
          <td>한국 도착가{qty > 1 && <span className="formula">병당 {won(total / qty)}</span>}</td>
          <td>{won(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}
