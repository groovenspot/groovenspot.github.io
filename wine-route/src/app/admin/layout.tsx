import Link from "next/link";
import { requireAdmin } from "@/server/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "관리자" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="stack-lg">
      <nav className="admin-nav" aria-label="관리자 메뉴">
        <Link href="/admin">지표·작업</Link>
        <Link href="/admin/orders">주문</Link>
        <Link href="/admin/wines">와인·판매 정보</Link>
        <Link href="/admin/sellers">셀러·배송대행지</Link>
        <Link href="/admin/import">CSV 가져오기</Link>
        <Link href="/admin/crawl">가격 수집 상태</Link>
        <Link href="/admin/settings">세율·환율</Link>
        <Link href="/admin/users">회원·대기자</Link>
      </nav>
      {children}
    </div>
  );
}
