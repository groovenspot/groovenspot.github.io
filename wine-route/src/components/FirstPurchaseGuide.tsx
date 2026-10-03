"use client";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveGuideStep } from "@/app/guide/first/actions";
import { keepFormSubmit } from "@/components/useKeepForm";
import { ProfileForm } from "@/components/ProfileForm";
import { ROUTE_LABEL } from "@/lib/engine";
import { firstPurchaseHref, firstPurchaseOrderHref, type FirstPurchaseSelection } from "@/lib/first-purchase";

type Profile = { firstNameEn: string; lastNameEn: string; address1En: string; address2En: string; cityEn: string; provinceEn: string; zip: string; phone: string; pcccMasked: string; pcccInNote: boolean };
type P = {
  selection: FirstPurchaseSelection;
  signedIn: boolean;
  done: boolean[];
  count: number;
  readyToPurchase: boolean;
  profile: Profile | null;
  forwarder: { name: string; website: string | null } | null;
  purchaseAvailable: boolean;
  trackingHref: string;
};
const TITLES = ["성인인증과 회원가입", "개인통관고유부호 발급", "해외결제 카드 확인", "받을 주소 영문 준비", "선택한 경로 준비", "주문 후 운송장 등록"];
const FAQS: [string, string][][] = [
  [["이미 회원인데 또 가입해야 하나요?", "이메일로 로그인하면 기존 회원 정보를 불러옵니다. 성인 본인인증을 마친 회원은 첫 단계를 다시 진행하지 않아도 됩니다."], ["체크만 하면 성인인증이 되나요?", "휴대폰 본인인증으로 확인된 만 19세 이상 회원에게만 완료 표시가 붙습니다."], ["로그인 전에 선택한 와인은 유지되나요?", "이 도우미의 로그인·인증 버튼을 사용하면 선택한 와인, 수량, 경로를 이어서 확인할 수 있습니다."]],
  [["개인통관고유부호는 어디서 발급하나요?", "관세청의 개인통관고유부호 발급 사이트에서 본인인증 후 발급하거나 기존 부호를 조회할 수 있습니다."], ["셀러도어에 꼭 저장해야 하나요?", "저장하지 않아도 됩니다. 발급 완료만 체크하고 판매처 또는 배송대행지 주문서에 직접 입력하세요."], ["통관부호가 있어도 통관이 늦어질 수 있나요?", "수령인 이름과 휴대폰 번호가 발급 정보와 다르면 확인이 필요할 수 있습니다. 주문 전에 관세청에 등록된 정보와 맞춰 주세요."]],
  [["모든 카드가 해외결제가 가능한가요?", "카드사 앱 또는 고객센터에서 해외 온라인 결제 가능 여부와 해외결제 차단 설정을 확인하세요."], ["카드 수수료는 얼마인가요?", "국제 브랜드 수수료와 카드사 해외서비스 수수료는 카드마다 다릅니다. 카드사 수수료 안내와 적용 환율을 확인하세요."], ["원화와 현지 통화 중 무엇을 고르나요?", "해외 판매처의 원화결제에는 별도 환전 비용이 포함될 수 있습니다. 결제 통화와 카드사 청구 조건을 확인한 뒤 선택하세요."]],
  [["한글 주소를 자동으로 영문으로 바꾸나요?", "한국 도로명주소를 검색하면 공식 도로명주소 정보의 영문 주소를 선택할 수 있습니다. 검색이 지원되지 않으면 공식 사이트에서 확인해 직접 입력하세요."], ["동·호수도 자동으로 채워지나요?", "검색 주소에는 상세 동·호수가 포함되지 않을 수 있습니다. 주소 2에 아파트 동·호수를 직접 추가하고 수령 가능한 주소인지 확인하세요."], ["배대지를 쓰는데 한국 주소도 필요한가요?", "한국 수령 주소는 배송대행지에 등록합니다. 해외 판매처에는 배송대행지에서 받은 현지 주소와 개인 사서함 번호를 사용하세요."]],
  [["배송대행지를 쓰려면 무엇을 준비하나요?", "선택한 배송대행지에 가입하고 현지 수령 주소·개인 사서함 번호를 발급받으세요. 주류 접수 조건, 보험과 배송 신청 방법을 함께 확인하세요."], ["와이너리 직배송 주문 폼은 어떻게 쓰나요?", "영문 이름·한국 수령 주소·전화번호를 입력하고 배송 국가를 South Korea로 지정하세요. 통관부호 입력란이 없다면 판매처 안내에 따라 주문 메모 또는 고객센터로 전달하세요."], ["도우미에서 결제도 하나요?", "결제는 선택한 해외 판매처에서 직접 합니다. 준비가 끝나면 주문 화면에서 선택한 와인과 수량을 다시 확인하고 판매처 결제 화면을 여세요."]],
  [["운송장 번호는 언제 알 수 있나요?", "판매처의 발송 메일 또는 배송대행지의 출고 안내에서 확인할 수 있습니다. 결제를 완료했어도 발송 전에는 번호가 없을 수 있습니다."], ["해외 운송장과 국내 운송장이 다르면요?", "해외 운송장을 먼저 등록하고 한국 도착 후 국내 운송장이 확인되면 주문 추적 화면에서 추가하세요."], ["운송장을 등록하면 도우미가 완료되나요?", "앞의 다섯 단계를 마치고 내 주문에 실제 운송장을 등록하면 여섯 번째 단계가 완료됩니다. 배송 추적 화면에서 통관·세금·국내 배송 진행을 확인하세요."]],
];

function StepConfirm({ step, selection, label, disabled }: { step: number; selection: FirstPurchaseSelection; label: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(saveGuideStep, {} as { ok?: boolean; error?: string });
  const router = useRouter();
  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);
  return (
    <form onSubmit={keepFormSubmit(action)} className="stack">
      <input type="hidden" name="step" value={step} />
      <input type="hidden" name="offerId" value={selection.offerId ?? ""} />
      <input type="hidden" name="qty" value={selection.qty} />
      <input type="hidden" name="route" value={selection.route} />
      <label className="check"><input type="checkbox" name="confirmed" disabled={disabled || pending} required />{label}</label>
      <div><button className="btn small" disabled={disabled || pending}>{pending ? "저장하는 중…" : "확인하고 다음 단계"}</button></div>
      {state.error && <p role="alert" className="small neg">{state.error}</p>}
      {state.ok && <p role="status" className="small pos">완료한 항목을 저장했습니다.</p>}
    </form>
  );
}

export function FirstPurchaseGuide(p: P) {
  const href = firstPurchaseHref(p.selection);
  const orderHref = firstPurchaseOrderHref(p.selection);
  const current = p.done.findIndex((d) => !d);
  const canStep = (index: number) => p.signedIn && p.done.slice(0, index).every(Boolean);
  return (
    <div className="stack-lg">
      <section className="box">
        <div className="row between"><h2>준비 진행률</h2><b className="num">6단계 중 {p.count}단계</b></div>
        <progress value={p.count} max={6} aria-label="첫 직구 도우미 진행률" style={{ width: "100%", accentColor: "var(--accent)" }} />
        <p className="small muted">완료한 준비는 계정에 저장됩니다. 운송장 등록은 판매처에서 주문·발송을 마친 뒤 진행하세요.</p>
        {!p.signedIn && <div className="alert">로그인 후 준비 체크를 저장할 수 있습니다. <Link href={`/login?next=${encodeURIComponent(href)}`}>로그인하고 시작하기</Link></div>}
      </section>
      <ol className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {TITLES.map((title, i) => (
          <li key={title} className="box" id={`step-${i + 1}`} style={current === i ? { borderColor: "var(--accent)" } : undefined}>
            <div className="row between"><h2>{i + 1}. {title}</h2><span className={`chip ${p.done[i] ? "ok" : current === i ? "best" : ""}`}>{p.done[i] ? "완료" : current === i ? "지금 할 일" : "다음 단계"}</span></div>
            <details open={current === i || p.done.every(Boolean) && i === 5}>
              <summary className="small">{p.done[i] ? "준비 내용 다시 보기" : "준비 방법 보기"}</summary>
              <div className="stack" style={{ marginTop: 12 }}>
                {i === 0 && <>
                  <p className="small">이메일로 회원가입·로그인 후 휴대폰 본인인증으로 만 19세 이상임을 확인해 주세요.</p>
                  {!p.done[0] && <div><Link className="btn small" href={p.signedIn ? `/verify?next=${encodeURIComponent(href)}` : `/login?next=${encodeURIComponent(href)}`}>{p.signedIn ? "성인 본인인증하기" : "회원가입·로그인하기"}</Link></div>}
                </>}
                {i === 1 && <>
                  <p className="small">관세청에서 개인통관고유부호를 발급하거나 기존 번호를 조회하세요. 번호를 저장하지 않고 발급 여부만 체크할 수 있습니다.</p>
                  <div className="row"><a className="btn ghost small" href="https://unipass.customs.go.kr/csp/persIndex.do" target="_blank" rel="noopener noreferrer">관세청 발급·조회</a>{p.signedIn && <Link className="small" href={`/me?next=${encodeURIComponent(href)}#profile`}>암호화 저장 선택하기</Link>}</div>
                  {!p.done[1] && <StepConfirm step={2} selection={p.selection} disabled={!canStep(i)} label="개인통관고유부호를 발급·확인했어요 (번호 저장 없이 완료 가능)" />}
                </>}
                {i === 2 && <>
                  <ul className="list"><li>카드사 앱에서 해외 온라인 결제 가능 여부와 차단 설정 확인</li><li>국제 브랜드·카드사 해외결제 수수료와 이용 한도 확인</li><li>판매처 결제 통화, 카드 인증 수단 확인</li></ul>
                  {!p.done[2] && <StepConfirm step={3} selection={p.selection} disabled={!canStep(i)} label="해외결제 가능 여부와 수수료를 확인했어요" />}
                </>}
                {i === 3 && <>
                  <p className="small">한글 도로명주소를 검색해 공식 영문 주소를 선택하세요. 영문 이름과 상세 동·호수, 휴대폰은 직접 확인해 주세요.</p>
                  {p.profile && canStep(i) ? <ProfileForm v={p.profile} next={href} /> : <p className="small muted">앞의 단계를 마치면 주소를 저장할 수 있습니다. <a href="https://www.juso.go.kr/openIndexPage.do" target="_blank" rel="noopener noreferrer">도로명주소 안내시스템</a>에서 영문 주소를 확인할 수도 있습니다.</p>}
                  {!p.done[3] && <StepConfirm step={4} selection={p.selection} disabled={!canStep(i)} label="저장한 영문 주소·우편번호·수령인 정보를 확인했어요" />}
                </>}
                {i === 4 && <>
                  <p className="small"><b>{ROUTE_LABEL[p.selection.route]}</b> 준비</p>
                  {p.selection.route === "FORWARDER" ? <>
                    {p.forwarder ? <p className="small">선택한 배송대행지: <b>{p.forwarder.name}</b>{p.forwarder.website && <> · <a href={p.forwarder.website} target="_blank" rel="noopener noreferrer">가입·현지 주소 발급</a></>}</p> : <div className="alert">와인 경로 비교에서 주류 접수가 가능한 배송대행지를 먼저 선택해 주세요.</div>}
                    <ul className="list"><li>배송대행지에 가입하고 현지 주소와 개인 사서함 번호 발급</li><li>해외 판매처의 수령 주소에는 배송대행지 주소 입력</li><li>배송대행지에 한국 수령 주소·통관부호 등록, 배송 신청과 보험 조건 확인</li></ul>
                  </> : <ul className="list"><li>판매처의 한국 배송 여부와 배송비·보험 조건 확인</li><li>영문 수령인·주소·전화번호 입력, 국가 South Korea 선택</li><li>통관부호 전달 방법 확인{p.selection.route === "WINERY_DIRECT" ? ", 와이너리 주문 폼의 빈티지·수량·배송 옵션 확인" : ""}</li></ul>}
                  {!p.done[4] && <StepConfirm step={5} selection={p.selection} disabled={!canStep(i) || !p.purchaseAvailable} label="선택한 경로의 주문 준비를 마쳤어요" />}
                </>}
                {i === 5 && <>
                  <p className="small">판매처에서 결제를 마치고 발송 메일에 있는 운송장 번호를 내 주문에 등록하세요. 해외 배송부터 통관·세금 고지·국내 배송까지 한 화면에서 확인합니다.</p>
                  <div><Link className="btn small" href={p.trackingHref}>내 주문에서 운송장 등록·추적</Link></div>
                  {!p.done[5] && <p className="small muted">실제 운송장 등록 후 자동으로 완료됩니다. 아직 주문하지 않았다면 아래에서 주문 준비를 이어가세요.</p>}
                </>}
              </div>
            </details>
            <details><summary className="small muted">자주 묻는 질문 3개</summary><div className="stack" style={{ marginTop: 10 }}>{FAQS[i].map(([question, answer]) => <details key={question}><summary className="small">{question}</summary><p className="small muted" style={{ marginTop: 6 }}>{answer}</p></details>)}</div></details>
            {!p.done[i] && !canStep(i) && i > 0 && <p className="small muted">앞의 단계를 완료한 뒤 체크할 수 있습니다.</p>}
          </li>
        ))}
      </ol>
      <section className="box">
        {p.readyToPurchase ? <><h2>주문할 준비가 됐어요</h2><p className="small muted">운송장은 주문·발송 후에 등록해도 됩니다. 선택한 와인과 수량을 확인하고 판매처로 이동하세요.</p></> : <><h2>준비를 이어가세요</h2><p className="small muted">체크는 저장되므로 나중에 이어서 마칠 수 있습니다.</p></>}
        <div className="row">
          {p.readyToPurchase && p.purchaseAvailable && <Link className="btn" href={orderHref}>{p.selection.offerId ? "선택한 와인 주문하기" : "와인 경로 비교하기"}</Link>}
          <Link className="btn ghost small" href={orderHref}>도우미 건너뛰고 {p.selection.offerId ? "주문 화면 보기" : "와인 찾아보기"}</Link>
        </div>
      </section>
    </div>
  );
}
