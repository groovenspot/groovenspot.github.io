import Link from "next/link";
import { prisma } from "@/server/db";
import { ymdhm } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "관리자 작업 기록" };

/** 작업 이름 → 한국어 (모르는 이름은 그대로 표시) */
const LABEL: Record<string, string> = {
  runJobAction: "정기 작업 실행", saveWine: "와인 저장", deleteWine: "와인 삭제", saveOffer: "판매 정보 저장", deleteOffer: "판매 정보 삭제",
  importOffers: "CSV 가져오기", saveSeller: "판매처 저장", saveForwarder: "배송대행지 저장", saveTax: "세율 설정", saveFx: "환율 설정",
  setRate: "환율 직접 입력", setPlan: "회원 등급 변경", adminMoveOrder: "주문 상태 변경", approveProof: "통관 인증 승인", rejectProof: "통관 인증 반려",
  resolveReports: "후기 신고 처리", resolveBoardReports: "게시판 신고 처리", suspendSeller: "판매처 노출 중단", grantKings: "후기왕 보상",
  createInvite: "초대 코드 생성", adjustPoints: "포인트 조정", saveCommunity: "커뮤니티 설정", openAllocation: "배정 판매 알림",
  addScanAlias: "검색 별칭 추가", setRequestStatus: "구해주세요 상태", saveSegments: "세그먼트 기준값", sendMarketing: "홍보 발송",
  setRequestGroupStatus: "구해주세요 묶음 상태", saveStatement: "수수료 정산",
};

const PAGE = 50;

export default async function AdminAudit({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const where = {
    ...(sp.action ? { action: sp.action } : {}),
    ...(sp.admin ? { adminEmail: sp.admin } : {}),
    ...(sp.fail === "1" ? { ok: false } : {}),
  };
  const [rows, total, actions, admins] = await Promise.all([
    prisma.adminLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.adminLog.count({ where }),
    prisma.adminLog.groupBy({ by: ["action"], _count: true, orderBy: { action: "asc" } }),
    prisma.adminLog.groupBy({ by: ["adminEmail"], _count: true, orderBy: { adminEmail: "asc" } }),
  ]);
  const pages = Math.ceil(total / PAGE);
  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ action: sp.action, admin: sp.admin, fail: sp.fail, page, ...patch })) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    return `/admin/audit${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="stack-lg">
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>관리자 작업 기록</h1>
        <span className="small muted">{total.toLocaleString("ko-KR")}건 · 비밀값은 가리고 긴 글은 잘라서 남깁니다</span>
      </div>
      <form className="row" action="/admin/audit" method="get">
        <select name="action" defaultValue={sp.action ?? ""} aria-label="작업">
          <option value="">모든 작업</option>
          {actions.map((a) => <option key={a.action} value={a.action}>{LABEL[a.action] ?? a.action} ({a._count})</option>)}
        </select>
        <select name="admin" defaultValue={sp.admin ?? ""} aria-label="관리자">
          <option value="">모든 관리자</option>
          {admins.map((a) => <option key={a.adminEmail} value={a.adminEmail}>{a.adminEmail}</option>)}
        </select>
        <label className="check small"><input type="checkbox" name="fail" value="1" defaultChecked={sp.fail === "1"} /> 실패만</label>
        <button className="btn ghost small">보기</button>
        {(sp.action || sp.admin || sp.fail) && <Link className="small" href="/admin/audit">초기화</Link>}
      </form>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>시각</th><th>관리자</th><th>작업</th><th>결과</th><th>보낸 값</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="small nowrap">{ymdhm(r.createdAt)}</td>
                <td className="small">{r.adminEmail}</td>
                <td>{LABEL[r.action] ?? r.action}</td>
                <td>{r.ok ? <span className="chip ok">완료</span> : <span className="chip bad" title={r.error ?? ""}>실패</span>}{!r.ok && r.error && <div className="small neg">{r.error}</div>}</td>
                <td className="small muted" style={{ maxWidth: 460, overflowWrap: "anywhere" }}>
                  {Object.entries(r.detail as Record<string, string>).map(([k, v]) => <span key={k}><b>{k}</b>={v} </span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="small muted">기록이 없습니다.</p>}
      {pages > 1 && <nav className="seg" aria-label="페이지">{Array.from({ length: Math.min(pages, 20) }, (_, i) => i + 1).map((n) => <Link key={n} href={href({ page: n })} aria-current={n === page ? "true" : undefined}>{n}</Link>)}</nav>}
    </div>
  );
}
