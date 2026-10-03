/**
 * LWIN(Liv-ex Wine Identification Number) 목록 파일 읽기.
 * Liv-ex 에서 받은 LWIN 데이터베이스(엑셀)를 CSV 로 저장해 올리면 됩니다. 머리줄 이름으로 열을 찾으므로 열 순서는 상관없습니다.
 * 공개 문서 기준 열: LWIN, STATUS, DISPLAY_NAME, PRODUCER_TITLE, PRODUCER_NAME, WINE, COUNTRY, REGION, SUB_REGION, COLOUR, TYPE, …
 */
export type LwinRow = { lwin: string; displayName: string; producer: string | null; wine: string | null; country: string | null; region: string | null; subRegion: string | null; colour: string | null; type: string | null; status: string | null };

const ALIASES: Record<keyof LwinRow, string[]> = {
  lwin: ["lwin", "lwin7", "lwin_7"],
  displayName: ["display_name", "displayname", "name"],
  producer: ["producer_name", "producer"],
  wine: ["wine", "wine_name"],
  country: ["country"],
  region: ["region"],
  subRegion: ["sub_region", "subregion"],
  colour: ["colour", "color"],
  type: ["type"],
  status: ["status"],
};

export function mapLwinRows(header: string[], rows: Record<string, string>[]): { rows: LwinRow[]; skipped: number; missing: string[] } {
  const pick = (k: keyof LwinRow) => ALIASES[k].find((a) => header.includes(a));
  const cols = Object.fromEntries((Object.keys(ALIASES) as (keyof LwinRow)[]).map((k) => [k, pick(k)])) as Record<keyof LwinRow, string | undefined>;
  const missing = (["lwin", "displayName"] as const).filter((k) => !cols[k]).map((k) => ALIASES[k][0].toUpperCase());
  if (missing.length) return { rows: [], skipped: rows.length, missing };
  const out: LwinRow[] = [];
  let skipped = 0;
  const get = (r: Record<string, string>, k: keyof LwinRow) => (cols[k] ? r[cols[k]!]?.trim() || null : null);
  for (const r of rows) {
    const lwin = (get(r, "lwin") ?? "").replace(/\D/g, "");
    const displayName = get(r, "displayName");
    if (lwin.length !== 7 || !displayName) { skipped++; continue; }
    const producerTitle = r.producer_title?.trim();
    const producer = get(r, "producer");
    out.push({
      lwin, displayName,
      producer: producer ? (producerTitle ? `${producerTitle} ${producer}` : producer) : null,
      wine: get(r, "wine"), country: get(r, "country"), region: get(r, "region"), subRegion: get(r, "subRegion"),
      colour: get(r, "colour"), type: get(r, "type"), status: get(r, "status"),
    });
  }
  return { rows: out, skipped, missing: [] };
}

/** 셀러도어 와인의 국가는 한글이라 주요 와인 생산국만 옮깁니다. 목록에 없으면 원문 그대로. */
export const COUNTRY_KO: Record<string, string> = {
  France: "프랑스", Italy: "이탈리아", Spain: "스페인", Germany: "독일", Portugal: "포르투갈", Austria: "오스트리아", Hungary: "헝가리",
  Greece: "그리스", "United States": "미국", USA: "미국", Chile: "칠레", Argentina: "아르헨티나", Australia: "호주", "New Zealand": "뉴질랜드",
  "South Africa": "남아프리카공화국", Canada: "캐나다", "United Kingdom": "영국", England: "영국", Switzerland: "스위스", Lebanon: "레바논",
  Israel: "이스라엘", Slovenia: "슬로베니아", Croatia: "크로아티아", Georgia: "조지아", Uruguay: "우루과이", Japan: "일본", China: "중국",
};
export const countryKo = (c: string | null | undefined) => (c ? COUNTRY_KO[c.trim()] ?? c.trim() : "");

/** LWIN 색·종류 → 셀러도어 와인 종류 */
export function lwinTypeKo(colour: string | null | undefined, type: string | null | undefined): string {
  const t = `${type ?? ""}`.toLowerCase(), c = `${colour ?? ""}`.toLowerCase();
  if (/sparkling|champagne/.test(t)) return "스파클링";
  if (/fortified|port|sherry|madeira/.test(t)) return "주정강화";
  if (/sweet|dessert/.test(t)) return "디저트";
  if (/ros[eé]/.test(c)) return "로제";
  if (/white/.test(c)) return "화이트";
  return "레드";
}

/** 이름 검색용: 공백으로 나눈 낱말 (2자 이상, 최대 4개) */
export const searchTokens = (q: string) => q.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/\s+/).filter((w) => w.length >= 2).slice(0, 4);
