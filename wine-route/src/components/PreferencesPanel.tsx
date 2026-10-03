import { BUDGET_BANDS } from "@/lib/taste";
import { deleteTaste, saveTaste, setMarketingConsent } from "@/app/me/actions";

type Props = {
  marketing: boolean;
  marketingUpdated: string | null; // 표시용 날짜 (YYYY-MM-DD)
  taste: { countries: string[]; types: string[]; budget: string | null } | null;
  countries: string[];
  types: string[];
};

/** 마이페이지 설정: 마케팅 수신 동의와 취향 설문. 둘 다 선택이며 언제든 바꾸거나 지울 수 있습니다. */
export function PreferencesPanel({ marketing, marketingUpdated, taste, countries, types }: Props) {
  return (
    <div className="stack">
      <form action={setMarketingConsent} className="box stack" style={{ gap: 8 }}>
        <div className="label">마케팅 수신 (선택)</div>
        <label className="check">
          <input type="checkbox" name="marketing" defaultChecked={marketing} /> 신규 와인 소개와 이벤트 소식을 받겠습니다.
        </label>
        <p className="small muted">
          가격 알림과 주문 상태 안내는 이 설정과 상관없이 보내드립니다. 동의하지 않아도 모든 기능을 쓸 수 있고, 언제든 해제할 수 있습니다.
          {marketingUpdated ? ` 마지막 변경 ${marketingUpdated}.` : ""}
        </p>
        <div><button className="btn small">저장</button></div>
      </form>

      <form action={saveTaste} className="box stack" style={{ gap: 12 }}>
        <div className="label">취향 설문 (선택)</div>
        <p className="small muted">고르면 맞는 와인을 먼저 보여드리는 데 씁니다. 소득이나 자산은 묻지 않습니다. 모두 비우고 저장하면 설문이 지워집니다.</p>
        <fieldset className="stack" style={{ gap: 6, border: 0, padding: 0, margin: 0 }}>
          <legend className="label">좋아하는 산지</legend>
          <div className="row">
            {countries.map((c) => (
              <label key={c} className="check"><input type="checkbox" name="countries" value={c} defaultChecked={taste?.countries.includes(c)} /> {c}</label>
            ))}
          </div>
        </fieldset>
        <fieldset className="stack" style={{ gap: 6, border: 0, padding: 0, margin: 0 }}>
          <legend className="label">좋아하는 종류</legend>
          <div className="row">
            {types.map((t) => (
              <label key={t} className="check"><input type="checkbox" name="types" value={t} defaultChecked={taste?.types.includes(t)} /> {t}</label>
            ))}
          </div>
        </fieldset>
        <fieldset className="stack" style={{ gap: 6, border: 0, padding: 0, margin: 0 }}>
          <legend className="label">병당 도착가 예산</legend>
          <div className="row">
            {BUDGET_BANDS.map((b) => (
              <label key={b.id} className="check"><input type="radio" name="budget" value={b.id} defaultChecked={taste?.budget === b.id} /> {b.label}</label>
            ))}
          </div>
        </fieldset>
        <div className="row">
          <button className="btn small">설문 저장</button>
        </div>
      </form>
      {taste && (
        <form action={deleteTaste}>
          <button className="btn ghost small">저장된 설문 삭제</button>
        </form>
      )}
    </div>
  );
}
