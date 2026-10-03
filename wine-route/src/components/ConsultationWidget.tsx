"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { TaxBreakdown } from "@/components/TaxBreakdown";
import { won } from "@/lib/format";
import { containsSensitiveInformation, type ConsultationAnswer, type ConsultationWineCard } from "@/lib/consultation";

type WineCard = ConsultationWineCard;
type Answer = ConsultationAnswer;
type Conversation = { id: string; question: string; answer: Answer; aiUsed: boolean; helpful: boolean | null; createdAt: string; expiresAt: string };
type Gate = "loading" | "ready" | "login_required" | "adult_required" | "error";
type Quota = { remaining: number | null; isPremium: boolean; limit: number | null; retentionDays: number };
const INITIAL_QUOTA: Quota = { remaining: null, isPremium: false, limit: 5, retentionDays: 30 };
const SUGGESTIONS = ["처음 직구해요", "선물용 와인 추천", "세금 계산해줘"];
const taxSchema = z.object({ cif: z.number().finite().nonnegative(), exempt: z.boolean(), fta: z.boolean(), duty: z.number().finite().nonnegative(), liquor: z.number().finite().nonnegative(), edu: z.number().finite().nonnegative(), vat: z.number().finite().nonnegative(), sum: z.number().finite().nonnegative(), waived: z.boolean(), pay: z.number().finite().nonnegative(), rate: z.number().finite().nonnegative() });
const taxConfigSchema = z.object({ dutyRate: z.number().finite().nonnegative(), liquorRate: z.number().finite().nonnegative(), eduRate: z.number().finite().nonnegative(), vatRate: z.number().finite().nonnegative(), exemptUsd: z.number().finite().nonnegative(), exemptMaxMl: z.number().finite().nonnegative(), minCollect: z.number().finite().nonnegative(), ftaCountries: z.array(z.string()), bulkWarnQty: z.number(), freeAlertLimit: z.number(), retailerMarkupHint: z.number() });
const cardSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/), nameKo: z.string(), name: z.string(), producer: z.string(), country: z.string(), region: z.string(), vintage: z.number().nullable(),
  qty: z.number().int().min(1).max(24), bottleMl: z.union([z.literal(375), z.literal(750), z.literal(1500)]), routeLabel: z.string(), sellerName: z.string(),
  goodsKrw: z.number().finite().nonnegative(), shipKrw: z.number().finite().nonnegative(), tax: taxSchema, total: z.number().finite().nonnegative(), perBottle: z.number().finite().nonnegative(),
  daysMin: z.number().int().nonnegative(), daysMax: z.number().int().nonnegative(), checkedAt: z.string(), dutyRate: z.number().finite().nonnegative(),
  evidence: z.object({ taxConfig: taxConfigSchema, fx: z.object({ rates: z.record(z.number().finite().positive()), asOf: z.string().nullable(), source: z.string().nullable() }) }),
});
const answerSchema = z.object({
  kind: z.enum(["calculation", "procedure", "choices", "unavailable", "unsupported", "refusal"]), text: z.string(),
  links: z.array(z.object({ label: z.string(), href: z.string(), action: z.enum(["compare", "watch"]).optional() })), wineCards: z.array(cardSchema),
  choices: z.array(z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/), nameKo: z.string(), name: z.string(), producer: z.string(), vintage: z.number().nullable() })).optional(),
});
const conversationSchema = z.object({ id: z.string(), question: z.string(), answer: answerSchema, aiUsed: z.boolean(), helpful: z.boolean().nullable(), createdAt: z.string(), expiresAt: z.string() });
const quotaSchema = z.object({ remaining: z.number().int().nonnegative().nullable(), isPremium: z.boolean(), retentionDays: z.number().int().positive() });
const historySchema = quotaSchema.extend({ limit: z.number().int().positive().nullable(), history: z.array(conversationSchema), configured: z.boolean() });
const replySchema = quotaSchema.extend({ id: z.string(), answer: answerSchema, aiUsed: z.boolean(), expiresAt: z.string() });

/** Consultation text is plain text; only known local destinations may become links. */
function safeLocalLink(href: string) {
  if (!href.startsWith("/") || href.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(href)) return null;
  try {
    const url = new URL(href, "https://cellardoor.invalid");
    if (url.origin !== "https://cellardoor.invalid" || !/^\/(?:$|guide(?:\/first)?\/?$|calculator\/?$|me\/?$|wines\/[a-zA-Z0-9_-]{1,120}\/?$|sellers\/[a-zA-Z0-9_-]{1,120}\/?$)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

function calendar(value: string | null) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }) : "확인되지 않음";
}

function ToolCard({ card, onNavigate }: { card: WineCard; onNavigate: (action: "compare" | "watch") => void }) {
  const href = `/wines/${encodeURIComponent(card.id)}?qty=${card.qty}&ml=${card.bottleMl}`;
  const cfg = card.evidence.taxConfig;
  return (
    <article className="consultation-wine-card stack">
      <div><b>{card.nameKo}</b><p className="small muted">{card.name} {card.vintage ?? "NV"} · {card.producer}</p></div>
      <div className="consultation-price"><span className="label">플랫폼 계산 · 병당 도착가</span><b className="num">{won(card.perBottle)}</b></div>
      <div className="consultation-assumption"><b>계산 조건</b> · {card.qty}병 · 병당 {card.bottleMl}ml<br />{card.country} · {card.routeLabel} · {card.sellerName}</div>
      <p className="small">합계 <b>{won(card.total)}</b> · 예상 배송 {card.daysMin}~{card.daysMax}일</p>
      <details className="consultation-evidence">
        <summary>세금 계산 근거 보기</summary>
        <div className="stack" style={{ marginTop: 10 }}>
          <TaxBreakdown goodsKrw={card.goodsKrw} shipKrw={card.shipKrw} tax={card.tax} total={card.total} qty={card.qty} dutyRate={card.dutyRate} taxConfig={cfg} />
          <p className="small muted">적용 세율: 관세 {cfg.dutyRate * 100}%, 주세 {cfg.liquorRate * 100}%, 교육세 {cfg.eduRate * 100}%, 부가세 {cfg.vatRate * 100}%</p>
          <p className="small muted">면세구간: 1병·{cfg.exemptMaxMl}ml·물품가 {cfg.exemptUsd}달러 이하. 같은 판매처의 같은 날 구매는 합산해서 확인하세요.</p>
          <p className="small muted">환율 기준 {calendar(card.evidence.fx.asOf)} · 가격 확인 {calendar(card.checkedAt)}. 실제 고지 세금·카드 청구액과 차이가 날 수 있습니다.</p>
          <details><summary className="small">적용 환율 보기</summary><dl className="consultation-fx">{Object.entries(card.evidence.fx.rates).map(([currency, rate]) => <div key={currency}><dt>{currency}</dt><dd>{rate.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}원</dd></div>)}</dl></details>
        </div>
      </details>
      <div className="row"><Link className="btn small" href={href} onClick={() => onNavigate("compare")}>경로 비교하기</Link><Link className="btn ghost small" href={`${href}#alerts`} onClick={() => onNavigate("watch")}>찜·알림 설정</Link></div>
    </article>
  );
}

export function ConsultationWidget({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname();
  const labelId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(embedded);
  const [gate, setGate] = useState<Gate>("loading");
  const [quota, setQuota] = useState<Quota>(INITIAL_QUOTA);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [qty, setQty] = useState("1");
  const [bottleMl, setBottleMl] = useState("750");
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState(pathname);
  const [feedbackPending, setFeedbackPending] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const requestsRef = useRef<AbortController[]>([]);
  const submitLock = useRef(false);
  const initSequence = useRef(0);
  const wineFromPage = /^\/wines\/([a-zA-Z0-9_-]{1,120})\/?$/.exec(pathname)?.[1] ?? null;
  const wineId = wineFromPage ?? selectedWineId;
  const next = embedded ? "/consultation" : wineFromPage ? `${pathname}?${new URLSearchParams({ qty, ml: bottleMl })}` : currentLocation;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const verifyHref = `/verify?next=${encodeURIComponent(next)}`;
  const canSend = gate === "ready" && (quota.isPremium || quota.remaining !== 0);

  useEffect(() => {
    setSelectedWineId(null);
    const locationPath = `${pathname}${window.location.search}${window.location.hash}`;
    setCurrentLocation(/[\\\u0000-\u001f\u007f]/.test(locationPath) ? pathname : locationPath);
    const query = new URLSearchParams(window.location.search);
    const q = Number(query.get("qty"));
    const ml = query.get("ml");
    setQty(Number.isInteger(q) && q >= 1 && q <= 24 ? String(q) : "1");
    setBottleMl(["375", "750", "1500"].includes(ml ?? "") ? ml! : "750");
  }, [pathname, open]);

  useEffect(() => () => { for (const request of requestsRef.current) request.abort(); }, []);

  async function initialize(signal?: AbortSignal) {
    const sequence = ++initSequence.current;
    const startedAt = Date.now();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), 20_000);
    setGate("loading"); setHistory([]); setError(""); setErrorCode("");
    try {
      const response = await fetch("/api/consultation", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      const data: unknown = await response.json();
      if (signal?.aborted || sequence !== initSequence.current) return;
      if (!response.ok) {
        const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
        const code = typeof result.error === "string" ? result.error : "unavailable";
        setGate(code === "login_required" || code === "adult_required" ? code : "error");
        setError(typeof result.message === "string" ? result.message : "상담을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        setErrorCode(code); return;
      }
      const result = historySchema.parse(data);
      setHistory((value) => {
        const serverIds = new Set(result.history.map((item) => item.id));
        const justReceived = value.filter((item) => !serverIds.has(item.id) && new Date(item.createdAt).getTime() >= startedAt);
        return [...result.history, ...justReceived];
      });
      setQuota({ remaining: result.remaining, isPremium: result.isPremium, limit: result.limit, retentionDays: result.retentionDays }); setGate("ready");
    } catch {
      if (!signal?.aborted && sequence === initSequence.current) { setGate("error"); setError("상담 연결을 확인하지 못했습니다. 다시 시도해 주세요."); setErrorCode("unavailable"); }
    } finally { clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
  }

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void initialize(controller.signal);
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open || embedded) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child !== rootRef.current && !["SCRIPT", "STYLE"].includes(child.tagName));
    const inertStates = siblings.map((element) => ({ element, inert: element.inert }));
    for (const { element } of inertStates) element.inert = true;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); dialogRef.current.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = originalOverflow;
      for (const { element, inert } of inertStates) element.inert = inert;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, embedded]);

  useEffect(() => { if (open) transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight }); }, [history.length, pending, open]);

  async function send(message: string, chosenWineId?: string, previousId?: string) {
    if (submitLock.current || !canSend) return;
    const text = message.trim();
    if (!text || text.length > 1000) { setError("질문을 1~1,000자로 입력해 주세요."); setErrorCode("validation"); return; }
    if (containsSensitiveInformation(text)) { setError("통관부호·카드번호·전화번호·이메일 같은 개인정보는 지운 뒤 질문해 주세요. 해당 질문은 전송하지 않았습니다."); setErrorCode("sensitive_information"); draftRef.current?.focus(); return; }
    const quantity = Number(qty); const ml = Number(bottleMl);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 24 || ![375, 750, 1500].includes(ml)) { setError("수량은 1~24병, 병 용량은 표시된 옵션에서 선택해 주세요."); setErrorCode("validation"); return; }
    const controller = new AbortController(); requestsRef.current.push(controller);
    const timeout = setTimeout(() => controller.abort(), 60_000);
    submitLock.current = true; setPending(true); setError(""); setErrorCode("");
    try {
      const response = await fetch("/api/consultation", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store", signal: controller.signal,
        body: JSON.stringify({ message: text, ...(chosenWineId || wineId ? { wineId: chosenWineId || wineId } : {}), qty: quantity, bottleMl: ml, ...(previousId || history.length ? { previousId: previousId ?? history[history.length - 1].id } : {}) }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
        const code = typeof result.error === "string" ? result.error : "unavailable";
        setError(typeof result.message === "string" ? result.message : "답변을 받지 못했습니다. 입력한 질문은 유지했습니다."); setErrorCode(code);
        if (code === "login_required" || code === "adult_required") setGate(code);
        if (code === "daily_limit") setQuota((value) => ({ ...value, remaining: 0, isPremium: false }));
        return;
      }
      const result = replySchema.parse(data);
      setHistory((value) => [...value, { id: result.id, question: text, answer: result.answer, aiUsed: result.aiUsed, helpful: null, createdAt: new Date().toISOString(), expiresAt: result.expiresAt }]);
      setQuota((value) => ({ ...value, remaining: result.remaining, isPremium: result.isPremium, limit: result.isPremium ? null : 5, retentionDays: result.retentionDays }));
      setDraft((value) => value.trim() === text ? "" : value);
      if (chosenWineId) setSelectedWineId(chosenWineId);
      if (result.answer.wineCards[0]) { setQty(String(result.answer.wineCards[0].qty)); setBottleMl(String(result.answer.wineCards[0].bottleMl)); }
    } catch {
      setError("답변 연결이 끊겼습니다. 입력한 질문은 유지했습니다. 상담을 다시 열면 저장된 답변을 확인할 수 있습니다."); setErrorCode("unavailable");
    } finally {
      clearTimeout(timeout); requestsRef.current = requestsRef.current.filter((value) => value !== controller);
      submitLock.current = false; setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send(draft); }
  async function helpful(id: string, value: boolean) {
    if (feedbackPending) return;
    setFeedbackPending(id);
    try {
      const response = await fetch(`/api/consultation/${encodeURIComponent(id)}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ helpful: value }) });
      if (!response.ok) throw new Error("feedback failed");
      setHistory((items) => items.map((item) => item.id === id ? { ...item, helpful: value } : item));
    } catch { setError("평가를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요."); setErrorCode("feedback"); }
    finally { setFeedbackPending(null); }
  }
  function navigate(id: string, action?: "compare" | "watch") {
    if (action) void fetch(`/api/consultation/${encodeURIComponent(id)}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", keepalive: true, body: JSON.stringify({ action }) }).catch(() => {});
    if (!embedded) setOpen(false);
  }

  if (!embedded && pathname === "/consultation") return null;
  return (
    <div ref={rootRef} className={embedded ? "consultation-root consultation-embedded" : "consultation-root"}>
      {!embedded && <button type="button" className="consultation-launcher" hidden={open} aria-label="AI 직구 상담 열기" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><span aria-hidden="true">✦</span> AI 직구 상담</button>}
      {open && <>
        {!embedded && <div className="consultation-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
        <div ref={dialogRef} className="consultation-panel" role={embedded ? "region" : "dialog"} aria-modal={embedded ? undefined : true} aria-labelledby={labelId} aria-describedby={descriptionId} tabIndex={-1}>
          <header className="consultation-head"><div>{embedded ? <h1 id={labelId}>AI 직구 상담</h1> : <h2 id={labelId}>AI 직구 상담</h2>}<p className="small muted" id={descriptionId}>지금은 직구 절차와 세금 계산을 도와드려요.</p>{!embedded && <Link className="small" href="/consultation" onClick={() => setOpen(false)}>상담 크게 보기</Link>}</div>{!embedded && <button ref={closeRef} type="button" className="consultation-close" aria-label="상담 닫기" onClick={() => setOpen(false)}>×</button>}</header>
          <div className="consultation-quota" role="status">{gate === "loading" ? "상담 기록을 확인하고 있습니다." : gate === "ready" ? quota.isPremium ? "프리미엄 · 상담 횟수 제한 없음" : `오늘 남은 상담 ${quota.remaining ?? "—"}/${quota.limit ?? 5}회 · 한국 시간 기준` : "성인인증을 완료한 회원에게 제공됩니다."}</div>
          <div ref={transcriptRef} className="consultation-transcript" role="log" aria-label="상담 대화" aria-live="polite" aria-busy={pending || gate === "loading"}>
            {!history.length && <div className="consultation-intro"><b>복잡한 직구, 준비부터 확인해요.</b><p className="small muted">통관 절차를 묻거나, 보고 있는 와인의 세금을 계산해 보세요. 수량·병 용량과 계산 근거를 함께 표시합니다.</p></div>}
            {(gate === "login_required" || gate === "adult_required") && <div className="alert"><p>{gate === "login_required" ? "로그인과 성인 본인인증을 마친 뒤 상담할 수 있어요." : "만 19세 이상 성인 본인인증을 먼저 완료해 주세요."}</p><Link className="btn small" style={{ marginTop: 8 }} href={gate === "login_required" ? loginHref : verifyHref} onClick={() => { if (!embedded) setOpen(false); }}>{gate === "login_required" ? "로그인·회원가입" : "성인인증하기"}</Link></div>}
            {history.map((item) => <article key={item.id} className="consultation-turn"><p className="consultation-question"><span className="consultation-speaker">내 질문</span>{item.question}</p><div className="consultation-answer"><span className="consultation-speaker">셀러도어 답변</span><span className="small muted">{item.aiUsed ? "AI 설명 · 금액은 플랫폼 계산" : "AI 미사용 · 기본 안내·플랫폼 계산 답변"}</span><p className="consultation-answer-text">{item.answer.text}</p>{item.answer.wineCards.map((card, index) => <ToolCard key={`${card.id}-${index}`} card={card} onNavigate={(action) => navigate(item.id, action)} />)}{item.answer.choices?.length ? <div className="stack"><p className="small">어떤 와인인지 선택해 주세요.</p>{item.answer.choices.map((choice) => <button key={choice.id} type="button" className="btn ghost small consultation-choice" disabled={pending || !canSend} onClick={() => { const question = "이 와인의 세금을 계산해줘"; setDraft(question); void send(question, choice.id, item.id); }}>{choice.nameKo} · {choice.producer} {choice.vintage ?? "NV"}</button>)}</div> : null}<div className="row">{item.answer.links.map((link, index) => { const href = safeLocalLink(link.href); return href ? <Link key={`${href}-${index}`} className="btn ghost small" href={href} onClick={() => navigate(item.id, link.action)}>{link.label}</Link> : null; })}</div><div className="consultation-feedback"><span>도움이 됐나요?</span><button type="button" disabled={feedbackPending !== null} aria-pressed={item.helpful === true} onClick={() => void helpful(item.id, true)}>네</button><button type="button" disabled={feedbackPending !== null} aria-pressed={item.helpful === false} onClick={() => void helpful(item.id, false)}>아니요</button>{item.helpful !== null && <span className="muted">평가 저장됨</span>}</div></div></article>)}
            {pending && <p className="consultation-loading" role="status">질문을 확인하고 계산 근거를 불러오고 있습니다…</p>}
          </div>
          <div className="consultation-controls">
            {error && <div className="consultation-error" role="alert">{error}{(errorCode === "daily_limit" || quota.remaining === 0 && !quota.isPremium) && <p><Link href="/me#points" onClick={() => { if (!embedded) setOpen(false); }}>포인트로 프리미엄 이용하기</Link></p>}{gate === "error" && <button type="button" className="btn ghost small" onClick={() => void initialize()}>상담 다시 불러오기</button>}</div>}
            {gate === "ready" && quota.remaining === 0 && !quota.isPremium && !error && <div className="consultation-error" role="status">오늘의 무료 상담을 모두 사용했습니다. <Link href="/me#points" onClick={() => { if (!embedded) setOpen(false); }}>포인트로 프리미엄 이용하기</Link></div>}
            <div className="consultation-suggestions" aria-label="추천 질문">{SUGGESTIONS.map((question) => <button type="button" key={question} disabled={pending || !canSend} onClick={() => { setDraft(question); void send(question); }}>{question}</button>)}</div>
            <form onSubmit={submit} className="consultation-form">
              <div className="consultation-context"><span>{wineFromPage ? "보고 있는 와인으로 계산" : selectedWineId ? "선택한 와인으로 계산" : "질문에 와인 이름을 적어 주세요"}</span><label>수량<input aria-label="상담 계산 수량" type="number" min={1} max={24} step={1} value={qty} disabled={pending} onChange={(event) => setQty(event.target.value)} />병</label><label>병 용량<select aria-label="상담 계산 병 용량" value={bottleMl} disabled={pending} onChange={(event) => setBottleMl(event.target.value)}><option value="375">375ml</option><option value="750">750ml</option><option value="1500">1500ml</option></select></label></div>
              <p className="consultation-assumption-note">질문에 쓴 수량·용량을 우선 적용하고, 실제 계산 조건은 답변 카드에 표시합니다.</p>
              <label className="label" htmlFor={`${labelId}-question`}>상담 질문</label><div className="consultation-input-row"><textarea ref={draftRef} id={`${labelId}-question`} value={draft} disabled={pending || gate !== "ready"} maxLength={1000} rows={2} placeholder="통관부호·카드번호 없이 궁금한 점을 적어 주세요" onChange={(event) => setDraft(event.target.value)} /><button className="btn" disabled={pending || !canSend || !draft.trim()}>{pending ? "답변 중…" : "보내기"}</button></div>
            </form>
            <p className="consultation-privacy">통관부호·카드번호는 입력하지 마세요. 상담 기록은 {quota.retentionDays}일 동안 보관됩니다.</p>
          </div>
        </div>
      </>}
    </div>
  );
}
