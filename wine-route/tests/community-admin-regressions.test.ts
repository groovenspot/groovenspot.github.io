import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMMUNITY } from "@/lib/community";

const m = vi.hoisted(() => ({
  admin: vi.fn(), config: vi.fn(), kings: vi.fn(), premium: vi.fn(), revalidate: vi.fn(),
  db: {
    $transaction: vi.fn(),
    directReview: { findUnique: vi.fn(), update: vi.fn() },
    proofFile: { deleteMany: vi.fn() }, report: { updateMany: vi.fn() },
    pointTx: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
    adminLog: { create: vi.fn() },
  },
  tx: {
    $queryRaw: vi.fn(), $executeRaw: vi.fn(),
    directReview: { findUnique: vi.fn(), update: vi.fn() },
    proofFile: { deleteMany: vi.fn() }, report: { updateMany: vi.fn() },
    pointTx: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
  },
}));
vi.mock("@/server/db", () => ({ prisma: m.db }));
vi.mock("@/server/auth", () => ({ requireAdmin: m.admin }));
vi.mock("@/server/settings", () => ({
  getCommunityConfig: m.config, getTaxConfig: vi.fn(), saveCommunityConfig: vi.fn(), saveFxConfig: vi.fn(), saveTaxConfig: vi.fn(),
}));
vi.mock("@/server/points", () => ({ extendPremiumInTransaction: m.premium }));
vi.mock("@/server/ranking", () => ({ monthKings: m.kings }));
vi.mock("@/server/orders", () => ({ moveOrder: vi.fn() }));
vi.mock("@/jobs/alerts", () => ({ notifyAllocation: vi.fn(), notifyNewVintage: vi.fn() }));
vi.mock("@/jobs/run", () => ({ runJob: vi.fn() }));
vi.mock("@/jobs/crawl", () => ({ runCrawlJob: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { approveProof, grantKings, rejectProof, resolveReports } from "@/app/admin/actions";

const pending = { id: "r1", userId: "author", status: "PUBLISHED", proofStatus: "PENDING", proofNote: null, proof: { id: "p1" } };
function form(values: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries({ id: "r1", action: "restore", note: "세금 내역이 보이지 않습니다", offset: "-1", ...values })) fd.set(key, value);
  return fd;
}
function expectNoMutations() {
  expect(m.tx.directReview.update).not.toHaveBeenCalled();
  expect(m.tx.proofFile.deleteMany).not.toHaveBeenCalled();
  expect(m.tx.report.updateMany).not.toHaveBeenCalled();
  expect(m.tx.pointTx.createMany).not.toHaveBeenCalled();
  expect(m.tx.pointTx.create).not.toHaveBeenCalled();
  expect(m.premium).not.toHaveBeenCalled();
}
function expectNoOutsideWrites() {
  expect(m.db.directReview.update).not.toHaveBeenCalled();
  expect(m.db.proofFile.deleteMany).not.toHaveBeenCalled();
  expect(m.db.report.updateMany).not.toHaveBeenCalled();
  expect(m.db.pointTx.createMany).not.toHaveBeenCalled();
  expect(m.db.pointTx.create).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  m.admin.mockResolvedValue({ id: "admin" });
  m.config.mockResolvedValue(DEFAULT_COMMUNITY);
  m.tx.$queryRaw.mockResolvedValue([{ id: "r1" }]);
  m.tx.$executeRaw.mockResolvedValue(1);
  m.tx.directReview.findUnique.mockResolvedValue(pending);
  m.tx.directReview.update.mockResolvedValue({});
  m.tx.proofFile.deleteMany.mockResolvedValue({ count: 1 });
  m.tx.pointTx.createMany.mockResolvedValue({ count: 1 });
  m.tx.pointTx.findMany.mockResolvedValue([]);
  m.premium.mockResolvedValue(new Date("2026-11-02T00:00:00Z"));
  m.kings.mockResolvedValue({ label: "2026-09", list: ["a", "b", "c"].map((userId) => ({ userId })) });
  m.db.$transaction.mockImplementation(async (work) => {
    expect(typeof work, "all dependent writes must share a callback transaction").toBe("function");
    return work(m.tx);
  });
});

describe("운영자 인증과 통관 증빙 처리", () => {
  it("운영자 권한이 없으면 승인·반려·신고 처리·후기왕 지급 모두 DB 접근 전에 중단한다", async () => {
    m.admin.mockRejectedValue(new Error("admin required"));
    for (const action of [approveProof, rejectProof, resolveReports, grantKings]) await expect(action(form())).rejects.toThrow("admin required");
    expect(m.db.$transaction).not.toHaveBeenCalled();
    expect(m.config).not.toHaveBeenCalled();
    expect(m.kings).not.toHaveBeenCalled();
    expectNoMutations();
  });

  it("증빙 승인 동시 요청은 실제 대기 상태를 확인해 배지·사진 삭제·포인트를 한 번만 반영한다", async () => {
    let current = { ...pending };
    let queue = Promise.resolve();
    const events: string[] = [];
    m.tx.$queryRaw.mockImplementation(async () => { events.push("lock"); return [{ id: "r1" }]; });
    m.tx.directReview.findUnique.mockImplementation(async () => { events.push("read"); return { ...current }; });
    m.tx.directReview.update.mockImplementation(async ({ data }) => { events.push("badge"); current = { ...current, ...data }; return current; });
    m.tx.proofFile.deleteMany.mockImplementation(async () => { events.push("delete proof"); return { count: 1 }; });
    m.tx.pointTx.createMany.mockImplementation(async () => { events.push("reward"); return { count: 1 }; });
    m.db.$transaction.mockImplementation((work) => {
      expect(typeof work).toBe("function");
      const result = queue.then(() => work(m.tx));
      queue = result.then(() => undefined);
      return result;
    });
    await Promise.all([approveProof(form()), approveProof(form())]);
    expect(current.proofStatus).toBe("APPROVED");
    expect(m.tx.directReview.update).toHaveBeenCalledOnce();
    expect(m.tx.directReview.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { proofStatus: "APPROVED", proofNote: null } });
    expect(m.tx.proofFile.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { reviewId: "r1" } });
    expect(m.tx.pointTx.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId: "author", reason: "proof", refId: "r1", amount: DEFAULT_COMMUNITY.points.proof, note: "통관 인증" }],
      skipDuplicates: true,
    });
    expect(events).toEqual(["lock", "read", "badge", "delete proof", "reward", "lock", "read"]);
    expect(String(m.tx.$queryRaw.mock.calls[0][0])).toMatch(/DirectReview[\s\S]*FOR UPDATE/);
    expect(m.tx.$queryRaw.mock.calls[0]).toContain("r1");
    expectNoOutsideWrites();
  });

  it("이미 승인·반려한 후기, 삭제한 후기, 증빙 없는 후기에는 승인과 보상을 적용하지 않는다", async () => {
    for (const current of [
      { ...pending, proofStatus: "APPROVED" }, { ...pending, proofStatus: "REJECTED" },
      { ...pending, status: "DELETED" }, { ...pending, proof: null }, null,
    ]) {
      m.tx.directReview.findUnique.mockResolvedValueOnce(current);
      await approveProof(form());
      expectNoMutations();
    }
    expectNoOutsideWrites();
  });

  it("대기 증빙만 반려하고 반려 사유와 사진 삭제를 같은 트랜잭션에 저장한다", async () => {
    await rejectProof(form());
    expect(m.tx.directReview.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { proofStatus: "REJECTED", proofNote: "세금 내역이 보이지 않습니다" } });
    expect(m.tx.proofFile.deleteMany).toHaveBeenCalledWith({ where: { reviewId: "r1" } });
    expect(m.tx.pointTx.createMany).not.toHaveBeenCalled();
    expectNoOutsideWrites();
  });

  it("반려 요청으로 승인 완료 배지를 취소하거나 삭제 후기를 변경하지 않는다", async () => {
    for (const current of [
      { ...pending, proofStatus: "APPROVED" }, { ...pending, proofStatus: "REJECTED" },
      { ...pending, proofStatus: "NONE" }, { ...pending, status: "DELETED" }, null,
    ]) {
      m.tx.directReview.findUnique.mockResolvedValueOnce(current);
      await rejectProof(form());
      expectNoMutations();
    }
    expectNoOutsideWrites();
  });
});

describe("신고 처리의 삭제 상태 보존", () => {
  it("복구 요청으로 삭제 후기를 되살리거나 공개 후기를 변경하지 않는다", async () => {
    for (const status of ["DELETED", "PUBLISHED"]) {
      m.tx.directReview.findUnique.mockResolvedValueOnce({ ...pending, status });
      await resolveReports(form());
      expectNoMutations();
    }
    await resolveReports(form({ action: "invalid" }));
    expectNoMutations();
    expectNoOutsideWrites();
  });

  it.each(["restore", "delete"])("숨긴 후기를 %s할 때 미해결 신고의 처리 결과도 함께 저장한다", async (action) => {
    m.tx.directReview.findUnique.mockResolvedValue({ ...pending, status: "HIDDEN" });
    await resolveReports(form({ action }));
    expect(m.tx.directReview.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { status: action === "restore" ? "PUBLISHED" : "DELETED" } });
    expect(m.tx.report.updateMany).toHaveBeenCalledWith({
      where: { reviewId: "r1", resolvedAt: null },
      data: { resolvedAt: expect.any(Date), resolution: action === "restore" ? "restored" : "deleted" },
    });
    if (action === "restore") expect(m.tx.proofFile.deleteMany).not.toHaveBeenCalled();
    else expect(m.tx.proofFile.deleteMany).toHaveBeenCalledWith({ where: { reviewId: "r1" } });
    expectNoOutsideWrites();
  });
});

describe("월별 후기왕의 지급 제한과 원자성", () => {
  it("진행 중인 월·미래 월·정수가 아닌 월은 순위 조회와 지급 전에 거부한다", async () => {
    for (const offset of ["0", "1", "-1.5", "Infinity", "-121"]) await expect(grantKings(form({ offset }))).rejects.toThrow("종료된 월");
    expect(m.kings).not.toHaveBeenCalled();
    expect(m.db.$transaction).not.toHaveBeenCalled();
    expectNoMutations();
  });

  it("월별 동시 지급 요청의 후보가 바뀌어도 이미 지급한 3명을 넘어 보상하지 않는다", async () => {
    const paid: { userId: string; reason: string; refId: string; amount: number }[] = [];
    const extended: string[] = [];
    const events: string[] = [];
    let queue = Promise.resolve();
    m.kings.mockResolvedValueOnce({ label: "2026-09", list: ["c", "a", "b"].map((userId) => ({ userId })) })
      .mockResolvedValueOnce({ label: "2026-09", list: ["d", "e", "f"].map((userId) => ({ userId })) });
    m.tx.$executeRaw.mockImplementation(async () => { events.push("monthly lock"); return 1; });
    m.tx.pointTx.findMany.mockImplementation(async () => { events.push("read awards"); return paid.map(({ userId }) => ({ userId })); });
    m.tx.pointTx.create.mockImplementation(async ({ data }) => { paid.push(data); return data; });
    m.premium.mockImplementation(async (tx, userId, months) => {
      expect(tx).toBe(m.tx);
      expect(months).toBe(1);
      expect(paid.some((row) => row.userId === userId)).toBe(true);
      extended.push(userId);
      return new Date("2026-11-02T00:00:00Z");
    });
    m.db.$transaction.mockImplementation((work) => {
      expect(typeof work).toBe("function");
      const result = queue.then(() => work(m.tx));
      queue = result.then(() => undefined);
      return result;
    });
    await Promise.all([grantKings(form()), grantKings(form())]);
    expect(m.kings).toHaveBeenCalledWith(-1);
    expect(paid.map((row) => row.userId)).toEqual(["a", "b", "c"]);
    expect(extended).toEqual(["a", "b", "c"]);
    expect(paid.every((row) => row.reason === "king" && row.refId === "2026-09" && row.amount === 0)).toBe(true);
    expect(events).toEqual(["monthly lock", "read awards", "monthly lock", "read awards"]);
    for (const raw of m.tx.$executeRaw.mock.calls) {
      expect(String(raw[0])).toMatch(/pg_advisory_xact_lock/);
      expect(raw).toContain("community-kings:2026-09");
    }
    expect(m.tx.pointTx.findMany).toHaveBeenCalledWith({ where: { reason: "king", refId: "2026-09" }, select: { userId: true } });
    expectNoOutsideWrites();
  });

  it("기존 수상자가 현재 상위권에 없어도 남은 월별 지급 인원만 보상한다", async () => {
    m.tx.pointTx.findMany.mockResolvedValue([{ userId: "old-a" }, { userId: "old-b" }]);
    await grantKings(form());
    expect(m.tx.pointTx.create).toHaveBeenCalledOnce();
    expect(m.tx.pointTx.create.mock.calls[0][0].data.userId).toBe("a");
    expect(m.premium).toHaveBeenCalledExactlyOnceWith(m.tx, "a", 1);
    expectNoOutsideWrites();
  });

  it("프리미엄 연장 실패를 삼키지 않고 월별 지급 원장도 커밋하지 않는다", async () => {
    const committed: string[] = [];
    let staged: string[] = [];
    m.tx.pointTx.create.mockImplementation(async ({ data }) => { staged.push(data.userId); return data; });
    m.premium.mockRejectedValue(new Error("premium update failed"));
    m.db.$transaction.mockImplementation(async (work) => {
      expect(typeof work).toBe("function");
      staged = [...committed];
      const result = await work(m.tx);
      committed.splice(0, committed.length, ...staged);
      return result;
    });
    await expect(grantKings(form())).rejects.toThrow("premium update failed");
    expect(m.tx.pointTx.create).toHaveBeenCalledOnce();
    expect(m.premium).toHaveBeenCalledExactlyOnceWith(m.tx, "a", 1);
    expect(committed).toEqual([]);
    expect(m.revalidate).not.toHaveBeenCalled();
    expectNoOutsideWrites();
  });
});
