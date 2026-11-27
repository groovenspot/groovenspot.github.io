(function (L) {
  const LANGS = { ko: '한국어', en: 'English', ja: '日本語', zh: '简体中文' };
  const COPY = {
    today: ['오늘의 프로그램', 'Today’s program', '今日のプログラム', '今日节目'],
    timetable: ['타임테이블', 'Timetable', 'タイムテーブル', '演出时间表'],
    live: ['LIVE', 'LIVE', 'ライブ', '现场'],
    onAir: ['지금 공연 중', 'Performing now', '出演中', '正在演出'],
    noLive: ['지금 공개된 라이브 일정이 없어요.', 'No live sets are listed right now.', '現在、公開中のライブ情報はありません。', '暂无公开的现场演出。'],
    noSchedule: ['오늘 공개된 타임테이블이 없어요.', 'No timetable is listed for today.', '本日のタイムテーブルは未掲載です。', '今天暂无公开的演出时间表。'],
    sessions: ['DJ 세션', 'DJ sessions', 'DJ セッション', 'DJ 现场录制'],
    session: ['세션 {n}', 'Session {n}', 'セッション {n}', '第 {n} 场'],
    more: ['전체 시간표', 'Full timetable', '全スケジュール', '完整时间表'],
    join: ['가입하기', 'Join', '登録する', '注册'],
    qr: ['직원 가입 QR 안내', 'Staff QR sign-up', 'スタッフQRで登録', '员工二维码注册'],
    lang: ['언어', 'Language', '言語', '语言'],
    load: ['프로그램을 불러오는 중', 'Loading the program', 'プログラムを読み込み中', '正在加载节目'],
    unavailable: ['프로그램을 불러오지 못했어요.', 'The program could not load.', 'プログラムを読み込めませんでした。', '无法加载节目。'],
    retry: ['다시 시도', 'Try again', '再試行', '重试']
  };
  L.i18n(Object.fromEntries(Object.keys(LANGS).map((lang, index) => [lang,
    Object.fromEntries(Object.entries(COPY).map(([key, words]) => ['public.' + key, words[index]]))])));
  const text = (key, vars) => L.esc(L.t('public.' + key, vars));
  const FLOORS = ['2F', '3F'];
  const SITE = 'https://xn--2i0bl1s25d.site';
  let active;

  function poster(data) {
    const url = URL.parse(data?.url || '');
    if (url?.origin !== SITE || !/^\/assets\/(?:flyers|timetables)\//.test(url.pathname)) return '';
    return '<figure class="public-poster"><img src="' + L.esc(url.href) +
      '" alt="" decoding="async"><figcaption>' + L.esc(data.title) + '</figcaption></figure>';
  }

  function line(slot) {
    return '<li><time>' + L.esc(slot.at) + '</time><span>' + L.esc(slot.dj) + '</span></li>';
  }

  function schedule(slots) {
    const panels = FLOORS.map(floor => {
      const rows = slots.filter(slot => slot.floor === floor);
      if (!rows.length) return '';
      const extra = rows.slice(3);
      return '<div class="public-floor" data-floor="' + floor + '"><h3>' + floor + '</h3><ul>' +
        rows.slice(0, 3).map(line).join('') + '</ul>' + (extra.length ? '<details><summary>' + text('more') +
        '</summary><ul>' + extra.map(line).join('') + '</ul></details>' : '') + '</div>';
    }).join('');
    return '<section><h2>' + text('timetable') + '</h2>' + (panels ?
      '<div class="public-floors">' + panels + '</div>' : L.l26Empty(text('noSchedule'), 'layers', true)) + '</section>';
  }

  function live(slots, showHeading) {
    return '<section>' + (showHeading ? '<h2>' + text('live') + '</h2>' : '') + (slots.length ?
      '<ul class="public-live" aria-label="' + text('onAir') + '">' + slots.filter(slot => FLOORS.includes(slot.floor)).map(slot =>
        '<li data-floor="' + slot.floor + '"><span>' + slot.floor + '</span><strong>' +
        L.esc(slot.dj) + '</strong><time>' + L.esc(slot.at) + '</time></li>').join('') + '</ul>' :
      L.l26Empty(text('noLive'), 'play', true)) + '</section>';
  }

  function sessions(videos) {
    const cards = videos.filter(video => /^[\w-]{11}$/.test(video.youtube)).map(video =>
      '<li><a href="https://www.youtube.com/watch?v=' + video.youtube +
      '" target="_blank" rel="noopener noreferrer"><span class="public-session-art" aria-hidden="true">' +
      L.icon('play', { size: 18 }) + '<img src="https://i.ytimg.com/vi/' + video.youtube +
      '/mqdefault.jpg" alt="" loading="lazy" decoding="async"></span><span><small>' +
      text('session', { n: video.session }) + '</small><strong>' + L.esc(video.dj) + '</strong></span>' +
      L.icon('chevron', { size: 18 }) + '</a></li>').join('');
    return cards ? '<section><h2>' + text('sessions') + '</h2><ul class="public-sessions">' + cards + '</ul></section>' : '';
  }

  function join(data) {
    if (L.me) return '';
    const route = data.join_route;
    const self = typeof route === 'string' && /^(?:join|(?:l26[_-])?self[_-]join)$/.test(route) && L.hasScreen(route);
    return '<div class="public-actions"><a class="btn btn-hot" href="#/' + (self ? route : 'join') + '">' +
      text(self ? 'join' : 'qr') + '</a><a class="btn" href="#/login">' + L.esc(L.t('core.login')) + '</a></div>';
  }

  function leave() {
    if (!active) return;
    active.stop();
    active = null;
  }

  function mount(root, liveFirst = false) {
    leave();
    root.className = 'l26-screen l26-public';
    root.innerHTML = '<header class="public-heading"><div><time data-program-day></time><h1>' +
      text(liveFirst ? 'live' : 'today') + '</h1></div><select aria-label="' + text('lang') + '">' +
      Object.entries(LANGS).map(([code, label]) => '<option value="' + code + '"' +
        (L.lang === code ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></header>' +
      '<nav class="public-nav"><a href="#/l26_public"' + (!liveFirst ? ' aria-current="page"' : '') + '>' +
      L.esc(L.t('nav.l26_home')) + '</a><a href="#/l26_public?live=1"' +
      (liveFirst ? ' aria-current="page"' : '') + '>' + text('live') + '</a></nav><div data-program>' +
      L.l26Skeleton(text('load')) + '</div>';
    const body = root.querySelector('[data-program]');
    const day = root.querySelector('[data-program-day]');
    const abort = new AbortController();
    let timer, pending = false, previous;
    async function refresh() {
      if (pending || abort.signal.aborted || document.hidden) return;
      pending = true;
      clearTimeout(timer);
      try {
        const response = await fetch(L.apiUrl('l26/public'), {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(8000)]), cache: 'no-store',
          credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'
        });
        if (abort.signal.aborted) return;
        if (response.status === 404) {
          body.replaceChildren();
          day.textContent = '';
          previous = undefined;
          await L.refreshConfig();
          if (!abort.signal.aborted && !L.open('l26_public_view')) {
            await L.route(null, true);
            return;
          }
        }
        if (!response.ok) throw new Error('program');
        const data = await response.json();
        if (abort.signal.aborted) return;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data.day)) throw new Error('program date');
        const nowPlaying = live(data.live, !liveFirst);
        const artwork = poster(data.poster);
        const content = (liveFirst ? nowPlaying + artwork : artwork + nowPlaying) +
          schedule(data.timetable) + sessions(data.sessions) + join(data);
        if (content !== previous) {
          body.innerHTML = content;
          previous = content;
        }
        day.dateTime = data.day;
        day.textContent = new Intl.DateTimeFormat(L.lang, {
          month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC'
        }).format(new Date(data.day));
      } catch {
        if (abort.signal.aborted) return;
        previous = undefined;
        day.textContent = '';
        body.innerHTML = L.l26Empty(text('unavailable'), 'layers', true, '',
          '<button class="btn" type="button" data-program-retry>' + text('retry') + '</button>');
      } finally {
        pending = false;
        if (!abort.signal.aborted) timer = setTimeout(refresh, 30_000);
      }
    }
    active = { stop() {
      abort.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    } };
    root.querySelector('select').onchange = event => {
      L.setLang(event.target.value, true);
      L.route();
    };
    body.addEventListener('error', event => { if (event.target.tagName === 'IMG') event.target.hidden = true; }, true);
    body.onclick = event => { if (event.target.closest('[data-program-retry]')) refresh(); };
    document.addEventListener('visibilitychange', refresh);
    return refresh();
  }

  L.publicView = { mount };
  L.screen('l26_public', {
    tabs: false,
    title: 'public.today',
    render: (root, params) => mount(root, params.live === true || params.live === '1'),
    leave
  });
})(window.Lounge);
