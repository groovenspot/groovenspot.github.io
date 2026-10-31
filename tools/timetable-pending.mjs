// 아직 읽지 않은 타임테이블 포스터 목록을 JSON 으로 출력한다 (매시간 자동 작업이 사용).
// 대상: 오늘·내일(한국 시간, 영업일 기준) 이벤트 중 포스터(flyer)가 있고,
//       그 포스터를 아직 읽지 않았으며, 손으로 넣은 타임테이블이 없는 날.
// 사용: node tools/timetable-pending.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f, d) => (existsSync(join(ROOT, f)) ? JSON.parse(readFileSync(join(ROOT, f), 'utf8')) : d);
const events = read('data/events.json', []), tt = read('data/timetable.json', {}), src = read('data/timetable-sources.json', {});
const kst = new Date(Date.now() + 9 * 3600e3);
const biz = new Date(kst.getTime() - (kst.getUTCHours() < 8 ? 864e5 : 0));
const days = [0, 1].map((n) => new Date(biz.getTime() + n * 864e5).toISOString().slice(0, 10));
const out = [];
for (const e of events) {
  if (!days.includes(e.date) || !e.flyer) continue;
  const s = src[e.date];
  const manual = tt[e.date] && (!s || s.skipped === 'manual');
  if (manual) continue;
  if (s && s.source === e.flyer) continue; // 이미 읽은 포스터
  const file = join(ROOT, e.flyer.replace(/^\//, ''));
  out.push({ date: e.date, title: e.title, source: e.flyer, file, exists: existsSync(file) });
}
console.log(JSON.stringify({ today: days[0], pending: out }, null, 2));
