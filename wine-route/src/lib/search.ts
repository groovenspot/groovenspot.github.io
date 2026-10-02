/** 검색어 보정: 한글 표기 ↔ 원어 표기, 악센트·공백 무시. */
export const ALIASES: Record<string, string[]> = {
  샤블리: ["chablis"],
  부르고뉴: ["bourgogne", "burgundy"],
  버건디: ["bourgogne", "burgundy"],
  보르도: ["bordeaux"],
  샴페인: ["champagne", "샹파뉴"],
  샹파뉴: ["champagne", "샴페인"],
  리슬링: ["riesling"],
  피노누아: ["pinotnoir"],
  피노: ["pinot"],
  샤르도네: ["chardonnay"],
  샤도네이: ["chardonnay"],
  소비뇽블랑: ["sauvignonblanc"],
  까베르네: ["cabernet"],
  카베르네: ["cabernet"],
  메를로: ["merlot"],
  쉬라즈: ["shiraz", "syrah"],
  시라: ["syrah", "shiraz"],
  말벡: ["malbec"],
  진판델: ["zinfandel"],
  네비올로: ["nebbiolo"],
  바롤로: ["barolo"],
  키안티: ["chianti"],
  산지오베제: ["sangiovese"],
  템프라니요: ["tempranillo"],
  리오하: ["rioja"],
  모젤: ["mosel"],
  블랑드블랑: ["blancdeblancs"],
};

export function fold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .normalize("NFC")
    .replace(/[\s'’\-.,]+/g, "");
}

/** 검색어를 비교용 토큰 묶음으로 바꿉니다. 각 묶음 중 하나라도 맞으면 그 단어는 일치. */
export function expandQuery(q: string): string[][] {
  return q
    .split(/\s+/)
    .map((w) => fold(w))
    .filter(Boolean)
    .map((w) => {
      const alts = new Set([w]);
      for (const [k, vs] of Object.entries(ALIASES)) {
        if (w.includes(k)) vs.forEach((v) => alts.add(v));
        if (vs.some((v) => w.includes(v))) alts.add(k);
      }
      return [...alts];
    });
}

export function matchesQuery(haystack: string, q: string) {
  if (!q.trim()) return true;
  const hay = fold(haystack);
  return expandQuery(q).every((alts) => alts.some((a) => hay.includes(a)));
}
