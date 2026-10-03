import { ImageResponse } from "next/og";
import { compareWine } from "@/server/compare";
import { ROUTE_LABEL } from "@/lib/engine";
import { loadKoreanFont } from "@/lib/ogFont";

export const alt = "셀러도어 와인 직구 도착가";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

/** 카톡·SNS 에 와인 링크를 붙였을 때 보이는 미리보기: 이름, 병당 도착가, 국내가 대비 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await compareWine(id, 1, 750);
  const name = d?.wine.nameKo ?? "와인 직구 도착가 비교";
  const sub = d ? `${d.wine.name} ${d.wine.vintage ?? "NV"} · ${d.wine.country} ${d.wine.region}` : "";
  const best = d?.result.best;
  const price = best ? won(best.perBottle) : "판매처 확인 중";
  const route = best ? `${ROUTE_LABEL[best.channel]} · 세금·운임 포함 1병` : "";
  const saving = d?.result.savingPerBottle;
  const savingLine = saving != null && saving > 0 ? `국내가보다 ${won(saving)} 저렴` : d?.result.krPerBottle == null && d ? "국내 미수입 와인" : "";
  const text = ["셀러도어", "직구 도착가", name, sub, price, route, savingLine].join("");
  const font = await loadKoreanFont(text);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#f2f4f1", color: "#18211d", fontFamily: font ? "NotoKR" : "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, color: "#7a1f3d", fontWeight: 700 }}>{font ? "셀러도어 · 직구 도착가" : "Cellar Door"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>{font ? name : d?.wine.name ?? "Wine"}</div>
          {sub && <div style={{ display: "flex", fontSize: 28, color: "#5b675f" }}>{font ? sub : `${d!.wine.vintage ?? "NV"} · landed price in Korea, tax & shipping incl.`}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: "#7a1f3d" }}>{font ? price : best ? price.replace("원", " KRW") : ""}</div>
            {font && route && <div style={{ display: "flex", fontSize: 26, color: "#5b675f" }}>{route}</div>}
          </div>
          {font && savingLine && <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#2f5d50", background: "#ddebe5", padding: "10px 22px", borderRadius: 999 }}>{savingLine}</div>}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "NotoKR", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
