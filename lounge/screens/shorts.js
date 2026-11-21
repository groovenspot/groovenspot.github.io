// GROOVE 숏츠 — 유튜브 숏츠를 위아래로 넘겨 보며 🔥 누르기 (놀거리 개편 1차). 서버: groove-staff-api lounge/src/shorts.js
// 지금 보이는 클립 하나만 유튜브 플레이어를 끼우고(영상·컨트롤 안 가림), 나머지는 썸네일. 3초 넘게 본 클립은 오늘 본 것으로 기록.
(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('shorts', {
    title: ['GROOVE 숏츠', 'GROOVE Shorts'],
    back: ['놀거리', 'Play'],
    today: ['오늘 {n}/{goal} · {goal}개 보면 +{p}P', 'Today {n}/{goal} · Watch {goal} for +{p}P'],
    todayDone: ['오늘 {n}/{goal} · +{p}P 받았어요', 'Today {n}/{goal} · +{p}P earned'],
    todayPlain: ['오늘 {n}/{goal}', 'Today {n}/{goal}'],
    guest: ['로그인하고 {goal}개 보면 +{p}P', 'Log in and watch {goal} for +{p}P'],
    earned: ['숏츠 {goal}개 완료! +{p}P', '{goal} Shorts watched! +{p}P'],
    rankBtn: ['DJ 불꽃 순위', 'DJ ranking'],
    rank: ['이번 주 DJ 불꽃 순위', 'This week’s DJ 🔥 ranking'],
    rankEmpty: ['이번 주엔 아직 불꽃이 없어요. 첫 🔥을 눌러 보세요!', 'No 🔥 yet this week. Be the first!'],
    fireCount: ['불꽃 {n}개', '{n} fires'],
    fire: ['불꽃 누르기', 'Send a fire'],
    play: ['재생: {song}', 'Play: {song}'],
    feed: ['GROOVE 숏츠 — 위아래로 넘겨 보기', 'GROOVE Shorts — swipe up or down'],
    empty: ['아직 숏츠가 없어요. 곧 올라와요!', 'No Shorts yet. New ones are on the way!'],
    error: ['숏츠를 불러오지 못했어요.', 'Could not load Shorts.'],
    retry: ['다시 시도', 'Try again'],
    soon: ['준비 중이에요', 'Coming soon'],
    floor2F: ['2F 힙합', '2F Hip-hop'],
    floor3F: ['3F EDM', '3F EDM']
  });
  L.i18n({
    ja: {
      'shorts.title': 'GROOVE ショート', 'shorts.back': '遊ぶ',
      'shorts.today': '今日 {n}/{goal} · {goal}本見ると +{p}P', 'shorts.todayDone': '今日 {n}/{goal} · +{p}P 獲得',
      'shorts.todayPlain': '今日 {n}/{goal}', 'shorts.guest': 'ログインして{goal}本見ると +{p}P',
      'shorts.earned': 'ショート{goal}本視聴完了！+{p}P', 'shorts.rankBtn': 'DJランキング',
      'shorts.rank': '今週のDJ 🔥ランキング', 'shorts.rankEmpty': '今週はまだ🔥がありません。最初の🔥を押してみよう！',
      'shorts.fireCount': '🔥 {n}件', 'shorts.fire': '🔥を送る', 'shorts.play': '再生：{song}',
      'shorts.feed': 'GROOVE ショート — 上下にスワイプ', 'shorts.empty': 'まだショートがありません。もうすぐ公開！',
      'shorts.error': 'ショートを読み込めませんでした。', 'shorts.retry': '再試行', 'shorts.soon': '準備中です',
      'shorts.floor2F': '2F ヒップホップ', 'shorts.floor3F': '3F EDM'
    },
    zh: {
      'shorts.title': 'GROOVE 短视频', 'shorts.back': '娱乐',
      'shorts.today': '今日 {n}/{goal} · 看满 {goal} 个 +{p}P', 'shorts.todayDone': '今日 {n}/{goal} · 已获得 +{p}P',
      'shorts.todayPlain': '今日 {n}/{goal}', 'shorts.guest': '登录后看满 {goal} 个 +{p}P',
      'shorts.earned': '已看完 {goal} 个短视频！+{p}P', 'shorts.rankBtn': 'DJ 排行',
      'shorts.rank': '本周 DJ 🔥 排行', 'shorts.rankEmpty': '本周还没有🔥，来点第一个吧！',
      'shorts.fireCount': '{n} 个🔥', 'shorts.fire': '送出🔥', 'shorts.play': '播放：{song}',
      'shorts.feed': 'GROOVE 短视频 — 上下滑动', 'shorts.empty': '还没有短视频，马上就来！',
      'shorts.error': '无法加载短视频。', 'shorts.retry': '重试', 'shorts.soon': '即将开放',
      'shorts.floor2F': '2F 嘻哈', 'shorts.floor3F': '3F EDM'
    }
  });

  const VIDEO = /^[A-Za-z0-9_-]{11}$/;
  const SEEN_MS = 3000;
  // 색은 app.css 변수(어두운·밝은 테마 공통)로만 — 영상 칸만 늘 어둡게
  const css = `
    .sh-screen { display:grid; gap:8px; min-width:0; padding-top:8px; }
    .sh-bar { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; min-width:0; }
    .sh-chip { margin:0; min-width:0; padding:5px 11px; border-radius:999px; border:1px solid color-mix(in srgb, #ff4f8b 45%, var(--line));
      background:color-mix(in srgb, #ff4f8b 16%, var(--card)); color:var(--txt); font-size:.8125rem; font-weight:800; line-height:1.35; overflow-wrap:anywhere; }
    .sh-chip[data-done] { border-color:color-mix(in srgb, var(--ok) 55%, var(--line)); background:color-mix(in srgb, var(--ok) 18%, var(--card)); }
    .sh-rank-btn { flex:none; display:inline-flex; align-items:center; gap:4px; min-height:44px; padding:0 12px; border-radius:12px;
      border:1px solid var(--line-2); background:var(--card); color:var(--txt); font:inherit; font-size:.8125rem; font-weight:800; cursor:pointer; }
    .sh-feed { position:relative; height:calc(100dvh - 190px); min-height:320px; overflow-y:auto; overflow-x:hidden;
      overscroll-behavior:contain; scroll-snap-type:y mandatory; border-radius:var(--radius); background:var(--bg-2);
      border:1px solid var(--line); scrollbar-width:none; }
    .sh-feed::-webkit-scrollbar { display:none; }
    .sh-feed:focus-visible { outline-offset:2px; }
    .sh-item { height:100%; display:flex; flex-direction:column; gap:8px; padding:10px 10px 12px; min-width:0;
      scroll-snap-align:start; scroll-snap-stop:always; }
    .sh-stage { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; container-type:size; }
    .sh-frame { position:relative; height:min(100cqh, calc(100cqw * 16 / 9)); max-width:100%; aspect-ratio:9 / 16;
      border-radius:14px; overflow:hidden; background:#141010; }
    .sh-frame iframe { position:absolute; inset:0; width:100%; height:100%; border:0; background:#000; }
    .sh-thumb { position:absolute; inset:0; display:block; width:100%; height:100%; padding:0; border:0; background:#141010; cursor:pointer; }
    .sh-thumb img { display:block; width:100%; height:100%; object-fit:cover; }
    .sh-thumb:focus-visible { outline-offset:-4px; }
    .sh-play { position:absolute; left:50%; top:50%; display:grid; place-items:center; width:64px; height:64px;
      transform:translate(-50%, -50%); border-radius:50%; background:rgb(0 0 0 / 62%); color:#fff; }
    .sh-info { flex:none; display:grid; gap:6px; min-width:0; }
    .sh-song { margin:0; color:var(--txt); font-weight:800; line-height:1.35; overflow:hidden; overflow-wrap:anywhere;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
    .sh-row { display:flex; align-items:center; justify-content:space-between; gap:8px; min-width:0; }
    .sh-dj { display:inline-flex; align-items:center; gap:6px; min-width:0; max-width:100%; min-height:44px; padding:0 12px;
      border-radius:999px; border:1px solid var(--line-2); background:var(--card); color:var(--txt); font-weight:800; text-decoration:none; }
    .sh-dj span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .sh-dj small, .sh-ranks small { flex:none; padding:1px 6px; border-radius:6px; font-size:.75rem; font-weight:900; }
    .sh-dj small[data-floor="2F"], .sh-ranks small[data-floor="2F"] { background:var(--g); color:var(--g-ink); }
    .sh-dj small[data-floor="3F"], .sh-ranks small[data-floor="3F"] { background:var(--s-deep); color:#fff; }
    .sh-fire { flex:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; min-width:72px; min-height:44px;
      padding:0 14px; border-radius:999px; border:1px solid var(--line-2); background:var(--card); color:var(--txt);
      font:inherit; font-weight:900; cursor:pointer; }
    .sh-fire[aria-pressed="true"] { border-color:#ff6f9e; background:color-mix(in srgb, #ff4f8b 22%, var(--card)); }
    .sh-flame { display:inline-block; }
    .sh-state { padding:18px 14px; border:1px dashed var(--line-2); border-radius:var(--radius); color:var(--muted); }
    .sh-ranks { margin:12px 0 0; padding:0; list-style:none; display:grid; gap:6px; }
    .sh-ranks li { display:grid; grid-template-columns:2em minmax(0,1fr) auto; align-items:center; gap:8px; min-height:48px;
      padding:2px 10px; border:1px solid var(--line); border-radius:12px; background:var(--bg-2); }
    .sh-ranks b { color:var(--g); font-weight:900; }
    .sh-ranks a, .sh-ranks .sh-name { min-width:0; display:inline-flex; align-items:center; gap:6px; min-height:44px;
      color:var(--txt); font-weight:800; overflow-wrap:anywhere; }
    @media (prefers-reduced-motion:no-preference) {
      .sh-fire[data-pop] .sh-flame { animation:sh-pop .45s ease-out; }
    }
    @keyframes sh-pop { 40% { transform:scale(1.45) rotate(-8deg); } }
  `;
  let dispose;

  function style() {
    if (document.getElementById('shorts-css')) return;
    const el = document.createElement('style');
    el.id = 'shorts-css';
    el.textContent = css;
    document.head.append(el);
  }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const floorOf = value => value === '2F' || value === '3F' ? value : '';
  const floorTag = floor => floor ? '<small data-floor="' + floor + '" title="' + t('floor' + floor) + '">' + floor + '</small>' : '';
  const djHref = key => '#/dj/' + encodeURIComponent(key);
  const label = item => item.song || item.title || 'GROOVE';

  function djChip(item) {
    if (!item.dj) return '<span></span>';
    const inner = '<span>' + L.esc(item.dj) + '</span>' + floorTag(floorOf(item.floor));
    return item.dj_key ? '<a class="sh-dj" href="' + L.esc(djHref(item.dj_key)) + '">' + inner + '</a>'
      : '<span class="sh-dj">' + inner + '</span>';
  }
  function fireButton(item) {
    return '<button type="button" class="sh-fire" data-fire aria-pressed="' + Boolean(item.fired) + '" aria-label="' +
      t('fire') + ' · ' + t('fireCount', { n: item.fires }) + '"><span class="sh-flame" aria-hidden="true">🔥</span><span data-count>' +
      L.esc(item.fires) + '</span></button>';
  }
  function thumb(item) {
    return '<button type="button" class="sh-thumb" data-play aria-label="' + t('play', { song: label(item) }) + '">' +
      '<img src="https://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg" alt="" loading="lazy" decoding="async">' +
      '<span class="sh-play" aria-hidden="true">' + L.icon('play', { size: 28, fill: true }) + '</span></button>';
  }
  function itemHtml(item, i) {
    return '<article class="sh-item" data-i="' + i + '" aria-label="' + L.esc(label(item)) + (item.dj ? ' — ' + L.esc(item.dj) : '') + '">' +
      '<div class="sh-stage"><div class="sh-frame" data-frame>' + thumb(item) + '</div></div>' +
      '<div class="sh-info"><p class="sh-song">' + L.esc(label(item)) + '</p>' +
      '<div class="sh-row">' + djChip(item) + fireButton(item) + '</div></div></article>';
  }
  function usable(list) {
    return (Array.isArray(list) ? list : []).filter(item => item && VIDEO.test(item.id)).map(item => ({
      ...item, fires: Number.isSafeInteger(item.fires) && item.fires >= 0 ? item.fires : 0, fired: item.fired === true
    }));
  }

  async function rankSheet() {
    const panel = L.sheet('<h2>' + t('rank') + '</h2><div data-sh-ranks>' + U.status('loading', true) + '</div>', { close: true });
    const result = await L.api('shorts_djs');
    const box = panel.querySelector('[data-sh-ranks]');
    if (!box?.isConnected) return;
    if (result.error || !Array.isArray(result.djs)) { box.innerHTML = U.status('error'); return; }
    if (!result.djs.length) { box.innerHTML = '<p class="muted">' + t('rankEmpty') + '</p>'; return; }
    box.innerHTML = '<ol class="sh-ranks">' + result.djs.map((dj, i) => {
      const name = L.esc(dj.dj) + floorTag(floorOf(dj.floor));
      return '<li><b>' + (i + 1) + '</b>' + (dj.dj_key ? '<a href="' + L.esc(djHref(dj.dj_key)) + '">' + name + '</a>'
        : '<span class="sh-name">' + name + '</span>') + '<span aria-label="' + t('fireCount', { n: dj.fires }) + '">🔥 ' +
        L.esc(dj.fires) + '</span></li>';
    }).join('') + '</ol>';
  }

  async function render(root) {
    dispose?.();
    dispose = undefined;
    style();
    const screen = document.createElement('section');
    screen.className = 'sh-screen';
    screen.innerHTML = '<div class="sh-bar"><p class="sh-chip" data-chip></p>' +
      '<button type="button" class="sh-rank-btn" data-rank><span aria-hidden="true">🔥</span>' + t('rankBtn') + '</button></div><div data-body>' +
      U.status('loading', true) + '</div>';
    // 4차 화면 틀: 화면이 위 막대를 직접 그림 (뒤로 = 놀거리)
    root.innerHTML = L.bar({ title: L.t('shorts.title'), left: '<a class="ui-bar-btn" href="#/play" data-sh-back aria-label="' + t('back') + '">' + L.icon('back') + '</a>' });
    root.append(screen);
    const chip = screen.querySelector('[data-chip]'), body = screen.querySelector('[data-body]');
    screen.querySelector('[data-rank]').onclick = rankSheet;
    let today = null, goal = 10, pts = 5;

    function paintChip() {
      const vars = { n: today?.seen ?? 0, goal, p: pts };
      chip.toggleAttribute('data-done', Boolean(today?.done));
      chip.innerHTML = !L.me ? t('guest', vars) : !pts ? t('todayPlain', vars) : t(today?.done ? 'todayDone' : 'today', vars);
    }
    function takeToday(value) {
      if (!value || typeof value !== 'object') return;
      today = value;
      if (Number.isSafeInteger(value.goal) && value.goal > 0) goal = value.goal;
      if (Number.isSafeInteger(value.pts) && value.pts >= 0) pts = value.pts;
    }
    paintChip();

    const first = await L.api('shorts_list');
    if (!screen.isConnected) return;
    if (first.error === 'closed') { body.innerHTML = '<p class="sh-state" role="status">' + t('soon') + '</p>'; return; }
    if (first.error || !Array.isArray(first.items)) {
      body.innerHTML = '<p class="sh-state" role="alert">' + t('error') + '</p>' + U.button(t('retry'), 'data-retry');
      body.querySelector('[data-retry]').onclick = () => render(root);
      return;
    }
    takeToday(first.today);
    paintChip();
    const items = usable(first.items);
    let next = Number.isSafeInteger(first.next) ? first.next : null;
    if (!items.length) { body.innerHTML = '<p class="sh-state" role="status" data-sh-empty>' + t('empty') + '</p>'; return; }

    body.innerHTML = '<div class="sh-feed" data-feed tabindex="0" role="region" aria-label="' + t('feed') + '">' +
      items.map(itemHtml).join('') + '</div>';
    const feed = body.querySelector('[data-feed]');
    const sent = new Set(), ratios = new Map();
    let active = -1, timer = 0, loading = false, alive = true;
    const el = i => feed.querySelector('.sh-item[data-i="' + i + '"]');

    function mount(i) {
      const frame = el(i)?.querySelector('[data-frame]'), item = items[i];
      if (!frame || !item || frame.querySelector('iframe')) return;
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + item.id + '?playsinline=1&autoplay=1&rel=0&modestbranding=1';
      iframe.title = label(item) + (item.dj ? ' — ' + item.dj : '');
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.querySelector('[data-play]').hidden = true;
      frame.append(iframe);
    }
    function unmount(i) {
      const frame = el(i)?.querySelector('[data-frame]');
      if (!frame) return;
      frame.querySelector('iframe')?.remove();
      const play = frame.querySelector('[data-play]');
      if (play) play.hidden = false;
    }
    async function seen(i) {
      const item = items[i];
      if (!item || sent.has(item.id) || !L.me) return;
      sent.add(item.id);
      const result = await L.api('shorts_seen', { id: item.id });
      if (!alive) return;
      if (result.error) {
        if (['busy', 'network', 'server'].includes(result.error)) sent.delete(item.id);
        return;
      }
      takeToday({ seen: result.seen, goal: result.goal, done: result.done, pts });
      paintChip();
      if (Number(result.gained) > 0) L.toast(L.t('shorts.earned', { goal, p: result.gained }));
    }
    function arm() {
      clearTimeout(timer);
      const i = active, item = items[i];
      if (!item || !L.me || sent.has(item.id) || document.hidden) return;
      timer = setTimeout(() => { if (alive && active === i && !document.hidden) seen(i); }, SEEN_MS);
    }
    async function more() {
      if (loading || next === null) return;
      loading = true;
      const result = await L.api('shorts_list', { before: next });
      loading = false;
      if (!alive || result.error || !Array.isArray(result.items)) return;
      const known = new Set(items.map(item => item.id));
      const fresh = usable(result.items).filter(item => !known.has(item.id));
      next = Number.isSafeInteger(result.next) && fresh.length ? result.next : null;
      const start = items.length;
      items.push(...fresh);
      feed.insertAdjacentHTML('beforeend', fresh.map((item, k) => itemHtml(item, start + k)).join(''));
      for (let i = start; i < items.length; i++) observer.observe(el(i));
    }
    function activate(i) {
      if (i === active || !items[i]) return;
      if (active >= 0) unmount(active);
      active = i;
      mount(i);
      arm();
      if (i >= items.length - 4) more();
    }
    function go(i) {
      const target = el(Math.max(0, Math.min(items.length - 1, i)));
      if (target) feed.scrollTo({ top: target.offsetTop, behavior: reduced() ? 'auto' : 'smooth' });
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
      let best = null, bestRatio = 0.6;
      for (const [node, ratio] of ratios) {
        if (!node.isConnected) { ratios.delete(node); continue; }
        if (ratio >= bestRatio) { best = node; bestRatio = ratio; }
      }
      if (best) activate(Number(best.dataset.i));
    }, { root: feed, threshold: [0, 0.6, 0.85, 1] });
    for (let i = 0; i < items.length; i++) observer.observe(el(i));

    function fit() {
      if (!feed.isConnected) return;
      const bar = document.getElementById('tabbar');
      const bottom = bar && getComputedStyle(bar).visibility !== 'hidden' ? bar.getBoundingClientRect().height : 0;
      const height = Math.max(320, Math.floor(window.innerHeight - feed.getBoundingClientRect().top - window.scrollY - bottom - 10));
      feed.style.height = height + 'px';
      const current = el(active);
      if (current) feed.scrollTop = current.offsetTop;
    }
    fit();
    activate(0);

    feed.addEventListener('click', async event => {
      const play = event.target.closest('[data-play]');
      if (play) { go(Number(play.closest('.sh-item').dataset.i)); return; }
      const button = event.target.closest('[data-fire]');
      if (!button) return;
      const i = Number(button.closest('.sh-item').dataset.i), item = items[i];
      if (!item || L.needLogin() || item.fired || button.dataset.busy) return;
      const paint = () => {
        button.setAttribute('aria-pressed', String(item.fired));
        button.setAttribute('aria-label', L.t('shorts.fire') + ' · ' + L.t('shorts.fireCount', { n: item.fires }));
        button.querySelector('[data-count]').textContent = item.fires;
      };
      button.dataset.busy = '1';
      item.fired = true; item.fires++;
      paint();
      button.toggleAttribute('data-pop', true);
      setTimeout(() => button.removeAttribute('data-pop'), 500);
      const result = await L.api('shorts_fire', { id: item.id });
      delete button.dataset.busy;
      if (!alive) return;
      if (result.ok && Number.isSafeInteger(result.fires)) {
        item.fires = result.fires;
        item.fired = true;
      } else {
        item.fired = false; item.fires = Math.max(0, item.fires - 1);
        U.error(result);
      }
      paint();
    });
    feed.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const step = { ArrowDown: 1, PageDown: 1, j: 1, ArrowUp: -1, PageUp: -1, k: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      go(active + step);
    });
    const onResize = () => fit();
    const onVisible = () => { if (document.hidden) clearTimeout(timer); else arm(); };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisible);
    dispose = () => {
      alive = false;
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible);
      feed.querySelectorAll('iframe').forEach(frame => frame.remove());
    };
  }

  L.screen('shorts', { nav: 'play', bar: 'own', title: 'shorts.title', render, leave() { dispose?.(); dispose = undefined; } });
})();
