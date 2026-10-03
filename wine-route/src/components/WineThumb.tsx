"use client";
import { useState } from "react";
import { TYPE_TINT } from "@/lib/wineImage";

/** 병 사진 (없거나 못 불러오면 종류 색의 병 모양 자리 표시). 판매처에 방문 주소를 넘기지 않습니다. */
export function WineThumb({ src, type, alt, size = "sm", credit }: { src?: string | null; type: string; alt: string; size?: "sm" | "lg"; credit?: string | null }) {
  const [broken, setBroken] = useState(false);
  const show = src && !broken;
  return (
    <figure className={`thumb ${size}`}>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        <svg viewBox="0 0 24 64" aria-hidden="true"><path d="M9 2h6v14c0 3 4 5 4 11v33a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V27c0-6 4-8 4-11z" fill={TYPE_TINT[type] ?? "#8a8a8a"} opacity=".55" /></svg>
      )}
      {show && credit && size === "lg" && <figcaption>사진 · {credit}</figcaption>}
    </figure>
  );
}
