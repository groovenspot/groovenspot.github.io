// 날짜별 교통 요금표(fares.json)를 만든다. 웹에 올린 페이지는 이 파일을 읽어 요금을 자동으로 채운다.
//   node mounjaro/update-fares.mjs
// - 배: 대아고속해운 공개 "이벤트 승선권" 표 (https://www.daea.com/booking/event)
// - 항공: 환경변수 TRAVELPAYOUTS_TOKEN 이 있으면 Travelpayouts(Aviasales) 데이터 API 에서 날짜별 최저가
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, 'fares.json');
const prev = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);

async function ferry() {
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
  return { at: today, rows };
}

// 날짜별 편도 최저가. any=시간 무관, am=오전 10:30 이전 출발(가는 편), pm=15:00 이후 출발(오는 편). 값: [원, 항공사, 출발시각]
async function air(token) {
  const ORG = { pus: 'PUS', sel: 'SEL' }, DST = { fuk: 'FUK', osa: 'OSA', tyo: 'TYO' };
  const months = [0, 1, 2, 3].map((i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i); return d.toISOString().slice(0, 7); });
  const res = {};
  const get = async (o, d, month) => {
    const u = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
    Object.entries({ origin: o, destination: d, departure_at: month, one_way: 'true', direct: 'true', currency: 'krw', sorting: 'price', unique: 'false', limit: '1000', token }).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u);
    if (!r.ok) throw new Error(o + '-' + d + ' ' + month + ' HTTP ' + r.status);
    const j = await r.json();
    return Array.isArray(j.data) ? j.data : [];
  };
  const fold = (list, dir) => {
    const m = {};
    for (const x of list) {
      const at = String(x.departure_at || ''), day = at.slice(0, 10), hm = at.slice(11, 16), won = Math.round(+x.price);
      if (!day || !won) continue;
      const e = (m[day] = m[day] || {}), v = [won, x.airline || '', hm];
      if (!e.any || won < e.any[0]) e.any = v;
      const key = dir === 'out' ? (hm && hm <= '10:30' ? 'am' : '') : (hm && hm >= '15:00' ? 'pm' : '');
      if (key && (!e[key] || won < e[key][0])) e[key] = v;
    }
    return m;
  };
  for (const [ok, o] of Object.entries(ORG)) {
    res[ok] = {};
    for (const [dk, d] of Object.entries(DST)) {
      const outL = [], backL = [];
      for (const mth of months) { outL.push(...await get(o, d, mth)); backL.push(...await get(d, o, mth)); }
      res[ok][dk] = { out: fold(outL, 'out'), back: fold(backL, 'back') };
    }
  }
  return { at: today, src: 'Travelpayouts', routes: res };
}

const data = { at: today, ferry: prev.ferry || null, air: prev.air || null };
try { data.ferry = await ferry(); console.log('배 특가 ' + data.ferry.rows.length + '행'); }
catch (e) { console.error('배 요금 갱신 실패, 이전 값 유지:', e.message); }
const token = process.env.TRAVELPAYOUTS_TOKEN;
if (token) {
  try { data.air = await air(token); console.log('항공 요금 갱신'); }
  catch (e) { console.error('항공 요금 갱신 실패, 이전 값 유지:', e.message); }
} else console.log('TRAVELPAYOUTS_TOKEN 이 없어 항공 요금은 건너뜁니다');
writeFileSync(out, JSON.stringify(data));
// 단독 웹 페이지(index.html)는 app.html 에 문서 골격을 씌운 것
const app = readFileSync(join(dir, 'app.html'), 'utf8');
writeFileSync(join(dir, 'index.html'), '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n' + app + '</body>\n</html>\n');
