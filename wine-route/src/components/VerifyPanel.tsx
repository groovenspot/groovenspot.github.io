"use client";
import { keepFormSubmit } from "@/components/useKeepForm";
import { useActionState, useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { verifyDev, verifyWithPortone } from "@/app/community/actions";

declare global {
  interface Window {
    PortOne?: { requestIdentityVerification: (o: { storeId: string; identityVerificationId: string; channelKey: string; redirectUrl?: string }) => Promise<{ code?: string; message?: string; identityVerificationId?: string } | undefined> };
  }
}

export function VerifyPanel({ portone, dev, next }: { portone: { storeId: string; channelKey: string } | null; dev: boolean; next: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devState, devAction, devPending] = useActionState(verifyDev, {} as { ok?: boolean; error?: string });
  useEffect(() => {
    if (devState.ok) router.refresh();
  }, [devState.ok, router]);

  const start = async () => {
    if (!portone || !window.PortOne) return setMsg("본인인증 모듈을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    setBusy(true);
    setMsg(null);
    const id = `idv-${crypto.randomUUID()}`;
    try {
      const r = await window.PortOne.requestIdentityVerification({ storeId: portone.storeId, identityVerificationId: id, channelKey: portone.channelKey, redirectUrl: `${location.origin}/verify?idv=${id}&next=${encodeURIComponent(next)}` });
      if (r?.code) return setMsg(r.message ?? "본인인증을 마치지 못했습니다.");
      const res = await verifyWithPortone(id);
      if (res.error) setMsg(res.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      {portone && (
        <>
          <Script src="https://cdn.portone.io/v2/browser-sdk.js" strategy="afterInteractive" />
          <button className="btn" onClick={start} disabled={busy}>{busy ? "인증하는 중…" : "휴대폰 본인인증"}</button>
        </>
      )}
      {!portone && dev && (
        <form onSubmit={keepFormSubmit(devAction)} className="stack">
          <div className="alert">개발 환경용 임시 인증입니다. 운영에서는 PortOne 본인인증 키를 설정해야 하며, 이 입력란은 나타나지 않습니다.</div>
          <div className="field"><label className="label" htmlFor="bd">생년월일</label><input id="bd" name="birthDate" type="date" required /></div>
          <div><button className="btn" disabled={devPending}>확인</button></div>
          {devState.error && <p className="small neg">{devState.error}</p>}
        </form>
      )}
      {!portone && !dev && <div className="alert bad">본인인증이 아직 설정되지 않아 가입할 수 없습니다. 운영자에게 알려 주세요.</div>}
      {msg && <p className="small neg">{msg}</p>}
    </div>
  );
}
