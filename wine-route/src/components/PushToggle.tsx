"use client";
import { useEffect, useState } from "react";

function keyBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "denied" | "off" | "on";

/** 이 브라우저에서 가격 알림을 받도록 구독합니다 (서비스워커 /sw.js 등록 → 푸시 구독 → 서버 저장) */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function call(method: string, body?: unknown) {
    const r = await fetch("/api/push", { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "요청을 처리하지 못했습니다");
    return j;
  }

  async function on() {
    setBusy(true); setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      await call("POST", sub.toJSON());
      setState("on"); setMsg("이 기기에서 알림을 받습니다. 찜 알림의 받는 방법을 '브라우저 알림'으로 바꿔 주세요.");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  async function off() {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await call("DELETE", { endpoint: sub.endpoint }); await sub.unsubscribe(); }
      setState("off"); setMsg("이 기기의 알림을 껐습니다.");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true); setMsg("");
    try {
      const r = await call("PUT");
      setMsg(r.sent ? "시험 알림을 보냈습니다. 몇 초 안에 도착합니다." : "보내지 못했습니다. 알림을 껐다 다시 켜 보세요.");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 8 }}>
        {state === "loading" && <span className="small muted">확인 중…</span>}
        {state === "unsupported" && <span className="small muted">이 브라우저는 알림을 지원하지 않습니다. iPhone은 홈 화면에 추가한 뒤 열어야 합니다.</span>}
        {state === "denied" && <span className="small muted">브라우저 설정에서 이 사이트의 알림이 막혀 있습니다. 주소창 왼쪽 자물쇠 → 알림 허용 후 새로고침하세요.</span>}
        {state === "off" && <button type="button" className="btn small" disabled={busy} onClick={on}>이 기기에서 알림 받기</button>}
        {state === "on" && <>
          <span className="chip ok">이 기기 알림 켜짐</span>
          <button type="button" className="btn ghost small" disabled={busy} onClick={test}>시험 알림</button>
          <button type="button" className="btn ghost small" disabled={busy} onClick={off}>끄기</button>
        </>}
      </div>
      {msg && <span className="small" role="status">{msg}</span>}
    </div>
  );
}
