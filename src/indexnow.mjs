// IndexNow — 바뀐 페이지 주소를 빙·얀덱스·네이버에 바로 알린다 (대표 요청 2026-11-19 "검색 등록 알아서 다해").
// 구글은 IndexNow를 안 받는다(서치 콘솔·사이트맵으로). 키 파일은 사이트 맨 위 <KEY>.txt.
// 쓰는 법: node src/indexnow.mjs <이전 커밋>   → 그 뒤로 바뀐 */index.html 중 사이트맵에 있는 주소만
//          node src/indexnow.mjs --all       → 사이트맵 주소 전부 (처음 한 번)
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const KEY = '114a0fde66c24ddf906d15202629fa9d';
const HOST = 'xn--2i0bl1s25d.site';
const BASE = 'https://' + HOST;
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow', 'https://yandex.com/indexnow', 'https://searchadvisor.naver.com/indexnow'];

const sitemap = existsSync('sitemap.xml') ? readFileSync('sitemap.xml', 'utf8') : '';
const inMap = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
const arg = process.argv[2] || '';
let urls = [];
if (arg === '--all') urls = [...inMap];
else if (/^[0-9a-f]{7,40}$/.test(arg) && !/^0+$/.test(arg)) {
  let files = [];
  try { files = execSync(`git diff --name-only ${arg} HEAD`, { encoding: 'utf8' }).split('\n'); } catch (e) { console.log('git diff 실패 — 건너뜀', e.message); }
  // 빌드마다 모든 페이지의 ?v= 캐시 번호가 바뀌므로, 그것만 다른 페이지는 빼고 내용이 바뀐 페이지만
  const norm = t => String(t || '').replace(/(\?v=|"v":")[a-z0-9]+/g, '$1');
  const changed = f => { let a = ''; try { a = execSync(`git show ${arg}:${f}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }); } catch (e) { return true; } return !existsSync(f) || norm(a) !== norm(readFileSync(f, 'utf8')); };
  urls = files.filter(f => /(^|\/)index\.html$/.test(f)).map(f => [f, BASE + '/' + f.replace(/index\.html$/, '')]).filter(x => inMap.has(x[1]) && changed(x[0])).map(x => x[1]);
}
urls = [...new Set(urls)].slice(0, 10000);
if (!urls.length) { console.log('IndexNow: 알릴 주소 없음'); process.exit(0); }
console.log('IndexNow: ' + urls.length + '개\n' + urls.slice(0, 30).join('\n') + (urls.length > 30 ? '\n…' : ''));
if (process.env.INDEXNOW_DRY) process.exit(0);   // 시험: 주소만 보기
const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: BASE + '/' + KEY + '.txt', urlList: urls });
for (const ep of ENDPOINTS) {
  try {
    const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
    console.log(ep + ' → ' + r.status + (r.status >= 400 ? ' ' + (await r.text()).slice(0, 200) : ''));   // 200·202 = 받음
  } catch (e) { console.log(ep + ' → 실패 ' + e.message); }
}
