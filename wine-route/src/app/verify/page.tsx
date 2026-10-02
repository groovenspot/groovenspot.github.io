import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/server/auth";
import { devVerifyAllowed, portoneConfigured } from "@/server/identity";
import { VerifyPanel } from "@/components/VerifyPanel";
import { NicknameForm } from "@/components/NicknameForm";
import { verifyWithPortone } from "@/app/community/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "커뮤니티 가입" };

export default async function Verify({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/community";
  let user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/verify?next=${encodeURIComponent(next)}`)}`);
  // 모바일 본인인증은 결과를 redirectUrl로 돌려줍니다.
  let redirectError: string | undefined;
  if (sp.idv && !user.adultVerifiedAt && portoneConfigured()) {
    const r = await verifyWithPortone(sp.idv);
    redirectError = r.error;
    user = await getUser();
  }
  if (user!.adultVerifiedAt && user!.nickname && !sp.edit) redirect(next);

  return (
    <div className="stack-lg" style={{ maxWidth: 640, margin: "0 auto" }}>
      <section className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 28 }}>커뮤니티 가입</h1>
        <p className="lede">직구 후기를 쓰고 도움됨을 누르려면 만 19세 이상 본인인증과 닉네임이 필요합니다. <Link href="/community/rules">운영 정책</Link></p>
      </section>
      <section className="box">
        <div className="row between"><h2>1. 성인 본인인증</h2>{user!.adultVerifiedAt && <span className="chip ok">완료</span>}</div>
        {user!.adultVerifiedAt ? (
          <p className="small muted">만 19세 이상 확인을 마쳤습니다.</p>
        ) : (
          <>
            <p className="small muted">휴대폰 본인인증으로 생년월일만 확인합니다. 이름·번호는 저장하지 않습니다.</p>
            {redirectError && <div className="alert bad">{redirectError}</div>}
            <VerifyPanel next={next} dev={devVerifyAllowed()} portone={portoneConfigured() ? { storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!, channelKey: process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY! } : null} />
          </>
        )}
      </section>
      <section className="box">
        <div className="row between"><h2>2. 닉네임</h2>{user!.nickname && <span className="chip ok">{user!.nickname}</span>}</div>
        {user!.adultVerifiedAt ? <NicknameForm current={user!.nickname ?? ""} next={next} /> : <p className="small muted">본인인증 후 정할 수 있습니다.</p>}
      </section>
    </div>
  );
}
