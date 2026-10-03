"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CARD_FOOTER, type CardData } from "@/lib/share";
import { logShare } from "@/app/share/actions";

type Fmt = "story" | "square";
const SIZE: Record<Fmt, [number, number]> = { story: [1080, 1920], square: [1080, 1080] };
// 카드는 이미지라 테마와 무관하게 고정 색을 씁니다 (가격표 스타일)
const C = { paper: "#FBFAF7", ink: "#18211D", muted: "#5B675F", line: "#D3DAD3", accent: "#7A1F3D", glass: "#2F5D50", tag: "#F3E3E8" };
const SERIF = '"Noto Serif KR", Georgia, serif';
const SANS = '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/(\s+)/)) {
    const next = cur + word;
    if (ctx.measureText(next).width <= maxW || !cur.trim()) {
      // 한 단어가 너무 길면 글자 단위로
      if (ctx.measureText(next).width > maxW) {
        for (const ch of word) {
          if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch;
        }
      } else cur = next;
    } else { lines.push(cur.trim()); cur = word.trimStart(); }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

// 형식별 글자 크기·간격. 정사각은 1080px 높이에 모두 들어가도록 촘촘하게.
const L = {
  story: { top: 210, eyebrow: 34, title: 76, titleStep: 96, titleLines: 3, sub: 34, gapSub: 70, saveLabel: 36, big: 150, bigGap: 150, after: 44, afterGap: 70, rowsGap: 90, rowLabel: 32, rowValue: 54, rowStep: 66, route: 34, qr: 220, bottom: 470, brand: 64, cta: 36, caption: 26, foot: 30, foot2: 25, footY: 150, inlineAfter: false },
  square: { top: 140, eyebrow: 28, title: 50, titleStep: 62, titleLines: 2, sub: 26, gapSub: 34, saveLabel: 28, big: 96, bigGap: 96, after: 32, afterGap: 0, rowsGap: 40, rowLabel: 24, rowValue: 38, rowStep: 50, route: 26, qr: 150, bottom: 330, brand: 46, cta: 28, caption: 20, foot: 24, foot2: 20, footY: 104, inlineAfter: true },
} as const;

async function draw(canvas: HTMLCanvasElement, d: CardData, fmt: Fmt) {
  const [W, H] = SIZE[fmt];
  const S = L[fmt];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await Promise.all([`800 80px ${SERIF}`, `600 40px ${SANS}`, `500 60px ${MONO}`].map((f) => document.fonts?.load(f).catch(() => null)));
  const P = 84;
  const hr = (yy: number) => {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P, yy); ctx.lineTo(W - P, yy); ctx.stroke();
  };
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  // 가격표 테두리와 구멍
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.beginPath();
  ctx.arc(W / 2, 90, 16, 0, Math.PI * 2);
  ctx.stroke();

  let y = S.top;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.accent;
  ctx.font = `600 ${S.eyebrow}px ${SANS}`;
  ctx.fillText(d.eyebrow, P, y);
  y += S.titleStep;
  ctx.fillStyle = C.ink;
  ctx.font = `800 ${S.title}px ${SERIF}`;
  for (const line of wrap(ctx, d.title, W - P * 2).slice(0, S.titleLines)) { ctx.fillText(line, P, y); y += S.titleStep; }
  ctx.fillStyle = C.muted;
  ctx.font = `400 ${S.sub}px ${SANS}`;
  ctx.fillText(d.subtitle, P, y - S.titleStep * 0.35);
  y += S.gapSub;

  // 절약액: 가장 크게
  ctx.fillStyle = C.muted;
  ctx.font = `600 ${S.saveLabel}px ${SANS}`;
  ctx.fillText(d.saving === null ? (d.myValue === null && d.kind === "review" ? "실제 결제 금액 미입력" : "비교할 가격 정보 없음") : d.saving >= 0 ? "국내 추정가 대비" : "국내 구매가 더 저렴해요", P, y);
  y += S.bigGap;
  ctx.fillStyle = d.saving !== null && d.saving >= 0 ? C.glass : C.ink;
  ctx.font = `500 ${S.big}px ${MONO}`;
  const big = d.saving === null ? (d.myValue !== null ? won(d.myValue) : "-") : `${d.saving >= 0 ? "" : "+"}${won(Math.abs(d.saving))}`;
  const maxBigWidth = W - P * 2 - (S.inlineAfter && d.saving !== null ? 240 : 0);
  const bigWidth = ctx.measureText(big).width;
  if (bigWidth > maxBigWidth) ctx.font = `500 ${Math.floor(S.big * maxBigWidth / bigWidth)}px ${MONO}`;
  ctx.fillText(big, P - 4, y);
  const bigW = ctx.measureText(big).width;
  if (d.saving !== null) {
    ctx.font = `600 ${S.after}px ${SANS}`;
    const after = d.saving >= 0 ? (d.kind === "wine" ? "아낄 수 있어요" : "아꼈어요") : "더 들어요";
    if (S.inlineAfter) ctx.fillText(after, P + bigW + 20, y);
    else { ctx.fillText(after, P, y + S.afterGap); y += S.afterGap; }
  }
  y += S.rowsGap;

  // 비교 두 줄
  const row = (label: string, value: number | null, strong: boolean) => {
    hr(y);
    y += S.rowStep;
    ctx.fillStyle = C.muted;
    ctx.font = `400 ${S.rowLabel}px ${SANS}`;
    ctx.fillText(wrap(ctx, label, W - P * 2 - S.rowValue * 7)[0], P, y);
    ctx.fillStyle = strong ? C.accent : C.ink;
    ctx.font = `500 ${S.rowValue}px ${MONO}`;
    const v = value !== null ? won(value) : "-";
    ctx.fillText(v, W - P - ctx.measureText(v).width, y);
    y += S.rowStep * 0.55;
  };
  row(d.krLabel, d.krValue, false);
  row(d.myLabel, d.myValue, true);
  hr(y);
  y += S.rowStep * 0.95;
  ctx.fillStyle = C.ink;
  ctx.font = `600 ${S.route}px ${SANS}`;
  ctx.fillText(d.routeLine, P, y);

  // 하단: QR + 로고 + 고지
  const qy = H - S.bottom;
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, d.link, { margin: 1, width: S.qr, color: { dark: C.ink, light: C.paper } });
  ctx.drawImage(qrCanvas, W - P - S.qr, qy);
  ctx.fillStyle = C.accent;
  ctx.font = `800 ${S.brand}px ${SERIF}`;
  ctx.fillText("셀러도어", P, qy + S.brand * 1.2);
  ctx.fillStyle = C.ink;
  ctx.font = `600 ${S.cta}px ${SANS}`;
  ctx.fillText("내 와인도 계산해보기 →", P, qy + S.brand * 1.2 + S.cta * 1.7);
  ctx.fillStyle = C.muted;
  ctx.font = `400 ${S.caption}px ${SANS}`;
  let ly = qy + S.brand * 1.2 + S.cta * 1.7 + S.caption * 1.8;
  for (const l of wrap(ctx, "QR을 찍으면 세금·운임까지 넣은 도착가를 볼 수 있어요", W - P * 2 - S.qr - 40).slice(0, 2)) {
    ctx.fillText(l, P, ly);
    ly += S.caption * 1.4;
  }

  let fy = H - S.footY;
  hr(fy - S.foot * 1.5);
  ctx.fillStyle = C.ink;
  ctx.font = `700 ${S.foot}px ${SANS}`;
  ctx.fillText(CARD_FOOTER[0], P, fy);
  fy += S.foot * 1.45;
  ctx.fillStyle = C.muted;
  ctx.font = `400 ${S.foot2}px ${SANS}`;
  for (const l of wrap(ctx, CARD_FOOTER[1], W - P * 2).slice(0, 2)) {
    ctx.fillText(l, P, fy);
    fy += S.foot2 * 1.35;
  }
}

export function ShareCard({ data, wineId }: { data: CardData; wineId?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fmt, setFmt] = useState<Fmt>("story");
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    const prepared = document.createElement("canvas");
    draw(prepared, data, fmt).then(() => {
      if (!active || !ref.current) return;
      ref.current.width = prepared.width;
      ref.current.height = prepared.height;
      ref.current.getContext("2d")!.drawImage(prepared, 0, 0);
      setReady(true);
    }).catch((e) => { if (active) setMsg(`카드를 그리지 못했습니다: ${e.message}`); });
    return () => { active = false; };
  }, [data, fmt]);

  const blob = () => new Promise<Blob>((ok, no) => ref.current!.toBlob((b) => (b ? ok(b) : no(new Error("이미지 생성 실패"))), "image/png"));
  const name = `cellardoor-${data.kind}-${fmt}.png`;
  const save = async () => {
    const b = await blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    void logShare({ kind: data.kind, format: fmt, action: "save", wineId });
    setMsg("이미지를 저장했습니다. 인스타 스토리나 카카오톡에 올려 보세요.");
  };
  const share = async () => {
    const file = new File([await blob()], name, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: `세금·운임까지 넣은 와인 직구 도착가 ${data.link}` });
        void logShare({ kind: data.kind, format: fmt, action: "share", wineId });
      } catch { /* 사용자가 닫음 */ }
    } else {
      try {
        await navigator.clipboard.writeText(data.link);
        setMsg("이 기기는 이미지 바로 공유를 지원하지 않아 링크를 복사했습니다. 이미지는 '저장'으로 받아 주세요.");
      } catch {
        setMsg(`링크: ${data.link}`);
      }
    }
  };

  return (
    <div className="grid-side" style={{ alignItems: "start" }}>
      <div className="box" style={{ alignItems: "center" }}>
        <canvas ref={ref} style={{ width: "100%", maxWidth: fmt === "story" ? 360 : 480, height: "auto", border: "1px solid var(--line)", borderRadius: 8 }} aria-label={`${data.title} 도착가 공유 카드`} />
      </div>
      <div className="stack">
        <div className="box">
          <span className="label">카드 모양</span>
          <div className="seg">
            <a href="#" onClick={(e) => { e.preventDefault(); setFmt("story"); }} aria-current={fmt === "story" ? "true" : undefined}>세로 9:16 (스토리)</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setFmt("square"); }} aria-current={fmt === "square" ? "true" : undefined}>정사각 1:1</a>
          </div>
          <div className="row">
            <button className="btn" onClick={save} disabled={!ready}>이미지로 저장</button>
            <button className="btn ghost" onClick={share} disabled={!ready}>공유하기</button>
          </div>
          {msg && <p className="small muted">{msg}</p>}
        </div>
        <div className="box tight">
          <span className="small muted">카드의 QR·링크에는 내 공유자 코드가 들어 있습니다. 이 링크로 3명이 가입하면 프리미엄 1개월을 드립니다 (가입 기준).</span>
          <span className="small num" style={{ wordBreak: "break-all" }}>{data.link}</span>
        </div>
      </div>
    </div>
  );
}
