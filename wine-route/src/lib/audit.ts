/** 관리자 작업 기록에 남길 값 요약: 파일은 빼고, 긴 글은 자르고, 비밀값은 가립니다. */
const SECRET = /secret|password|token|pccc|key$/i;
const MAX = 200;

export function summarizeForm(fd: FormData | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fd) return out;
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue; // Next.js 내부 값
    const val = typeof v === "string" ? v : `[파일 ${v.size}B]`;
    const shown = SECRET.test(k) ? "***" : val.length > MAX ? `${val.slice(0, MAX)}…(${val.length}자)` : val;
    out[k] = k in out ? `${out[k]}, ${shown}` : shown;
  }
  return out;
}

/** Next.js 의 redirect()는 예외로 끝나지만 정상 완료입니다. */
export const isRedirectError = (e: unknown) => typeof (e as { digest?: unknown })?.digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT");
