import Link from "next/link";
import type { Metadata } from "next";
import { LegalDraft } from "@/components/LegalDraft";

export const metadata: Metadata = { title: "이용약관", robots: { index: false } };

const VERSION = "2026-10-03";

export default function Terms() {
  return (
    <article className="stack-lg legal">
      <h1 style={{ fontSize: 28 }}>이용약관</h1>
      <LegalDraft version={VERSION} />
      <section className="stack">
        <h2>1. 서비스의 성격</h2>
        <ul className="list">
          <li>셀러도어는 해외 판매처의 와인 가격과 한국 도착가(운임·세금 포함 추정치)를 비교해 보여 주고 판매처로 연결하는 정보 서비스입니다.</li>
          <li>셀러도어는 와인을 판매하지 않으며, 주문·결제·배송 계약은 이용자와 해외 판매처 사이에 이루어집니다. 셀러도어는 대금을 받지 않습니다.</li>
          <li>셀러도어는 일부 판매처로부터 연결 실적에 따른 제휴 수수료를 받을 수 있습니다.</li>
        </ul>
      </section>
      <section className="stack">
        <h2>2. 계산 결과</h2>
        <p>도착가·세금·합배송 견적은 공개된 기준과 판매처 정보로 계산한 예상치이며, 실제 세금은 세관의 과세가격·과세환율과 원산지 증빙에 따라 달라질 수 있습니다. 주문 전에 판매처와 관련 기관의 안내를 확인해 주세요.</p>
      </section>
      <section className="stack">
        <h2>3. 회원</h2>
        <ul className="list">
          <li>이메일 코드 또는 소셜 계정으로 가입합니다.</li>
          <li>커뮤니티 글쓰기와 직구 상담은 만 19세 이상 본인인증 회원만 이용할 수 있습니다.</li>
          <li>회원은 언제든 탈퇴할 수 있으며, 탈퇴하면 개인 데이터는 <Link href="/privacy">개인정보 처리방침</Link>에 따라 삭제됩니다.</li>
        </ul>
      </section>
      <section className="stack">
        <h2>4. 금지 행위</h2>
        <p>개인 간 주류 거래·나눔, 공동구매 모집, 연락처 교환을 통한 거래 유도, 음주 권장, 대가를 받고도 밝히지 않은 후기, 허위 후기, 서비스 운영 방해. 자세한 내용은 <Link href="/community/rules">커뮤니티 운영 정책</Link>을 따릅니다.</p>
      </section>
      <section className="stack">
        <h2>5. 게시물</h2>
        <p>후기·게시글의 권리는 작성자에게 있으며, 셀러도어는 서비스 안에서 이를 표시하고 도착가 정확도 검증에 활용할 수 있습니다. 신고된 게시물은 운영자 확인 전까지 숨길 수 있습니다.</p>
      </section>
      <section className="stack">
        <h2>6. 책임의 제한</h2>
        <p>[판매처와의 거래, 배송 지연·파손, 통관 결과에 대한 책임 범위 — 변호사 검토 후 작성]</p>
      </section>
      <section className="stack">
        <h2>7. 분쟁 해결</h2>
        <p>[준거법·관할 법원 — 변호사 검토 후 작성]</p>
      </section>
    </article>
  );
}
