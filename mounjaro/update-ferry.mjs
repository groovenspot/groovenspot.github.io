// 대아고속해운 공개 "이벤트 승선권" 표(https://www.daea.com/booking/event)를 읽어
// app.html 의 FERRY 데이터와 index.html 을 갱신한다.  사용: node mounjaro/update-ferry.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : await (await fetch('https://www.daea.com/booking/event', { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
const rows = [];
let port = '';
for (const tr of src.split(/<tr[\s>]/).slice(1)) {
  const sec = /<th[^>]*rowspan[^>]*>\s*부산↔\s*([^<\s]+)/.exec(tr);
  if (sec) port = sec[1].includes('히타') ? 'hit' : sec[1].includes('이즈') ? 'izu' : '';
  const m = /showDiscount\('(\d{4}-\d{2}-\d{2})',\s*'[^']*',\s*'KB01',\s*'(\d+)'[^)]*?'([^']+)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*'\)/.exec(tr);
  const price = /<th>\s*([\d,]+)원\s*<\/th>/.exec(tr);
  const seats = [...tr.matchAll(/<th>\s*(\d+)\s*<\/th>/g)].pop();
  if (!m || !price || !port) continue;
  rows.push([m[1], port, +m[2], +price[1].replace(/,/g, ''), seats ? +seats[1] : null, m[3]]);
}
if (rows.length < 5) throw new Error('특가표를 읽지 못했습니다: ' + rows.length + '행');
rows.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]) || a[3] - b[3]);
const today = new Date().toISOString().slice(0, 10);
const app = join(dir, 'app.html');
let html = readFileSync(app, 'utf8');
const re = /const FERRY=\{[^\n]*\};/;
if (!re.test(html)) throw new Error('app.html 에 FERRY 자리가 없습니다');
html = html.replace(re, () => 'const FERRY={at:' + JSON.stringify(today) + ',rows:' + JSON.stringify(rows) + '};');
writeFileSync(app, html);
writeFileSync(join(dir, 'index.html'), '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n' + html + '</body>\n</html>\n');
console.log(rows.length + '행, ' + rows[0][0] + ' ~ ' + rows[rows.length - 1][0]);
