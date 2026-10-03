import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), config: vi.fn(),
  user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  pointTx: { aggregate: vi.fn(), create: vi.fn() },
}));
vi.mock("@/server/db", () => ({ prisma: { $transaction: mocks.transaction, user: mocks.user, pointTx: mocks.pointTx } }));
vi.mock("@/server/settings", () => ({ getCommunityConfig: mocks.config }));
import { awardPremiumOnce, balance, extendPremium, redeemPremium } from "@/server/points";

type LedgerEntry = { userId: string; reason: string; refId: string; amount: number; note?: string };
type Account = { premiumUntil: Date | null; ledger: LedgerEntry[] };

/** Simulates transaction commits/rollbacks and PostgreSQL's per-user transaction lock.
 * Reads and writes yield to let concurrent calls overlap before they acquire the lock. */
function accountDatabase(points = 200) {
  let account: Account = { premiumUntil: null, ledger: [{ userId: "u1", reason: "seed", refId: "seed", amount: points }] };
  let nextLock = Promise.resolve();
  let failedUpdates = 0;
  const lockedUsers: string[] = [];
  const sqlStatements: string[] = [];
  mocks.pointTx.aggregate.mockImplementation(async () => ({ _sum: { amount: account.ledger.reduce((sum, row) => sum + row.amount, 0) } }));
  mocks.user.findUniqueOrThrow.mockImplementation(() => { throw new Error("user read outside transaction"); });
  mocks.user.update.mockImplementation(() => { throw new Error("user update outside transaction"); });
  mocks.transaction.mockImplementation(async (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
    let draft: Account | null = null;
    let release: (() => void) | undefined;
    let lockedUser: string | undefined;
    let rowLocked = false;
    const state = () => {
      if (!draft) throw new Error("account accessed before acquiring the user lock");
      return draft;
    };
    const tx = {
      $executeRaw: async (sql: TemplateStringsArray, userId: string) => {
        sqlStatements.push(sql.join("?"));
        if (lockedUser === userId) return 0; // Transaction advisory locks are reentrant.
        const previous = nextLock;
        nextLock = new Promise<void>((resolve) => { release = resolve; });
        await previous;
        lockedUser = userId;
        lockedUsers.push(userId);
        draft = structuredClone(account);
        return 0;
      },
      $queryRaw: async (sql: TemplateStringsArray, userId: string) => {
        if (userId !== lockedUser) throw new Error("user row locked before advisory lock");
        expect(sql.join("?")).toContain('FROM "User" WHERE id = ? FOR UPDATE');
        rowLocked = true;
        return [{ id: userId }];
      },
      user: {
        findUniqueOrThrow: async () => {
          if (!rowLocked) throw new Error("premium read before locking user row");
          return { id: "u1", premiumUntil: state().premiumUntil };
        },
        update: async ({ data }: { data: { premiumUntil: Date } }) => {
          if (failedUpdates > 0) {
            failedUpdates--;
            throw new Error("premium update failed");
          }
          state().premiumUntil = data.premiumUntil;
          return { id: "u1", premiumUntil: data.premiumUntil };
        },
      },
      pointTx: {
        aggregate: async () => ({ _sum: { amount: state().ledger.reduce((sum, row) => sum + row.amount, 0) } }),
        findUnique: async ({ where }: { where: { userId_reason_refId: Pick<LedgerEntry, "userId" | "reason" | "refId"> } }) => {
          const key = where.userId_reason_refId;
          return state().ledger.find((row) => row.userId === key.userId && row.reason === key.reason && row.refId === key.refId) ?? null;
        },
        create: async ({ data }: { data: LedgerEntry }) => {
          if (state().ledger.some((row) => row.userId === data.userId && row.reason === data.reason && row.refId === data.refId)) throw new Error("duplicate ledger key");
          state().ledger.push(data);
          return data;
        },
      },
    };
    try {
      const result = await work(tx as unknown as Prisma.TransactionClient);
      if (draft) account = draft;
      return result;
    } finally {
      release?.();
    }
  });
  return {
    snapshot: () => structuredClone(account),
    failNextPremiumUpdate: () => { failedUpdates++; },
    lockedUsers, sqlStatements,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-02T08:00:00Z"));
  mocks.config.mockResolvedValue({ costs: { premiumMonth: 100 } });
});
afterEach(() => vi.useRealTimers());

describe("프리미엄·포인트의 동시 처리", () => {
  it("동시에 들어온 기간 연장을 누락하지 않는다", async () => {
    const db = accountDatabase();
    await Promise.all([extendPremium("u1", 1), extendPremium("u1", 2)]);
    expect(db.snapshot().premiumUntil).toEqual(new Date("2027-01-02T08:00:00Z"));
    expect(db.lockedUsers).toEqual(["u1", "u1"]);
    expect(db.sqlStatements.every((sql) => sql.includes("pg_advisory_xact_lock(hashtext("))).toBe(true);
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it.each([{ initial: 100, successful: 1 }, { initial: 200, successful: 2 }])(
    "잔액 $initial P에서 동시 교환은 $successful 건만 승인한다",
    async ({ initial, successful }) => {
      const db = accountDatabase(initial);
      const results = await Promise.all([redeemPremium("u1"), redeemPremium("u1")]);
      expect(results.filter((result) => result.ok)).toHaveLength(successful);
      expect(await balance("u1")).toBe(initial - successful * 100);
      expect(db.snapshot().premiumUntil).toEqual(new Date(successful === 1 ? "2026-11-02T08:00:00Z" : "2026-12-02T08:00:00Z"));
      const debits = db.snapshot().ledger.filter((row) => row.reason === "redeem_premium");
      expect(debits).toHaveLength(successful);
      expect(new Set(debits.map((row) => row.refId)).size).toBe(successful);
    },
  );

  it("기간 갱신 실패 시 차감도 취소하여 다시 교환할 수 있다", async () => {
    const db = accountDatabase(100);
    db.failNextPremiumUpdate();
    await expect(redeemPremium("u1")).rejects.toThrow("premium update failed");
    expect(await balance("u1")).toBe(100);
    expect(db.snapshot().premiumUntil).toBeNull();
    expect(db.snapshot().ledger).toHaveLength(1);
    expect(await redeemPremium("u1")).toMatchObject({ ok: true });
    expect(await balance("u1")).toBe(0);
  });

  it("같은 월간 보상은 동시에 요청해도 한 번만 적용한다", async () => {
    const db = accountDatabase();
    const results = await Promise.all([
      awardPremiumOnce("u1", "monthly_king", "2026-10", 1),
      awardPremiumOnce("u1", "monthly_king", "2026-10", 1),
    ]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(db.snapshot().ledger.filter((row) => row.reason === "monthly_king")).toHaveLength(1);
    expect(db.snapshot().premiumUntil).toEqual(new Date("2026-11-02T08:00:00Z"));
    expect(await balance("u1")).toBe(200);
  });

  it("보상 갱신 실패 시 완료 표식을 남기지 않으며 재시도하면 지급한다", async () => {
    const db = accountDatabase();
    db.failNextPremiumUpdate();
    await expect(awardPremiumOnce("u1", "monthly_king", "2026-10", 1)).rejects.toThrow("premium update failed");
    expect(db.snapshot().ledger).toHaveLength(1);
    expect(db.snapshot().premiumUntil).toBeNull();
    expect(await awardPremiumOnce("u1", "monthly_king", "2026-10", 1)).toMatchObject({ created: true });
  });

  it("교환·일반 연장·월간 보상이 같은 회원 잠금을 공유한다", async () => {
    const db = accountDatabase();
    await Promise.all([
      redeemPremium("u1"), extendPremium("u1", 1), awardPremiumOnce("u1", "monthly_king", "2026-10", 1),
    ]);
    expect(db.snapshot().premiumUntil).toEqual(new Date("2027-01-02T08:00:00Z"));
    expect(await balance("u1")).toBe(100);
    expect(db.lockedUsers).toEqual(["u1", "u1", "u1"]);
  });
});

describe("잘못된 교환 설정·기간", () => {
  it.each([0, -100, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])("잘못된 비용 %s로 프리미엄을 지급하지 않는다", async (premiumMonth) => {
    mocks.config.mockResolvedValue({ costs: { premiumMonth } });
    expect(await redeemPremium("u1")).toMatchObject({ ok: false, error: expect.any(String) });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 121])("잘못된 기간 %s를 거부한다", async (months) => {
    await expect(extendPremium("u1", months)).rejects.toThrow(RangeError);
    await expect(awardPremiumOnce("u1", "monthly_king", "2026-10", months)).rejects.toThrow(RangeError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
