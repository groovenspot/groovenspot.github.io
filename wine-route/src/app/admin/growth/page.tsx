import Link from "next/link";
import { prisma } from "@/server/db";
import { addScanAlias, openAllocation, setRequestStatus } from "@/app/admin/actions";
import { ymd } from "@/lib/format";

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "-");
const days = (n: number) => new Date(Date.now() - n * 86400e3);

function Kpi({ label, value, goal, note }: { label: string; value: string; goal: string; note: string }) {
  return (
    <div className="box tight stat">
      <span className="label">{label}</span>
      <span className="v">{value}</span>
      <span className="small muted">목표 {goal}</span>
      <span className="small muted">{note}</span>
    </div>
  );
}

export default async function Growth() {
  const d30 = days(30), d60 = days(60);
  const [cohort, watchers, sent, clicked, alertOrders, limitHit, converted, views, saves, newUsers, referred, visits, sharers, resolved, correct, scanUsers, requests, reqFromScan] = await Promise.all([
    prisma.userDay.groupBy({ by: ["userId"], where: { day: { gte: d60, lt: d30 } } }).then((r) => r.map((x) => x.userId)),
    prisma.priceAlert.groupBy({ by: ["userId"], where: { active: true } }).then((r) => new Set(r.map((x) => x.userId))),
    prisma.notification.count({ where: { status: "SENT", sentAt: { gte: d30 } } }),
    prisma.notification.count({ where: { status: "SENT", sentAt: { gte: d30 }, clickedAt: { not: null } } }),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT o.id) AS n FROM "Order" o JOIN "Notification" n
        ON n."userId" = o."userId" AND n."wineId" = o."wineId" AND n."clickedAt" IS NOT NULL
       AND o."createdAt" BETWEEN n."clickedAt" AND n."clickedAt" + interval '7 days'
      WHERE o."createdAt" >= ${d30}`,
    prisma.user.count({ where: { hitWatchLimitAt: { not: null } } }),
    prisma.user.count({ where: { hitWatchLimitAt: { not: null }, OR: [{ plan: "PREMIUM" }, { premiumUntil: { gt: new Date() } }] } }),
    prisma.wineView.count({ where: { createdAt: { gte: d30 } } }),
    prisma.shareEvent.count({ where: { createdAt: { gte: d30 }, kind: "wine" } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 }, referredById: { not: null } } }),
    prisma.refVisit.count({ where: { createdAt: { gte: d30 } } }),
    prisma.refVisit.groupBy({ by: ["refCode"], where: { createdAt: { gte: d30 } } }).then((r) => r.length),
    prisma.scanLog.count({ where: { resolvedAt: { not: null }, chosenWineId: { not: null }, provider: { not: "text" } } }),
    prisma.scanLog.count({ where: { correct: true, provider: { not: "text" } } }),
    prisma.scanLog.groupBy({ by: ["userId"], where: { userId: { not: null } } }).then((r) => new Set(r.map((x) => x.userId!))),
    prisma.wineRequest.count(),
    prisma.wineRequest.count({ where: { source: "scan" } }),
  ]);
  // 재방문: 31~60일 전에 방문한 회원 중 최근 30일에 다시 온 비율, 찜 여부로 나눔
  const back = new Set((await prisma.userDay.groupBy({ by: ["userId"], where: { day: { gte: d30 }, userId: { in: cohort } } })).map((r) => r.userId));
  const w = cohort.filter((u) => watchers.has(u)), nw = cohort.filter((u) => !watchers.has(u));
  const rw = w.length ? w.filter((u) => back.has(u)).length / w.length : null;
  const rnw = nw.length ? nw.filter((u) => back.has(u)).length / nw.length : null;
  // 사진 검색 사용자 vs 미사용자 평균 찜 수
  const watchCounts = await prisma.priceAlert.groupBy({ by: ["userId"], _count: true });
  const totalUsers = await prisma.user.count();
  const sumOf = (pred: (id: string) => boolean) => watchCounts.filter((x) => pred(x.userId)).reduce((a, x) => a + x._count, 0);
  const avgScan = scanUsers.size ? sumOf((id) => scanUsers.has(id)) / scanUsers.size : null;
  const avgNo = totalUsers - scanUsers.size ? sumOf((id) => !scanUsers.has(id)) / (totalUsers - scanUsers.size) : null;

  const [allocs, producers, fixes, reqs] = await Promise.all([
    prisma.allocationOpen.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.wine.findMany({ distinct: ["producer"], select: { producer: true }, orderBy: { producer: "asc" } }),
    prisma.scanLog.findMany({ where: { correct: false, chosenWineId: { not: null } }, orderBy: { resolvedAt: "desc" }, take: 20 }),
    prisma.wineRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const fixWines = await prisma.wine.findMany({ where: { id: { in: fixes.map((f) => f.chosenWineId!) } }, select: { id: true, nameKo: true, aliases: true } });

  return (
    <div className="stack-lg">
      <h1 style={{ fontSize: 28 }}>성장 지표 · 최근 30일</h1>

      <section className="stack">
        <h2>1. 가격 하락·입고 알림</h2>
        <div className="grid-4">
          <Kpi label="찜 회원 30일 재방문율" value={rw !== null ? pct(rw * 100, 100) : "-"} goal="찜 안 한 회원의 2배" note={`찜 안 한 회원 ${rnw !== null ? pct(rnw * 100, 100) : "-"} · 기준 회원 ${cohort.length}명`} />
          <Kpi label="알림 클릭률" value={pct(clicked, sent)} goal="20% 이상" note={`발송 ${sent} · 클릭 ${clicked}`} />
          <Kpi label="알림 경유 주문" value={String(Number(alertOrders[0]?.n ?? 0))} goal="증가" note="알림 클릭 후 7일 안에 같은 와인 결제 화면 이동" />
          <Kpi label="찜 한도 → 프리미엄" value={pct(converted, limitHit)} goal="5% 이상" note={`한도 도달 ${limitHit}명 중 ${converted}명`} />
        </div>
      </section>

      <section className="stack">
        <h2>2. 도착가 공유 카드</h2>
        <div className="grid-3">
          <Kpi label="계산 대비 카드 저장률" value={pct(saves, views)} goal="10% 이상" note={`와인 상세 조회 ${views} · 카드 저장·공유 ${saves}`} />
          <Kpi label="카드 링크 경유 가입" value={pct(referred, newUsers)} goal="전체 가입의 30% 이상" note={`신규 가입 ${newUsers}명 중 ${referred}명`} />
          <Kpi label="공유자 1명당 유입" value={sharers ? (visits / sharers).toFixed(1) : "-"} goal="1.5명 이상" note={`링크 방문 ${visits} · 공유자 ${sharers}명`} />
        </div>
      </section>

      <section className="stack">
        <h2>3. 라벨 사진 검색</h2>
        <div className="grid-3">
          <Kpi label="첫 후보 정답률" value={pct(correct, resolved)} goal="80% 이상 (라벨)" note={`사용자가 와인을 확정한 사진 ${resolved}건`} />
          <Kpi label="사진 검색 회원 평균 찜" value={avgScan !== null ? avgScan.toFixed(1) : "-"} goal="미사용 회원의 2배" note={`미사용 회원 ${avgNo !== null ? avgNo.toFixed(1) : "-"}개`} />
          <Kpi label="구해주세요 중 사진 경유" value={pct(reqFromScan, requests)} goal="추적" note={`요청 ${requests}건`} />
        </div>
      </section>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="box">
          <h2>와이너리 배정 판매 시작 알리기</h2>
          <p className="small muted">메일링 회원제 와이너리가 판매 시즌을 열면, 그 생산자 와인을 찜한 프리미엄 회원에게 바로 알립니다.</p>
          <form action={openAllocation} className="stack">
            <div className="field"><label className="label" htmlFor="al-prod">생산자</label>
              <select id="al-prod" name="producer" required>{producers.map((p) => <option key={p.producer}>{p.producer}</option>)}</select></div>
            <div className="field"><label className="label" htmlFor="al-note">안내 문구</label><input id="al-note" name="note" required maxLength={200} placeholder="2026 가을 배정 판매가 시작됐습니다. 마감 10월 20일." /></div>
            <div className="field"><label className="label" htmlFor="al-url">와이너리 안내 링크 (선택)</label><input id="al-url" name="url" type="url" /></div>
            <div><button className="btn">알림 보내기</button></div>
          </form>
          {allocs.length > 0 && <table className="taxtable"><tbody>{allocs.map((a) => <tr key={a.id}><td>{a.producer}<span className="formula">{a.note}</span></td><td>{ymd(a.createdAt)}</td></tr>)}</tbody></table>}
        </section>

        <section className="box">
          <h2>사진 검색 매칭 수정</h2>
          <p className="small muted">첫 후보가 틀려 사용자가 다른 와인을 고른 기록입니다. 읽은 글자를 그 와인의 검색 보정 표기로 넣으면 다음부터 바로 맞춥니다.</p>
          {fixes.length ? (
            <table className="taxtable"><tbody>{fixes.map((f) => {
              const read = (f.extracted as { query?: string; name?: string }) ?? {};
              const wine = fixWines.find((x) => x.id === f.chosenWineId);
              const alias = read.name ?? read.query ?? "";
              return (
                <tr key={f.id}>
                  <td><span className="num small">{read.query}</span><span className="formula">→ {wine?.nameKo}</span></td>
                  <td>{wine && !wine.aliases.includes(alias) ? (
                    <form action={addScanAlias}><input type="hidden" name="wineId" value={wine.id} /><input type="hidden" name="alias" value={alias} /><button className="btn ghost small">보정 표기 추가</button></form>
                  ) : <span className="small muted">반영됨</span>}</td>
                </tr>
              );
            })}</tbody></table>
          ) : <p className="small muted">수정 기록이 없습니다.</p>}
        </section>
      </div>

      <section className="stack">
        <h2>구해주세요 · 미수입 와인 수요 {requests}건</h2>
        <p className="small muted">사진 검색이나 요청으로 들어온, 셀러도어 목록에 없는 와인입니다. 판매처를 찾아 와인을 추가하거나 정식 수입 검토 목록으로 씁니다.</p>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>요청</th><th>경로</th><th>날짜</th><th>상태</th></tr></thead>
            <tbody>
              {reqs.length ? reqs.map((r) => (
                <tr key={r.id}>
                  <td>{r.text}</td>
                  <td className="small">{r.source === "scan" ? "사진 검색" : "직접"}</td>
                  <td className="num small">{ymd(r.createdAt)}</td>
                  <td>
                    <form action={setRequestStatus} className="row" style={{ flexWrap: "nowrap" }}>
                      <input type="hidden" name="id" value={r.id} />
                      <select name="status" defaultValue={r.status} aria-label="상태" style={{ width: 110 }}><option value="open">대기</option><option value="added">목록 추가함</option><option value="closed">종료</option></select>
                      <button className="btn ghost small">저장</button>
                    </form>
                  </td>
                </tr>
              )) : <tr><td colSpan={4} className="muted">요청이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
        <Link className="small" href="/admin/wines/new">와인 추가</Link>
      </section>
    </div>
  );
}
