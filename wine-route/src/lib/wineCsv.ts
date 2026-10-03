import { cleanImageUrl } from "./wineImage";
/**
 * 와인 목록 CSV 대량 등록. 한 줄이 와인 하나(빈티지별)입니다.
 * 필수: name(원어명), name_ko(한글명), country(한글 국가), type
 * 선택: producer, region, grape, vintage(NV는 비움), kr_price, kr_price_src, rating, rating_src, aliases(| 구분), lwin, notes_ko, notes_src, image_url, image_src (사진은 비우면 기존 사진을 그대로 둡니다)
 */
import { csvObjects } from "./csvParse";

export const WINE_TYPES = ["레드", "화이트", "스파클링", "로제", "디저트", "주정강화"];
export const WINE_CSV_HEADER = ["name", "name_ko", "producer", "country", "region", "type", "grape", "vintage", "kr_price", "kr_price_src", "rating", "rating_src", "aliases", "lwin", "notes_ko", "notes_src", "image_url", "image_src"];

export type WineInput = {
  name: string; nameKo: string; producer: string; country: string; region: string; type: string; grape: string;
  vintage: number | null; krPrice: number | null; krPriceSrc: string | null; rating: number | null; ratingSrc: string | null;
  aliases: string[]; lwin: string | null; notesKo: string | null; notesSrc: string | null; imageUrl?: string; imageSrc?: string;
};

const intOrNull = (v: string) => (v === "" ? null : Number.isInteger(Number(v.replace(/,/g, ""))) ? Number(v.replace(/,/g, "")) : NaN);

export function parseWineCsv(text: string, maxRows = 5000): { rows: { line: number; wine: WineInput }[]; errors: string[] } {
  const { header, rows } = csvObjects(text);
  const errors: string[] = [];
  const need = ["name", "name_ko", "country", "type"].filter((h) => !header.includes(h));
  if (need.length) return { rows: [], errors: [`머리줄에 ${need.join(", ")} 열이 필요합니다`] };
  if (rows.length > maxRows) return { rows: [], errors: [`한 번에 ${maxRows.toLocaleString("ko-KR")}줄까지 올릴 수 있습니다 (지금 ${rows.length.toLocaleString("ko-KR")}줄)`] };
  const out: { line: number; wine: WineInput }[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const line = i + 2;
    const bad = (m: string) => errors.push(`${line}행: ${m}`);
    const vintage = r.vintage && !/^nv$/i.test(r.vintage) ? intOrNull(r.vintage) : null;
    const krPrice = intOrNull(r.kr_price ?? "");
    const rating = r.rating ? Number(r.rating) : null;
    const lwin = (r.lwin ?? "").replace(/\D/g, "") || null;
    if (!r.name || !r.name_ko) return bad("name, name_ko 는 비울 수 없습니다");
    if (!r.country) return bad("country(한글 국가)가 필요합니다");
    if (!WINE_TYPES.includes(r.type)) return bad(`type 은 ${WINE_TYPES.join("·")} 중 하나여야 합니다 (지금 '${r.type}')`);
    if (vintage !== null && (Number.isNaN(vintage) || vintage < 1900 || vintage > new Date().getFullYear())) return bad(`vintage '${r.vintage}' 를 확인해 주세요 (NV는 비움)`);
    if (krPrice !== null && (Number.isNaN(krPrice) || krPrice <= 0)) return bad(`kr_price '${r.kr_price}' 는 원 단위 정수입니다`);
    if (rating !== null && !(rating > 0 && rating <= 100)) return bad(`rating '${r.rating}' 은 100점 만점 숫자입니다`);
    if (rating !== null && !r.rating_src) return bad("rating 을 넣으면 rating_src(평점 출처)도 적어 주세요");
    if (r.notes_ko && !r.notes_src) return bad("notes_ko 를 넣으면 notes_src(노트 출처)도 적어 주세요");
    let imageUrl: string | undefined;
    if (r.image_url) {
      try { imageUrl = cleanImageUrl(r.image_url) ?? undefined; } catch (e) { return bad(`image_url: ${(e as Error).message}`); }
      if (!r.image_src) return bad("image_url 을 넣으면 image_src(사진 출처)도 적어 주세요");
    }
    if (lwin && lwin.length !== 7) return bad(`lwin '${r.lwin}' 은 7자리 LWIN 코드입니다`);
    const key = `${r.name.toLowerCase()}|${(r.producer ?? "").toLowerCase()}|${vintage ?? "NV"}`;
    if (seen.has(key)) return bad("같은 파일에 같은 와인·빈티지가 두 번 있습니다");
    seen.add(key);
    out.push({
      line,
      wine: {
        name: r.name, nameKo: r.name_ko, producer: r.producer ?? "", country: r.country, region: r.region ?? "", type: r.type, grape: r.grape ?? "",
        vintage, krPrice, krPriceSrc: r.kr_price_src || null, rating, ratingSrc: r.rating_src || null,
        aliases: (r.aliases ?? "").split("|").map((a) => a.trim()).filter(Boolean), lwin, notesKo: r.notes_ko || null, notesSrc: r.notes_src || null,
        ...(imageUrl ? { imageUrl, imageSrc: r.image_src } : {}),
      },
    });
  });
  return { rows: out, errors };
}
