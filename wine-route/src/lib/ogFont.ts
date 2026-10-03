/**
 * 공유 미리보기 이미지에 쓸 한글 글꼴. 기본 글꼴에는 한글이 없어 네모로 나옵니다.
 * Google Fonts 에서 화면에 쓰는 글자만 잘라 받아 옵니다. 실패하면 null (호출하는 쪽이 영문만으로 그림).
 */
export async function loadKoreanFont(text: string, weight = 700): Promise<ArrayBuffer | null> {
  try {
    const chars = [...new Set(text)].join("");
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(chars)}`, {
      // 오래된 UA 로 요청하면 Satori 가 못 읽는 woff2 대신 woff 를 줍니다.
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.30 (KHTML, like Gecko) Safari/534.30" },
      signal: AbortSignal.timeout(4000),
    }).then((r) => (r.ok ? r.text() : ""));
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}
