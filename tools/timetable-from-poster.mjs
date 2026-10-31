// 타임테이블 포스터에서 읽은 DJ·시간을 data/timetable.json 에 넣는다 (매시간 자동 작업이 사용).
//
// 사용: node tools/timetable-from-poster.mjs <입력.json> [--force]
// 입력: { "date": "2026-10-31", "source": "/assets/flyers/....jpg",
//         "floors": { "2F": [{ "t": "09:00", "n": "MUTE" }, ...], "3F": [...] } }
//   - 시간은 포스터에 적힌 그대로(12시간제 "09:00", "12:20", "01:00") 넣어도 되고 24시간제여도 된다.
//   - 타임테이블이 없는 포스터면 "floors": {} 로 넣어 "확인함"만 기록한다.
// 규칙: 첫 슬롯은 저녁(오후)으로 보고, 다음 슬롯부터는 앞 슬롯 이후의 가장 가까운 시각으로 바꾼다.
// 이미 손으로 넣었거나 다른 경로로 들어온 타임테이블은 덮어쓰지 않는다(--force 일 때만).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TT = join(ROOT, 'data/timetable.json');
const SRC = join(ROOT, 'data/timetable-sources.json');
const pad = (n) => String(n).padStart(2, '0');

export function toNight(slots) {
  // 반환: 24시간제 "HH:MM" (자정 이후는 00~11시)
  let prev = null;
  return slots.map((s, i) => {
    const m = String(s.t).trim().match(/^(\d{1,2})[:.](\d{2})$/);
    if (!m) throw new Error(`시간 형식이 이상해요: ${s.t}`);
    if (+m[1] > 24 || +m[2] > 59) throw new Error(`시간 형식이 이상해요: ${s.t}`);
    let h = +m[1] % 24; const mi = +m[2];
    // 영업일 기준 분(정오=0): 저녁 18시 → 360, 자정 → 720, 새벽 7시 → 1140
    const cands = [h, (h + 12) % 24].map((hh) => ({ hh, v: ((hh - 12 + 24) % 24) * 60 + mi }));
    let pick;
    if (i === 0) pick = cands.filter((c) => c.v >= 5 * 60 && c.v < 14 * 60).sort((a, b) => a.v - b.v)[0] || cands[0]; // 첫 슬롯: 17:00~02:00 사이
    else pick = cands.filter((c) => c.v >= prev).sort((a, b) => a.v - b.v)[0];
    if (!pick) throw new Error(`시간 순서가 맞지 않아요: ${s.t} (${s.n})`);
    prev = pick.v;
    return { t: `${pad(pick.hh)}:${pad(mi)}`, n: String(s.n).trim() };
  });
}

function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) { console.error('사용: node tools/timetable-from-poster.mjs <입력.json> [--force]'); process.exit(2); }
  const input = JSON.parse(readFileSync(file, 'utf8'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '')) throw new Error('date 형식: YYYY-MM-DD');
  const tt = JSON.parse(readFileSync(TT, 'utf8'));
  const src = existsSync(SRC) ? JSON.parse(readFileSync(SRC, 'utf8')) : {};
  const day = {};
  for (const f of ['2F', '3F']) {
    const list = (input.floors && input.floors[f]) || [];
    const clean = list.filter((s) => s && s.t && s.n);
    if (clean.length) day[f] = toNight(clean);
  }
  const manual = tt[input.date] && (!src[input.date] || src[input.date].skipped === 'manual');
  if (manual && flag !== '--force') {
    console.log(`건너뜀: ${input.date} 타임테이블이 이미 있어요 (직접 입력/기존 자료). --force 로만 덮어써요.`);
    src[input.date] = { source: input.source || null, skipped: 'manual', at: new Date().toISOString() };
  } else if (!Object.keys(day).length) {
    console.log(`타임테이블 없음: ${input.date} (${input.source || ''}) 확인만 기록했어요.`);
    src[input.date] = { source: input.source || null, none: true, at: new Date().toISOString() };
  } else {
    tt[input.date] = day;
    src[input.date] = { source: input.source || null, at: new Date().toISOString() };
    console.log(`저장: ${input.date} ` + Object.entries(day).map(([f, l]) => `${f} ${l.length}명 (${l[0].t}~${l[l.length - 1].t})`).join(', '));
  }
  const sorted = {}; Object.keys(tt).sort().forEach((k) => { sorted[k] = tt[k]; });
  writeFileSync(TT, JSON.stringify(sorted, null, 2) + '\n');
  const ssorted = {}; Object.keys(src).sort().forEach((k) => { ssorted[k] = src[k]; });
  writeFileSync(SRC, JSON.stringify(ssorted, null, 2) + '\n');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
