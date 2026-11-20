// Shared markup and interactions for the guest screens, loaded first by lounge/index.html.
const LoungeScreenUI = (() => {
  const L = Lounge;
  function words(prefix, entries) {
    const ko = {}, en = {};
    for (const [key, [korean, english]] of Object.entries(entries)) {
      ko[prefix + '.' + key] = korean;
      en[prefix + '.' + key] = english;
    }
    L.i18n({ ko, en });
    return (key, vars) => L.esc(L.t(prefix + '.' + key, vars));
  }
  const t = words('screens', {
    loading: ['불러오는 중', 'Loading'], empty: ['아직 없어요', 'Nothing here yet'],
    error: ['불러오지 못했어요. 다시 시도해 주세요.', 'Could not load. Please try again.'],
    failed: ['처리하지 못했어요. 다시 시도해 주세요.', 'Could not complete. Please try again.'],
    dup: ['오늘은 이미 했어요.', 'You already did this today.'],
    saved: ['완료했어요', 'Saved'], close: ['닫기', 'Close'], soon: ['준비 중', 'Coming soon'],
    report: ['신고하기', 'Report'], reason: ['이유를 골라 주세요', 'Choose a reason'],
    ad: ['광고', 'Spam'], sexual: ['성적인 내용', 'Sexual content'], abuse: ['괴롭힘', 'Harassment'],
    illegal: ['불법 내용', 'Illegal content'], etc: ['기타', 'Other'], me: ['사진 속 사람이 저예요', 'I’m in this photo']
  });
  const card = 'padding:16px;margin:12px 0;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow-wrap:anywhere';
  const media = 'display:block;width:100%;border:0;border-radius:14px';
  const status = (key, waiting = false) => '<p class="muted" role="status"' +
    (waiting ? ' data-loading' : '') + '>' + t(key) + '</p>';
  const button = (label, attrs = '', hot = false) =>
    '<button type="button" class="btn' + (hot ? ' btn-hot' : '') + '" ' + attrs + '>' + label + '</button>';
  const link = (href, label) => '<a class="btn" href="' + L.esc(href) + '">' + label + '</a>';

  function mount(root, heading) {
    const view = document.createElement('section');
    view.style.cssText = 'max-width:640px;margin:auto;overflow-wrap:anywhere';
    view.innerHTML = heading + '<div data-content>' + status('loading', true) + '</div>';
    root.replaceChildren(view);
    return view.querySelector('[data-content]');
  }
  function url(value) {
    if (typeof value !== 'string' || !value) return '';
    try {
      const parsed = new URL(value, location.href);
      if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(parsed.hostname))) return parsed.href;
    } catch { /* Invalid media URL. */ }
    return '';
  }
  function image(value) {
    if (typeof value !== 'string' || !value) return '';
    return url(/^(?:https?:\/\/|\/)/i.test(value) ? value : L.img(value));
  }
  function error(response) {
    if (response?.error === 'auth') L.needLogin();
    else L.toast(L.t('screens.' + (response?.error === 'dup' ? 'dup' : 'failed')));
  }
  function sheet(html) {
    const el = L.sheet(button(t('close'), 'data-c-close') + html);
    el.querySelector('[data-c-close]').onclick = () => L.closeSheet();
    return el;
  }
  function reason({ title, reasons, submit, done }) {
    const el = sheet('<h2>' + title + '</h2><form><label>' + t('reason') +
      '<select name="why" required><option value="">—</option>' +
      reasons.map(why => '<option value="' + why + '">' + t(why) + '</option>').join('') +
      '</select></label><button class="btn btn-hot" style="margin-top:12px">' + title + '</button></form>');
    el.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const send = form.querySelector('button');
      if (send.disabled) return;
      send.disabled = true;
      const result = await submit(form.elements.why.value);
      if (!el.isConnected) return;
      send.disabled = false;
      if (!result || result.error) return error(result);
      L.closeSheet();
      L.toast(L.t('screens.saved'));
      done?.();
    };
  }
  function report(kind, id) {
    if (L.needLogin()) return;
    reason({ title: t('report'), reasons: ['ad', 'sexual', 'abuse', 'illegal', 'etc'],
      submit: why => L.api('report', { kind, id, why }) });
  }
  function time(at, options) {
    const date = new Date(at);
    return at && Number.isFinite(date.getTime())
      ? L.esc(new Intl.DateTimeFormat(document.documentElement.lang || navigator.language,
          { timeZone: 'Asia/Seoul', ...options }).format(date)) : '';
  }
  return { words, t, card, media, status, button, link, mount, url, image, error, sheet, reason, report, time };
})();

(() => {
  const L = Lounge;
  const U = LoungeScreenUI;
  const t = U.words('tonight', {
    open: ['영업 중', 'Open now'], closed: ['영업 전·종료', 'Closed'], unknown: ['영업 정보 없음', 'Hours unavailable'],
    now: ['지금 DJ', 'Now playing'], next: ['다음 DJ', 'Up next'], crowd0: ['정보 없음', 'Unknown'],
    crowd1: ['여유', 'Quiet'], crowd2: ['보통', 'Moderate'], crowd3: ['꽉 참', 'Full'],
    line: ['입구 줄', 'Entry queue'], none: ['줄 없음', 'No queue'], mins: ['약 {n}분', 'About {n} min'],
    live: ['매장 영상', 'Club live'], timetable: ['타임테이블', 'Timetable'],
    going: ['갈래요', 'I’m going'], undo: ['갈래요 취소', 'Cancel going'],
    people: ['{n}명 갈래요', '{n} going'], friends: ['같이 가는 친구', 'Friends going'],
    stale: ['마지막으로 받은 정보예요', 'Showing the last update']
  });
  let timer;
  let lastGoing;

  function render(root) {
    const view = U.mount(root, '<h1>' + L.esc(L.t('nav.tonight')) + '</h1>');
    let data;
    let pending = false;
    let updating = false;
    let revision = 0;
    const going = () => Boolean(L.me && (data.going?.me ??
      (lastGoing?.day === data.day && lastGoing?.member === L.me.id && lastGoing?.value)));

    function paintGoing() {
      const el = view.querySelector('[data-going]');
      const summary = data.going || {};
      el.innerHTML = U.button(t(going() ? 'undo' : 'going'), 'aria-pressed="' + Boolean(going()) + '"', true) +
        ' <strong>' + t('people', { n: Number(summary.n) || 0 }) + '</strong>' +
        (summary.friends?.length ? '<div>' + t('friends') + ' · ' + summary.friends.map(nick =>
          U.link('#/u/' + encodeURIComponent(nick), L.esc(nick))).join(' ') + '</div>' : '');
      el.querySelector('button').onclick = async event => {
        if (L.needLogin() || updating) return;
        const button = event.currentTarget;
        const value = !going();
        const member = L.me?.id;
        updating = button.disabled = true;
        revision++;
        const result = await L.api(value ? 'going' : 'going_off');
        updating = false;
        if (!view.isConnected) return;
        button.disabled = false;
        if (!result || result.error) return U.error(result);
        lastGoing = { day: data.day, member, value };
        data.going = { ...result, me: value };
        paintGoing();
      };
    }

    async function refresh() {
      if (pending || updating) return;
      pending = true;
      const requested = revision;
      const result = await L.api('tonight');
      pending = false;
      if (!view.isConnected || updating || requested !== revision) return;
      if (!result || result.error) {
        if (!data) view.innerHTML = U.status(result?.error === 'action' ? 'empty' : 'error') + '<div data-going></div>';
        data ||= {};
        paintGoing();
        return;
      }
      data = result;
      const stamp = /^\d{4}-\d{2}-\d{2}$/.test(data.day || '') ? U.time(data.day + 'T12:00:00+09:00', { dateStyle: 'full' }) : '';
      view.innerHTML = '<p class="muted">' + stamp + '</p><div style="' + U.card + '"><strong style="color:' +
        (data.open ? 'var(--ok)' : 'var(--muted)') + '">● ' + t(data.open === true ? 'open' : data.open === false ? 'closed' : 'unknown') +
        '</strong> · ' + L.esc(data.hours) + (data.stale ? '<p class="muted">' + t('stale') + '</p>' : '') +
        '</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">' +
        ['2F', '3F'].map((floor, i) => {
          const info = data.floors?.[floor] || {};
          const crowd = [1, 2, 3].includes(info.crowd) ? info.crowd : 0;
          return '<article style="' + U.card + ';margin:0;border-top:3px solid var(--' + (i ? 's' : 'g') + ')"><strong>' +
            floor + (i ? ' SPOT' : ' GROOVE') + '</strong><div><small class="muted">' + t('now') + '</small><br><b>' +
            L.esc(info.now || '—') + '</b></div><div><small class="muted">' + t('next') + '</small><br>' +
            L.esc([info.next, info.nextAt].filter(Boolean).join(' · ') || '—') + '</div><p>' + t('crowd' + crowd) +
            '<br><meter style="width:100%" min="0" max="3" value="' + crowd + '" aria-label="' + t('crowd' + crowd) +
            '"></meter></p></article>';
        }).join('') + '</div><p style="' + U.card + '">' + t('line') + ' · <b>' +
        (['10', '30'].includes(data.line) ? t('mins', { n: data.line }) : data.line === 'none' ? t('none') : t('crowd0')) +
        '</b></p><div data-going style="' + U.card + '"></div><h2>' + t('live') + '</h2>' +
        ((data.lives || []).map(live => {
          const video = U.url(live.vid), photo = U.url(live.img);
          if (!video && !photo) return '';
          return '<figure style="' + U.card + '">' + (video
            ? '<video style="' + U.media + '" controls playsinline preload="none" src="' + L.esc(video) + '"' +
              (photo ? ' poster="' + L.esc(photo) + '"' : '') + '></video>'
            : '<img alt="" loading="lazy" style="' + U.media + '" src="' + L.esc(photo) + '">') +
            '<figcaption>' + L.esc(live.floor) + ' · ' + (typeof live.at === 'number'
              ? U.time(live.at, { timeStyle: 'short' }) : L.esc(live.at)) + '</figcaption></figure>';
        }).join('') || U.status('empty')) + '<h2>' + t('timetable') + '</h2>' +
        ((data.timetable || []).length ? '<ul style="' + U.card + ';padding-left:36px">' + data.timetable.map(slot =>
          '<li>' + L.esc(slot.at) + ' · ' + L.esc(slot.floor) + ' · ' + L.esc(slot.dj) + '</li>').join('') + '</ul>' : U.status('empty'));
      paintGoing();
    }
    refresh();
    timer = setInterval(refresh, 60_000);
  }

  L.screen('tonight', { nav: 'tonight', auth: false, title: 'nav.tonight', render, leave() { clearInterval(timer); } });
})();
