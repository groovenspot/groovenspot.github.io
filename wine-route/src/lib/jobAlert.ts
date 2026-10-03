/**
 * 정기 작업 실패 알림: 같은 작업이 연속으로 실패한 횟수가 기준에 닿는 순간 한 번, 다시 성공하면 한 번 알립니다.
 * recent = 그 작업의 최근 실행 결과 (최신이 먼저, 방금 실행 포함)
 */
export const JOB_ALERT_STREAK = 2;

export function jobAlertKind(recent: boolean[], streak = JOB_ALERT_STREAK): "failing" | "recovered" | null {
  if (!recent.length) return null;
  const fails = recent.findIndex((ok) => ok);
  const leadingFails = fails === -1 ? recent.length : fails;
  if (!recent[0]) return leadingFails === streak ? "failing" : null;
  // 방금 성공: 바로 앞까지 기준 이상 연속 실패였으면 복구 알림
  const before = recent.slice(1);
  const prevFails = before.findIndex((ok) => ok);
  return (prevFails === -1 ? before.length : prevFails) >= streak ? "recovered" : null;
}
