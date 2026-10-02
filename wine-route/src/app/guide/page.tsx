import { getTaxConfig } from "@/server/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "통관 가이드" };

export default async function Guide() {
  const t = await getTaxConfig();
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <section className="stack" style={{ gap: 6 }}>
        <h1>와인 직구 통관 가이드</h1>
        <p className="lede">해외 판매처에 직접 주문할 때 알아야 할 세금과 통관 절차입니다.</p>
      </section>
      <section className="box">
        <h2>1. 주문 전에</h2>
        <ul className="list">
          <li><b>개인통관고유부호</b>를 관세청 유니패스에서 발급받아 주문서에 넣습니다. 수령인 이름·휴대폰 번호와 일치해야 통관이 지연되지 않습니다.</li>
          <li>배송지는 <b>영문 주소</b>로 적습니다. 도로명주소 안내 사이트에서 영문 주소를 확인할 수 있습니다.</li>
          <li>같은 판매자에게 같은 날 산 물품은 <b>합산과세</b>됩니다. 주문을 쪼개도 세금은 줄지 않습니다.</li>
          <li>개인이 자가사용 목적으로 사는 것만 허용됩니다. 수량이 많으면 재판매용으로 보아 일반 수입신고 대상이 될 수 있습니다.</li>
        </ul>
      </section>
      <section className="box">
        <h2>2. 세금 구조</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>조건</th><th>관세</th><th>주세</th><th>교육세</th><th>부가세</th><th className="r">합계</th></tr></thead>
            <tbody>
              <tr><td>1병·1L 이하·물품가 {t.exemptUsd}달러 이하</td><td>면제</td><td>{t.liquorRate * 100}%</td><td>주세의 {t.eduRate * 100}%</td><td>면제</td><td className="r">약 33%</td></tr>
              <tr><td>그 외 + FTA 원산지 국가에서 구매</td><td>0%</td><td>{t.liquorRate * 100}%</td><td>주세의 {t.eduRate * 100}%</td><td>{t.vatRate * 100}%</td><td className="r">약 46%</td></tr>
              <tr><td>그 외 + 제3국(예: 홍콩)에서 구매</td><td>{t.dutyRate * 100}%</td><td>(가격+관세)의 {t.liquorRate * 100}%</td><td>주세의 {t.eduRate * 100}%</td><td>{t.vatRate * 100}%</td><td className="r">약 68%</td></tr>
            </tbody>
          </table>
        </div>
        <p className="small muted">과세가격 = 물품가 + 한국까지 국제운임. 세액 합계가 {t.minCollect.toLocaleString("ko-KR")}원 미만이면 징수가 면제됩니다.</p>
        <p className="small muted">FTA 관세 0%가 적용되는 원산지: {t.ftaCountries.join(", ")}. 원산지가 아닌 나라(예: 홍콩)에서 사면 FTA 혜택을 받을 수 없습니다.</p>
      </section>
      <section className="box">
        <h2>3. 도착 후</h2>
        <ul className="list">
          <li>통관 단계에서 세금 납부 안내(카카오톡·문자)가 옵니다. 안내에 따라 수령인이 납부하면 반출됩니다.</li>
          <li>실제 낸 세금을 <a href="/me">내 기록</a>에 남겨 주시면 도착가 계산 정확도를 높이는 데 씁니다.</li>
          <li>파손·분실은 판매처 책임입니다. 판매처의 보험 가입 여부를 경로 비교 화면에서 확인하세요.</li>
        </ul>
      </section>
    </div>
  );
}
