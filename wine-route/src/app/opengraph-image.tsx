import { ImageResponse } from "next/og";
import { loadKoreanFont } from "@/lib/ogFont";

export const alt = "셀러도어 · 와인 직구 도착가 비교";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// 빌드 때 글꼴을 못 받았어도 하루 뒤 다시 그립니다.
export const revalidate = 86400;

const TITLE = "이 와인, 한국에 얼마에 도착할까?";
const LEDE = "세금·운임을 모두 더한 병당 도착가로 직구 경로 4가지를 비교합니다";

export default async function Image() {
  const font = await loadKoreanFont(`셀러도어${TITLE}${LEDE}`);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 28, padding: "72px", background: "#f2f4f1", color: "#18211d", fontFamily: font ? "NotoKR" : "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, color: "#7a1f3d", fontWeight: 700 }}>{font ? "셀러도어" : "Cellar Door"}</div>
        <div style={{ display: "flex", fontSize: 70, fontWeight: 700, lineHeight: 1.2 }}>{font ? TITLE : "Wine direct-import landed price, compared"}</div>
        {font && <div style={{ display: "flex", fontSize: 30, color: "#5b675f" }}>{LEDE}</div>}
      </div>
    ),
    { ...size, fonts: font ? [{ name: "NotoKR", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
