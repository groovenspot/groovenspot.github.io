import { describe, expect, it } from "vitest";
import { addCompare, inOrder, parseIds, pushRecent, removeId } from "@/lib/wineList";
import { fillDays, historyStats } from "@/lib/history";
import { PRIVATE_PATHS } from "@/lib/site";

describe("쿠키 와인 목록", () => {
  it("이상한 값은 버리고 중복을 없애며 최대 개수에서 자릅니다", () => {
    expect(parseIds("a1,,a1,<script>,b2,c3,d4", 3)).toEqual(["a1", "b2", "c3"]);
    expect(parseIds(undefined, 3)).toEqual([]);
  });
  it("비교함은 가득 차면 가장 먼저 담은 와인을 뺍니다", () => {
    expect(addCompare(["a", "b", "c"], "d")).toEqual(["b", "c", "d"]);
    expect(addCompare(["a", "b"], "a")).toEqual(["b", "a"]);
    expect(addCompare(["a"], "bad id!")).toEqual(["a"]);
    expect(removeId(["a", "b"], "a")).toEqual(["b"]);
  });
  it("최근 본 와인은 방금 본 것을 맨 앞으로 올립니다", () => {
    expect(pushRecent(["a", "b", "c"], "c", 3)).toEqual(["c", "a", "b"]);
    expect(pushRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
  });
  it("DB 결과를 쿠키 순서로 다시 세우고 없어진 와인은 뺍니다", () => {
    expect(inOrder(["b", "x", "a"], [{ id: "a" }, { id: "b" }]).map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("도착가 추이", () => {
  const today = new Date("2026-10-03T05:00:00Z");
  it("빈 날을 null 로 채워 일 단위로 펼칩니다", () => {
    const cells = fillDays([{ day: new Date("2026-10-01"), perBottle: 50000 }, { day: new Date("2026-10-03"), perBottle: 45000 }], 4, today);
    expect(cells).toEqual([
      { day: "2026-09-30", value: null },
      { day: "2026-10-01", value: 50000 },
      { day: "2026-10-02", value: null },
      { day: "2026-10-03", value: 45000 },
    ]);
  });
  it("최저가·최저일·처음 대비 변화를 계산하고, 점이 하나뿐이면 null", () => {
    const st = historyStats([{ day: "d1", value: 50000 }, { day: "d2", value: 42000 }, { day: "d3", value: null }, { day: "d4", value: 45000 }]);
    expect(st).toMatchObject({ min: 42000, minDay: "d2", max: 50000, first: 50000, last: 45000, changePct: -10, points: 3 });
    expect(historyStats([{ day: "d1", value: 1 }, { day: "d2", value: null }])).toBeNull();
  });
});

describe("검색엔진 차단 경로", () => {
  it("개인 화면과 관리자는 막고 와인 상세는 열어 둡니다", () => {
    for (const p of ["/admin", "/me", "/api", "/go", "/order"]) expect(PRIVATE_PATHS).toContain(p);
    expect(PRIVATE_PATHS.some((p) => "/wines/abc".startsWith(p))).toBe(false);
  });
});
