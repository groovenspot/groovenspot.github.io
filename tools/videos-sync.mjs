// 유튜브 채널의 공개 롱폼(GROOVE SESSIONS) 목록을 홈페이지에 맞춘다 (.github/workflows/videos-sync.yml 이 매일 실행).
//   · data/videos.json  — 없는 영상을 추가(최신 세션이 맨 위). 지우지는 않는다.
//   · club/index.html   — 가상 클럽 BGM 목록(var TRACKS)에 '퍼가기 허용'된 영상만 추가.
// 입력: tools/videos-fetch.mjs 가 만든 JSON
//   { "videos": [ { youtube, session, dj, title_ko, title_en, duration, privacy, embeddable } ] }
// 사용: node tools/videos-sync.mjs site_videos.json [--dry]
// 결과는 JSON 으로 출력한다: added·tracksAdded·retitled 가 모두 비어 있으면 바뀐 게 없는 것.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [input, ...flags] = process.argv.slice(2);
const DRY = flags.includes('--dry');
const MIN_LIST = 20; // 유튜브 목록이 이보다 짧으면 읽기 오류로 보고 아무것도 바꾸지 않는다
const fail = (msg) => { console.log(JSON.stringify({ ok: false, error: msg })); process.exit(1); };
if (!input) fail('사용: node tools/videos-sync.mjs site_videos.json [--dry]');

let src;
try { src = JSON.parse(readFileSync(input, 'utf8')); } catch (e) { fail('입력 파일을 읽지 못했어요: ' + e.message); }
const ID = /^[A-Za-z0-9_-]{11}$/, DUR = /^(\d+:)?\d{1,2}:\d{2}$/;
const yt = (Array.isArray(src.videos) ? src.videos : []).filter((v) => v && ID.test(v.youtube || '') && Number.isInteger(v.session) && v.session > 0 && v.dj);
if (yt.length < MIN_LIST) fail(`유튜브 목록이 ${yt.length}개뿐이에요(최소 ${MIN_LIST}개). 바꾸지 않았어요.`);
const pub = yt.filter((v) => v.privacy === 'public');
const byId = new Map(yt.map((v) => [v.youtube, v]));
const hasHangul = (s) => /[가-힣]/.test(s || '');

// ---------- data/videos.json ----------
const vFile = join(ROOT, 'data/videos.json');
const videos = JSON.parse(readFileSync(vFile, 'utf8'));
if (!Array.isArray(videos)) fail('data/videos.json 형식이 달라요.');
const have = new Set(videos.map((v) => v.youtube));
const added = [], conflicts = [], retitled = [], waiting = [];
for (const v of pub) {
  if (have.has(v.youtube)) {
    // 번역 전이라 영어 장르로 넣어 둔 제목은, 한국어 제목이 생기면 바꿔 준다(손으로 고친 한국어 제목은 건드리지 않음)
    const cur = videos.find((x) => x.youtube === v.youtube);
    if (v.title_ko && cur.title !== v.title_ko && !hasHangul(cur.title)) { retitled.push({ session: cur.session, dj: cur.dj, from: cur.title, to: v.title_ko }); cur.title = v.title_ko; }
    continue;
  }
  const same = videos.find((x) => x.session === v.session);
  if (same) { conflicts.push({ session: v.session, site: `${same.dj} ${same.youtube}`, youtube: `${v.dj} ${v.youtube}` }); continue; }
  if (!DUR.test(v.duration || '')) { waiting.push({ session: v.session, dj: v.dj, why: '길이를 아직 못 읽음(처리 중)' }); continue; }
  videos.push({ youtube: v.youtube, dj: v.dj, session: v.session, title: v.title_ko || v.title_en || '', duration: v.duration });
  added.push({ session: v.session, dj: v.dj, title: v.title_ko || v.title_en || '', koTitle: !!v.title_ko });
}
videos.sort((a, b) => (b.session || 0) - (a.session || 0));
// 홈페이지에는 있는데 유튜브 공개 롱폼 목록에 없는 영상(비공개·삭제) — 지우지 않고 알리기만 한다
const gone = videos.filter((v) => !byId.has(v.youtube) || byId.get(v.youtube).privacy !== 'public').map((v) => ({ session: v.session, dj: v.dj, youtube: v.youtube }));

// ---------- club/index.html 의 var TRACKS ----------
const cFile = join(ROOT, 'club/index.html');
let club = readFileSync(cFile, 'utf8');
const m = club.match(/^(\s*var TRACKS = )(\[.*\]);[ \t]*$/m);
if (!m) fail('club/index.html 에서 var TRACKS 줄을 찾지 못했어요.');
let tracks;
try { tracks = JSON.parse(m[2]); } catch (e) { fail('var TRACKS 를 읽지 못했어요: ' + e.message); }
const inTracks = new Set(tracks.map((t) => t.yt));
const tracksAdded = [];
for (const v of pub) {
  if (!v.embeddable || inTracks.has(v.youtube) || !DUR.test(v.duration || '')) continue;
  if (!videos.some((x) => x.youtube === v.youtube)) continue; // 홈페이지 목록에 들어간 영상만
  tracks.push({ n: v.dj, yt: v.youtube, s: v.session, d: v.duration });
  tracksAdded.push({ session: v.session, dj: v.dj });
}
tracks.sort((a, b) => (b.s || 0) - (a.s || 0));
const line = '[' + tracks.map((t) => '{' + Object.entries(t).map(([k, x]) => JSON.stringify(k) + ': ' + JSON.stringify(x)).join(', ') + '}').join(', ') + ']';
// 퍼가기가 꺼져 있어 가상 클럽 BGM 에 못 넣는 공개 영상
const notEmbeddable = pub.filter((v) => !v.embeddable && !inTracks.has(v.youtube)).map((v) => ({ session: v.session, dj: v.dj, youtube: v.youtube }));

const changed = { videos: added.length > 0 || retitled.length > 0, club: tracksAdded.length > 0 };
if (!DRY) {
  if (changed.videos) writeFileSync(vFile, JSON.stringify(videos, null, 1) + '\n');
  if (changed.club) writeFileSync(cFile, club.replace(m[0], () => m[1] + line + ';'));
}
console.log(JSON.stringify({ ok: true, dry: DRY, youtubePublic: pub.length, site: videos.length, changed, added, tracksAdded, retitled, waiting, conflicts, notEmbeddable, gone }, null, 2));
