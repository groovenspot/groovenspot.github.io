import Link from "next/link";
import type { Metadata } from "next";
import { LegalDraft } from "@/components/LegalDraft";
import { consultationRetentionDays } from "@/lib/consultation";

export const metadata: Metadata = { title: "개인정보 처리방침", robots: { index: false } };
// 상담 보관일은 배포 환경변수를 따르므로 빌드 때 고정하지 않습니다.
export const dynamic = "force-dynamic";

const VERSION = "2026-10-03";

export default function Privacy() {
  const consultDays = consultationRetentionDays();
  return (
    <article className="stack-lg legal">
      <h1 style={{ fontSize: 28 }}>개인정보 처리방침</h1>
      <LegalDraft version={VERSION} />

      <section className="stack">
        <h2>1. 처리하는 개인정보</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>구분</th><th>항목</th><th>목적</th><th>보관</th></tr></thead>
            <tbody>
              <tr><td>회원가입(필수)</td><td>이메일 주소</td><td>로그인, 서비스 알림 발송</td><td>탈퇴 시 삭제</td></tr>
              <tr><td>소셜 로그인(선택)</td><td>카카오·네이버 회원 식별값, 이메일</td><td>소셜 계정으로 로그인</td><td>연결 해제·탈퇴 시 삭제</td></tr>
              <tr><td>알림톡(선택)</td><td>휴대폰 번호</td><td>가격 알림·주문 상태 알림톡</td><td>삭제·탈퇴 시 삭제</td></tr>
              <tr><td>커뮤니티(선택)</td><td>닉네임, 생년월일, 본인인증 연계정보의 해시값</td><td>성인 확인, 1인 1계정</td><td>탈퇴 시 삭제</td></tr>
              <tr><td>주문서 정보(선택)</td><td>영문 이름·주소, 우편번호, 개인통관고유부호(암호화 저장)</td><td>해외 판매처 주문서에 붙여넣기·미리 채우기</td><td>삭제·탈퇴 시 삭제</td></tr>
              <tr><td>취향 설문(선택)</td><td>선호 국가·종류·예산 구간</td><td>추천·정렬</td><td>삭제·탈퇴 시 삭제</td></tr>
              <tr><td>마케팅 수신 동의(선택)</td><td>동의·철회 일시, 2년 안내 발송일</td><td>홍보 메일 발송과 동의 확인</td><td>철회·탈퇴 시까지</td></tr>
              <tr><td>서비스 이용 기록</td><td>판매처 이동, 주문 진행·운송장, 구매 기록·세금, 찜·알림, 후기·게시글·댓글</td><td>주문 추적, 도착가 정확도 검증, 커뮤니티</td><td>탈퇴 시 삭제(통계용 이동 기록은 회원 연결을 끊고 보관)</td></tr>
              <tr><td>직구 상담</td><td>질문·답변</td><td>상담 제공·품질 확인</td><td>{consultDays}일 후 자동 삭제</td></tr>
              <tr><td>통관 인증 자료</td><td>통관 내역 사진·PDF</td><td>후기 인증</td><td>운영자 확인(승인·반려) 즉시 삭제</td></tr>
              <tr><td>자동 생성</td><td>로그인 세션, 브라우저 식별 쿠키, 접속지(IP) 해시</td><td>로그인 유지, 방문 통계, 사진 인식 남용 방지</td><td>세션 30일, 접속지 해시 2일</td></tr>
            </tbody>
          </table>
        </div>
        <p className="small muted">라벨 사진은 인식에만 쓰고 저장하지 않습니다. 비교함·최근 본 와인은 이용자 브라우저에만 저장됩니다.</p>
      </section>

      <section className="stack">
        <h2>2. 제3자 제공</h2>
        <p>셀러도어는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 이용자가 해외 판매처 주문서에 주문서 정보를 직접 붙여넣거나 &lsquo;장바구니 담기·미리 채우기&rsquo;를 쓰는 경우, 그 정보는 이용자의 요청에 따라 해당 판매처로 전달됩니다.</p>
      </section>

      <section className="stack">
        <h2>3. 처리 위탁과 국외 이전</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>받는 곳</th><th>위탁 업무</th><th>항목</th></tr></thead>
            <tbody>
              <tr><td>[메일 발송 업체 · 예: Resend (미국)]</td><td>이메일 발송</td><td>이메일 주소, 메일 내용</td></tr>
              <tr><td>[알림톡 발송 업체 · 예: SOLAPI]</td><td>카카오 알림톡 발송</td><td>휴대폰 번호, 알림 내용</td></tr>
              <tr><td>[본인인증 업체 · 예: PortOne]</td><td>휴대폰 본인인증</td><td>인증 결과(생년월일, 연계정보)</td></tr>
              <tr><td>[이미지 인식 업체 · 예: Anthropic 또는 Google (미국)]</td><td>라벨 사진 글자 인식, 상담 질문 분류</td><td>라벨 사진, 상담 질문</td></tr>
              <tr><td>[배송 조회 업체]</td><td>운송장 배송·통관 상태 조회</td><td>운송장 번호</td></tr>
              <tr><td>[호스팅 업체]</td><td>서버·데이터베이스 운영</td><td>서비스 전체 데이터</td></tr>
            </tbody>
          </table>
        </div>
        <p className="small muted">국외 이전되는 경우 이전 국가, 일시·방법, 보유 기간, 거부 방법을 확정 문안에 적습니다.</p>
      </section>

      <section className="stack">
        <h2>4. 이용자의 권리</h2>
        <ul className="list">
          <li>열람·내려받기: <Link href="/me#account">내 정보 → 내 데이터 내려받기</Link></li>
          <li>정정: 내 정보 화면에서 직접 수정</li>
          <li>삭제: <Link href="/me#account">회원 탈퇴</Link> (즉시 삭제)</li>
          <li>처리 정지: 마케팅 수신 거부는 메일의 링크 또는 <Link href="/me#preferences">내 정보</Link>에서</li>
        </ul>
      </section>

      <section className="stack">
        <h2>5. 안전성 확보 조치</h2>
        <p>개인통관고유부호는 별도 키로 암호화해 저장하고, 본인인증 연계정보는 해시값만 보관합니다. 관리자 작업은 기록으로 남깁니다.</p>
      </section>

      <section className="stack">
        <h2>6. 개인정보 보호책임자</h2>
        <p>[이름 · 직책 · 연락처]</p>
      </section>
    </article>
  );
}
