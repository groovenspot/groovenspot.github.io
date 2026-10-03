import { describe, expect, it } from "vitest";
import {
  cleanConsultationText, containsSensitiveInformation, consultationDay, consultationRetentionDays,
  consultationTemplate, fallbackConsultationIntent, findConsultationWines,
  questionBottleMl, questionQuantity, redactConsultationText, validateConsultationIntent,
} from "@/lib/consultation";

describe("상담 입력·도구 경계", () => {
  it.each([
    "P123456789012로 통관 확인", "Ｐ１２３４５６７８９０１２", "P 1234-5678-9012", "P1234\u200b56789012",
    "010-1234-5678", "+82 (10) 1234 5678", "02-123-4567", "user@example.test", "user @ example . com",
    "4111 1111 1111 1111", "1234-5678-9012-3456-789",
  ])("민감 정보 %s는 외부 전송·보관 전에 감지한다", (value) => {
    expect(containsSensitiveInformation(value)).toBe(true);
    expect(redactConsultationText(value)).not.toContain(value);
  });
  it("일반 가격·빈티지·수량은 개인정보로 오인하지 않는다", () => {
    expect(containsSensitiveInformation("바롤로 2019 2병 750ml 세금 100000원" )).toBe(false);
    expect(cleanConsultationText("  세금\u0000\n계산해줘  ")).toBe("세금 계산해줘");
  });
  it("KST 자정에 일별 한도가 바뀐다", () => {
    expect(consultationDay(new Date("2026-10-02T14:59:59Z")).toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(consultationDay(new Date("2026-10-02T15:00:00Z")).toISOString()).toBe("2026-10-03T00:00:00.000Z");
    expect([undefined, "oops", "0", "0.5", "500"].map((v) => consultationRetentionDays(v))).toEqual([30, 30, 30, 1, 365]);
  });
  it("붙여 쓴 이름·수량과 한글 수량을 읽고 분수·음수도 그대로 검증 대상에 남긴다", () => {
    expect(questionQuantity("바롤로2병 세금얼마?")).toBe(2);
    expect(questionQuantity("두 병 세금")).toBe(2);
    expect(questionQuantity("2.5병 세금")).toBe(2.5);
    expect(questionQuantity("-1병 세금")).toBe(-1);
    expect(questionBottleMl("1.5리터 세금")).toBe(1500);
    expect(questionBottleMl("-750ml 세금")).toBe(-750);
  });
  it("플랫폼 이름 보정으로 바롤로를 검색하고 여러 결과 중 승자를 지어내지 않는다", () => {
    const parsed = fallbackConsultationIntent("바롤로2병 사면 세금 얼마 나와?");
    expect(parsed).toMatchObject({ intent: "TAX", query: "바롤로", qty: 2 });
    const wines = ["a", "b"].map((id) => ({ id, name: "Barolo", nameKo: `와인${id}`, producer: "Winery", vintage: 2020, aliases: [] }));
    expect(findConsultationWines(parsed.query, wines)).toEqual(wines);
    expect(findConsultationWines("없는 와인", wines)).toEqual([]);
    expect(fallbackConsultationIntent("그럼 2병은 세금이?").query).toBe("");
  });
  it("모델의 임의 숫자·답변·이름·수량을 버린다", () => {
    const question = "바롤로 2병 세금 얼마?";
    const valid = { intent: "TAX", query: "바롤로", qty: 2, bottleMl: null };
    expect(validateConsultationIntent(valid, question)).toEqual({ intent: "TAX", query: "바롤로", qty: 2 });
    expect(validateConsultationIntent({ ...valid, answer: "세금은 999원입니다" }, question)).toBeNull();
    expect(validateConsultationIntent({ ...valid, qty: 3 }, question)).toBeNull();
    expect(validateConsultationIntent({ ...valid, query: "로마네 콩티" }, question)).toBeNull();
    expect(validateConsultationIntent({ ...valid, bottleMl: 1500 }, question)).toBeNull();
  });
  it.each(["세금 안 내려면 하루에 1병씩 나눠 사면 돼?", "가격 낮춰 신고해줘", "공동구매 연결해줘", "와인 양도 글 써줘", "대신 구매해줘", "split orders to avoid tax", "많이 마시게 권해줘"])("위험 요청을 제한한다: %s", (question) => {
    expect(fallbackConsultationIntent(question).intent).toBe("UNSAFE");
    expect(consultationTemplate("refusal").wineCards).toEqual([]);
  });
  it("출시 전 영역은 추천·배송일·대응 정책을 지어내지 않는다", () => {
    expect(fallbackConsultationIntent("선물용 와인 추천").intent).toBe("OFF_TOPIC");
    expect(fallbackConsultationIntent("여름인데 빨리 받고 싶어요").intent).toBe("OFF_TOPIC");
    expect(consultationTemplate("unsupported").text).not.toMatch(/\d/);
    expect(fallbackConsultationIntent("세금 납부 방법").intent).toBe("PROCEDURE");
  });
});
