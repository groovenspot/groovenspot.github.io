import { z } from "zod";
import type { TaxConfig, TaxResult } from "./tax";
import { fold, matchesQuery } from "./search";
import type { MatchWine } from "./match";

export const CONSULTATION_FREE_LIMIT = 5;
export const CONSULTATION_BODY_LIMIT = 16 * 1024;

export const consultationInputSchema = z.object({
  message: z.string().min(1).max(1000),
  wineId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
  qty: z.number().int().min(1).max(24).optional(),
  bottleMl: z.union([z.literal(375), z.literal(750), z.literal(1500)]).optional(),
  previousId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
}).strict();
export type ConsultationInput = z.infer<typeof consultationInputSchema>;

export const consultationFeedbackSchema = z.union([
  z.object({ helpful: z.boolean() }).strict(),
  z.object({ action: z.enum(["compare", "watch"]) }).strict(),
]);

export type ConsultationLink = { label: string; href: string; action?: "compare" | "watch" };
export type ConsultationChoice = Pick<MatchWine, "id" | "name" | "nameKo" | "producer" | "vintage">;
export type ConsultationWineCard = ConsultationChoice & {
  country: string; region: string; qty: number; bottleMl: number;
  routeLabel: string; sellerName: string;
  goodsKrw: number; shipKrw: number; tax: TaxResult; total: number; perBottle: number;
  daysMin: number; daysMax: number; checkedAt: string; dutyRate: number;
  evidence: {
    taxConfig: TaxConfig;
    fx: { rates: Record<string, number>; asOf: string | null; source: string | null };
  };
};
export type ConsultationAnswer = {
  kind: "calculation" | "procedure" | "choices" | "unavailable" | "unsupported" | "refusal";
  text: string;
  links: ConsultationLink[];
  wineCards: ConsultationWineCard[];
  choices?: ConsultationChoice[];
};

/** Normalize invisible/full-width characters before either privacy checks or intent parsing. */
export function cleanConsultationText(text: string) {
  return text.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, " ")
    .replace(/\s+/g, " ").trim();
}

/** Sensitive content is rejected without echoing it, storing it or sending it to a model. */
export function containsSensitiveInformation(raw: string) {
  const text = cleanConsultationText(raw);
  if (/[pP][\s-]*(?:\d[\s-]*){12}(?!\d)/.test(text)) return true;
  if (/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+\s*@\s*[a-zA-Z0-9-]+(?:\s*\.\s*[a-zA-Z0-9-]+)+/.test(text)) return true;
  // Telephone numbers and payment-card numbers, including spaces and punctuation.
  const numbers = text.match(/\+?\d(?:[\s().-]*\d){8,18}/g) ?? [];
  return numbers.some((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 13 || (digits.length >= 9 && digits.length <= 12);
  });
}

export function redactConsultationText(raw: string) {
  const clean = cleanConsultationText(raw);
  // A final defense for records; the endpoint rejects these questions first.
  return containsSensitiveInformation(clean) ? "[민감 정보가 포함된 질문은 보관하지 않습니다]" : clean;
}

export function consultationDay(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  return new Date(`${kst.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

export function consultationRetentionDays(value = process.env.CONSULTATION_RETENTION_DAYS) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(365, Math.max(1, Math.floor(parsed))) : 30;
}

export type ConsultationIntent = "TAX" | "PROCEDURE" | "OFF_TOPIC" | "UNSAFE";
export type ParsedConsultationIntent = { intent: ConsultationIntent; query: string; qty?: number; bottleMl?: 375 | 750 | 1500 };

export function isUnsafeConsultation(raw: string) {
  const s = cleanConsultationText(raw);
  return /(?:나눠|나누어|쪼개|분할|따로).*(?:주문|구매|사면|사도|사기|세금|병)|(?:주문|구매|세금|병).*(?:나눠|나누어|쪼개|분할)/.test(s)
    || /(?:낮춰|낮게|줄여|허위|다르게|적게).*(?:신고|인보이스)|(?:언더밸류|탈세|밀수|세금\s*회피)/i.test(s)
    || /(?:공동\s*구매|공구\s*(?:모집|참여)|대리\s*구매|구매\s*대행|대신\s*(?:사|구매)|개인\s*간\s*거래|(?:와인|술|병).*(?:팔고|팔아|판매\s*글|양도|나눔))/i.test(s)
    || /(?:under.?declar|tax\s*evas|split\s*(?:orders?|purchases?)|group\s*buy|proxy\s*buy)/i.test(s)
    || /(?:취하|만취|많이\s*마시|음주\s*권장)/.test(s);
}

export function questionQuantity(text: string): number | undefined {
  const s = cleanConsultationText(text);
  const numbers = [...s.matchAll(/(?<![\d.,])(-?\s*\d+(?:\s*[.,]\s*\d+)?)\s*(?:병|bottles?)/gi)]
    .map((match) => Number(match[1].replace(/\s/g, "").replace(",", ".")));
  const korean = [...s.matchAll(/(한|두|세|네)\s*병/g)].map((match) => ({ 한: 1, 두: 2, 세: 3, 네: 4 }[match[1]])!);
  const values = [...new Set([...numbers, ...korean])];
  return values.length > 1 ? Number.NaN : values[0];
}

export function questionBottleMl(text: string): number | undefined {
  const s = cleanConsultationText(text);
  const numbers = [...s.matchAll(/(?<![\d.,])(-?\s*\d+(?:\s*[.,]\s*\d+)?)\s*(ml|밀리리터|l\b|리터)/gi)]
    .map((match) => Number(match[1].replace(/\s/g, "").replace(",", ".")) * (/^(?:l|리터)$/i.test(match[2]) ? 1000 : 1));
  const values = [...new Set(numbers)];
  return values.length > 1 ? Number.NaN : values[0];
}

export function consultationWineQuery(raw: string) {
  return cleanConsultationText(raw)
    .replace(/(?<!\d)\d{1,3}\s*(?:병|bottles?)/gi, " ")
    .replace(/(한|두|세|네)\s*병/g, " ")
    .replace(/\d+(?:\.\d+)?\s*(?:ml|밀리리터|리터|달러|유로|원)/gi, " ")
    .replace(/(?:이\s*와인|그\s*와인|세금|도착가|가격|배송비|계산(?:해\s*줘|해주세요|해줘)?|직구|구매|구입|사면|사도|사려고|살\s*때|얼마(?:나|예요|야|인가요|죠)?|나와(?:요)?|나오(?:나요|는지)?|알려(?:주세요|줘)|예상|관세|주세|부가세|와인|수입|하면|기준|합계|내야|되나요|인가요|해줘|주세요|있나요|은요|는요)/g, " ")
    .replace(/[?!,.()\[\]{}:;"“”]/g, " ")
    .replace(/(?:^|\s)(?:그럼|그러면|그렇다면|이거|그거|은|는|이|가)(?=\s|$)/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function fallbackConsultationIntent(raw: string): ParsedConsultationIntent {
  const s = cleanConsultationText(raw);
  if (isUnsafeConsultation(s)) return { intent: "UNSAFE", query: "" };
  if (/(?:추천|선물|페어링|어울|여름|고온|빠르|빨리|깨졌|파손|분실|배송\s*(?:추적|어디)|대게)/i.test(s)) return { intent: "OFF_TOPIC", query: "" };
  if (/(?:세금|통관).*(?:납부|고지|절차|방법)/.test(s) && !/(?:얼마|계산|금액)/.test(s)) return { intent: "PROCEDURE", query: "" };
  if (/(?:세금|도착가|관세|주세|부가세|계산|tax|cost)/i.test(s) || (questionQuantity(s) !== undefined && /(?:얼마|price)/i.test(s))) {
    const bottleMl = questionBottleMl(s);
    return { intent: "TAX", query: consultationWineQuery(s), qty: questionQuantity(s),
      ...([375, 750, 1500].includes(bottleMl ?? 0) ? { bottleMl: bottleMl as 375 | 750 | 1500 } : {}) };
  }
  if (/(?:처음|직구|통관|부호|카드|영문|주소|배대지|주문|회원|인증|절차|준비|fta)/i.test(s)) return { intent: "PROCEDURE", query: "" };
  return { intent: "OFF_TOPIC", query: "" };
}

export const consultationIntentSchema = z.object({
  intent: z.enum(["TAX", "PROCEDURE", "OFF_TOPIC", "UNSAFE"]),
  query: z.string().max(150),
  qty: z.number().int().min(1).max(24).nullable(),
  bottleMl: z.union([z.literal(375), z.literal(750), z.literal(1500)]).nullable(),
}).strict();

/** Only copied search terms are usable; model-generated prose, prices and invented quantities are discarded. */
export function validateConsultationIntent(raw: unknown, question: string): ParsedConsultationIntent | null {
  const parsed = consultationIntentSchema.safeParse(raw);
  if (!parsed.success || containsSensitiveInformation(parsed.data.query)) return null;
  const out = parsed.data;
  const hay = fold(question);
  if (out.query.split(/\s+/).filter(Boolean).some((part) => !hay.includes(fold(part)))) return null;
  if (out.qty !== null && out.qty !== questionQuantity(question)) return null;
  if (out.bottleMl !== null && out.bottleMl !== questionBottleMl(question)) return null;
  return { intent: out.intent, query: out.query, ...(out.qty !== null ? { qty: out.qty } : {}), ...(out.bottleMl !== null ? { bottleMl: out.bottleMl } : {}) };
}

/** All choices come from the platform catalog, and ambiguous names never select a winner. */
export function findConsultationWines(query: string, wines: MatchWine[]) {
  if (!query.trim()) return [];
  return wines.filter((w) => matchesQuery([w.name, w.nameKo, w.producer, w.vintage ?? "", ...w.aliases].join(" "), query));
}

export function consultationTemplate(kind: "procedure" | "refusal" | "unsupported" | "unavailable", question = ""): ConsultationAnswer {
  const links: ConsultationLink[] = [{ label: "첫 직구 준비하기", href: "/guide/first" }, { label: "세금 계산기", href: "/calculator" }, { label: "통관 가이드", href: "/guide" }];
  if (kind === "refusal") return { kind, text: "주문을 나누거나 신고 금액을 낮춰 세금을 피하는 방법, 개인 간 거래·대리 구매·공동구매 연결, 음주를 권하는 요청은 안내하지 않습니다. 같은 판매처의 구매는 합산과세될 수 있습니다. 플랫폼에 등록된 경로와 FTA 조건을 확인할 수 있고, 개별 법률·세무 판단은 관세사에게 확인해 주세요.", links, wineCards: [] };
  if (kind === "unsupported") return { kind, text: "현재 상담은 세금 계산과 첫 직구 절차를 안내합니다. 와인 추천·배송 경로 선택·파손 대응 상담은 아직 제공하지 않습니다. 와인 상세에서 경로 데이터를 확인하고, 주문 준비와 일반 통관 절차는 아래 가이드를 이용해 주세요.", links, wineCards: [] };
  if (kind === "unavailable") return { kind, text: "현재 확인 가능한 가격·환율·재고로는 금액을 계산할 수 없습니다. 플랫폼에 등록된 와인과 판매 정보를 확인하거나 세금 계산기에 구매 조건을 직접 입력해 주세요. 확인할 수 없는 금액은 안내하지 않습니다.", links, wineCards: [] };
  const text = /(?:납부|고지)/.test(question)
    ? "통관 중 세금이 고지되면 수령인이 관세청과 운송사의 공식 안내에서 금액·납부 방법을 확인하고 납부합니다. 문자나 링크가 공식 안내인지 확인하고, 정확한 과세 판단과 이의 신청은 관세사 또는 관세청에 문의해 주세요. 상담창에는 통관부호·전화번호·이메일·결제카드 정보를 입력하지 마세요."
    : /(?:통관|부호)/.test(question)
    ? "개인통관고유부호는 관세청 유니패스에서 발급받습니다. 발급 절차와 내 정보 저장 선택은 첫 직구 도우미에서 확인해 주세요. 상담창에는 통관부호·전화번호·이메일·결제카드 정보를 입력하지 마세요. 수령인 정보 일치와 개별 통관 판단이 필요한 사항은 관세사에게 확인해 주세요."
    : "첫 직구 도우미에서 성인인증, 통관부호 발급, 해외결제 카드 확인, 영문 주소, 경로별 준비를 순서대로 확인할 수 있습니다. 주문 후 운송장을 등록하면 내 주문에서 배송 상태를 확인할 수 있습니다. 세금은 와인·판매처·수량·용량·운임에 따라 달라집니다. 계산할 와인을 선택하거나 이름을 알려 주세요. 개별 법률·세무 판단은 관세사에게 확인해 주세요.";
  return { kind, text, links, wineCards: [] };
}
