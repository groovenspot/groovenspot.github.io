import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../screens/l26_live.js', import.meta.url), 'utf8');
const at = (time, day = '2026-11-27') => Date.parse(day + 'T' + time + '+09:00');
const scheduled = { opensAt: at('21:00:00'), closesAt: at('07:00:00', '2026-11-28') };

async function renderVenue(now, response, scheduleOnly = false) {
  const nodes = new Map();
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, { dataset: {}, querySelector: () => null });
    return nodes.get(selector);
  }
  node('[data-live-vote]').querySelector = node;
  const root = { isConnected: true, addEventListener() {}, querySelector: node, querySelectorAll: () => [] };
  let screen;
  const Lounge = {
    lang: 'ko', t: key => key, esc: value => String(value), icon: () => '', open: () => false,
    screen: (name, definition) => { screen = definition; },
    djMark: value => value, l26Skeleton: () => '', l26Empty: label => label, photoSrc: value => value,
    mountDjFeedback: () => ({ refresh() {}, destroy() {} }),
    api: async () => ({ floors: { '2F': { now: 'DJ A' } }, ...response })
  };
  runInNewContext(source, {
    Date: { now: () => now },
    fetch: async () => ({ ok: true, json: async () => [{ dj: 'DJ B', youtube: 'whM3ZZUnSVE' }] }),
    setTimeout() {}, clearTimeout() {},
    window: { Lounge, addEventListener() {}, removeEventListener() {} },
    document: { hidden: false, querySelector: () => true, addEventListener() {}, removeEventListener() {} }
  });
  screen.render(root);
  await new Promise(resolve => setImmediate(resolve));
  screen.leave();

  const badge = node('[data-live-venue]');
  const schedule = node('[data-live-dj="2F"]').innerHTML;
  if (scheduleOnly) return schedule;
  return [badge.dataset.liveVenue, badge.textContent, schedule.includes('data-live-current')];
}

const cases = [
  ['19:30 early staff open with extended timing', at('19:30:00'), { open: true, phase: 'open', ...scheduled }, 'pre', '오픈 전 · 21:00 오픈'],
  ['20:59:59 legacy staff open', at('20:59:59'), { open: true }, 'pre', '오픈 전 · 21:00 오픈'],
  ['21:00 inclusive opening', at('21:00:00'), { open: true, phase: 'open', ...scheduled }, 'open', '영업 중'],
  ['server opening time takes priority over a slow device clock', at('19:30:00'), { open: true, phase: 'open', server_now: at('21:00:00'), ...scheduled }, 'open', '영업 중'],
  ['server time at close hides the current DJ on a slow device', at('23:00:00'), { open: true, server_now: at('07:00:00', '2026-11-28') }, 'after', '영업 종료'],
  ['scheduled time alone cannot open the venue', at('21:00:00'), { open: false, phase: 'pre' }, 'pre', '오픈 전 · 21:00 오픈'],
  ['00:00 overnight opening', at('00:00:00', '2026-11-28'), { open: true, ...scheduled }, 'open', '영업 중'],
  ['06:59:59 before closing', at('06:59:59', '2026-11-28'), { open: true }, 'open', '영업 중'],
  ['07:00 exclusive closing even if staff still reports open', at('07:00:00', '2026-11-28'), { open: true, phase: 'open', ...scheduled }, 'after', '영업 종료'],
  ['11:59:59 after the previous night', at('11:59:59', '2026-11-28'), { open: false }, 'after', '영업 종료'],
  ['12:00 next opening period', at('12:00:00', '2026-11-28'), { open: false }, 'pre', '오픈 전 · 21:00 오픈'],
  ['server reports an early close', at('02:00:00', '2026-11-28'), { open: false, phase: 'after', ...scheduled }, 'after', '영업 종료'],
  ['configured opening takes priority over default hours', at('21:00:00'), { open: true, hours: '21:00–07:00', opensAt: at('22:00:00') }, 'pre', '오픈 전 · 22:00 오픈'],
  ['stale open data stays unknown', at('23:00:00'), { open: true, stale: true }, 'unknown', '영업 상태 확인 불가']
];

for (const [name, now, response, state, label] of cases) {
  test(name, async () => {
    assert.deepEqual(await renderVenue(now, response), [state, label, state === 'open']);
  });
}

test('before opening shows every floor slot using DJ marks', async () => {
  const schedule = await renderVenue(at('20:00:00'), {
    open: false,
    timetable: [{ floor: '2F', at: '21:00', dj: 'DJ A' },
      { floor: '3F', at: '21:30', dj: 'DJ C' }, { floor: '2F', at: '00:30', dj: 'DJ B' }]
  }, true);
  assert.match(schedule, /<time>21:00<\/time><strong>DJ A<\/strong>/);
  assert.match(schedule, /<time>00:30<\/time><strong>DJ B<\/strong>/);
  assert.doesNotMatch(schedule, /<details|DJ C|다음 DJ|i.ytimg.com/);
});
