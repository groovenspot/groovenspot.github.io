// 유튜브 채널 GROOVE CLUB BUSAN 의 공개 롱폼(GROOVE SESSIONS) 목록을 읽어 JSON 파일로 저장한다.
// 로그인·API 키 없이 공개 페이지만 읽는다 (.github/workflows/videos-sync.yml 이 매주 실행).
//   · '동영상' 탭 재생목록 페이지(한국어) → 영상 ID · 한국어 제목 · 길이
//   · oEmbed → 다른 사이트 재생(퍼가기) 허용 여부. 가상 클럽 BGM 목록에 아직 없는 영상만 확인한다.
// 사용: node tools/videos-fetch.mjs out.json   → 이어서 node tools/videos-sync.mjs out.json
// 페이지 구조가 바뀌어 못 읽으면 오류로 끝난다(홈페이지는 그대로 둔다).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANNEL = 'UCdS6A_RNPeys5ZBkvFSwuQg';
const LIST = 'UULF' + CHANNEL.slice(2); // 채널 '동영상' 탭(롱폼만, 최신순)
const out = process.argv[2];
if (!out) { console.error('사용: node tools/videos-fetch.mjs out.json'); process.exit(1); }

const HEAD = {
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Cookie: 'CONSENT=YES+; SOCS=CAI',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: HEAD, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (r.status === 200 || r.status === 401 || r.status === 403 || r.status === 404) return r;
      last = new Error('HTTP ' + r.status);
    } catch (e) { last = e; }
    await sleep(3000 * (i + 1));
  }
  throw last;
}

const DUR = /^(\d+:)?\d{1,2}:\d{2}$/, ID = /^[A-Za-z0-9_-]{11}$/;
// 한국어 제목 "후킹 문구 | DJ | GROOVE SESSIONS 035" 또는 기본(영어) 제목 "GROOVE SESSIONS 035 | DJ - 장르 | …"
const KO = /^(.*\S)\s*\|\s*([^|]+?)\s*\|\s*GROOVE SESSIONS\s+0*(\d+)\s*$/;
const EN = /^GROOVE SESSIONS\s+0*(\d+)\s*\|\s*(.+?)\s+-\s+(.+?)(?:\s*\|.*)?$/;
function parseTitle(t) {
  let m = KO.exec(t);
  if (m) return { session: +m[3], dj: m[2].trim(), title_ko: m[1].trim(), title_en: '' };
  m = EN.exec(t);
  if (m) return { session: +m[1], dj: m[2].trim(), title_ko: '', title_en: m[3].trim() };
  return null;
}
// 객체 안의 글자를 순서대로 모은다(구조가 조금 바뀌어도 읽히도록)
function texts(o, acc = []) {
  if (Array.isArray(o)) o.forEach((x) => texts(x, acc));
  else if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'content' || k === 'text' || k === 'simpleText') && typeof v === 'string') acc.push(v);
      else texts(v, acc);
    }
  }
  return acc;
}

const res = await get(`https://www.youtube.com/playlist?list=${LIST}&hl=ko&gl=KR`);
const html = await res.text();
const mm = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
if (!mm) { console.error('유튜브 재생목록 페이지를 읽지 못했어요 (HTTP ' + res.status + ', ' + html.length + '자).'); process.exit(1); }
const data = JSON.parse(mm[1]);
const items = [];
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (!o || typeof o !== 'object') return;
  if (o.lockupViewModel && ID.test(o.lockupViewModel.contentId || '')) { items.push({ id: o.lockupViewModel.contentId, t: texts(o.lockupViewModel) }); return; }
  if (o.playlistVideoRenderer && ID.test(o.playlistVideoRenderer.videoId || '')) {
    const r = o.playlistVideoRenderer;
    items.push({ id: r.videoId, t: [...texts(r.lengthText), ...texts(r.title)] }); return;
  }
  Object.values(o).forEach(walk);
})(data);

let club = '';
try { club = readFileSync(join(ROOT, 'club/index.html'), 'utf8'); } catch (e) {}
const videos = [], other = [], seen = new Set();
for (const it of items) {
  if (seen.has(it.id)) continue; seen.add(it.id);
  const duration = it.t.find((x) => DUR.test(x)) || '';
  let p = null, raw = '';
  for (const x of it.t) { p = parseTitle(x); if (p) break; if (!raw && x.length > 12 && !DUR.test(x)) raw = x; }
  if (!p) { other.push(raw || it.id); continue; }
  videos.push({ youtube: it.id, ...p, duration, privacy: 'public', embeddable: true });
}
videos.sort((a, b) => b.session - a.session);

// 가상 클럽 BGM 목록에 없는 영상만 퍼가기 허용 여부를 확인한다(401 = 꺼짐). 확인이 안 되면 이번에는 넣지 않는다.
for (const v of videos) {
  if (club.includes(`"yt": "${v.youtube}"`)) continue;
  try {
    const r = await get('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + v.youtube), 2);
    v.embeddable = r.status === 200;
  } catch (e) { v.embeddable = false; }
  await sleep(400);
}

writeFileSync(out, JSON.stringify({ listed: items.length, videos, other }, null, 1) + '\n');
console.log(`listed ${items.length} · sessions ${videos.length} · other ${other.length}`);
for (const v of videos.slice(0, 5)) console.log(`${String(v.session).padStart(3, '0')} ${v.dj} ${v.duration || '-'} emb=${v.embeddable ? 'Y' : 'N'} ${v.title_ko || v.title_en}`);
other.forEach((t) => console.log('OTHER ' + t));
