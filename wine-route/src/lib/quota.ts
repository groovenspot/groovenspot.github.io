/**
 * 라벨 사진 인식 사용 한도. 인식은 유료 API라 한 사람·한 접속지·전체 하루 상한을 둡니다.
 * 글자 직접 입력(scanText)은 API를 쓰지 않아 한도와 무관합니다.
 */
export type ScanLimits = { memberPerDay: number; anonPerDay: number; perMinute: number; globalPerDay: number };

export const DEFAULT_SCAN_LIMITS: ScanLimits = { memberPerDay: 20, anonPerDay: 5, perMinute: 3, globalPerDay: 1000 };

const int = (v: string | undefined, d: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : d;
};

/** 환경변수로 조정: SCAN_LIMIT_MEMBER, SCAN_LIMIT_ANON, SCAN_LIMIT_PER_MINUTE, SCAN_LIMIT_GLOBAL */
export const scanLimits = (env: Record<string, string | undefined> = process.env): ScanLimits => ({
  memberPerDay: int(env.SCAN_LIMIT_MEMBER, DEFAULT_SCAN_LIMITS.memberPerDay),
  anonPerDay: int(env.SCAN_LIMIT_ANON, DEFAULT_SCAN_LIMITS.anonPerDay),
  perMinute: int(env.SCAN_LIMIT_PER_MINUTE, DEFAULT_SCAN_LIMITS.perMinute),
  globalPerDay: int(env.SCAN_LIMIT_GLOBAL, DEFAULT_SCAN_LIMITS.globalPerDay),
});

export type ScanUsage = { member: boolean; userDay: number; ipDay: number; ipMinute: number; globalDay: number };

export type ScanDecision = { ok: true; remaining: number } | { ok: false; error: string };

export function decideScan(u: ScanUsage, l: ScanLimits): ScanDecision {
  if (u.globalDay >= l.globalPerDay) return { ok: false, error: "오늘은 사진 인식 이용이 많아 잠시 멈췄습니다. 라벨 글자를 직접 입력해 찾아 주세요." };
  if (u.ipMinute >= l.perMinute) return { ok: false, error: "사진을 너무 빠르게 보내고 있습니다. 1분 뒤 다시 시도해 주세요." };
  if (u.member) {
    if (u.userDay >= l.memberPerDay) return { ok: false, error: `사진 인식은 하루 ${l.memberPerDay}번까지입니다. 내일 다시 쓰거나 라벨 글자를 직접 입력해 주세요.` };
    // 같은 접속지에서 여러 계정을 돌려 쓰는 경우도 막습니다.
    if (u.ipDay >= l.memberPerDay * 3) return { ok: false, error: "이 접속지에서 오늘 사진 인식을 너무 많이 썼습니다. 라벨 글자를 직접 입력해 주세요." };
    return { ok: true, remaining: l.memberPerDay - u.userDay - 1 };
  }
  if (u.ipDay >= l.anonPerDay) return { ok: false, error: `로그인하지 않으면 사진 인식은 하루 ${l.anonPerDay}번까지입니다. 로그인하면 하루 ${l.memberPerDay}번까지 쓸 수 있습니다.` };
  return { ok: true, remaining: l.anonPerDay - u.ipDay - 1 };
}
