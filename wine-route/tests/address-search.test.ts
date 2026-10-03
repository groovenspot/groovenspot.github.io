import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getUser } from "@/server/auth";
import { POST } from "@/app/guide/first/address/route";

vi.mock("@/server/auth", () => ({ getUser: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const sample = {
  results: {
    common: { errorCode: "0", totalCount: "1" },
    juso: [{ roadAddr: "152, Teheran-ro, Gangnam-gu, Seoul", siNm: "Seoul", sggNm: "Gangnam-gu", zipNo: "06236" }],
  },
};

function request(body: unknown = { keyword: "테헤란로 152" }) {
  return new NextRequest("http://localhost/guide/first/address", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("JUSO_API_KEY", "server-only-key");
  vi.mocked(getUser).mockResolvedValue({ id: "user" } as NonNullable<Awaited<ReturnType<typeof getUser>>>);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(Response.json(sample));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("official English address search", () => {
  it("requires login before contacting the provider", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports an unconfigured provider without generating a translation", async () => {
    vi.stubEnv("JUSO_API_KEY", "");
    const result = await POST(request());
    expect(result.status).toBe(503);
    expect(await result.json()).toMatchObject({ configured: false, addresses: [], total: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing, too short, and control-character keywords", async () => {
    for (const body of [{}, { keyword: "가" }, { keyword: "테헤란로\u0000 152" }, { keyword: "- -" }]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the fixed official endpoint and returns only validated address fields", async () => {
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    const payload = await result.json();
    expect(payload).toEqual({
      configured: true,
      total: 1,
      addresses: [{ address1En: "152, Teheran-ro, Gangnam-gu, Seoul", cityEn: "Gangnam-gu", provinceEn: "Seoul", zip: "06236" }],
    });
    expect(JSON.stringify(payload)).not.toContain("server-only-key");
    const [target, options] = fetchMock.mock.calls[0];
    const url = new URL(String(target));
    expect(`${url.origin}${url.pathname}`).toBe("https://business.juso.go.kr/addrlink/addrEngApi.do");
    expect(Object.fromEntries(url.searchParams)).toEqual({ confmKey: "server-only-key", currentPage: "1", countPerPage: "10", keyword: "테헤란로 152", resultType: "json" });
    expect(options).toMatchObject({ cache: "no-store", redirect: "error", method: "GET" });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses the province as city for addresses without a separate district", async () => {
    fetchMock.mockResolvedValue(Response.json({
      results: { common: sample.results.common, juso: [{ roadAddr: "13, Dodam-ro, Sejong-si", siNm: "Sejong-si", sggNm: "", zipNo: "30000" }] },
    }));
    const payload = await (await POST(request())).json();
    expect(payload.addresses[0].cityEn).toBe("Sejong-si");
  });

  it("shows no matches without inventing an address", async () => {
    fetchMock.mockResolvedValue(Response.json({ results: { common: { errorCode: "0", totalCount: "0" }, juso: [] } }));
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ configured: true, addresses: [], total: 0 });
  });

  it("fails closed when the provider returns malformed or untranslated addresses", async () => {
    for (const data of [
      { results: { common: sample.results.common, juso: [{ ...sample.results.juso[0], zipNo: "invalid" }] } },
      { results: { common: sample.results.common, juso: [{ ...sample.results.juso[0], roadAddr: "서울특별시 강남구 테헤란로 152" }] } },
      { results: { common: sample.results.common, juso: [] } },
      { unexpected: "payload" },
    ]) {
      fetchMock.mockResolvedValue(Response.json(data));
      const result = await POST(request());
      expect(result.status).toBe(502);
      expect(await result.json()).toMatchObject({ configured: true, addresses: [], total: 0 });
    }
  });

  it("returns a useful fallback on provider failure and aborts a hanging request", async () => {
    fetchMock.mockRejectedValueOnce(new Error("upstream unavailable"));
    expect((await POST(request())).status).toBe(502);

    vi.useFakeTimers();
    fetchMock.mockImplementationOnce((_, options) => new Promise((_, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    const resultPromise = POST(request());
    await vi.advanceTimersByTimeAsync(8000);
    const result = await resultPromise;
    expect(result.status).toBe(502);
    expect(await result.json()).toMatchObject({ configured: true, addresses: [], total: 0 });
  });
});
