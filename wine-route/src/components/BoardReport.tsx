import { reportBoard } from "@/app/community/board/actions";
import { REPORT_REASONS } from "@/lib/community";

/** 신고: 사유를 고르면 바로 숨겨지고 운영자가 확인합니다. */
export function BoardReport({ targetType, targetId, back }: { targetType: "post" | "comment"; targetId: string; back: string }) {
  return (
    <details className="small">
      <summary className="muted">신고</summary>
      <form action={reportBoard} className="row" style={{ gap: 6, marginTop: 6 }}>
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="back" value={back} />
        <select name="reason" aria-label="신고 사유" defaultValue={REPORT_REASONS[0]}>
          {REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <button className="btn ghost small">신고하기</button>
      </form>
    </details>
  );
}
