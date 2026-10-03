import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "찾는 화면이 없습니다", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="stack oops">
      <span className="code">404</span>
      <h1 style={{ fontSize: 26 }}>찾는 화면이 없습니다</h1>
      <p className="muted">주소가 바뀌었거나 판매 정보가 내려간 와인일 수 있습니다. 와인 이름으로 다시 찾아보세요.</p>
      <form action="/" method="get" role="search" className="row" style={{ width: "100%", justifyContent: "center" }}>
        <label htmlFor="nf-q" className="sr-only">와인 검색</label>
        <input id="nf-q" name="q" type="search" placeholder="예: 샤블리, 리슬링" style={{ flex: "1 1 220px", maxWidth: 320 }} />
        <button className="btn">검색</button>
      </form>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link className="btn ghost small" href="/">홈으로</Link>
        <Link className="btn ghost small" href="/calculator">목록에 없는 와인 직접 계산</Link>
      </div>
    </section>
  );
}
