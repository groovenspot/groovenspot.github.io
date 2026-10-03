import { describe, expect, it } from "vitest";
import { DEFAULT_COMMUNITY as C, daysBetween, findBanned, fullAge, helpfulMilestone, isAdult, kingScore, measuredSaving, pointMultiplier, validNickname } from "@/lib/community";

describe("금지 표현 필터", () => {
  const P = C.bannedPatterns;
  it("거래·공구·연락처·음주 권장을 잡는다", () => {
    expect(findBanned("이거 2병 팝니다", P)).toBe("팝니다");
    expect(findBanned("같이 주문하실 분", P)).toMatch(/같이\s*주문/);
    expect(findBanned("공동 구매 모집해요", P)).toBeTruthy();
    expect(findBanned("연락은 010-1234-5678", P)).toBeTruthy();
    expect(findBanned("오픈채팅으로", P)).toBeTruthy();
    expect(findBanned("원샷 가능", P)).toBe("원샷");
  });
  it("정상 후기는 통과한다 (판매처·구매 같은 단어 포함)", () => {
    expect(findBanned("판매처 포장이 꼼꼼했고 배송 9일 걸렸어요", P)).toBeNull();
    expect(findBanned("수출 리테일러에서 구매, 세금 예상과 거의 같았음", P)).toBeNull();
    expect(findBanned("산도가 좋고 굴이랑 잘 맞아요", P)).toBeNull();
  });
  it("깨진 정규식은 건너뛴다", () => {
    expect(findBanned("abc", ["(", "b"])).toBe("b");
  });
});

describe("성인 확인 (만 19세)", () => {
  const now = new Date("2026-10-02T03:00:00Z");
  it("생일 전날까지는 만 18세", () => {
    expect(fullAge("2007-10-03", now)).toBe(18);
    expect(isAdult("2007-10-03", now)).toBe(false);
    expect(isAdult("2007-10-02", now)).toBe(true);
    expect(isAdult("bad", now)).toBe(false);
  });
  it("존재하지 않는 생년월일을 성인으로 인정하지 않는다", () => {
    for (const date of ["2007-00-00", "2007-02-29", "2007-04-31", "2007-13-01"]) {
      expect(fullAge(date, now)).toBeNaN();
      expect(isAdult(date, now)).toBe(false);
    }
    expect(isAdult("2004-02-29", now)).toBe(true);
  });
});

describe("닉네임", () => {
  it("형식·사칭·금지어를 막는다", () => {
    expect(validNickname("와인러버", C.bannedPatterns)).toBeNull();
    expect(validNickname("a", C.bannedPatterns)).toContain("2~12자");
    expect(validNickname("운영자킴", C.bannedPatterns)).toContain("운영자");
    expect(validNickname("나눔왕", C.bannedPatterns)).toContain("쓸 수 없는");
  });
});

describe("포인트·랭킹", () => {
  it("오픈 이벤트 기간에만 배수", () => {
    const cfg = { ...C, bonusUntil: "2026-10-31" };
    expect(pointMultiplier(cfg, new Date("2026-10-31T14:00:00Z"))).toBe(2);
    expect(pointMultiplier(cfg, new Date("2026-10-31T15:30:00Z"))).toBe(1);
    expect(pointMultiplier(C)).toBe(1);
  });
  it("도움됨 10개마다 보상", () => {
    expect([9, 10, 11, 20].map(helpfulMilestone)).toEqual([null, 1, null, 2]);
  });
  it("후기왕 점수와 실측 절약액", () => {
    expect(kingScore({ reviews: 4, verified: 2, helpful: 25 })).toBe(10);
    expect(measuredSaving({ cardPaidKrw: 180000, taxPaid: 90000, qty: 2, bottleMl: 750 }, 160000)).toBe(25000);
    expect(measuredSaving({ cardPaidKrw: null, taxPaid: 1, qty: 1, bottleMl: 750 }, 1)).toBeNull();
    expect(daysBetween(new Date("2026-10-01"), new Date("2026-10-10"))).toBe(9);
  });
});
