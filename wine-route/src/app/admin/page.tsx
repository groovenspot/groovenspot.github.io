import { prisma } from "@/server/db";
import { ymd } from "@/lib/format";
import { runJobAction } from "./actions";

const monthStart = () => {
  const k = new Date(Date.now() + 9 * 3600e3);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1) - 9 * 3600e3);
};

export default async function AdminHome() {
  const since = monthStart();
  const d90 = new Date(Date.now() - 90 * 86400e3);
  const [conversions, clicks, views, viewers, clickers, alertUsers, waitlist, purchases, logs, repeat, commission] = await Promise.all([
    prisma.conversion.count({ where: { createdAt: { gte: since } } }),
    prisma.clickLog.count({ where: { createdAt: { gte: since } } }),
    prisma.wineView.count({ where: { createdAt: { gte: since } } }),
    prisma.wineView.groupBy({ by: ["anonId"], where: { createdAt: { gte: since } } }).then((r) => r.length),
    prisma.clickLog.groupBy({ by: ["anonId"], where: { createdAt: { gte: since } } }).then((r) => r.length),
    prisma.priceAlert.groupBy({ by: ["userId"], where: { active: true } }).then((r) => r.length),
    prisma.waitlist.count(),
    prisma.purchase.findMany({ where: { estTax: { not: null } }, select: { taxPaid: true, estTax: true } }).then(async (ps) => [
      ...ps,
      // 주문 없이 쓴 직구 후기도 실측 기록 (주문에서 쓴 후기는 구매 기록과 중복이라 제외)
      ...(await prisma.directReview.findMany({ where: { estTax: { not: null }, orderId: null, status: "PUBLISHED" }, select: { taxPaid: true, estTax: true } })),
    ]),
    prisma.jobLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.$queryRaw<{ buyers: bigint; repeaters: bigint }[]>`
      SELECT COUNT(*) AS buyers, COUNT(*) FILTER (WHERE n >= 2) AS repeaters FROM (
        SELECT c."userId", COUNT(*) AS n FROM "Conversion" v JOIN "ClickLog" c ON c.id = v."clickId"
        WHERE v."createdAt" >= ${d90} AND c."userId" IS NOT NULL GROUP BY c."userId") t`,
    prisma.$queryRaw<{ krw: number | null }[]>`
      SELECT SUM(v.commission * COALESCE(r.krw, 0)) AS krw FROM "Conversion" v
      LEFT JOIN LATERAL (SELECT krw FROM "ExchangeRate" e WHERE e.currency = v.currency ORDER BY date DESC LIMIT 1) r ON true
      WHERE v."createdAt" >= ${since}`,
  ]);
  const errs = purchases.filter((p) => p.estTax! > 0).map((p) => Math.abs(p.taxPaid - p.estTax!) / p.estTax!);
  const err = errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null;
  const rep = repeat[0];
  const repRate = rep && Number(rep.buyers) ? Number(rep.repeaters) / Number(rep.buyers) : null;

  const kpis: [string, string, string][] = [
    ["월 구매 연결 건수", conversions.toLocaleString("ko-KR"), "북극성 지표 · 제휴사 포스트백 기준 · 2단계 목표 300건"],
    ["판매처 이동", clicks.toLocaleString("ko-KR"), "이번 달 제휴 링크 클릭"],
    ["경로 비교 → 판매처 이동률", views ? `${((clickers / Math.max(1, viewers)) * 100).toFixed(1)}%` : "-", `상세 조회 ${views.toLocaleString("ko-KR")}회 · 방문 기기 ${viewers.toLocaleString("ko-KR")}`],
    ["가격 알림 등록자", alertUsers.toLocaleString("ko-KR"), "알림 1개 이상 켠 회원"],
    ["대기자", waitlist.toLocaleString("ko-KR"), "1단계 목표 1,000명"],
    ["도착가 오차", err !== null ? `±${(err * 100).toFixed(1)}%` : "-", `구매 기록·직구 후기 ${errs.length}건의 세금 예상 대비 실제 차이 평균`],
    ["재구매율", repRate !== null ? `${(repRate * 100).toFixed(0)}%` : "-", "90일 내 2회 이상 구매 연결된 회원 비율"],
    ["이번 달 수수료", commission[0]?.krw ? `${Math.round(commission[0].krw).toLocaleString("ko-KR")}원` : "-", "포스트백 수수료 합계 (최근 환율 환산)"],
  ];

  return (
    <div className="stack-lg">
      <h1 style={{ fontSize: 28 }}>핵심 지표 · {ymd(since).slice(0, 7)}</h1>
      <div className="grid-4">
        {kpis.map(([l, v, d]) => (
          <div key={l} className="box tight stat">
            <span className="label">{l}</span>
            <span className="v">{v}</span>
            <span className="small muted">{d}</span>
          </div>
        ))}
      </div>
      <section className="stack">
        <div className="row between">
          <h2>정기 작업</h2>
          <div className="row">
            {(["fx", "crawl", "alerts"] as const).map((j) => (
              <form key={j} action={runJobAction}>
                <input type="hidden" name="job" value={j} />
                <button className="btn ghost small">{j === "fx" ? "환율 갱신" : j === "crawl" ? "가격 수집" : "가격 알림 확인"} 지금 실행</button>
              </form>
            ))}
          </div>
        </div>
        <p className="small muted">운영 환경에서는 /api/cron/fx (1시간마다), /api/cron/crawl (주 1회), /api/cron/alerts (매일 환율 갱신 후)를 스케줄러로 호출합니다.</p>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>시각</th><th>작업</th><th>결과</th><th>내용</th></tr></thead>
            <tbody>
              {logs.length ? logs.map((l) => (
                <tr key={l.id}>
                  <td className="num small">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td>{l.job}</td>
                  <td>{l.ok ? <span className="chip ok">성공</span> : <span className="chip bad">실패</span>}</td>
                  <td className="small">{l.message}</td>
                </tr>
              )) : <tr><td colSpan={4} className="muted">실행 기록이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
