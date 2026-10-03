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
        <Link href="/admin/growth">성장 지표</Link>
        <Link href="/admin/orders">주문</Link>
        <Link href="/admin/community">커뮤니티</Link>
        <Link href="/admin/wines">와인·판매 정보</Link>
        <Link href="/admin/sellers">셀러·배송대행지</Link>
        <Link href="/admin/import">CSV 가져오기</Link>
        <Link href="/admin/crawl">가격 수집 상태</Link>
        <Link href="/admin/settings">세율·환율</Link>
        <Link href="/admin/users">회원·대기자</Link>
        <Link href="/admin/segments">회원 세그먼트</Link>
        <Link href="/admin/marketing">홍보 발송</Link>
        <Link href="/admin/requests">구해주세요</Link>
        <Link href="/admin/commissions">수수료 정산</Link>
        <Link href="/admin/import-cost">수입 원가</Link>
        <Link href="/admin/audit">작업 기록</Link>
      </nav>
      {children}
    </div>
  );
}
