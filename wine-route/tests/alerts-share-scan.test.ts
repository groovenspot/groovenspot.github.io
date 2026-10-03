import { describe, expect, it } from "vitest";
import { adWordsFound, defaultTarget, isDrop, isFxLow, isRestock, sparkPath, weekKey } from "@/lib/alerts";
import { confident, dice, matchWines, parsePriceKrw, parseVintage, type MatchWine } from "@/lib/match";
import { cardWordingProblems, makeRefCode, referralMilestone, type CardData } from "@/lib/share";

describe("알림 규칙", () => {
  it("5% 이상 하락만 잡는다", () => {
    expect(isDrop(100000, 95000)).toBe(true);
    expect(isDrop(100000, 95100)).toBe(false);
    expect(isDrop(null, 90000)).toBe(false);
  });
  it("재입고는 품절 → 구매 가능일 때만", () => {
    expect(isRestock(false, true)).toBe(true);
    expect(isRestock(null, true)).toBe(false);
    expect(isRestock(true, true)).toBe(false);
  });
  it("기본 목표가는 현재가의 90%, 천 원 단위", () => {
    expect(defaultTarget(140365)).toBe(126000);
  });
  it("환율 30일 저점", () => {
    const d = (n: number) => new Date(Date.UTC(2026, 9, 1) - n * 86400e3);
    const hist = Array.from({ length: 25 }, (_, i) => ({ day: d(i + 1), krw: 1600 + i }));
    expect(isFxLow(hist, { day: d(0), krw: 1600 })).toBe(true);
    expect(isFxLow(hist, { day: d(0), krw: 1601 })).toBe(false);
    expect(isFxLow(hist.slice(0, 10), { day: d(0), krw: 1500 })).toBe(false);
  });
  it("주간 키는 KST 월요일", () => {
    expect(weekKey(new Date("2026-10-04T14:59:00Z"))).toBe("2026-09-28"); // 일요일 23:59 KST
    expect(weekKey(new Date("2026-10-04T15:00:00Z"))).toBe("2026-10-05"); // 월요일 00:00 KST
  });
  it("광고 금지 표현", () => {
    expect(adWordsFound("최저가 폭탄 할인")).toEqual(["최저가", "할인", "폭탄"]);
    expect(adWordsFound("국내 추정가 대비 2만 원 아낌")).toEqual([]);
  });
  it("가격 선은 품절(null)에서 끊는다", () => {
    expect(sparkPath([3, 2, null, 1], 34, 10, 2)).toBe("M2.0,2.0L12.0,5.0M32.0,8.0");
    expect(sparkPath([5], 10, 10)).toBe("");
  });
});

const W: MatchWine[] = [
  { id: "chablis", name: "Chablis 1er Cru Montmains", nameKo: "윌리엄 페브르 샤블리 프리미에 크뤼 몽맹", producer: "Domaine William Fèvre", vintage: 2022, aliases: [] },
  { id: "faiveley", name: "Bourgogne Pinot Noir", nameKo: "페블레 부르고뉴 피노 누아", producer: "Domaine Faiveley", vintage: 2022, aliases: [] },
  { id: "keller", name: "Riesling Trocken", nameKo: "켈러 리슬링 트로켄", producer: "Weingut Keller", vintage: 2023, aliases: [] },
  { id: "loosen", name: "Wehlener Sonnenuhr Riesling Kabinett", nameKo: "닥터 루젠 벨레너 조넨우어 리슬링 카비네트", producer: "Dr. Loosen", vintage: 2023, aliases: [] },
];

describe("라벨 매칭", () => {
  it("OCR 오타·잡음이 있어도 맞는 와인이 첫 후보", () => {
    const ocr = "WILLIAM FEVRE\nCHABLIS PREMIER CRU\nMONTMA1NS\n2022\nAppellation Chablis Premier Cru Controlee\n750 ml 13% vol";
    const r = matchWines(ocr, W);
    expect(r[0].wine.id).toBe("chablis");
    expect(confident(r)).toBe(true);
  });
  it("같은 품종 와인이 여럿이면 생산자로 가른다", () => {
    const r = matchWines("KELLER\nRiesling trocken\nRheinhessen 2023", W);
    expect(r[0].wine.id).toBe("keller");
  });
  it("모르는 와인은 확신하지 않는다", () => {
    expect(confident(matchWines("Penfolds Grange Shiraz 2018", W))).toBe(false);
  });
  it("같은 이름의 다른 빈티지는 읽은 빈티지로 확실하게 구분한다", () => {
    const wines = [W[0], { ...W[0], id: "chablis-2021", vintage: 2021 }];
    const r = matchWines("Domaine William Fevre Chablis 1er Cru Montmains 2022", wines);
    expect(r[0].wine.id).toBe("chablis");
    expect(confident(r)).toBe(true);
  });
  it("같은 와인 이름이어도 생산자가 다르면 라벨의 생산자를 우선한다", () => {
    const wines = [W[1], { ...W[1], id: "other-bourgogne", nameKo: "다른 부르고뉴", producer: "Maison Louis Jadot" }];
    const r = matchWines("Domaine Faiveley Bourgogne Pinot Noir 2022", wines);
    expect(r[0].wine.id).toBe("faiveley");
    expect(confident(r)).toBe(true);
  });
  it("유사도, 빈티지, 가격 읽기", () => {
    expect(dice("chablis", "chablis")).toBe(1);
    expect(parseVintage("est. 1885 · 2021 vintage")).toBe(2021);
    expect(parsePriceKrw("샤블리 1er 139,000원")).toBe(139000);
    expect(parsePriceKrw("₩ 89,000")).toBe(89000);
    expect(parsePriceKrw("750ml 13.5%")).toBeNull();
  });
});

describe("공유 카드", () => {
  const card: CardData = { kind: "wine", eyebrow: "직구 도착가", title: "샤블리", subtitle: "부르고뉴 · 2022", krLabel: "국내 추정가", krValue: 139000, myLabel: "직구 도착가", myValue: 112000, saving: 27000, routeLine: "최적경로 · 와이너리 직배송 · 7~14일", link: "https://x/r/ABC" };
  it("문구가 광고 기준을 지킨다", () => {
    expect(cardWordingProblems(card)).toEqual([]);
    expect(cardWordingProblems({ ...card, eyebrow: "최저가 발견" })).toEqual(["최저가"]);
  });
  it("공유자 코드와 3명마다 보상", () => {
    expect(makeRefCode(() => 0)).toBe("AAAAAA");
    expect(makeRefCode()).toMatch(/^[A-Z2-9]{6}$/);
    expect([1, 2, 3, 4, 6].map(referralMilestone)).toEqual([null, null, 1, null, 2]);
  });
});
