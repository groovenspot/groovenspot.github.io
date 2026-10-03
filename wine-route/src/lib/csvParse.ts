/** CSV 읽기 (RFC 4180): 큰따옴표 안의 쉼표·줄바꿈·"" 를 처리하고, 엑셀이 붙이는 BOM 을 뗍니다. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

/** 머리줄을 키로 한 객체 배열. 머리줄은 소문자·공백 제거로 맞춥니다. */
export function csvObjects(text: string): { header: string[]; rows: Record<string, string>[] } {
  const all = parseCsv(text);
  if (!all.length) return { header: [], rows: [] };
  const header = all[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return { header, rows: all.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()]))) };
}
