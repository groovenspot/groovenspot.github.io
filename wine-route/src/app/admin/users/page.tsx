import { prisma } from "@/server/db";
import { setPlan } from "@/app/admin/actions";
import { ymd } from "@/lib/format";

export default async function UsersPage() {
  const [users, waitlist] = await Promise.all([
    prisma.user.findMany({ include: { _count: { select: { alerts: true, purchases: true, clicks: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.waitlist.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="stack-lg">
      <section className="stack">
        <h1 style={{ fontSize: 28 }}>회원 {users.length}명</h1>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>이메일</th><th>가입일</th><th className="r">알림</th><th className="r">구매 기록</th><th className="r">판매처 이동</th><th>등급</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td className="num small">{ymd(u.createdAt)}</td>
                  <td className="r">{u._count.alerts}</td>
                  <td className="r">{u._count.purchases}</td>
                  <td className="r">{u._count.clicks}</td>
                  <td>
                    <form action={setPlan} className="row" style={{ flexWrap: "nowrap" }}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="plan" value={u.plan === "PREMIUM" ? "FREE" : "PREMIUM"} />
                      <span className={`chip ${u.plan === "PREMIUM" ? "best" : ""}`}>{u.plan === "PREMIUM" ? "프리미엄" : "무료"}</span>
                      <button className="btn ghost small">{u.plan === "PREMIUM" ? "무료로" : "프리미엄으로"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="stack">
        <div className="row between">
          <h2>대기자 {waitlist.length.toLocaleString("ko-KR")} / 1,000명</h2>
        </div>
        <div className="meter"><i style={{ width: `${Math.min(100, waitlist.length / 10)}%` }} /></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>이메일</th><th>찾는 와인</th><th className="r">목표가</th><th>목적</th><th>등록일</th></tr></thead>
            <tbody>
              {waitlist.length ? waitlist.map((w) => (
                <tr key={w.id}><td>{w.email}</td><td className="small">{w.wish ?? "-"}</td><td className="r">{w.target ? w.target.toLocaleString("ko-KR") : "-"}</td><td className="small">{w.purpose ?? "-"}</td><td className="num small">{ymd(w.createdAt)}</td></tr>
              )) : <tr><td colSpan={5} className="muted">아직 대기자가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
