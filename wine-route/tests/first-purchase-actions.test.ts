import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUser: vi.fn(),
  upsert: vi.fn(), update: vi.fn(), findOrder: vi.fn(), context: vi.fn(), cookie: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: m.cookie }) }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("@/server/auth", () => ({ requireUser: m.requireUser }));
vi.mock("@/server/db", () => ({ prisma: { firstPurchaseGuide: { upsert: m.upsert, update: m.update }, order: { findFirst: m.findOrder } } }));
vi.mock("@/app/guide/first/context", () => ({ loadGuideContext: m.context }));
import { saveGuideStep } from "@/app/guide/first/actions";

const user = { id: "owner", adultVerifiedAt: new Date(), pcccEnc: null, firstNameEn: "Gildong", lastNameEn: "Hong", address1En: "12, Teheran-ro", cityEn: "Seoul", zip: "06134", phone: "01012345678" };
const guide = { userId: "owner", pcccIssued: false, cardChecked: false, addressConfirmed: false, preparedRoutes: [] as string[], completedAt: null };
function form(step: number, confirmed = true) { const fd = new FormData(); fd.set("step", String(step)); fd.set("offerId", "offer1"); fd.set("qty", "2"); fd.set("route", "EXPORT_RETAILER"); fd.set("userId", "another-user"); if (confirmed) fd.set("confirmed", "on"); return fd; }

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUser.mockResolvedValue(user);
  m.upsert.mockResolvedValue(guide);
  m.findOrder.mockResolvedValue(null);
  m.update.mockResolvedValue({ ...guide, pcccIssued: true });
  m.context.mockResolvedValue({ routeKey: "EXPORT_RETAILER", candidate: { offerId: "offer1" }, forwarder: null });
});

describe("인증된 회원의 순서대로 준비 확인", () => {
  it("가짜 userId 입력을 무시하고 발급 여부만 본인 계정에 저장한다", async () => {
    expect(await saveGuideStep({}, form(2))).toEqual({ ok: true });
    expect(m.update).toHaveBeenCalledWith({ where: { userId: "owner" }, data: { pcccIssued: true } });
    expect(m.findOrder.mock.calls[0][0].where.userId).toBe("owner");
    expect(m.requireUser).toHaveBeenCalledWith("/guide/first?qty=2&route=EXPORT_RETAILER&offerId=offer1");
    expect(m.update.mock.calls[0][0].data).not.toHaveProperty("pcccEnc");
  });
  it("실제 성인인증 없이 발급 단계 완료를 저장하지 않는다", async () => {
    m.requireUser.mockResolvedValue({ ...user, adultVerifiedAt: null });
    expect((await saveGuideStep({}, form(2))).error).toBeTruthy();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("미완료 단계를 건너뛰거나 확인 체크를 빼면 저장하지 않는다", async () => {
    expect((await saveGuideStep({}, form(3))).error).toBeTruthy();
    expect((await saveGuideStep({}, form(2, false))).error).toBeTruthy();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("실제 주소가 없는 상태에서 주소 완료 체크를 저장하지 않는다", async () => {
    m.upsert.mockResolvedValue({ ...guide, pcccIssued: true, cardChecked: true });
    m.requireUser.mockResolvedValue({ ...user, address1En: null });
    expect((await saveGuideStep({}, form(4))).error).toBeTruthy();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("선택한 경로가 이용 불가하면 주문 준비를 완료하지 않는다", async () => {
    m.upsert.mockResolvedValue({ ...guide, pcccIssued: true, cardChecked: true, addressConfirmed: true });
    m.context.mockResolvedValue({ routeKey: "EXPORT_RETAILER", candidate: null, forwarder: null });
    expect((await saveGuideStep({}, form(5))).error).toBeTruthy();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("발송 전 단계를 체크해도 운송장 등록·완료 시각을 지어내지 않는다", async () => {
    const ready = { ...guide, pcccIssued: true, cardChecked: true, addressConfirmed: true, preparedRoutes: ["EXPORT_RETAILER"] };
    m.upsert.mockResolvedValue(ready);
    m.update.mockResolvedValue(ready);
    expect(await saveGuideStep({}, form(5))).toEqual({ ok: true });
    expect(m.update).toHaveBeenCalledTimes(1);
    expect(m.update.mock.calls[0][0].data).not.toHaveProperty("completedAt");
  });
});
