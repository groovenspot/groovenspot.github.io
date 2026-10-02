import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/server/auth";
import { monthCard, reviewCard, wineCard } from "@/server/cards";
import { monthRange } from "@/server/ranking";
import { ShareCard } from "@/components/ShareCard";
import { cardWordingProblems } from "@/lib/share";

export const dynamic = "force-dynamic";
export const metadata = { title: "도착가 공유 카드" };

export default async function SharePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getUser();
  const kind = sp.kind ?? "wine";
  const here = `/share?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`;
  if ((kind === "review" || kind === "month") && !user) redirect(`/login?next=${encodeURIComponent(here)}`);

  const m = monthRange(sp.month === "last" ? -1 : 0);
  const data =
    kind === "review" && sp.review ? await reviewCard(user!, sp.review)
    : kind === "month" ? await monthCard(user!, m.start, m.end, m.label)
    : sp.wine ? await wineCard(user, sp.wine, Math.min(24, Math.max(1, Number(sp.qty) || 1)), Number(sp.ml) || 750)
    : null;
  if (!data) return <div className="box"><p>카드를 만들 정보가 없습니다.</p><Link href="/">와인 찾기</Link></div>;
  const problems = cardWordingProblems(data);
  if (problems.length) throw new Error(`카드 문구에 광고 금지 표현: ${problems.join(", ")}`);

  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 28 }}>{kind === "month" ? "이번 달 직구 결산 카드" : kind === "review" ? "나는 이만큼 아꼈다" : "도착가 공유 카드"}</h1>
        <p className="lede">계산 결과를 이미지 한 장으로 저장해 인스타 스토리나 카카오톡에 올려 보세요.{!user && " 로그인하면 내 공유자 코드가 들어가, 이 카드로 3명이 가입할 때 프리미엄 1개월을 드립니다."}</p>
        {kind === "month" && (
          <nav className="seg"><Link href="/share?kind=month" aria-current={sp.month !== "last" ? "true" : undefined}>이번 달</Link><Link href="/share?kind=month&month=last" aria-current={sp.month === "last" ? "true" : undefined}>지난달</Link></nav>
        )}
      </section>
      <ShareCard data={data} wineId={sp.wine} />
    </div>
  );
}
