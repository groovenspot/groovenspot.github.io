import { afterEach, describe, expect, it, vi } from "vitest";
import { decideScan, DEFAULT_SCAN_LIMITS as L, scanLimits } from "@/lib/quota";
import { noticeDue, noticeMail } from "@/lib/consentNotice";
import { unsubscribeToken, unsubscribeUrl, verifyUnsubscribe } from "@/lib/unsubscribe";
import { jobAlertKind } from "@/lib/jobAlert";
import { isRedirectError, summarizeForm } from "@/lib/audit";
import { rankSimilar, similarityScore } from "@/lib/similar";
import { marketingFooter } from "@/lib/marketing";

const usage = (o: Partial<Parameters<typeof decideScan>[0]> = {}) => ({ member: false, userDay: 0, ipDay: 0, ipMinute: 0, globalDay: 0, ...o });

describe("사진 인식 한도", () => {
  it("비회원은 접속지당 하루 5회, 회원은 하루 20회", () => {
    expect(decideScan(usage({ ipDay: 4 }), L)).toEqual({ ok: true, remaining: 0 });
    expect(decideScan(usage({ ipDay: 5 }), L)).toMatchObject({ ok: false });
    expect(decideScan(usage({ member: true, userDay: 19, ipDay: 19 }), L)).toEqual({ ok: true, remaining: 0 });
    expect(decideScan(usage({ member: true, userDay: 20 }), L)).toMatchObject({ ok: false });
  });
  it("1분에 3회, 접속지 하나에서 여러 계정, 전체 하루 상한도 막습니다", () => {
    expect(decideScan(usage({ member: true, ipMinute: 3 }), L)).toMatchObject({ ok: false, error: expect.stringContaining("1분") });
    expect(decideScan(usage({ member: true, userDay: 0, ipDay: 60 }), L)).toMatchObject({ ok: false });
    expect(decideScan(usage({ member: true, globalDay: 1000 }), L)).toMatchObject({ ok: false, error: expect.stringContaining("직접 입력") });
  });
  it("환경변수로 바꿀 수 있고, 잘못된 값은 기본값", () => {
    expect(scanLimits({ SCAN_LIMIT_ANON: "2", SCAN_LIMIT_GLOBAL: "abc" })).toMatchObject({ anonPerDay: 2, globalPerDay: 1000 });
  });
});

describe("마케팅 수신 동의 2년 안내", () => {
  const d = (s: string) => new Date(s);
  it("동의 후 2년(2주 먼저)이 되면 대상, 안내 후 다시 2년", () => {
    expect(noticeDue({ marketingConsentAt: d("2024-10-30"), marketingConsentNoticeAt: null }, d("2026-10-03"))).toBe(false);
    expect(noticeDue({ marketingConsentAt: d("2024-10-10"), marketingConsentNoticeAt: null }, d("2026-10-03"))).toBe(true);
    expect(noticeDue({ marketingConsentAt: d("2022-01-01"), marketingConsentNoticeAt: d("2025-01-01") }, d("2026-10-03"))).toBe(false);
    expect(noticeDue({ marketingConsentAt: null, marketingConsentNoticeAt: null }, d("2026-10-03"))).toBe(false);
  });
  it("다시 동의하면 그날부터 다시 셉니다", () => {
    expect(noticeDue({ marketingConsentAt: d("2026-01-01"), marketingConsentNoticeAt: d("2023-01-01") }, d("2026-10-03"))).toBe(false);
  });
  it("안내 메일에 동의 날짜와 거부 방법이 들어갑니다", () => {
    const m = noticeMail(d("2024-10-01T03:00:00Z"), "https://x/unsubscribe?u=1&t=2", "https://x/me#preferences");
    expect(m.text).toContain("2024-10-01");
    expect(m.text).toContain("https://x/unsubscribe?u=1&t=2");
    expect(m.subject).not.toContain("(광고)");
  });
});

describe("수신 거부 링크", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("서명이 맞아야 하고, 다른 회원 id 로는 통과하지 않습니다", () => {
    vi.stubEnv("SESSION_SECRET", "s1");
    const t = unsubscribeToken("u1");
    expect(verifyUnsubscribe("u1", t)).toBe(true);
    expect(verifyUnsubscribe("u2", t)).toBe(false);
    expect(verifyUnsubscribe("u1", "x")).toBe(false);
    expect(unsubscribeUrl("https://c.kr", "u1")).toBe(`https://c.kr/unsubscribe?u=u1&t=${t}`);
    expect(marketingFooter("https://c.kr", unsubscribeUrl("https://c.kr", "u1"))).toContain("로그인 없이");
  });
});

describe("정기 작업 실패 알림", () => {
  it("연속 2회 실패한 순간 한 번, 계속 실패하면 다시 보내지 않음", () => {
    expect(jobAlertKind([false])).toBeNull();
    expect(jobAlertKind([false, false, true])).toBe("failing");
    expect(jobAlertKind([false, false, false])).toBeNull();
  });
  it("2회 이상 실패 뒤 성공하면 복구 알림", () => {
    expect(jobAlertKind([true, false, false, true])).toBe("recovered");
    expect(jobAlertKind([true, false, true])).toBeNull();
    expect(jobAlertKind([true, true])).toBeNull();
  });
});

describe("관리자 작업 기록", () => {
  it("비밀값은 가리고, 긴 글은 자르고, 파일·내부 값은 뺍니다", () => {
    const fd = new FormData();
    fd.set("name", "샤블리"); fd.set("apiSecret", "abc"); fd.set("bannedPatterns", "x".repeat(300)); fd.set("$ACTION_ID_1", "z");
    fd.set("photo", new File(["12345"], "a.jpg"));
    const s = summarizeForm(fd);
    expect(s).toMatchObject({ name: "샤블리", apiSecret: "***", photo: "[파일 5B]" });
    expect(s.bannedPatterns).toContain("(300자)");
    expect("$ACTION_ID_1" in s).toBe(false);
  });
  it("redirect 는 성공으로 봅니다", () => {
    expect(isRedirectError({ digest: "NEXT_REDIRECT;replace;/x;307;" })).toBe(true);
    expect(isRedirectError(new Error("x"))).toBe(false);
  });
});

describe("비슷한 와인", () => {
  const base = { id: "a", type: "화이트", region: "샤블리", grape: "샤르도네", country: "프랑스" };
  it("산지 3·품종 2·나라 1점, 다른 종류와 자기 자신은 제외", () => {
    expect(similarityScore(base, { ...base, id: "b" })).toBe(6);
    expect(similarityScore(base, { ...base, id: "c", region: "뫼르소" })).toBe(3);
    expect(similarityScore(base, { ...base, id: "d", type: "레드" })).toBe(0);
    expect(similarityScore(base, base)).toBe(0);
  });
  it("점수 높은 순, 같으면 싼 순, 살 수 없는 와인은 제외", () => {
    const r = rankSimilar(base, [
      { wine: { ...base, id: "x", region: "뫼르소" }, perBottle: 50000 },
      { wine: { ...base, id: "y" }, perBottle: 90000 },
      { wine: { ...base, id: "z", region: "뫼르소" }, perBottle: 40000 },
      { wine: { ...base, id: "n" }, perBottle: null },
    ]);
    expect(r.map((i) => i.wine.id)).toEqual(["y", "z", "x"]);
  });
});
