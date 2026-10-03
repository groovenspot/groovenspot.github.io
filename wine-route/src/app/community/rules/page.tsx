import { CommunityNav } from "@/components/CommunityNav";

export const metadata = { title: "커뮤니티 운영 정책" };

export default function Rules() {
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <section className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 28 }}>커뮤니티 운영 정책</h1>
        <p className="lede">커뮤니티 안에서 술이 거래되는 순간 서비스 전체가 위험해집니다. 아래 원칙은 예외 없이 적용합니다.</p>
        <CommunityNav current="rules" />
      </section>
      <section className="box">
        <h2>가입 조건</h2>
        <ul className="list">
          <li>휴대폰 본인인증으로 <b>만 19세 이상</b>임을 확인한 회원만 후기를 쓰고 도움됨·신고를 할 수 있습니다.</li>
          <li>한 사람당 계정 하나만 쓸 수 있습니다.</li>
        </ul>
      </section>
      <section className="box">
        <h2>금지</h2>
        <ul className="list">
          <li><b>개인 간 거래</b>: 판매·양도·나눔·교환 글. 중고거래 기능은 만들지 않습니다.</li>
          <li><b>공동구매 모집</b>: 사람을 모아 함께 주문하거나 묶음 배송을 모으는 글.</li>
          <li><b>연락처 공유</b>: 전화번호, 오픈채팅, 메신저 아이디로 거래를 유도하는 글.</li>
          <li><b>음주 권장</b>: 과음을 부추기는 표현, 마시는 장면 위주의 사진.</li>
        </ul>
        <p className="small muted">금지 표현은 자동으로 막습니다. 신고가 접수된 글은 즉시 공개 목록에서 제거하고, 운영자가 확인한 뒤 복구하거나 최종 삭제합니다.</p>
      </section>
      <section className="box">
        <h2>후기 신뢰</h2>
        <ul className="list">
          <li>판매처로부터 제품·돈 등 대가를 받고 쓴 후기는 <b>광고·협찬</b> 표시를 해야 합니다. 협찬 후기는 판매처 신뢰 점수와 모든 후기 랭킹에서 빠지고, 도움됨 포인트도 지급하지 않습니다.</li>
          <li>판매처가 대가를 주고 표시 없는 후기를 쓰게 한 사실이 확인되면 그 판매처의 노출을 중단합니다.</li>
          <li>통관 인증 배지는 운영자가 통관 내역·영수증을 확인한 후기에만 붙습니다. 사진은 확인이 끝나면 지웁니다.</li>
        </ul>
      </section>
      <section className="box">
        <h2>포인트</h2>
        <ul className="list">
          <li>포인트는 프리미엄 구독과 (예정) 오프라인 시음회 참가에만 쓸 수 있습니다.</li>
          <li>와인 값을 내거나 깎는 데는 쓸 수 없습니다. 플랫폼이 주류 대금에 관여하지 않기 위해서입니다.</li>
          <li>부정한 방법(다중 계정, 허위 후기)으로 받은 포인트는 회수합니다.</li>
          <li>본인 후기에는 도움됨을 누를 수 없습니다. 같은 후기의 도움됨 10개 구간 보상은 취소 후 다시 눌러도 한 번만 지급합니다.</li>
          <li>포인트 차감과 프리미엄 연장은 함께 처리합니다. 이달의 후기왕 보상은 종료된 월의 상위 3명에게 한 번씩 지급합니다.</li>
        </ul>
      </section>
    </div>
  );
}
