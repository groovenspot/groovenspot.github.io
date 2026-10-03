import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { verifyUnsubscribe } from "@/lib/unsubscribe";
import { confirmUnsubscribe } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "마케팅 메일 수신 거부", robots: { index: false } };

const mask = (e: string) => e.replace(/^(.{2}).*(@.*)$/, (_, a, b) => `${a}***${b}`);

/**
 * 메일의 수신 거부 링크가 여는 화면. 메일 보안 프로그램이 링크를 미리 열어도 거부되지 않도록 버튼을 한 번 누르게 합니다.
 * (메일 앱의 '수신 거부' 버튼은 /api/unsubscribe 로 바로 처리됩니다.)
 */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const u = sp.u ?? "", t = sp.t ?? "";
  const valid = !!u && !!t && verifyUnsubscribe(u, t);
  const user = valid ? await prisma.user.findUnique({ where: { id: u }, select: { email: true, marketingConsentAt: true } }) : null;
  return (
    <section className="box stack" style={{ maxWidth: 520, margin: "32px auto" }}>
      <h1 style={{ fontSize: 24 }}>마케팅 메일 수신 거부</h1>
      {!user ? (
        <p className="muted">링크가 올바르지 않습니다. 메일의 링크를 다시 눌러 주시거나, 로그인 후 <Link href="/me#preferences">내 정보</Link>에서 설정을 바꿔 주세요.</p>
      ) : sp.r === "done" || sp.r === "already" || !user.marketingConsentAt ? (
        <>
          <div className="alert ok">{mask(user.email)} 주소로는 더 이상 마케팅 메일을 보내지 않습니다.</div>
          <p className="small muted">가격 알림·주문 상태 같은 서비스 알림은 계속 받습니다. 다시 받으려면 <Link href="/me#preferences">내 정보</Link>에서 동의할 수 있습니다.</p>
        </>
      ) : (
        <>
          <p>{mask(user.email)} 주소로 보내는 신규 와인·이벤트 소개 메일을 그만 받으시겠어요?</p>
          <form action={confirmUnsubscribe}>
            <input type="hidden" name="u" value={u} />
            <input type="hidden" name="t" value={t} />
            <button className="btn">수신 거부</button>
          </form>
          <p className="small muted">가격 알림·주문 상태 같은 서비스 알림은 이 설정과 상관없이 계속 받습니다.</p>
        </>
      )}
    </section>
  );
}
