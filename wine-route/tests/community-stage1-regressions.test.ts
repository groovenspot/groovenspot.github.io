import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMMUNITY } from "@/lib/community";

const m = vi.hoisted(() => ({
  member: vi.fn(), requireUser: vi.fn(), config: vi.fn(), tax: vi.fn(), fx: vi.fn(),
  award: vi.fn(), revalidate: vi.fn(), redirect: vi.fn(), kings: vi.fn(),
  db: {
    directReview: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    order: { findFirst: vi.fn() }, wine: { findUnique: vi.fn(), findMany: vi.fn() }, seller: { findUnique: vi.fn() },
    helpful: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn() },
    report: { upsert: vi.fn() }, pointTx: { createMany: vi.fn(), create: vi.fn() },
    clickLog: { groupBy: vi.fn() }, $transaction: vi.fn(),
  },
  tx: {
    directReview: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    helpful: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn() },
    report: { upsert: vi.fn() }, pointTx: { createMany: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(), $executeRaw: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({ prisma: m.db }));
vi.mock("@/server/auth", () => ({ requireUser: m.requireUser }));
vi.mock("@/server/member", () => ({ memberState: m.member }));
vi.mock("@/server/settings", () => ({ getCommunityConfig: m.config, getTaxConfig: m.tax, getFx: m.fx }));
vi.mock("@/server/points", () => ({
  award: m.award, extendPremium: vi.fn(), extendPremiumInTransaction: vi.fn(), redeemPremium: vi.fn(),
}));
vi.mock("@/server/identity", () => ({ devVerifyAllowed: vi.fn(), fetchIdentity: vi.fn(), portoneConfigured: vi.fn() }));
vi.mock("@/server/ranking", () => ({ monthKings: m.kings }));
vi.mock("@/components/CommunityNav", () => ({ CommunityNav: () => null }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement("a", { href }, children) }));

import { createReview, reportReview, toggleHelpful } from "@/app/community/actions";
import Ranking from "@/app/community/ranking/page";

const member = { id: "reader", adultVerifiedAt: new Date(), nickname: "독자" };
const wine = { id: "w1", nameKo: "샤블리", country: "프랑스", krPrice: 100000 };
const review = { id: "r1", userId: "author", status: "PUBLISHED", sponsored: false, helpfulCount: 99 };
const deliveredOrder = {
  id: "o1", userId: member.id, wineId: wine.id, sellerId: "s1", route: "EXPORT_RETAILER",
  qty: 2, bottleMl: 750, status: "DELIVERED", estTax: 12000, review: null,
};
function form(values: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries({
    id: "r1", wineId: "w1", route: "EXPORT_RETAILER", sellerId: "s1", qty: "1", ml: "750",
    taxPaid: "0", shippingDays: "9", rating: "4", oneLiner: "포장이 꼼꼼하고 배송이 빨랐어요", reason: "허위 후기", ...values,
  })) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.resetAllMocks();
  // Next's JSX is compiled by Vitest without the Next runtime.
  vi.stubGlobal("React", React);
  m.member.mockResolvedValue({ ok: true, user: member });
  m.requireUser.mockResolvedValue(member);
  m.config.mockResolvedValue(DEFAULT_COMMUNITY);
  m.db.wine.findUnique.mockResolvedValue(wine);
  m.db.seller.findUnique.mockResolvedValue({ id: "s1", channel: "EXPORT_RETAILER" });
  m.db.order.findFirst.mockResolvedValue(null);
  m.db.directReview.findUnique.mockResolvedValue(review);
  m.db.directReview.create.mockResolvedValue({ id: "written" });
  m.award.mockResolvedValue({ created: true, amount: 300 });
  m.redirect.mockImplementation((destination: string) => { throw new Error(`REDIRECT:${destination}`); });
  m.tx.directReview.findUnique.mockResolvedValue(review);
  m.tx.directReview.create.mockResolvedValue({ id: "written" });
  m.tx.directReview.update.mockResolvedValue(review);
  m.tx.directReview.updateMany.mockResolvedValue({ count: 1 });
  m.tx.helpful.findUnique.mockResolvedValue(null);
  m.tx.helpful.count.mockResolvedValue(1);
  m.tx.pointTx.createMany.mockResolvedValue({ count: 1 });
  m.tx.$queryRaw.mockResolvedValue([{ id: "r1" }]);
  m.tx.$executeRaw.mockResolvedValue(1);
  m.db.$transaction.mockImplementation(async (work) => {
    expect(typeof work, "eligibility and mutations must run inside a callback transaction").toBe("function");
    return work(m.tx);
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("성인 커뮤니티 회원과 실제 구매 조건", () => {
  it("성인인증 또는 닉네임이 없으면 후기 작성과 신고 전에 DB에 접근하지 않는다", async () => {
    m.member.mockResolvedValue({ ok: false, user: { ...member, adultVerifiedAt: null, nickname: null } });
    expect((await createReview({}, form())).error).toBeTruthy();
    await expect(reportReview(form())).rejects.toThrow("REDIRECT:/verify");
    expect(m.db.order.findFirst).not.toHaveBeenCalled();
    expect(m.db.wine.findUnique).not.toHaveBeenCalled();
    expect(m.db.directReview.findUnique).not.toHaveBeenCalled();
    expect(m.db.directReview.create).not.toHaveBeenCalled();
    expect(m.tx.directReview.create).not.toHaveBeenCalled();
    expect(m.db.report.upsert).not.toHaveBeenCalled();
    expect(m.db.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["qty", "0"], ["qty", "1.5"], ["qty", "25"], ["qty", "Infinity"],
    ["ml", "0"], ["ml", "750.5"], ["ml", "Infinity"],
    ["taxPaid", "-1"], ["taxPaid", "0.5"], ["taxPaid", "Infinity"], ["taxPaid", "2147483648"],
  ])("%s=%s는 반올림하거나 기본값으로 바꾸지 않고 거부한다", async (field, value) => {
    expect((await createReview({}, form({ [field]: value }))).error).toBeTruthy();
    expect(m.db.directReview.create).not.toHaveBeenCalled();
    expect(m.tx.directReview.create).not.toHaveBeenCalled();
    expect(m.tx.pointTx.create).not.toHaveBeenCalled();
    expect(m.award).not.toHaveBeenCalled();
  });

  it.each(["CLICKED", "CONFIRMED", "SHIPPED", "CUSTOMS", "CANCELLED"])("%s 주문은 수령 후기 작성에 사용할 수 없다", async (status) => {
    m.db.order.findFirst.mockResolvedValue({ ...deliveredOrder, status });
    expect((await createReview({}, form({ orderId: "o1" }))).error).toBeTruthy();
    expect(m.db.directReview.create).not.toHaveBeenCalled();
    expect(m.tx.directReview.create).not.toHaveBeenCalled();
    expect(m.db.order.findFirst.mock.calls[0][0].where).toMatchObject({ id: "o1", userId: member.id });
  });

  it("선택 경로와 판매처 유형이 다르면 저장하지 않으며 배대지는 LOCAL_SHOP 판매처를 허용한다", async () => {
    m.db.seller.findUnique.mockResolvedValue({ id: "s1", channel: "HK_RETAILER" });
    expect((await createReview({}, form())).error).toBeTruthy();
    expect(m.db.directReview.create).not.toHaveBeenCalled();
    expect(m.tx.directReview.create).not.toHaveBeenCalled();
    m.db.seller.findUnique.mockResolvedValue({ id: "s1", channel: "LOCAL_SHOP" });
    await expect(createReview({}, form({ route: "FORWARDER" }))).rejects.toThrow("REDIRECT:/community?written=written");
    expect(m.tx.directReview.create.mock.calls[0][0].data).toMatchObject({ route: "FORWARDER", sellerId: "s1", taxPaid: 0 });
    expect(m.tx.pointTx.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: member.id, reason: "review", refId: "written" }) }));
    expect(m.db.directReview.create).not.toHaveBeenCalled();
  });
});

describe("도움됨의 현재 상태 확인과 중복 보상 방지", () => {
  it.each([
    { status: "HIDDEN", userId: "author" },
    { status: "DELETED", userId: "author" },
    { status: "PUBLISHED", userId: member.id },
  ])("잠금 후 읽은 후기 상태 $status · 작성자 $userId가 부적격이면 변경하지 않는다", async (current) => {
    // An earlier outside-transaction snapshot is still eligible.
    m.tx.directReview.findUnique.mockResolvedValue({ ...review, ...current });
    await toggleHelpful(form());
    expect(m.tx.directReview.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "r1" } }));
    expect(m.tx.helpful.create).not.toHaveBeenCalled();
    expect(m.tx.helpful.delete).not.toHaveBeenCalled();
    expect(m.tx.directReview.update).not.toHaveBeenCalled();
    expect(m.tx.pointTx.createMany).not.toHaveBeenCalled();
    expect(m.award).not.toHaveBeenCalled();
  });

  it("동시에 추가한 두 도움됨을 실제 행 수로 집계하고 같은 10개 보상은 재진입해도 한 번만 지급한다", async () => {
    const helpful = new Set(Array.from({ length: 9 }, (_, i) => `existing-${i}`));
    const rewards = new Set<string>();
    let savedCount = review.helpfulCount;
    let queue = Promise.resolve();
    const events: string[] = [];
    const lock = async () => { events.push("lock"); return [{ id: "r1" }]; };
    m.tx.$queryRaw.mockImplementation(lock);
    m.tx.$executeRaw.mockImplementation(lock);
    m.tx.directReview.findUnique.mockImplementation(async () => { events.push("review"); return { ...review, helpfulCount: savedCount }; });
    m.tx.helpful.findUnique.mockImplementation(async ({ where }) => helpful.has(where.reviewId_userId.userId) ? { reviewId: "r1", userId: where.reviewId_userId.userId } : null);
    m.tx.helpful.create.mockImplementation(async ({ data }) => { helpful.add(data.userId); return data; });
    m.tx.helpful.delete.mockImplementation(async ({ where }) => { helpful.delete(where.reviewId_userId.userId); return {}; });
    m.tx.helpful.count.mockImplementation(async () => helpful.size);
    m.tx.directReview.update.mockImplementation(async ({ data }) => { savedCount = data.helpfulCount; return { ...review, helpfulCount: savedCount }; });
    m.tx.pointTx.createMany.mockImplementation(async ({ data, skipDuplicates }) => {
      expect(skipDuplicates).toBe(true);
      const rows = Array.isArray(data) ? data : [data];
      let added = 0;
      for (const row of rows) {
        const key = `${row.userId}:${row.reason}:${row.refId}`;
        if (!rewards.has(key)) { rewards.add(key); added++; }
      }
      return { count: added };
    });
    m.db.$transaction.mockImplementation((work) => {
      expect(typeof work).toBe("function");
      const result = queue.then(() => work(m.tx));
      queue = result.then(() => undefined);
      return result;
    });
    m.member.mockResolvedValueOnce({ ok: true, user: { ...member, id: "a" } }).mockResolvedValueOnce({ ok: true, user: { ...member, id: "b" } });
    await Promise.all([toggleHelpful(form()), toggleHelpful(form())]);
    expect(savedCount).toBe(11); // The stale cached value was 99.
    expect(helpful.size).toBe(11);
    expect(rewards.size).toBe(1);
    const firstReward = m.tx.pointTx.createMany.mock.calls[0][0].data;
    expect(Array.isArray(firstReward) ? firstReward[0] : firstReward).toMatchObject({ userId: "author", reason: "helpful10", refId: "r1:1", amount: DEFAULT_COMMUNITY.points.helpful10 });
    expect(events).toEqual(["lock", "review", "lock", "review"]);
    for (const raw of [...m.tx.$queryRaw.mock.calls, ...m.tx.$executeRaw.mock.calls]) {
      expect(String(raw[0])).toMatch(/SELECT[\s\S]*DirectReview[\s\S]*FOR UPDATE/i);
      expect(raw).toContain("r1");
    }
    m.member.mockResolvedValue({ ok: true, user: { ...member, id: "b" } });
    await toggleHelpful(form()); // 11 -> 10: removing a vote never earns points.
    expect(rewards.size).toBe(1);
    expect(m.tx.pointTx.createMany).toHaveBeenCalledOnce();
    m.member.mockResolvedValue({ ok: true, user: { ...member, id: "a" } });
    await toggleHelpful(form()); // 10 -> 9
    await toggleHelpful(form()); // 9 -> 10, an already-paid milestone.
    expect(savedCount).toBe(10);
    expect(rewards.size).toBe(1);
    expect(m.tx.helpful.count).toHaveBeenCalledWith({ where: { reviewId: "r1" } });
    expect(m.db.helpful.create).not.toHaveBeenCalled();
    expect(m.award).not.toHaveBeenCalled();
  });

  it("협찬 후기에 도움됨 10개가 쌓여도 포인트를 지급하지 않는다", async () => {
    m.tx.directReview.findUnique.mockResolvedValue({ ...review, sponsored: true });
    m.tx.helpful.count.mockResolvedValue(10);
    await toggleHelpful(form());
    expect(m.tx.directReview.update).toHaveBeenCalledWith(expect.objectContaining({ data: { helpfulCount: 10 } }));
    expect(m.tx.pointTx.createMany).not.toHaveBeenCalled();
    expect(m.award).not.toHaveBeenCalled();
  });
});

describe("신고 재접수와 공개 절약액 랭킹", () => {
  it("이미 해결한 신고를 재접수하면 해결 표시를 지우고 후기 숨김과 함께 커밋한다", async () => {
    await reportReview(form());
    expect(m.tx.report.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { reviewId_userId: { reviewId: "r1", userId: member.id } },
      update: { reason: "허위 후기", resolvedAt: null, resolution: null },
    }));
    expect(m.tx.directReview.updateMany).toHaveBeenCalledWith({ where: { id: "r1", status: "PUBLISHED" }, data: { status: "HIDDEN" } });
    expect(m.db.report.upsert).not.toHaveBeenCalled();
    expect(m.db.directReview.updateMany).not.toHaveBeenCalled();
  });

  it("절약액 랭킹에서 협찬 후기를 제외하되 일반 후기는 보여 준다", async () => {
    const paid = { id: "paid", wineId: "paid-wine", route: "EXPORT_RETAILER", cardPaidKrw: 1, taxPaid: 0, qty: 1, bottleMl: 750, sponsored: true, wine: { nameKo: "협찬 와인", krPrice: 1000000 } };
    const ordinary = { ...paid, id: "ordinary", wineId: wine.id, sponsored: false, cardPaidKrw: 50000, wine };
    m.db.clickLog.groupBy.mockResolvedValue([]);
    m.db.wine.findMany.mockResolvedValue([]);
    m.kings.mockResolvedValue({ label: "2026-10", list: [] });
    m.db.directReview.findMany.mockImplementation(async ({ where }) => where.sponsored === false ? [ordinary] : [ordinary, paid]);
    const markup = renderToStaticMarkup(await Ranking());
    expect(markup).toContain("샤블리");
    expect(markup).not.toContain("협찬 와인");
    expect(m.db.directReview.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "PUBLISHED", sponsored: false }) }));
  });
});
