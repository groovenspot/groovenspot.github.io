import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decrypt, encrypt } from "@/server/crypto";

beforeEach(() => {
  vi.stubEnv("ORDER_DATA_KEY", "");
  vi.stubEnv("SESSION_SECRET", "");
  vi.stubEnv("NODE_ENV", "production");
});
afterEach(() => vi.unstubAllEnvs());

describe("개인통관고유부호 암호화", () => {
  it("운영 환경에 비밀 키가 없으면 알려진 기본 키로 저장하지 않는다", () => {
    expect(() => encrypt("P123456789012")).toThrow();
  });
  it("설정한 전용 키로 복호화할 수 있으며 같은 번호도 암호문이 매번 달라진다", () => {
    vi.stubEnv("ORDER_DATA_KEY", "test-only-order-secret");
    const first = encrypt("P123456789012");
    const second = encrypt("P123456789012");
    expect(first).not.toContain("P123456789012");
    expect(second).not.toBe(first);
    expect(decrypt(first)).toBe("P123456789012");
    expect(decrypt(second)).toBe("P123456789012");
  });
  it("전용 키가 없으면 설정한 세션 비밀 키로 기존 번호를 읽을 수 있다", () => {
    vi.stubEnv("SESSION_SECRET", "test-only-session-secret");
    const token = encrypt("P123456789012");
    expect(decrypt(token)).toBe("P123456789012");
    vi.stubEnv("SESSION_SECRET", "a-different-secret");
    expect(decrypt(token)).toBeNull();
  });
  it("암호문이 변조되거나 운영 키가 사라지면 번호를 반환하지 않는다", () => {
    vi.stubEnv("ORDER_DATA_KEY", "test-only-order-secret");
    const token = encrypt("P123456789012");
    const [version, iv, tag, body] = token.split(".");
    const changed = Buffer.from(body, "base64url");
    changed[0] ^= 1;
    expect(decrypt([version, iv, tag, changed.toString("base64url")].join("."))).toBeNull();
    vi.stubEnv("ORDER_DATA_KEY", "");
    expect(decrypt(token)).toBeNull();
  });
});
