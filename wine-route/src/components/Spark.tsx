import { sparkPath } from "@/lib/alerts";

/** 30일 가격 선. 목표가를 점선으로, 마지막 값을 점으로 */
export function Spark({ values, target, w = 120, h = 32 }: { values: (number | null)[]; target?: number; w?: number; h?: number }) {
  const nums = values.filter((v): v is number => v !== null);
  const d = sparkPath(values, w, h);
  if (!d) return <span className="small muted">기록 쌓는 중</span>;
  const y = (v: number) => 2 + (h - 4) * (1 - (v - Math.min(...nums)) / (Math.max(...nums) - Math.min(...nums) || 1));
  const last = values.length - 1 - [...values].reverse().findIndex((v) => v !== null);
  const step = (w - 4) / Math.max(1, values.length - 1);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`최근 30일 도착가 ${nums[0].toLocaleString("ko-KR")}원에서 ${nums[nums.length - 1].toLocaleString("ko-KR")}원`}>
      {target !== undefined && target >= Math.min(...nums) && target <= Math.max(...nums) && (
        <line x1="2" x2={w - 2} y1={y(target)} y2={y(target)} stroke="var(--accent)" strokeDasharray="3 3" strokeWidth="1" />
      )}
      <path d={d} fill="none" stroke="var(--glass)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={2 + last * step} cy={y(values[last]!)} r="2.6" fill="var(--glass)" />
    </svg>
  );
}
