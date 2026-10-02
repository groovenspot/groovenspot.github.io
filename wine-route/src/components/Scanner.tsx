"use client";
import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { quickWatch, requestWine, resolveScan, scanPhoto, scanText, type ScanItem, type ScanState } from "@/app/scan/actions";
import { ROUTE_LABEL, type ChannelKey } from "@/lib/engine";
import { keepFormSubmit } from "@/components/useKeepForm";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

/** 브라우저에서 긴 변 1600px JPEG로 줄여 보냅니다 (HEIC도 브라우저가 열 수 있으면 변환). */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob = await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no()), "image/jpeg", 0.85));
    return new File([blob], "label.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function Item({ it, loggedIn }: { it: ScanItem; loggedIn: boolean }) {
  const [pick, setPick] = useState<number | null>(it.confident ? 0 : null);
  const [msg, setMsg] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const c = pick !== null ? it.candidates[pick] : null;
  const photoPrice = it.read.priceKrw;
  const kr = photoPrice ?? c?.krPrice ?? null;
  const diff = c?.perBottle !== null && c?.perBottle !== undefined && kr ? kr - c.perBottle : null;

  return (
    <div className="box" style={{ gap: 10 }}>
      <div className="small muted">읽은 글자: <span className="num">{it.read.query || "-"}</span>{photoPrice ? ` · 사진 속 가격 ${won(photoPrice)}` : ""}</div>
      {c ? (
        <>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div className="stack" style={{ gap: 2 }}>
              <Link href={`/wines/${c.wineId}`}><b>{c.nameKo}</b></Link>
              <span className="small muted">{c.name} {c.vintage ?? "NV"}{!it.confident || pick !== 0 ? "" : " · 자동 인식"}</span>
            </div>
            {diff !== null ? (
              diff > 0 ? <span className="chip ok">직구가 {won(diff)} 낮음</span> : <span className="chip">국내 구매가 {won(-diff)} 낮음</span>
            ) : <span className="chip">비교할 국내가 없음</span>}
          </div>
          <table className="taxtable">
            <tbody>
              <tr><td>{photoPrice ? "사진 속 가격" : "국내 판매가 (추정)"}</td><td>{kr ? won(kr) : "-"}</td></tr>
              <tr><td>직구 도착가 (1병, 세금·운임 포함){c.route && <span className="formula">{ROUTE_LABEL[c.route as ChannelKey]}</span>}</td><td className={diff !== null && diff > 0 ? "pos" : ""}>{c.perBottle !== null ? won(c.perBottle) : "지금은 살 수 있는 경로 없음"}</td></tr>
            </tbody>
          </table>
          {diff !== null && diff <= 0 && <p className="small">이 와인은 국내에서 사는 편이 낫습니다. 직구는 시간이 걸리고 파손 위험도 있습니다.</p>}
          <div className="row">
            <button className="btn small" onClick={async () => {
              const r = await quickWatch(it.scanId, c.wineId, c.perBottle);
              setMsg(r.login ? "로그인하면 찜할 수 있습니다." : r.error ?? "찜했습니다. 도착가가 내려가면 알려드릴게요.");
            }}>찜하기</button>
            <Link className="btn ghost small" href={`/wines/${c.wineId}`} onClick={() => void resolveScan(it.scanId, c.wineId)}>경로 비교 보기</Link>
            {it.candidates.length > 1 && <button className="btn ghost small" onClick={() => setPick(null)}>다른 와인이에요</button>}
            {msg && <span className="small">{msg}{msg.startsWith("로그인") && <> <Link href="/login?next=/scan">로그인</Link></>}</span>}
          </div>
        </>
      ) : (
        <>
          <p className="small">{it.candidates.length ? "어떤 와인인가요? 맞는 것을 골라 주세요." : "셀러도어 목록에서 찾지 못했습니다."}</p>
          <div className="stack" style={{ gap: 6 }}>
            {it.candidates.map((x, i) => (
              <button key={x.wineId} className="btn ghost" style={{ justifyContent: "space-between" }} onClick={() => { setPick(i); void resolveScan(it.scanId, x.wineId); }}>
                <span>{x.nameKo} <span className="small muted">{x.vintage ?? "NV"}</span></span>
                <span className="small muted num">{x.perBottle ? won(x.perBottle) : ""}</span>
              </button>
            ))}
          </div>
          <div className="row">
            {requested ? <span className="small pos">요청을 남겼습니다. 요청이 모이면 판매처를 찾아 목록에 추가합니다.</span> : (
              <button className="btn small" onClick={async () => { await requestWine(it.scanId, it.read.query); setRequested(true); }}>목록에 없어요 · 구해주세요</button>
            )}
            {!loggedIn && <span className="small muted">로그인하면 추가될 때 알려드립니다.</span>}
          </div>
        </>
      )}
    </div>
  );
}

export function Scanner({ loggedIn, photoEnabled }: { loggedIn: boolean; photoEnabled: boolean }) {
  const [state, action, pending] = useActionState<ScanState, FormData>(scanPhoto, {});
  const [tState, tAction, tPending] = useActionState<ScanState, FormData>(scanText, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const cur = mode === "text" ? tState : state;
  const shown = cur.items;
  const busy = pending || tPending;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setMode("photo");
    const small = await shrink(f);
    setPreview(URL.createObjectURL(small));
    const fd = new FormData();
    fd.set("photo", small);
    startTransition(() => action(fd));
  };

  return (
    <div className="grid-side" style={{ alignItems: "start" }}>
      <div className="stack">
        {(shown ?? []).map((it) => <Item key={it.scanId} it={it} loggedIn={loggedIn} />)}
        {!shown && !busy && (
          <div className="box">
            <h2>라벨을 찍어 보세요</h2>
            <p className="small muted">와인 한 병의 앞 라벨이 화면에 꽉 차게 찍히면 가장 잘 읽힙니다. 선반 가격표가 함께 찍히면 그 가격과 직구 도착가를 비교합니다.</p>
          </div>
        )}
        {busy && <div className="box"><p>라벨을 읽는 중…</p></div>}
        {cur.error && !busy && <div className="alert">{cur.error}</div>}
      </div>
      <aside className="stack">
        <div className="box">
          <label className="label" htmlFor="photo">라벨 사진</label>
          {photoEnabled ? (
            <input id="photo" type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} disabled={pending} />
          ) : (
            <p className="small muted">사진 인식이 아직 설정되지 않았습니다. 아래에 라벨 글자를 입력해 주세요.</p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="찍은 라벨" style={{ maxHeight: 240, objectFit: "contain", borderRadius: 8 }} />}
          <p className="small muted">사진은 인식에만 쓰고 저장하지 않습니다.</p>
        </div>
        <form className="box" onSubmit={(e) => { setMode("text"); keepFormSubmit(tAction)(e); }}>
          <label className="label" htmlFor="label-text">라벨 글자로 찾기</label>
          <input id="label-text" name="text" placeholder="예: William Fevre Chablis Montmains 2022" />
          <button className="btn ghost small" disabled={tPending}>찾기</button>
        </form>
      </aside>
    </div>
  );
}

