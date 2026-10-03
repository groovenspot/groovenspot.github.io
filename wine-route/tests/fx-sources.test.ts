import { describe, expect, it } from "vitest";
import { collectRates, parseEcb, parseErApi, sourceOrder, type FxFetch, type FxSourceKey } from "@/lib/fxSources";

const ECB = `<?xml version="1.0"?><gesmes:Envelope><Cube><Cube time='2026-10-02'>
<Cube currency='USD' rate='1.1225'/><Cube currency='JPY' rate='176.99'/><Cube currency='KRW' rate='1513.44'/><Cube currency='HKD' rate='8.8084'/>
</Cube></Cube></gesmes:Envelope>`;

describe("ECB 기준환율", () => {
  it("유로 기준 값을 '외화 1단위당 원'으로 바꿉니다", () => {
    const r = parseEcb(ECB)!;
    expect(r.date.toISOString().slice(0, 10)).toBe("2026-10-02");
    expect(r.rates.EUR).toBe(1513.44);
    expect(r.rates.USD).toBeCloseTo(1513.44 / 1.1225, 3);
    expect(r.rates.JPY).toBeCloseTo(8.5510, 3);
    expect("KRW" in r.rates).toBe(false);
  });
  it("원화가 없거나 형식이 다르면 null", () => {
    expect(parseEcb("<html>maintenance</html>")).toBeNull();
    expect(parseEcb(ECB.replace(/<Cube currency='KRW'[^>]*>/, ""))).toBeNull();
  });
});

describe("ExchangeRate-API", () => {
  it("달러 기준 값을 원화로 바꾸고, 갱신 시각을 KST 날짜로", () => {
    const r = parseErApi({ result: "success", time_last_update_unix: 1790985752, rates: { USD: 1, KRW: 1350, EUR: 0.9, JPY: 150 } })!;
    expect(r.rates.USD).toBe(1350);
    expect(r.rates.EUR).toBe(1500);
    expect(r.rates.JPY).toBe(9);
    expect(r.date.toISOString().slice(0, 10)).toBe("2026-10-03");
  });
  it("실패 응답은 null", () => {
    expect(parseErApi({ result: "error", "error-type": "unsupported-code" })).toBeNull();
  });
});

describe("출처 순서와 보충", () => {
  it("보충을 켜면 주 출처 다음에 ECB → ExchangeRate-API → 수출입은행", () => {
    expect(sourceOrder("investing", true)).toEqual(["investing", "ecb", "erapi", "koreaexim"]);
    expect(sourceOrder("ecb", true)).toEqual(["ecb", "erapi", "koreaexim"]);
    expect(sourceOrder("erapi", false)).toEqual(["erapi"]);
  });
  it("실패한 출처는 건너뛰고, 못 받은 통화만 다음 출처에서 채우며, 급변 값은 버립니다", async () => {
    const data: Partial<Record<FxSourceKey, FxFetch | Error>> = {
      investing: new Error("HTTP 403 (봇 차단)"),
      ecb: { rates: { USD: 1348, EUR: 1513 }, date: new Date("2026-10-02") },
      erapi: { rates: { USD: 9999, EUR: 1, NZD: 760, HKD: 173 }, date: new Date("2026-10-03") },
    };
    const saved: [FxSourceKey, Record<string, number>][] = [];
    const { runs, missing } = await collectRates(
      ["investing", "ecb", "erapi", "koreaexim"], ["USD", "EUR", "NZD", "HKD", "CHF"],
      async (s) => { const d = data[s]; if (!d) throw new Error("키 없음"); if (d instanceof Error) throw d; return d; },
      { HKD: 100 }, 0.1,
      async (s, r) => { saved.push([s, r]); },
    );
    expect(saved).toEqual([["ecb", { USD: 1348, EUR: 1513 }], ["erapi", { NZD: 760 }]]);
    expect(runs.map((r) => [r.source, r.saved.length, !!r.error])).toEqual([["investing", 0, true], ["ecb", 2, false], ["erapi", 1, false], ["koreaexim", 0, true]]);
    expect(runs[2].rejected.HKD).toContain("73.0%");
    expect(missing).toEqual(["HKD", "CHF"]);
  });
  it("다 채우면 다음 출처는 부르지 않습니다", async () => {
    const called: string[] = [];
    await collectRates(["ecb", "erapi"], ["USD"], async (s) => { called.push(s); return { rates: { USD: 1350 }, date: new Date() }; }, {}, 0.1, async () => {});
    expect(called).toEqual(["ecb"]);
  });
});
