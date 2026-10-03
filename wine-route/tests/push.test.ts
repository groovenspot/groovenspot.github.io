import { describe, expect, it } from "vitest";
import { isGoneStatus, parseSubscription, pushPayload } from "@/lib/push";

describe("브라우저 알림", () => {
  it("구독 정보는 https 주소와 두 키가 있어야 받습니다", () => {
    const ok = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BPk", auth: "xyz" }, expirationTime: null };
    expect(parseSubscription(ok)).toEqual({ endpoint: ok.endpoint, keys: { p256dh: "BPk", auth: "xyz" } });
    expect(parseSubscription({ ...ok, endpoint: "http://evil.test/x" })).toBeNull();
    expect(parseSubscription({ endpoint: ok.endpoint, keys: { p256dh: "BPk" } })).toBeNull();
    expect(parseSubscription(null)).toBeNull();
    expect(parseSubscription({ ...ok, keys: { p256dh: "x".repeat(201), auth: "a" } })).toBeNull();
  });
  it("누르면 열 주소는 사이트 안 경로만, 길이는 자릅니다", () => {
    expect(JSON.parse(pushPayload("t", "b", "/wines/1")).url).toBe("/wines/1");
    expect(JSON.parse(pushPayload("t", "b", "https://evil.test")).url).toBe("/");
    expect(JSON.parse(pushPayload("t", "b", "//evil.test")).url).toBe("/");
    const p = JSON.parse(pushPayload("가".repeat(100), "나".repeat(400), "/"));
    expect(p.title).toHaveLength(80);
    expect(p.body).toHaveLength(300);
  });
  it("404·410 은 구독이 사라진 것", () => {
    expect(isGoneStatus(410)).toBe(true);
    expect(isGoneStatus(404)).toBe(true);
    expect(isGoneStatus(500)).toBe(false);
    expect(isGoneStatus(undefined)).toBe(false);
  });
});
