import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  notification: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  priceAlert: { findUnique: vi.fn(), count: vi.fn(), upsert: vi.fn() },
  directReview: { findFirst: vi.fn(), findMany: vi.fn() },
  scanLog: { findUnique: vi.fn(), update: vi.fn() },
  user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  pointTx: { create: vi.fn() },
  queryRaw: vi.fn(), executeRaw: vi.fn(), transaction: vi.fn(),
  sendMail: vi.fn(), sendAlimtalk: vi.fn(), template: vi.fn(), getUser: vi.fn(), compareWine: vi.fn(), tax: vi.fn(),
}));

vi.mock("@/server/db", () => ({ prisma: {
  notification: mocks.notification, priceAlert: mocks.priceAlert, directReview: mocks.directReview,
  scanLog: mocks.scanLog, user: mocks.user, pointTx: mocks.pointTx,
  $executeRaw: mocks.executeRaw, $transaction: mocks.transaction,
} }));
vi.mock("@/server/mail", () => ({ sendMail: mocks.sendMail }));
vi.mock("@/server/alimtalk", () => ({ alimtalkTemplate: mocks.template, sendGenericAlimtalk: mocks.sendAlimtalk }));
vi.mock("@/server/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/server/compare", () => ({ compareWine: mocks.compareWine, compareMany: vi.fn() }));
vi.mock("@/server/settings", () => ({ getTaxConfig: mocks.tax }));
vi.mock("@/server/points", () => ({ isPremium: (u: { plan: string }) => u.plan === "PREMIUM" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { notify, sendDigests } from "@/server/notify";
import { monthCard, reviewCard } from "@/server/cards";
import { attributeSignup, ensureRefCode } from "@/server/referral";
import { quickWatch, resolveScan } from "@/app/scan/actions";
import { createAlert } from "@/app/wines/[id]/actions";
import { recognize } from "@/server/recognize";

const user = { id: "u1", email: "user@example.test", phone: "01012345678", plan: "FREE", hitWatchLimitAt: new Date(), refCode: "ABCDEF" };
const request = { user, type: "TARGET" as const, title: "목표가 도달", body: "병당 도착가 90,000원", link: "/wines/w1", dedupeKey: "target:w1:90000" };
const duplicate = () => new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6" });
const wine = { id: "w1", nameKo: "샤블리", country: "프랑스", region: "부르고뉴", vintage: 2022, krPrice: 150000 };
const review = { id: "r1", wineId: "w1", wine, cardPaidKrw: null, taxPaid: 10000, qty: 1, bottleMl: 750, route: "WINERY", shippingDays: 9, order: { estTotal: 100000, estTax: 20000 } };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.notification.create.mockResolvedValue({ id: "n1" });
  mocks.notification.update.mockResolvedValue({});
  mocks.notification.updateMany.mockResolvedValue({ count: 1 });
  mocks.template.mockReturnValue("approved-template");
  mocks.sendMail.mockResolvedValue({ ok: true });
  mocks.sendAlimtalk.mockResolvedValue(undefined);
  mocks.getUser.mockResolvedValue(user);
  mocks.compareWine.mockResolvedValue({ wine, result: { best: { perBottle: 100000 } } });
  mocks.tax.mockResolvedValue({ freeAlertLimit: 3 });
  mocks.priceAlert.findUnique.mockResolvedValue(null);
  mocks.priceAlert.count.mockResolvedValue(0);
  mocks.priceAlert.upsert.mockResolvedValue({});
  mocks.scanLog.findUnique.mockResolvedValue(null);
  mocks.user.findUnique.mockResolvedValue(user);
  mocks.user.findUniqueOrThrow.mockResolvedValue(user);
  mocks.user.updateMany.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation(async (fn) => fn({ user: mocks.user, pointTx: mocks.pointTx, $executeRaw: mocks.executeRaw, $queryRaw: mocks.queryRaw }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("알림 발송과 주간 묶음", () => {
  it("사용자가 이메일을 고르면 카카오 설정과 번호가 있어도 이메일로 보낸다", async () => {
    expect(await notify({ ...request, channel: "EMAIL" })).toEqual({ sent: true });
    expect(mocks.sendAlimtalk).not.toHaveBeenCalled();
    expect(mocks.sendMail).toHaveBeenCalledOnce();
    expect(mocks.notification.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ channel: "email", status: "SENT" }) }));
  });
  it("카카오 발송 실패 시 같은 알림을 이메일로 전달한다", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.sendAlimtalk.mockRejectedValue(new Error("provider unavailable"));
    expect(await notify({ ...request, channel: "KAKAO" })).toEqual({ sent: true });
    expect(mocks.sendMail).toHaveBeenCalledOnce();
    expect(mocks.notification.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: "FAILED" } }));
  });
  it("이전 발송 실패는 재시도하고 성공한 알림은 중복 발송하지 않는다", async () => {
    mocks.notification.create.mockRejectedValue(duplicate());
    mocks.notification.findUnique.mockResolvedValue({ id: "failed", status: "FAILED" });
    expect(await notify(request)).toEqual({ sent: true });
    mocks.notification.findUnique.mockResolvedValue({ id: "sent", status: "SENT" });
    expect(await notify(request)).toEqual({ sent: false, duplicate: true });
    expect(mocks.sendAlimtalk).toHaveBeenCalledOnce();
  });
  it("이미 주간 묶음이 발송된 뒤 새로 들어온 하락 알림을 버리지 않는다", async () => {
    const createdAt = new Date("2026-10-06T00:00:00Z");
    mocks.notification.findMany.mockResolvedValue([{ id: "later", userId: user.id, user, title: "도착가 내려감", createdAt, channel: "email" }]);
    mocks.notification.create.mockRejectedValue(duplicate());
    mocks.notification.findUnique.mockResolvedValue({ id: "digest", status: "SENT", createdAt: new Date("2026-10-05T00:00:00Z"), sentAt: new Date("2026-10-05T00:00:01Z") });
    await sendDigests(new Date("2026-10-07T00:00:00Z"));
    expect(mocks.notification.updateMany).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});

describe("공유 카드의 실측 금액", () => {
  it("청구액이 없는 후기에서 주문 예상액을 실제 결제액으로 사용하지 않는다", async () => {
    mocks.directReview.findFirst.mockResolvedValue(review);
    const card = await reviewCard(user as never, review.id);
    expect(card?.myValue).toBeNull();
    expect(card?.saving).toBeNull();
  });
  it("실제 청구액과 납부 세금으로 절약액을 계산한다", async () => {
    mocks.directReview.findFirst.mockResolvedValue({ ...review, cardPaidKrw: 100000 });
    const card = await reviewCard(user as never, review.id);
    expect(card?.myValue).toBe(110000);
    expect(card?.saving).toBe(40000);
  });
  it("월간 결산에는 실측 청구액과 국내 추정가가 있는 후기만 합산한다", async () => {
    mocks.directReview.findMany.mockResolvedValue([review, { ...review, id: "r2", cardPaidKrw: 100000 }]);
    const card = await monthCard(user as never, new Date("2026-10-01"), new Date("2026-11-01"), "2026-10");
    expect(card.myValue).toBe(110000);
    expect(card.krValue).toBe(150000);
    expect(card.saving).toBe(40000);
    expect(card.subtitle).toContain("후기 1건");
  });
});

describe("사진 검색에서 찜 등록", () => {
  it.each(["google", "claude"])("%s 제공자에서도 지원하지 않는 사진 형식은 외부 전송 전에 거부한다", async (provider) => {
    vi.stubEnv("SCAN_PROVIDER", provider);
    vi.stubEnv("GOOGLE_VISION_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(recognize(new Uint8Array([1]), "image/svg+xml")).rejects.toThrow("JPG·PNG·WEBP");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("삭제했던 찜을 다시 켜도 무료 3개 한도를 적용한다", async () => {
    mocks.priceAlert.findUnique.mockResolvedValue({ active: false });
    mocks.priceAlert.count.mockResolvedValue(3);
    expect((await quickWatch("scan1", "w1")).error).toContain("3개");
    expect(mocks.priceAlert.upsert).not.toHaveBeenCalled();
  });
  it("목표가를 서버의 현재 도착가 90%로 정한다", async () => {
    await quickWatch("scan1", "w1");
    expect(mocks.priceAlert.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ targetPerBottle: 90000 }) }));
  });
  it("다른 회원의 사진 검색 결과를 변경하지 않는다", async () => {
    mocks.scanLog.findUnique.mockResolvedValue({ id: "scan1", userId: "another-user", resolvedAt: null });
    await resolveScan("scan1", "w1");
    expect(mocks.scanLog.update).not.toHaveBeenCalled();
  });
  it("상세 화면에서도 비활성 찜을 통한 한도 우회를 막는다", async () => {
    mocks.priceAlert.findUnique.mockResolvedValue({ active: false });
    mocks.priceAlert.count.mockResolvedValue(3);
    const fd = new FormData();
    fd.set("wineId", "w1"); fd.set("target", "90000"); fd.set("channel", "EMAIL");
    expect((await createAlert({}, fd)).limit).toBe(true);
    expect(mocks.priceAlert.upsert).not.toHaveBeenCalled();
  });
});

describe("가입 기준 공유 보상", () => {
  it("공유자 코드 생성 경합 때 이미 저장된 코드를 덮어쓰지 않는다", async () => {
    mocks.user.findUniqueOrThrow.mockResolvedValueOnce({ refCode: null }).mockResolvedValueOnce({ refCode: "STABLE" });
    mocks.user.updateMany.mockResolvedValue({ count: 0 });
    expect(await ensureRefCode("u1")).toBe("STABLE");
    expect(mocks.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1", refCode: null } }));
  });
  it("이미 연결한 가입자의 추천인을 바꾸거나 다시 보상하지 않는다", async () => {
    mocks.user.updateMany.mockResolvedValue({ count: 0 });
    await attributeSignup("new-user", "ABCDEF");
    expect(mocks.pointTx.create).not.toHaveBeenCalled();
  });
  it("3명째 가입과 프리미엄 1개월 보상을 같은 트랜잭션으로 처리한다", async () => {
    mocks.user.count.mockResolvedValue(3);
    const until = new Date("2099-10-02T00:00:00Z");
    mocks.user.findUniqueOrThrow.mockResolvedValue({ ...user, premiumUntil: until });
    await attributeSignup("new-user", "ABCDEF");
    expect(mocks.executeRaw).toHaveBeenCalledTimes(2);
    expect(mocks.queryRaw).toHaveBeenCalledOnce();
    expect(mocks.pointTx.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reason: "referral", refId: "1", amount: 0 }) }));
    expect(mocks.user.update).toHaveBeenCalledWith({ where: { id: user.id }, data: { premiumUntil: new Date("2099-11-02T00:00:00Z") } });
  });
});
