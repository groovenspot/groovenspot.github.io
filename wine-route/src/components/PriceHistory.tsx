import { historyStats } from "@/lib/history";
import { won } from "@/lib/format";

type Cell = { day: string; value: number | null };

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;

/** 와인 상세의 도착가 추이. 빈 날(수집 전·품절)은 선을 끊고, 국내가가 범위 안이면 점선으로 겹칩니다. */
export function PriceHistory({ cells, krPrice }: { cells: Cell[]; krPrice: number | null }) {
  const st = historyStats(cells);
  if (!st) return <p className="small muted">도착가 기록을 쌓는 중입니다. 하루 한 번 기록하며 이틀 치가 모이면 추이가 보입니다. 1병·750ml가 아닌 조건은 찜한 경우에만 기록합니다.</p>;

  // 글자는 SVG 밖(HTML)에 둡니다. SVG 안 글자는 휴대폰 폭에서 6px 까지 줄어듭니다.
  const W = 640, H = 150, L = 6, R = 6, T = 8, B = 8;
  const lo = Math.min(st.min, krPrice ?? Infinity), hi = Math.max(st.max, krPrice !== null && krPrice < st.max * 1.6 ? krPrice : -Infinity);
  const pad = (hi - lo) * 0.08 || hi * 0.05 || 1;
  const y0 = lo - pad, y1 = hi + pad;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, cells.length - 1);
  const y = (v: number) => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));

  // 빈 날마다 선을 끊어 여러 조각으로
  const segs: string[] = [];
  let cur = "";
  cells.forEach((c, i) => {
    if (c.value === null) { if (cur) segs.push(cur); cur = ""; return; }
    cur += `${cur ? "L" : "M"}${x(i).toFixed(1)} ${y(c.value).toFixed(1)}`;
  });
  if (cur) segs.push(cur);
  const lastI = cells.length - 1 - [...cells].reverse().findIndex((c) => c.value !== null);
  const minI = cells.findIndex((c) => c.day === st.minDay);
  const showKr = krPrice !== null && krPrice >= y0 && krPrice <= y1;
  const ticks = [0, Math.floor((cells.length - 1) / 2), cells.length - 1];

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 16 }}>
        <span className="small">최근 {cells.length}일 최저 <b className="num">{won(st.min)}</b> <span className="muted">({md(st.minDay)})</span></span>
        <span className="small">최고 <b className="num">{won(st.max)}</b></span>
        <span className={`small num ${st.changePct <= 0 ? "pos" : "neg"}`}>기간 처음 대비 {st.changePct > 0 ? "+" : ""}{st.changePct}%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`최근 ${cells.length}일 병당 도착가: 최저 ${won(st.min)}, 최고 ${won(st.max)}, 지금 ${won(st.last)}`} style={{ display: "block" }}>
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--line)" vectorEffect="non-scaling-stroke" />
        {showKr && <line x1={L} x2={W - R} y1={y(krPrice!)} y2={y(krPrice!)} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        {segs.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--glass)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
        {minI >= 0 && <circle cx={x(minI)} cy={y(st.min)} r="3.5" fill="none" stroke="var(--accent)" strokeWidth="1.6" />}
        <circle cx={x(lastI)} cy={y(cells[lastI].value!)} r="3.5" fill="var(--glass)" />
      </svg>
      <div className="row between small muted" style={{ marginTop: -4 }}>
        {ticks.map((i) => <span key={i}>{md(cells[i].day)}</span>)}
      </div>
      <div className="row small muted" style={{ gap: 14 }}>
        <span><svg width="18" height="8" aria-hidden="true"><line x1="0" x2="18" y1="4" y2="4" stroke="var(--glass)" strokeWidth="2" /></svg> 병당 도착가</span>
        <span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--accent)" strokeWidth="1.6" /></svg> 기간 최저</span>
        {showKr && <span><svg width="18" height="8" aria-hidden="true"><line x1="0" x2="18" y1="4" y2="4" stroke="var(--muted)" strokeDasharray="4 3" /></svg> 국내가 {won(krPrice!)}</span>}
      </div>
      <p className="small muted">최저 경로 병당 도착가를 하루 한 번 기록합니다(1병·750ml는 모든 와인, 다른 수량·용량은 누군가 찜한 경우). 빈 구간은 기록 전이거나 살 수 있는 경로가 없던 날입니다.</p>
    </div>
  );
}
