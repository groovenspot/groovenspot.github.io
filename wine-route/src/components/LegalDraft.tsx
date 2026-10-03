/** 처리방침·약관 공통: 검토 전 초안 표시 */
export function LegalDraft({ version }: { version: string }) {
  return (
    <div className="alert" role="note">
      <b>검토 전 초안입니다.</b> 서비스 코드가 실제로 수집·처리하는 항목을 기준으로 작성했으며, 변호사·개인정보 전문가 검토를 거쳐 확정합니다. 확정 전에는 공개 서비스에 쓰지 마세요. <span className="small muted">초안 {version}</span>
    </div>
  );
}
