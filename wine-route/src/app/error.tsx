"use client";

import Link from "next/link";
import { useEffect } from "react";

/** 화면을 그리다 오류가 나면 머리말·꼬리말은 그대로 두고 본문만 이 화면으로 바뀝니다. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <section className="stack oops" role="alert">
      <span className="code">오류</span>
      <h1 style={{ fontSize: 26 }}>화면을 불러오지 못했습니다</h1>
      <p className="muted">잠시 뒤 다시 시도해 주세요. 계속되면 아래 오류 번호와 함께 알려 주시면 확인하겠습니다.</p>
      {error.digest && <p className="small muted">오류 번호 <code>{error.digest}</code></p>}
      <div className="row" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={() => reset()}>다시 시도</button>
        <Link className="btn ghost" href="/">홈으로</Link>
      </div>
    </section>
  );
}
