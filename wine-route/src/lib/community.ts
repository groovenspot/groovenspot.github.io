/** 커뮤니티 규칙. DB와 무관한 순수 함수입니다. */

export type CommunityConfig = {
  /** 개인 간 거래·공동구매·음주 권장 차단 패턴 (정규식 문자열, 대소문자 무시) */
  bannedPatterns: string[];
  /** 이 날짜(포함)까지 후기 포인트 배수 적용 (오픈 첫 달 2배) */
  bonusUntil: string | null;
  bonusMultiplier: number;
  points: { review: number; proof: number; helpful10: number; answer: number };
  costs: { premiumMonth: number; tasting: number };
  /** 2단계(마이 셀러·구해주세요·등급)를 여는 기준 — 가안 */
  stage2: { reviews: number; members: number };
  /** 자유게시판: auto = 2단계 기준에 닿으면 열림, open = 지금 열기, closed = 닫기 */
  boardMode: BoardMode;
};

export type BoardMode = "auto" | "open" | "closed";
export const BOARD_MODES: BoardMode[] = ["auto", "open", "closed"];

export const DEFAULT_COMMUNITY: CommunityConfig = {
  bannedPatterns: [
    // 개인 간 거래
    "팝니다", "팔아요", "판매\\s*합니다", "판매해요", "판매\\s*중", "양도", "나눔", "교환\\s*(해요|원해|합니다|하실)", "삽니다", "사요\\b", "구매\\s*희망", "구해\\s*드립니다",
    "직거래", "택포", "반값", "입금", "계좌", "선착순",
    // 공동구매 모집
    "공구", "공동\\s*구매", "같이\\s*(사|주문|구매|합배송)", "합배송\\s*(모집|구해|하실|참여|함께)", "묶음\\s*배송\\s*모집", "모집\\s*(합니다|해요|중)",
    // 연락처 유도
    "오픈\\s*채팅", "open\\.kakao", "카톡\\s*(아이디|id)", "텔레그램", "01[0-9][-\\s]?\\d{3,4}[-\\s]?\\d{4}",
    // 음주 권장
    "원샷", "폭음", "부어라", "필름\\s*끊",
  ],
  bonusUntil: null,
  bonusMultiplier: 2,
  points: { review: 300, proof: 500, helpful10: 200, answer: 500 },
  costs: { premiumMonth: 3000, tasting: 5000 },
  stage2: { reviews: 300, members: 1000 },
  boardMode: "auto",
};

/* ---------- 자유게시판 ---------- */
export const BOARD_CATEGORIES = { free: "자유", question: "질문", info: "정보" } as const;
export type BoardCategory = keyof typeof BOARD_CATEGORIES;
export const isBoardCategory = (c: string): c is BoardCategory => c in BOARD_CATEGORIES;
export const BOARD_LIMITS = { postsPerDay: 10, commentsPerDay: 60, title: [2, 80], body: [5, 5000], comment: [1, 1000] } as const;

export function boardOpen(cfg: Pick<CommunityConfig, "boardMode" | "stage2">, published: number, members: number) {
  if (cfg.boardMode === "open") return true;
  if (cfg.boardMode === "closed") return false;
  return published >= cfg.stage2.reviews && members >= cfg.stage2.members;
}

const len = (s: string) => [...s].length;

/** 글 검사: 길이, 금지 표현(개인 간 거래·공동구매·연락처·음주 권장) */
export function validatePost(input: { category: string; title: string; body: string }, patterns: string[]): string | null {
  if (!isBoardCategory(input.category)) return "말머리를 골라 주세요.";
  const title = input.title.trim(), body = input.body.trim();
  const [tMin, tMax] = BOARD_LIMITS.title, [bMin, bMax] = BOARD_LIMITS.body;
  if (len(title) < tMin || len(title) > tMax) return `제목은 ${tMin}~${tMax}자입니다.`;
  if (len(body) < bMin || len(body) > bMax) return `본문은 ${bMin}~${bMax.toLocaleString("ko-KR")}자입니다.`;
  const hit = findBanned(`${title}\n${body}`, patterns);
  if (hit) return `'${hit}' 같은 표현은 쓸 수 없습니다. 개인 간 거래·공동구매·연락처 교환·음주 권장은 운영 정책상 금지입니다.`;
  return null;
}

export function validateComment(body: string, patterns: string[]): string | null {
  const b = body.trim();
  const [min, max] = BOARD_LIMITS.comment;
  if (len(b) < min || len(b) > max) return `댓글은 ${min}~${max.toLocaleString("ko-KR")}자입니다.`;
  const hit = findBanned(b, patterns);
  if (hit) return `'${hit}' 같은 표현은 쓸 수 없습니다.`;
  return null;
}

/** 금지 표현을 찾으면 그 표현을 돌려줍니다. */
export function findBanned(text: string, patterns: string[]): string | null {
  const t = text.normalize("NFC");
  for (const p of patterns) {
    let re: RegExp;
    try {
      re = new RegExp(p, "i");
    } catch {
      continue;
    }
    const m = t.match(re);
    if (m) return m[0];
  }
  return null;
}

/** 만 나이 (생년월일 YYYY-MM-DD, 기준일 KST) */
export function fullAge(birthDate: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return NaN;
  const [y, m, d] = birthDate.split("-").map(Number);
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() !== y || date.getUTCMonth() + 1 !== m || date.getUTCDate() !== d) return NaN;
  const k = new Date(now.getTime() + 9 * 3600e3);
  const ny = k.getUTCFullYear(), nm = k.getUTCMonth() + 1, nd = k.getUTCDate();
  return ny - y - (nm < m || (nm === m && nd < d) ? 1 : 0);
}
export const isAdult = (birthDate: string, now = new Date()) => /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && fullAge(birthDate, now) >= 19;

export function validNickname(n: string, patterns: string[]): string | null {
  const s = n.trim();
  if (!/^[가-힣a-zA-Z0-9_]{2,12}$/.test(s)) return "닉네임은 한글·영문·숫자 2~12자입니다.";
  if (/운영자|관리자|admin|셀러도어|와인루트/i.test(s)) return "운영자로 오해할 수 있는 닉네임은 쓸 수 없습니다.";
  if (findBanned(s, patterns)) return "쓸 수 없는 표현이 들어 있습니다.";
  return null;
}

/** 후기 포인트 배수 (오픈 이벤트 기간) */
export function pointMultiplier(cfg: CommunityConfig, now = new Date()) {
  if (!cfg.bonusUntil) return 1;
  const until = new Date(`${cfg.bonusUntil}T23:59:59+09:00`);
  return now <= until ? cfg.bonusMultiplier : 1;
}

/** 도움됨 수가 이번에 넘은 10단위 구간 (보상 대상) */
export const helpfulMilestone = (count: number) => (count > 0 && count % 10 === 0 ? count / 10 : null);

/** 이달의 후기왕 점수: 후기 1, 인증 후기 +2, 도움됨 10개당 1 */
export function kingScore(r: { reviews: number; verified: number; helpful: number }) {
  return r.reviews + r.verified * 2 + Math.floor(r.helpful / 10);
}

/** 실측 병당 절약액 (국내가 기준). 결제액이 없으면 null */
export function measuredSaving(r: { cardPaidKrw: number | null; taxPaid: number; qty: number; bottleMl: number }, krPrice750: number | null) {
  if (!r.cardPaidKrw || !krPrice750) return null;
  const kr = krPrice750 * (r.bottleMl / 750);
  return kr - (r.cardPaidKrw + r.taxPaid) / r.qty;
}

/** 주문 기록에서 배송일 (주문 확정 또는 이동 → 도착) */
export function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400e3));
}

export const REPORT_REASONS = ["개인 간 거래·나눔", "공동구매 모집", "광고·협찬 미표시", "허위 후기", "음주 권장·부적절한 사진", "기타"] as const;
