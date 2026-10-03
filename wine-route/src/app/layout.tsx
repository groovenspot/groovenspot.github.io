import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getUser, isAdminEmail } from "@/server/auth";
import { prisma } from "@/server/db";
import { ConsultationWidget } from "@/components/ConsultationWidget";
import { cookies } from "next/headers";
import { siteUrl } from "@/lib/site";
import { COMPARE_COOKIE, COMPARE_MAX, parseIds } from "@/lib/wineList";

export const metadata: Metadata = {
  title: { default: "셀러도어 · 와인 직구 도착가 비교", template: "%s · 셀러도어" },
  description: "세금·운임을 모두 넣은 한국 도착가로 와인 직구 경로를 비교합니다.",
  metadataBase: new URL(siteUrl()),
  applicationName: "셀러도어",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "셀러도어",
    title: "셀러도어 · 와인 직구 도착가 비교",
    description: "세금·운임을 모두 넣은 한국 도착가로 와인 직구 경로를 비교합니다.",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const compareCount = parseIds((await cookies()).get(COMPARE_COOKIE)?.value, COMPARE_MAX).length;
  if (user) {
    // 재방문율 KPI용 방문일 기록 (KST 하루 1건)
    const day = new Date(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10));
    void prisma.userDay.upsert({ where: { userId_day: { userId: user.id, day } }, update: {}, create: { userId: user.id, day } }).catch(() => {});
  }
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;800&family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <header className="site-head">
          <div className="wrap">
            <Link href="/" className="brand">
              셀러<em>도어</em>
            </Link>
            <nav className="nav" aria-label="주 메뉴">
              <Link href="/">와인 찾기</Link>
              <Link href="/scan">라벨 검색</Link>
              <Link href="/community">직구 후기</Link>
              <Link href="/calculator">직접 계산</Link>
              {compareCount > 0 && <Link href="/compare">비교함 {compareCount}</Link>}
              <Link href="/guide">통관 가이드</Link>
              <Link href="/guide/first">첫 직구 도우미</Link>
              {user ? (
                <>
                  <Link href="/me">내 찜·주문</Link>
                  {isAdminEmail(user.email) && <Link href="/admin">관리자</Link>}
                  <form action="/logout" method="post">
                    <button className="btn ghost small" type="submit">로그아웃</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn small">로그인</Link>
              )}
            </nav>
          </div>
        </header>
        <main>
          <div className="wrap">{children}</div>
        </main>
        <footer className="site-foot">
          <div className="wrap">
            <span>셀러도어는 와인을 판매하지 않습니다. 해외 판매처 정보와 도착가 계산을 제공하고, 주문과 결제는 소비자가 해외 판매처에서 직접 합니다.</span>
            <span>세금은 2026년 10월 공개 기준(1병·1L·150달러 이하 주세·교육세만, FTA 원산지 구매 관세 0%, 제3국 구매 관세 15%)으로 계산한 예상치이며 실제 납부액과 다를 수 있습니다.</span>
          </div>
        </footer>
        <ConsultationWidget />
      </body>
    </html>
  );
}
