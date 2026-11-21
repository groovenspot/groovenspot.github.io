/* SPEC5 home composition. Parts are owned by t4/t5 and are optional. */
(function () {
  const L = window.Lounge;
  L.tonightParts ||= {};
  const words = {
    open: ['영업 중', 'Open now', '営業中', '营业中'], pre: ['영업 전', 'Before opening', '営業前', '营业前'],
    after: ['마감', 'Closed', '営業終了', '已打烊'], line: ['입구 줄', 'Entry queue', '入場待ち', '入场排队'],
    none: ['없음', 'None', 'なし', '无'], mins: ['{n}분', '{n} min', '{n}分', '{n}分钟'],
    now: ['지금 DJ', 'Now playing', '現在のDJ', '当前DJ'], soon: ['곧 시작', 'Starting soon', 'まもなく開始', '即将开始'],
    crowd1: ['여유', 'Quiet', '余裕あり', '宽松'], crowd2: ['보통', 'Moderate', '普通', '适中'], crowd3: ['꽉 참', 'Full', '満員', '已满'],
    estimate: ['어림', 'Estimate', '推定', '估计'], hiphop: ['힙합', 'Hip-hop', 'ヒップホップ', '嘻哈'],
    countdown: ['오픈까지 {h}시간 {m}분', 'Opens in {h}h {m}m', 'オープンまで{h}時間{m}分', '距离开门{h}小时{m}分钟'],
    tonight: ['오늘 밤', 'Tonight', '今夜', '今晚'], lineup: ['타임테이블', 'Timetable', 'タイムテーブル', '时间表'],
    parties: ['이번 주 파티', 'This week’s parties', '今週のパーティー', '本周派对'],
    quick: ['바로 가기', 'Explore', 'ショートカット', '快捷入口'], lives: ['지금 매장 영상', 'Live at the club', '店内ライブ', '店内实况'],
    strip: ['오늘 올라온 글', 'Tonight’s posts', '今日の投稿', '今日动态'], party: ['오늘 파티', 'Tonight’s party', '今日のパーティー', '今日派对'],
    table: ['테이블 문의 · 조각 모집', 'Tables & groups', 'テーブル・仲間募集', '订桌与拼桌'],
    recap: ['어젯밤 다시 보기', 'Last night', '昨夜を振り返る', '昨夜回顾'],
    loading: ['불러오는 중', 'Loading', '読み込み中', '加载中'], error: ['불러오지 못했어요', 'Could not load', '読み込めませんでした', '加载失败'],
    retry: ['다시 시도', 'Try again', '再試行', '重试']
  };
  const dict = {};
  ['ko', 'en', 'ja', 'zh'].forEach((lang, i) => {
    dict[lang] = Object.fromEntries(Object.entries(words).map(([key, values]) => ['t5.' + key, values[i]]));
  });
  L.i18n(dict);
  const t = (key, vars) => L.esc(L.t('t5.' + key, vars));
  const now = () => typeof L.clock === 'function' ? L.clock() : Number.isFinite(L.clock) ? L.clock : Date.now();
  const phaseOf = data => ['open', 'pre', 'after'].includes(data.phase) ? data.phase : data.open ? 'open' :
    ((new Date(now() + 9 * 3600000).getUTCHours() >= 7 && new Date(now() + 9 * 3600000).getUTCHours() < 12) ? 'after' : 'pre');
  let active, classic = false;

  function leave() {
    if (classic) L.tonightClassic.leave?.();
    classic = false;
    if (!active) return;
    active.dead = true;
    clearInterval(active.timer);
    active.unpull?.();
    document.removeEventListener('visibilitychange', active.visible);
    active = null;
  }
  function render(root, params) {
    leave();
    if (!L.open('tonight5')) {
      classic = true;
      document.getElementById('app').classList.remove('own-bar');
      return L.tonightClassic.render(root, params);
    }
    root.innerHTML = '<div class="t5-home"><header class="t5-bar"><span class="t5-logo">GROOVE LOUNGE</span><div>' +
      (L.inboxIcons ? L.inboxIcons() : '') + '</div></header><div data-t5-content aria-busy="true"><div class="t5-skeleton" role="status" aria-label="' + t('loading') + '"><i></i><i></i><i></i></div></div></div>';
    const state = active = { root, view: root.querySelector('[data-t5-content]'), dead: false, pending: false, revision: 0 };
    state.ctx = { refresh, setData(patch) {
      if (state.dead || !state.data) return;
      state.revision++;
      Object.assign(state.data, patch);
      paint(state);
    } };
    L.paintInbox?.();
    state.unpull = L.pull?.(root, refresh);
    state.visible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', state.visible);
    state.timer = setInterval(() => {
      if (document.hidden || state.dead) return;
      countdown(state);
      refresh();
    }, 60000);
    return refresh();
  }
  async function refresh() {
    if (classic) return L.route();
    const state = active;
    if (!state || state.dead || state.pending) return;
    state.pending = true;
    const revision = state.revision;
    let result;
    try { result = await L.api('tonight'); } catch { result = { error: 'network' }; }
    state.pending = false;
    if (state.dead || active !== state) return;
    state.view.setAttribute('aria-busy', 'false');
    if (!result || result.error) {
      state.view.querySelector('[data-t5-error]')?.remove();
      if (!state.data) state.view.replaceChildren();
      const error = document.createElement('div');
      error.dataset.t5Error = '';
      error.setAttribute('role', 'status');
      error.innerHTML = '<p>' + t('error') + '</p><button class="btn" type="button">' + t('retry') + '</button>';
      error.querySelector('button').onclick = refresh;
      state.view.append(error);
      return;
    }
    if (revision !== state.revision) return;
    state.data = result;
    paint(state);
    L.restoreScroll?.();
  }
  function part(state, name, title) {
    const fn = L.tonightParts[name];
    if (typeof fn !== 'function') return;
    const section = document.createElement('section');
    section.dataset.t5Part = name;
    section.className = 't5-section';
    const el = document.createElement('div');
    if (title) {
      const h = document.createElement('h2'); h.textContent = L.t('t5.' + name); section.append(h);
    }
    section.append(el); state.view.append(section);
    // Parts that have nothing to show set their host hidden.
    fn(el, state.data, name === 'lineup' ? { ...state.ctx, compact: true } : state.ctx);
    section.hidden = el.hidden;
  }
  function countdown(state) {
    const el = state.view.querySelector('[data-t5-countdown]');
    if (!el) return;
    const opensAt = Number(state.data.opensAt);
    el.hidden = !Number.isFinite(opensAt) || !opensAt;
    const minutes = Math.max(0, Math.ceil((opensAt - now()) / 60000));
    el.textContent = L.t('t5.countdown', { h: Math.floor(minutes / 60), m: minutes % 60 });
  }
  // '2026-11-21' → '11월 21일 (토)' (타임테이블 화면과 같은 모양)
  function dayText(day) {
    const U = typeof LoungeScreenUI !== 'undefined' ? LoungeScreenUI : null;
    return L.esc(/^\d{4}-\d{2}-\d{2}$/.test(day) && U?.time ? U.time(day + 'T12:00:00+09:00', { month: 'long', day: 'numeric', weekday: 'short' }) : day);
  }
  function hero(state) {
    const data = state.data, party = data.party;
    // 파티·포스터가 없는 날에도 그린다 — '갈래요' 버튼과 오픈까지 남은 시간이 여기 있다
    const poster = typeof party?.poster === 'string' ? party.poster : party?.poster?.url || data.poster?.url;
    const src = typeof LoungeScreenUI !== 'undefined' ? LoungeScreenUI.url(poster) : '';
    const el = document.createElement('section'); el.className = 't5-hero' + (src ? ' t5-hero-image' : ''); el.dataset.t5Hero = '';
    el.innerHTML = (src ? '<img alt="" src="' + L.esc(src) + '">' : '') +
      '<div class="t5-hero-copy"><p>' + t('tonight') + ' · ' + dayText(party?.day || data.day || '') + '</p><h1>' +
      L.esc(party?.title || data.poster?.title || L.t('t5.tonight')) + '</h1><p data-t5-countdown></p><div data-t5-going></div></div>';
    state.view.append(el);
    if (src) el.querySelector('img').onerror = () => { el.classList.remove('t5-hero-image'); el.querySelector('img')?.remove(); };
    L.tonightParts.going?.(el.querySelector('[data-t5-going]'), data, state.ctx);
    countdown(state);
  }
  function floors(state) {
    const data = state.data;
    if (!data.floors) return;
    const el = document.createElement('section'); el.className = 't5-floors'; el.dataset.t5Floors = '';
    el.innerHTML = ['2F', '3F'].map((floor, i) => {
      const f = data.floors[floor] || {}, crowd = [1, 2, 3].includes(f.crowd) ? f.crowd : 0;
      return '<article class="t5-floor" data-floor="' + floor + '"><h2>' + floor + (i ? ' SPOT' : ' GROOVE') +
        '</h2><p class="muted">' + L.esc(f.genre || (i ? 'EDM' : L.t('t5.hiphop'))) + '</p><p class="t5-now-label">' + t('now') +
        '</p><strong class="t5-dj" title="' + L.esc(f.now || L.t('t5.soon')) + '">' + L.esc(f.now || L.t('t5.soon')) + '</strong>' +
        (f.next ? '<p class="t5-next">' + L.esc([f.nextAt, f.next].filter(Boolean).join(' · ')) + '</p>' : '') +
        (crowd ? '<div class="t5-crowd"><span class="t5-crowd-bars" aria-hidden="true">' + [1, 2, 3].map(n => '<i' + (n <= crowd ? ' class="on"' : '') + '></i>').join('') +
          '</span><span>' + t('crowd' + crowd) + '</span>' + (f.crowdSrc === 'auto' ? '<small>' + t('estimate') + '</small>' : '') + '</div>' : '') + '</article>';
    }).join('');
    state.view.append(el);
  }
  function paint(state) {
    const data = state.data, phase = phaseOf(data);
    state.view.dataset.phase = phase;
    state.view.innerHTML = '<div class="t5-status"><span class="t5-chip"><i class="t5-dot' + (phase === 'open' ? ' is-open' : '') + '"></i>' +
      t(phase) + (data.hours ? ' · ' + L.esc(data.hours) : '') + '</span>' +
      (phase === 'open' && ['none', '10', '30'].includes(String(data.line)) ? '<span class="t5-chip">' + t('line') + ' · ' +
        (data.line === 'none' ? t('none') : t('mins', { n: data.line })) + '</span>' : '') + '</div>';
    if (phase === 'open') {
      if (L.open('stories') && L.storyTray) {
        const tray = document.createElement('div'); tray.dataset.storyTray = ''; state.view.append(tray); L.storyTray(tray);
      }
      floors(state);
      // 오늘 파티가 없으면 파티 카드가 숨어 '갈래요'가 사라진다 → 따로 한 줄
      if (!data.party) part(state, 'going', false);
      ['quick', 'lives', 'strip', 'party', 'lineup', 'safety'].forEach(name => part(state, name, name !== 'safety'));
    } else if (phase === 'pre') {
      hero(state);
      ['table', 'lineup', 'recap', 'parties'].forEach(name => part(state, name, true));
    } else {
      part(state, 'recap', true); hero(state); part(state, 'lineup', true);
    }
  }
  L.screen('tonight', { nav: 'tonight', auth: false, title: 'nav.tonight', bar: 'own', keepScroll: true, render, leave, refresh });
})();
