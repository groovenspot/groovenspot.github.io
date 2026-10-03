import { afterEach, describe, expect, it, vi } from "vitest";
import { boardOpen, DEFAULT_COMMUNITY, validateComment, validatePost } from "@/lib/community";
import { authorizeUrl, enabledProviders, parseKakao, parseNaver, safeNext } from "@/lib/oauth";

const P = DEFAULT_COMMUNITY.bannedPatterns;

describe("자유게시판 규칙", () => {
  it("자동이면 후기·회원 기준에 둘 다 닿아야 열리고, 관리자가 열거나 닫을 수 있습니다", () => {
    const cfg = { stage2: { reviews: 300, members: 1000 }, boardMode: "auto" as const };
    expect(boardOpen(cfg, 300, 999)).toBe(false);
    expect(boardOpen(cfg, 300, 1000)).toBe(true);
    expect(boardOpen({ ...cfg, boardMode: "open" }, 0, 0)).toBe(true);
    expect(boardOpen({ ...cfg, boardMode: "closed" }, 9999, 9999)).toBe(false);
  });
  it("길이·말머리·금지 표현을 검사합니다", () => {
    expect(validatePost({ category: "free", title: "보르도 직구 첫 후기", body: "관세가 생각보다 적게 나왔어요." }, P)).toBeNull();
    expect(validatePost({ category: "etc", title: "제목입니다", body: "본문입니다 본문" }, P)).toContain("말머리");
    expect(validatePost({ category: "free", title: "a", body: "본문입니다 본문" }, P)).toContain("제목");
    expect(validatePost({ category: "free", title: "샤블리 팝니다", body: "두 병 있어요 연락 주세요" }, P)).toContain("팝니다");
    expect(validatePost({ category: "question", title: "같이 주문하실 분", body: "오픈채팅으로 모여요" }, P)).not.toBeNull();
    // 내 주문을 한 상자로 받는 합배송 이야기는 되고, 사람을 모으는 글은 막습니다.
    expect(validatePost({ category: "info", title: "합배송 처음 해 봤어요", body: "다음엔 합배송도 써 보려고요." }, P)).toBeNull();
    expect(validatePost({ category: "free", title: "합배송 모집합니다", body: "프랑스 배대지로 같이 받아요" }, P)).not.toBeNull();
    expect(validatePost({ category: "free", title: "보르도 같이 합배송 하실 분", body: "댓글 주세요 주세요" }, P)).not.toBeNull();
    expect(validateComment("", P)).toContain("댓글");
    expect(validateComment("010-1234-5678 로 연락", P)).not.toBeNull();
  });
});

describe("소셜 로그인", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("키가 있는 곳만 켜고, 네이버는 시크릿까지 있어야 합니다", () => {
    vi.stubEnv("KAKAO_CLIENT_ID", "k"); vi.stubEnv("NAVER_CLIENT_ID", "n"); vi.stubEnv("NAVER_CLIENT_SECRET", "");
    expect(enabledProviders()).toEqual(["kakao"]);
    vi.stubEnv("NAVER_CLIENT_SECRET", "s");
    expect(enabledProviders()).toEqual(["kakao", "naver"]);
  });
  it("동의 화면 주소에 client_id·redirect_uri·state·이메일 동의항목을 넣습니다", () => {
    vi.stubEnv("KAKAO_CLIENT_ID", "kid");
    const u = new URL(authorizeUrl("kakao", "https://cellar.example", "st8"));
    expect(u.origin + u.pathname).toBe("https://kauth.kakao.com/oauth/authorize");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ client_id: "kid", redirect_uri: "https://cellar.example/login/oauth/kakao/callback", state: "st8", response_type: "code", scope: "account_email" });
  });
  it("카카오는 유효·인증된 이메일만 인증된 것으로 봅니다", () => {
    expect(parseKakao({ id: 42, kakao_account: { email: "a@b.kr", is_email_valid: true, is_email_verified: true } })).toEqual({ providerId: "42", email: "a@b.kr", emailVerified: true });
    expect(parseKakao({ id: 42, kakao_account: { email: "a@b.kr", is_email_valid: true, is_email_verified: false } })?.emailVerified).toBe(false);
    expect(parseKakao({ id: 42 })).toEqual({ providerId: "42", email: null, emailVerified: false });
    expect(parseKakao({})).toBeNull();
  });
  it("네이버는 resultcode 00 일 때만 받습니다", () => {
    expect(parseNaver({ resultcode: "00", response: { id: "nv1", email: "x@naver.com" } })).toEqual({ providerId: "nv1", email: "x@naver.com", emailVerified: true });
    expect(parseNaver({ resultcode: "024", message: "Authentication failed" })).toBeNull();
  });
  it("로그인 후 이동은 같은 사이트 경로만", () => {
    expect(safeNext("/wines/a")).toBe("/wines/a");
    expect(safeNext("//evil.com")).toBe("/me");
    expect(safeNext("https://evil.com")).toBe("/me");
  });
});
