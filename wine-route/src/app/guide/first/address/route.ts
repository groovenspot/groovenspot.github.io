import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/auth";

export const dynamic = "force-dynamic";

const keywordSchema = z.string().trim().min(2).max(120)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value) && /[\p{L}\p{N}]/u.test(value));
const englishText = z.string().trim().min(1).max(500)
  .refine((value) => !/[\u3131-\u318e\uac00-\ud7a3\u0000-\u001f]/.test(value));
const jusoSchema = z.object({
  roadAddr: englishText,
  siNm: englishText,
  sggNm: z.string().trim().max(100)
    .refine((value) => !/[\u3131-\u318e\uac00-\ud7a3\u0000-\u001f]/.test(value)),
  zipNo: z.string().regex(/^\d{5}$/),
});
const commonSchema = z.object({
  errorCode: z.string().max(20),
  totalCount: z.union([z.string().regex(/^\d{1,9}$/), z.number().int().min(0).max(999_999_999)])
    .transform(Number).optional(),
});

function response(configured: boolean, message: string, status: number) {
  return NextResponse.json({ configured, addresses: [], total: 0, message }, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

/** Search official English road addresses; never invent or transliterate an address. */
export async function POST(request: NextRequest) {
  const user = await getUser();
  const key = process.env.JUSO_API_KEY?.trim();
  if (!user) return response(Boolean(key), "로그인 후 주소를 검색해 주세요.", 401);

  let keyword: string;
  try {
    if (Number(request.headers.get("content-length")) > 2048) throw new Error("body too large");
    const body = await request.text();
    if (body.length > 2048) throw new Error("body too large");
    keyword = z.object({ keyword: keywordSchema }).parse(JSON.parse(body)).keyword;
  } catch {
    return response(Boolean(key), "도로명이나 건물명 등 주소 검색어를 2~120자로 입력해 주세요.", 400);
  }

  if (!key) {
    return response(false, "영문 주소 검색이 아직 연결되지 않았습니다. 도로명주소 안내시스템에서 확인한 주소를 직접 입력해 주세요.", 503);
  }

  const url = new URL("https://business.juso.go.kr/addrlink/addrEngApi.do");
  url.search = new URLSearchParams({
    confmKey: key,
    currentPage: "1",
    countPerPage: "10",
    keyword,
    resultType: "json",
  }).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!upstream.ok) throw new Error("address provider unavailable");
    const envelope = z.object({ results: z.object({ common: commonSchema, juso: z.unknown().optional() }) })
      .parse(await upstream.json());
    if (envelope.results.common.errorCode !== "0") {
      if (["E0005", "E0006", "E0008"].includes(envelope.results.common.errorCode)) {
        return response(true, "검색어를 확인해 주세요. 도로명과 건물번호를 함께 입력하면 더 정확합니다.", 400);
      }
      throw new Error("address provider error");
    }

    const total = envelope.results.common.totalCount;
    if (total === undefined) throw new Error("missing total count");
    const rows = z.array(jusoSchema).max(10).parse(envelope.results.juso ?? []);
    if ((total > 0 && rows.length === 0) || rows.length > total) throw new Error("invalid address results");
    const addresses = rows.map((row) => ({
      address1En: row.roadAddr,
      cityEn: row.sggNm || row.siNm,
      provinceEn: row.siNm,
      zip: row.zipNo,
    }));
    return NextResponse.json({
      configured: true,
      addresses,
      total,
      message: total === 0 ? "일치하는 주소가 없습니다. 도로명과 건물번호로 다시 검색해 주세요." : undefined,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return response(true, "주소 검색 서비스에 연결하지 못했습니다. 잠시 후 다시 검색하거나 영문 주소를 직접 입력해 주세요.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
