import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TAX, calcTax } from "@/lib/tax";

const m = vi.hoisted(() => ({
  getUser: vi.fn(), model: vi.fn(), construct: vi.fn(), raw: vi.fn(), transaction: vi.fn(), user: vi.fn(),
  usageFind: vi.fn(), usageUpsert: vi.fn(), usageRestore: vi.fn(), history: vi.fn(), previous: vi.fn(),
  save: vi.fn(), feedback: vi.fn(), wineFind: vi.fn(), wines: vi.fn(), setting: vi.fn(), forwarders: vi.fn(),
}));
vi.mock("@/server/auth", () => ({ getUser: m.getUser }));
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn(function () { m.construct(); return { messages: { create: m.model } }; }) }));
vi.mock("@/server/db", () => ({ prisma: {
  $transaction: m.transaction,
  consultationDailyUsage: { findUnique: m.usageFind, updateMany: m.usageRestore },
  consultation: { findMany: m.history, findFirst: m.previous, create: m.save, updateMany: m.feedback },
  wine: { findMany: m.wines },
} }));

import { GET, POST } from "@/app/api/consultation/route";
import { POST as feedbackPOST } from "@/app/api/consultation/[id]/feedback/route";
import { classifyConsultation, createConsultation, consultationFeedback, consultationHistory, readConsultationBody } from "@/server/consultation";

const now = new Date("2026-10-02T12:00:00Z");
const user = { id: "owner", adultVerifiedAt: now, plan: "FREE" as const, premiumUntil: null, nickname: null };
const wine = {
  id: "wine-a", name: "Barolo", nameKo: "바롤로", producer: "Producer", country: "이탈리아", region: "피에몬테", vintage: 2020, aliases: [], krPrice: 120000,
  offers: [{ id: "offer-a", price: 20, bottleMl: 750, inStock: true, checkedAt: now, url: "https://example.test/wine",
    seller: { id: "seller-a", name: "Seller", country: "이탈리아", channel: "EXPORT_RETAILER", shipsToKorea: true, currency: "EUR", shipBase: 20, shipPerBottle: 0, daysMin: 7, daysMax: 12, insured: true, active: true } }],
};
const tx = {
  $queryRaw: m.raw, user: { findUnique: m.user },
  consultationDailyUsage: { findUnique: m.usageFind, upsert: m.usageUpsert },
  wine: { findUnique: m.wineFind }, setting: { findUnique: m.setting }, forwarder: { findMany: m.forwarders },
};
const request = (data: unknown) => new Request("http://localhost/api/consultation", { method: "POST", body: JSON.stringify(data) });

beforeEach(() => {
  vi.clearAllMocks(); vi.unstubAllEnvs();
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  m.getUser.mockResolvedValue(user); m.user.mockResolvedValue(user);
  m.transaction.mockImplementation(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx));
  m.raw.mockImplementation(async (strings: TemplateStringsArray) => strings.join("").includes("ExchangeRate")
    ? [{ currency: "USD", krw: 1300, fetchedAt: now, source: "test" }, { currency: "EUR", krw: 1500, fetchedAt: now, source: "test" }] : [{ id: user.id }]);
  m.usageFind.mockResolvedValue(null); m.usageUpsert.mockResolvedValue({ count: 1 }); m.usageRestore.mockResolvedValue({ count: 1 });
  m.save.mockResolvedValue({ id: "consult-a" }); m.history.mockResolvedValue([]); m.previous.mockResolvedValue(null);
  m.wines.mockResolvedValue([wine]); m.wineFind.mockResolvedValue(wine); m.setting.mockResolvedValue(null); m.forwarders.mockResolvedValue([]);
  m.feedback.mockResolvedValue({ count: 1 });
});

describe("상담 API 인증·저장·모델 경계", () => {
  it("비회원과 실제 성인인증 없는 회원은 조회·질문·평가를 이용할 수 없다", async () => {
    m.getUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(request({ message: "처음 직구해요" }))).status).toBe(401);
    m.getUser.mockResolvedValue({ ...user, adultVerifiedAt: null });
    expect((await GET()).status).toBe(403);
    expect((await POST(request({ message: "처음 직구해요" }))).status).toBe(403);
    expect((await feedbackPOST(request({ helpful: true }), { params: Promise.resolve({ id: "c" }) })).status).toBe(403);
    expect(m.transaction).not.toHaveBeenCalled(); expect(m.save).not.toHaveBeenCalled();
  });
  it("닉네임 없는 인증 회원도 도우미를 이용하고 민감 정보가 없는 질문만 보관한다", async () => {
    const response = await POST(request({ message: " 처음 직구해요 " }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "consult-a", aiUsed: false, remaining: 4, answer: { kind: "procedure" } });
    expect(m.save.mock.calls[0][0].data).toMatchObject({ userId: "owner", question: "처음 직구해요", aiUsed: false });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("민감 질문은 모델 호출·한도 소모·DB 저장 없이 거절하며 입력값을 돌려주지 않는다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test");
    const response = await POST(request({ message: "P123456789012로 세금 확인해줘" }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("P123456789012");
    expect(m.construct).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled(); expect(m.save).not.toHaveBeenCalled();
  });
  it("무료 한도에 도달하면 외부 호출과 저장 전에 중단한다", async () => {
    m.usageFind.mockResolvedValue({ count: 5 });
    const response = await POST(request({ message: "세금 계산해줘" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: "daily_limit", remaining: 0 });
    expect(m.usageUpsert).not.toHaveBeenCalled(); expect(m.save).not.toHaveBeenCalled();
  });
  it.each(["-1병 세금", "- 1병 세금", "2.5병 세금", "2 . 5병 세금", "0병 세금", "25병 세금", "1000ml 세금", "1병과 2병 세금", "750ml와 1500ml 세금"])("명시된 잘못된 수량·용량을 묵시적으로 바꾸지 않는다: %s", async (message) => {
    const response = await POST(request({ message, wineId: wine.id, qty: 1, bottleMl: 750 }));
    expect(response.status).toBe(400); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("키가 없어도 이름을 보정하고 질문의 수량으로 플랫폼 계산기를 호출한다", async () => {
    const result = await createConsultation(user.id, { message: "바롤로2병 사면 세금 얼마 나와?", qty: 1 }, now);
    const card = result.answer.wineCards[0];
    const expected = calcTax({ cif: 90000, goodsUsdPerBottle: 30000 / 1300, qty: 2, bottleMl: 750, fta: true }, DEFAULT_TAX);
    expect(card).toMatchObject({ id: wine.id, qty: 2, goodsKrw: 60000, shipKrw: 30000, tax: expected, total: 90000 + expected.pay });
    expect(card.evidence).toMatchObject({ taxConfig: DEFAULT_TAX, fx: { rates: { USD: 1300, EUR: 1500 }, asOf: now.toISOString(), source: "test" } });
    expect(result.answer.text).not.toMatch(/\d/);
    expect(result.aiUsed).toBe(false);
    expect(m.transaction.mock.calls[1][1]).toMatchObject({ isolationLevel: "RepeatableRead" });
  });
  it("실제 설정 세율로 계산하고 evidence에 같은 설정을 넣는다", async () => {
    m.setting.mockResolvedValue({ value: { liquorRate: 0.4 } });
    const result = await createConsultation(user.id, { message: "세금 계산해줘", wineId: wine.id, qty: 2 }, now);
    expect(result.answer.wineCards[0].tax.liquor).toBe(36000);
    expect(result.answer.wineCards[0].evidence.taxConfig.liquorRate).toBe(0.4);
  });
  it("모호한 이름은 검증된 후보만 보여 주고 가격을 추측하지 않는다", async () => {
    m.wines.mockResolvedValue([wine, { ...wine, id: "wine-b", producer: "Another" }, { ...wine, id: "wine-c" }, { ...wine, id: "wine-d" }]);
    const result = await createConsultation(user.id, { message: "바롤로2병 세금" }, now);
    expect(result.answer.kind).toBe("choices"); expect(result.answer.choices).toHaveLength(3);
    expect(result.answer.wineCards).toEqual([]); expect(m.wineFind).not.toHaveBeenCalled();
  });
  it("와인 상세 맥락보다 새로 언급한 이름을 우선하며 명시한 ID로만 후보를 선택한다", async () => {
    const chablis = { ...wine, id: "wine-chablis", name: "Chablis", nameKo: "샤블리" };
    m.wines.mockResolvedValue([wine, chablis]); m.wineFind.mockResolvedValue(chablis);
    const newWine = await createConsultation(user.id, { message: "샤블리 2병 세금 얼마?", wineId: wine.id }, now);
    expect(m.wineFind.mock.calls[0][0].where.id).toBe(chablis.id);
    expect(newWine.answer.wineCards[0].id).toBe(chablis.id);
    m.wines.mockResolvedValue([wine, { ...wine, id: "wine-b" }]); m.wineFind.mockResolvedValue(wine);
    const chosen = await createConsultation(user.id, { message: "바롤로 2병 세금 얼마?", wineId: wine.id }, now);
    expect(chosen.answer.kind).toBe("calculation");
  });
  it("다른 사람/만료된 이전 상담의 와인을 사용하지 않는다", async () => {
    const result = await createConsultation(user.id, { message: "그럼 2병은 세금이?", previousId: "other-consultation" }, now);
    expect(result.answer.kind).toBe("procedure");
    expect(m.previous).toHaveBeenCalledWith({ where: { id: "other-consultation", userId: user.id, expiresAt: { gt: now } }, select: { answer: true } });
    expect(m.wineFind).not.toHaveBeenCalled();
  });
  it("유효한 본인 이전 상담의 선택 와인만 이어서 계산한다", async () => {
    m.previous.mockResolvedValue({ answer: { wineCards: [{ id: wine.id }] } });
    const result = await createConsultation(user.id, { message: "그럼 2병은 세금이?", previousId: "own-prior" }, now);
    expect(result.answer.wineCards[0]).toMatchObject({ id: wine.id, qty: 2 });
  });
  it("LLM이 제시한 숫자 문장을 버리고 API 보고 토큰은 기록한다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test");
    m.model.mockResolvedValue({ stop_reason: "end_turn", usage: { input_tokens: 90, output_tokens: 40 }, content: [{ type: "text", text: JSON.stringify({ intent: "TAX", query: "", qty: null, bottleMl: null, answer: "세금은 999원" }) }] });
    const result = await createConsultation(user.id, { message: "세금 계산해줘", wineId: wine.id }, now);
    expect(result.aiUsed).toBe(false);
    expect(JSON.stringify(result.answer)).not.toContain("999원");
    expect(m.save.mock.calls[0][0].data).toMatchObject({ inputTokens: 90, outputTokens: 40, aiUsed: false });
  });
  it("구조화된 의도만 사용하고 provider 실패는 결정적 가이드로 이어진다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test");
    m.model.mockResolvedValue({ stop_reason: "end_turn", usage: { input_tokens: 20, output_tokens: 10 }, content: [{ type: "text", text: JSON.stringify({ intent: "TAX", query: "바롤로", qty: 2, bottleMl: null }) }] });
    expect(await classifyConsultation("바롤로 2병 세금 얼마?")).toMatchObject({ aiUsed: true, parsed: { query: "바롤로", qty: 2 } });
    m.model.mockRejectedValue(new Error("provider failed"));
    expect(await classifyConsultation("처음 직구해요")).toMatchObject({ aiUsed: false, parsed: { intent: "PROCEDURE" } });
  });
  it("위험 요청과 미출시 기능은 API에 보내거나 계산하지 않는다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test");
    expect((await createConsultation(user.id, { message: "공동구매 연결해줘" }, now)).answer.kind).toBe("refusal");
    expect((await createConsultation(user.id, { message: "선물용 와인 추천" }, now)).answer.kind).toBe("unsupported");
    expect(m.model).not.toHaveBeenCalled(); expect(m.wineFind).not.toHaveBeenCalled();
  });
  it("가격·환율이 없으면 금액을 만들어 내지 않는다", async () => {
    m.raw.mockImplementation(async (strings: TemplateStringsArray) => strings.join("").includes("ExchangeRate") ? [] : [{ id: user.id }]);
    const result = await createConsultation(user.id, { message: "세금 계산해줘", wineId: wine.id }, now);
    expect(result.answer.kind).toBe("unavailable"); expect(result.answer.wineCards).toEqual([]);
  });
  it("저장 실패는 예약한 일일 상담 한도를 돌려준다", async () => {
    m.save.mockRejectedValue(new Error("storage failed"));
    await expect(createConsultation(user.id, { message: "처음 직구해요" }, now)).rejects.toThrow("storage failed");
    expect(m.usageRestore).toHaveBeenCalledWith({ where: { userId: "owner", day: new Date("2026-10-02T00:00:00.000Z"), count: { gt: 0 } }, data: { count: { decrement: 1 } } });
  });
  it("조회는 본인의 보관 기간 내 최근 기록만 반환한다", async () => {
    await consultationHistory(user, now);
    expect(m.history.mock.calls[0][0]).toMatchObject({ where: { userId: "owner", expiresAt: { gt: now } }, take: 10, orderBy: { createdAt: "desc" } });
  });
  it("평가·클릭은 소유자와 만료일을 확인하며 찜·구매를 실행하지 않는다", async () => {
    expect(await consultationFeedback("owner", "consult-a", { action: "watch" }, now)).toEqual({ ok: true });
    expect(m.feedback).toHaveBeenCalledWith({ where: { id: "consult-a", userId: "owner", expiresAt: { gt: now } }, data: { watchClickedAt: now } });
    m.feedback.mockResolvedValue({ count: 0 });
    await expect(consultationFeedback("other", "consult-a", { helpful: false }, now)).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
  it("Content-Length 없는 스트림도 본문 크기 제한을 적용한다", async () => {
    const large = new Request("http://localhost", { method: "POST", body: "x".repeat(16 * 1024 + 1) });
    await expect(readConsultationBody(large)).rejects.toMatchObject({ status: 413 });
    expect(m.save).not.toHaveBeenCalled();
  });
});
