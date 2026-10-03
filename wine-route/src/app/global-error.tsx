"use client";

/** 최상위 레이아웃까지 실패했을 때. 전역 CSS 도 못 쓸 수 있어 모양을 직접 넣습니다. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f2f4f1", color: "#18211d" }}>
        <main style={{ maxWidth: 520, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
          <p style={{ color: "#7a1f3d", fontWeight: 700 }}>셀러도어</p>
          <h1 style={{ fontSize: 24 }}>서비스에 일시적인 문제가 있습니다</h1>
          <p style={{ color: "#5b675f" }}>잠시 뒤 다시 시도해 주세요.{error.digest ? ` 오류 번호 ${error.digest}` : ""}</p>
          <p style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={() => reset()} style={{ padding: "10px 18px", borderRadius: 8, border: 0, background: "#7a1f3d", color: "#fff", cursor: "pointer" }}>다시 시도</button>
            <a href="/" style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #d3dad3", color: "inherit", textDecoration: "none" }}>홈으로</a>
          </p>
        </main>
      </body>
    </html>
  );
}
