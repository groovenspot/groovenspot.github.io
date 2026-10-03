import Link from "next/link";
import { checkCode, sendCode } from "./actions";
import { PROVIDER_LABEL, enabledProviders, safeNext } from "@/lib/oauth";

export const metadata = { title: "로그인" };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const socials = enabledProviders();
  const codeStep = sp.step === "code" && sp.email;
  return (
    <div className="box" style={{ maxWidth: 420, margin: "24px auto" }}>
      <h1 style={{ fontSize: 24 }}>로그인</h1>
      <p className="small muted">비밀번호 없이 이메일로 받은 6자리 코드로 로그인합니다. 처음이면 자동으로 가입됩니다. 가입 전에 <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보 처리방침</Link>을 확인해 주세요.</p>
      {sp.error && <div className="alert bad">{sp.error}</div>}
      {codeStep ? (
        <form action={checkCode} className="stack">
          <input type="hidden" name="email" value={sp.email} />
          <input type="hidden" name="next" value={next} />
          <p className="small"><b>{sp.email}</b>로 코드를 보냈습니다. 10분 안에 입력해 주세요.</p>
          <div className="field">
            <label className="label" htmlFor="code">로그인 코드</label>
            <input id="code" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required autoFocus />
          </div>
          <button className="btn">로그인</button>
          <a href={`/login?next=${encodeURIComponent(next)}`} className="small muted">다른 이메일로 받기</a>
        </form>
      ) : (
        <form action={sendCode} className="stack">
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label className="label" htmlFor="email">이메일</label>
            <input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </div>
          <button className="btn">코드 받기</button>
        </form>
      )}
      {!codeStep && socials.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="small muted" style={{ textAlign: "center" }}>또는</div>
          {socials.map((p) => (
            <a key={p} className={`btn social ${p}`} href={`/login/oauth/${p}?next=${encodeURIComponent(next)}`}>{PROVIDER_LABEL[p]}로 계속하기</a>
          ))}
          <p className="small muted">소셜 계정의 인증된 이메일로 가입·로그인합니다. 같은 이메일로 가입한 계정이 있으면 그 계정에 연결됩니다.</p>
        </div>
      )}
    </div>
  );
}
