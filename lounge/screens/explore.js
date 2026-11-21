/* 탐색·검색·해시태그 (4차 · lounge/SPEC4.md 8장) — 주인: 스토리·글쓰기 작업창(D) (틀 작업창 A 대신 맡음)
   #/explore            검색칸 + 3칸 사진 격자(explore) · 검색 중이면 계정·태그 결과(search) · 최근 검색 5개(이 기기)
   #/tag/<태그>          그 태그가 달린 글 격자(tag_posts)
   #/explore/p/<글id> · #/tag/<태그>/p/<글id>   격자에서 누른 글부터 이어 보기 (L.feedCards + post_get) */
(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('explore', {
    title: ['탐색', 'Explore'], search: ['검색', 'Search'], placeholder: ['닉네임 · #태그 검색', 'Search nicknames or #tags'],
    cancel: ['취소', 'Cancel'], clear: ['검색어 지우기', 'Clear search'],
    recent: ['최근 검색', 'Recent'], clearAll: ['모두 지우기', 'Clear all'], removeRecent: ['최근 검색에서 {q} 지우기', 'Remove {q} from recent searches'],
    hint: ['닉네임이나 #태그로 찾아보세요.', 'Search by nickname or #tag.'],
    accounts: ['계정', 'Accounts'], tags: ['태그', 'Tags'], posts: ['게시물 {n}개', '{n} posts'],
    none: ['‘{q}’ 검색 결과가 없어요.', 'No results for “{q}”.'], loginUsers: ['로그인하면 회원도 찾을 수 있어요.', 'Log in to find members too.'],
    busy: ['잠시 뒤 다시 검색해 주세요.', 'Please try searching again in a moment.'],
    empty: ['아직 볼 사진이 없어요.', 'No photos to explore yet.'], tagEmpty: ['이 태그가 달린 게시물이 없어요.', 'No posts with this tag yet.'],
    view: ['게시물 보기', 'View post'], many: ['사진 여러 장', 'Multiple photos'], video: ['영상', 'Video'], photos: ['사진 격자', 'Photo grid']
  });
  L.i18n({
    ja: {
      'explore.title': '見つける', 'explore.search': '検索', 'explore.placeholder': 'ニックネーム・#タグを検索', 'explore.cancel': 'キャンセル', 'explore.clear': '検索語を消す',
      'explore.recent': '最近の検索', 'explore.clearAll': 'すべて消す', 'explore.removeRecent': '最近の検索から{q}を消す', 'explore.hint': 'ニックネームか#タグで探せます。',
      'explore.accounts': 'アカウント', 'explore.tags': 'タグ', 'explore.posts': '投稿{n}件', 'explore.none': '「{q}」の検索結果はありません。',
      'explore.loginUsers': 'ログインすると会員も探せます。', 'explore.busy': 'しばらくしてからもう一度検索してください。',
      'explore.empty': 'まだ見られる写真がありません。', 'explore.tagEmpty': 'このタグの投稿はまだありません。', 'explore.view': '投稿を見る', 'explore.many': '複数の写真', 'explore.video': '動画', 'explore.photos': '写真グリッド'
    },
    zh: {
      'explore.title': '发现', 'explore.search': '搜索', 'explore.placeholder': '搜索昵称或 #标签', 'explore.cancel': '取消', 'explore.clear': '清除搜索词',
      'explore.recent': '最近搜索', 'explore.clearAll': '全部清除', 'explore.removeRecent': '从最近搜索中删除 {q}', 'explore.hint': '可以用昵称或 #标签搜索。',
      'explore.accounts': '账号', 'explore.tags': '标签', 'explore.posts': '{n} 条帖子', 'explore.none': '没有找到“{q}”的结果。',
      'explore.loginUsers': '登录后还可以搜索会员。', 'explore.busy': '请稍后再搜索。',
      'explore.empty': '还没有可以浏览的照片。', 'explore.tagEmpty': '还没有带这个标签的帖子。', 'explore.view': '查看帖子', 'explore.many': '多张照片', 'explore.video': '视频', 'explore.photos': '照片网格'
    }
  });

  const RECENT = 'gl_explore_recent', RECENT_MAX = 5, WAIT = 250, QUERY_MAX = 30, STEP = 2;
  const TAG = /^[가-힣A-Za-z0-9_]{1,30}$/;
  const icon = (name, opt) => L.icon(name, opt);
  const sources = Object.create(null);     // 이어 보기가 쓰는 격자 목록: key → { state, load(before) }
  let cleanup = null;
  const soon = () => '<p class="ex-note" role="status">' + L.esc(L.t('core.soon')) + '</p>';
  // 뒤로 돌아왔을 때 보던 자리: 틀의 L.restoreScroll(keepScroll 화면)이 있으면 그것으로, 없으면 맡겨 둔 값으로.
  function restore(saved, dead) {
    if (!saved) return;
    if (typeof L.restoreScroll === 'function') return void L.restoreScroll();
    if (saved.scroll) requestAnimationFrame(() => { if (!dead()) window.scrollTo(0, saved.scroll); });
  }

  function readRecent() {
    try {
      const list = JSON.parse(localStorage.getItem(RECENT));
      return Array.isArray(list) ? list.filter(one => one && ['u', 't', 'q'].includes(one.k) && typeof one.v === 'string' && one.v).slice(0, RECENT_MAX) : [];
    } catch { return []; }
  }
  function writeRecent(list) {
    try { if (list.length) localStorage.setItem(RECENT, JSON.stringify(list.slice(0, RECENT_MAX))); else localStorage.removeItem(RECENT); } catch { /* 저장 못 하면 건너뜀 */ }
  }
  function remember(k, v) {
    v = String(v || '').trim().slice(0, QUERY_MAX);
    if (!v) return;
    writeRecent([{ k, v }, ...readRecent().filter(one => !(one.k === k && one.v.toLowerCase() === v.toLowerCase()))]);
  }

  // ── 3칸 사진 격자 ── state = { posts, next, done } (뒤로 돌아오면 그대로 다시 그림) · load(before) → { posts, before } | { error }
  function mountGrid(host, state, load, { key, base, emptyText, onPage }) {
    host.innerHTML = '<div class="ex-grid" data-grid></div><div class="ex-page" data-page aria-live="polite"></div><div class="ex-sentinel" data-sentinel aria-hidden="true"></div>';
    const grid = host.querySelector('[data-grid]'), page = host.querySelector('[data-page]'), sentinel = host.querySelector('[data-sentinel]');
    const ids = new Set(), trail = typeof L.feedCards === 'function';
    let busy = false, dead = false, version = 0, stop;
    sources[key] = { state, load };
    const cell = post => '<a class="ex-cell" data-post="' + L.esc(post.id) + '" href="#/' + (trail ? base + '/p/' : 'feed/') + encodeURIComponent(post.id) + '" aria-label="' + t('view') + '">' +
      '<img src="' + L.esc(U.image(post.thumb)) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' +
      (post.hasVideo ? '<span class="ex-mark" role="img" aria-label="' + t('video') + '">' + icon('play', { size: 18, fill: true }) + '</span>'
        : post.count > 1 ? '<span class="ex-mark" role="img" aria-label="' + t('many') + '">' + icon('layers', { size: 18 }) + '</span>' : '') + '</a>';
    const usable = post => post && post.id != null && U.image(post.thumb) && !ids.has(post.id);
    function append(posts) {
      const fresh = posts.filter(usable);
      fresh.forEach(post => ids.add(post.id));
      grid.insertAdjacentHTML('beforeend', fresh.map(cell).join(''));
      return fresh;
    }
    function watch() {
      stop?.();
      stop = state.done ? null : L.more(sentinel, () => more());
    }
    async function more(reset) {
      if (busy || dead || (!reset && state.done)) return;
      busy = true;
      const request = ++version;
      if (!state.posts.length) page.innerHTML = skeleton();
      const result = await load(reset ? undefined : state.next ?? undefined);
      busy = false;
      if (dead || request !== version) return;
      if (!Array.isArray(result?.posts)) {
        state.done = true;
        stop?.();
        if (state.posts.length && !reset) { page.innerHTML = ''; return; }
        page.innerHTML = result?.error === 'action' || result?.error === 'closed' ? soon()
          : '<p class="ex-note" role="status">' + L.esc(L.t('ui.error')) + '</p><button type="button" class="btn ex-retry" data-retry>' + L.esc(L.t('ui.retry')) + '</button>';
        const retry = page.querySelector('[data-retry]');
        if (retry) retry.onclick = () => { state.done = false; more(true); };
        return;
      }
      if (reset) { state.posts.length = 0; ids.clear(); grid.innerHTML = ''; }
      state.posts.push(...append(result.posts));
      state.next = result.before ?? null;
      state.done = !state.next || !result.posts.length;
      onPage?.(result);
      page.innerHTML = state.posts.length ? '' : '<div class="ex-empty">' + icon('image', { size: 44 }) + '<p>' + emptyText + '</p></div>';
      watch();
    }
    if (state.posts.length) {
      const kept = state.posts.splice(0);
      state.posts.push(...append(kept));
      watch();
    } else void more(true);
    return { refresh: () => { state.done = false; return more(true); }, stop() { dead = true; stop?.(); } };
  }
  const skeleton = () => '<div class="ex-grid ex-skeleton" role="status"><span class="sr-only">' + U.t('loading') + '</span>' + '<i></i>'.repeat(12) + '</div>';

  // ── #/explore ──
  function renderExplore(root, params) {
    const sub = /^p\/(.+)$/.exec(params.id || '');
    if (sub) return renderTrail(root, { id: sub[1], key: 'explore', title: L.t('explore.title'), back: 'explore' });
    const saved = L.unstash('explore');
    const state = saved || { q: '', searching: false, results: null, posts: [], next: undefined, done: false, scroll: 0 };
    L.stash('explore', state);
    root.innerHTML = '<section class="ex" data-explore>' + L.bar({
      back: 'feed',
      titleHtml: '<h1 class="sr-only">' + t('title') + '</h1><form class="ex-search" role="search" data-ex-form><label class="ex-field">' + icon('search', { size: 18 }) +
        '<span class="sr-only">' + t('search') + '</span><input type="search" name="q" maxlength="' + QUERY_MAX + '" enterkeyhint="search" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="' + t('placeholder') + '"></label>' +
        '<button type="button" class="ex-clear" data-ex-clear aria-label="' + t('clear') + '" hidden>' + icon('close', { size: 16 }) + '</button></form>',
      right: '<button type="button" class="ex-cancel" data-ex-cancel hidden>' + t('cancel') + '</button>'
    }) + '<div class="ex-find" data-ex-find hidden></div><div data-ex-body></div></section>';
    const form = root.querySelector('[data-ex-form]'), input = form.elements.q, clear = root.querySelector('[data-ex-clear]'), cancel = root.querySelector('[data-ex-cancel]');
    const find = root.querySelector('[data-ex-find]'), body = root.querySelector('[data-ex-body]');
    let timer = 0, version = 0, dead = false;
    input.value = state.q;

    const grid = mountGrid(body, state, before => L.api('explore', before ? { before } : {}), { key: 'explore', base: 'explore', emptyText: t('empty') });
    const stopPull = L.pull(body, () => grid.refresh());

    function paintMode() {
      find.hidden = !state.searching;
      body.hidden = state.searching;
      cancel.hidden = !state.searching;
      clear.hidden = !state.q;
    }
    const userRow = person => typeof L.userRow === 'function' ? L.userRow(person, { follow: true })
      : '<a class="ex-row" href="#/u/' + encodeURIComponent(person.nick) + '">' + L.avatar(person, 44) + '<span class="ex-row-text"><strong>' + L.whoTag(person) +
        '</strong>' + (person.bio ? '<small>' + L.esc(String(person.bio).split(/\r?\n/)[0]) + '</small>' : '') + '</span></a>';
    const tagRow = row => '<a class="ex-row" href="#/tag/' + encodeURIComponent(row.tag) + '" data-ex-tag="' + L.esc(row.tag) + '"><span class="ex-hash" aria-hidden="true">#</span>' +
      '<span class="ex-row-text"><strong>#' + L.esc(row.tag) + '</strong><small>' + t('posts', { n: L.count(row.n) }) + '</small></span></a>';
    function paintFind() {
      if (!state.q) {
        const recent = readRecent();
        find.innerHTML = recent.length ? '<div class="ex-head"><h2>' + t('recent') + '</h2><button type="button" class="ex-link" data-recent-clear>' + t('clearAll') + '</button></div><ul class="ex-list" data-recent-list>' +
          recent.map((one, n) => {
            const label = one.k === 't' ? '#' + one.v : one.v;
            const lead = one.k === 'u' ? L.avatar({ nick: one.v }, 44) : '<span class="ex-hash" aria-hidden="true">' + (one.k === 't' ? '#' : icon('search', { size: 20 })) + '</span>';
            const main = one.k === 'q' ? '<button type="button" class="ex-row" data-recent="' + n + '">' + lead + '<span class="ex-row-text"><strong>' + L.esc(label) + '</strong></span></button>'
              : '<a class="ex-row" data-recent="' + n + '" href="#/' + (one.k === 'u' ? 'u/' : 'tag/') + encodeURIComponent(one.v) + '">' + lead + '<span class="ex-row-text"><strong>' + L.esc(label) + '</strong></span></a>';
            return '<li class="ex-recent">' + main + '<button type="button" class="ex-x" data-recent-del="' + n + '" aria-label="' + t('removeRecent', { q: label }) + '">' + icon('close', { size: 16 }) + '</button></li>';
          }).join('') + '</ul>' : '<p class="ex-note">' + t('hint') + '</p>';
        return;
      }
      const results = state.results;
      if (!results || results.q !== state.q) {
        find.innerHTML = '<p class="ex-note" role="status" data-ex-loading>' + U.t('loading') + '</p>';
        return;
      }
      if (results.error) {
        find.innerHTML = results.error === 'action' || results.error === 'closed' ? soon() : '<p class="ex-note" role="status">' + (results.error === 'busy' ? t('busy') : U.t('error')) + '</p>';
        return;
      }
      const users = results.users, tags = results.tags;
      find.innerHTML = (users.length ? '<div class="ex-head"><h2>' + t('accounts') + '</h2></div><div class="ex-list" data-ex-users>' + users.map(userRow).join('') + '</div>' : '') +
        (tags.length ? '<div class="ex-head"><h2>' + t('tags') + '</h2></div><div class="ex-list" data-ex-tags>' + tags.map(tagRow).join('') + '</div>' : '') +
        (!users.length && !tags.length ? '<p class="ex-note" role="status" data-ex-none>' + t('none', { q: state.q }) + '</p>' : '') +
        (!L.me && !state.q.startsWith('#') ? '<p class="ex-note" data-ex-login>' + t('loginUsers') + '</p>' : '');
    }
    async function search() {
      clearTimeout(timer);
      const q = state.q, request = ++version;
      if (!q) return paintFind();
      if (!q.replace(/^[@#]/, '')) { state.results = { q, users: [], tags: [] }; return paintFind(); }
      paintFind();
      const result = await L.api('search', { q });
      if (dead || request !== version || q !== state.q) return;
      state.results = result.error ? { q, error: result.error === 'q' ? '' : result.error, users: [], tags: [] }
        : { q, users: Array.isArray(result.users) ? result.users.filter(one => one?.nick) : [], tags: Array.isArray(result.tags) ? result.tags.filter(one => one?.tag) : [] };
      paintFind();
    }
    function setQuery(value, now) {
      state.q = String(value || '').trim().slice(0, QUERY_MAX);
      paintMode();
      clearTimeout(timer);
      if (!state.q) { version++; state.results = null; return paintFind(); }
      paintFind();
      if (now) void search(); else timer = setTimeout(search, WAIT);
    }

    input.addEventListener('focus', () => {
      if (state.searching) return;
      state.searching = true;
      paintMode();
      paintFind();
      window.scrollTo(0, 0);
    });
    input.addEventListener('input', () => setQuery(input.value));
    form.addEventListener('submit', event => {
      event.preventDefault();
      setQuery(input.value, true);
      if (state.q) remember('q', state.q);
      input.blur();
    });
    clear.onclick = () => { input.value = ''; setQuery(''); input.focus(); };
    cancel.onclick = () => {
      state.searching = false;
      input.value = '';
      setQuery('');
      input.blur();
      paintMode();
    };
    find.addEventListener('click', event => {
      const hit = name => event.target.closest('[' + name + ']');
      const del = hit('data-recent-del'), pick = hit('data-recent');
      if (hit('data-recent-clear')) { writeRecent([]); return paintFind(); }
      if (del) { const list = readRecent(); list.splice(Number(del.dataset.recentDel), 1); writeRecent(list); paintFind(); return void (find.querySelector('[data-recent], [data-recent-del]') || input).focus(); }
      if (pick) {
        const one = readRecent()[Number(pick.dataset.recent)];
        if (!one) return;
        remember(one.k, one.v);
        if (one.k === 'q') { input.value = one.v; setQuery(one.v, true); }
        return;
      }
      const tag = hit('data-ex-tag'), user = event.target.closest('a[href^="#/u/"]');
      if (tag) remember('t', tag.dataset.exTag);
      else if (user) { try { remember('u', decodeURIComponent(user.getAttribute('href').slice(4))); } catch { /* 이상한 주소는 기억하지 않음 */ } }
    });

    paintMode();
    if (state.searching) { paintFind(); if (state.q && state.results?.q !== state.q) void search(); }
    restore(saved, () => dead);
    cleanup = () => { dead = true; clearTimeout(timer); state.scroll = window.scrollY; grid.stop(); stopPull(); };
  }

  // ── #/tag/<태그> ──
  function renderTag(root, params) {
    let raw = String(params.id || '');
    const sub = /^(.+)\/p\/([^/]+)$/.exec(raw);
    if (sub) raw = sub[1];
    const tag = raw.trim().replace(/^#/, '').toLowerCase(), key = 'tag:' + tag, base = 'tag/' + encodeURIComponent(tag);
    if (sub) return renderTrail(root, { id: sub[2], key, title: '#' + tag, back: base });
    const saved = L.unstash('tag');
    const state = saved?.tag === tag ? saved : { tag, n: null, posts: [], next: undefined, done: false, scroll: 0 };
    L.stash('tag', state);
    root.innerHTML = '<section class="ex" data-tag-screen>' + L.bar({ title: '#' + tag, back: 'explore' }) +
      '<p class="ex-count" data-tag-count aria-live="polite"></p><div data-ex-body></div></section>';
    const count = root.querySelector('[data-tag-count]'), body = root.querySelector('[data-ex-body]');
    const paintCount = () => { count.textContent = state.n == null ? '' : L.t('explore.posts', { n: L.count(state.n) }); };
    paintCount();
    let dead = false;
    if (!TAG.test(tag)) {
      body.innerHTML = '<div class="ex-empty">' + icon('image', { size: 44 }) + '<p>' + t('tagEmpty') + '</p></div>';
      cleanup = null;
      return;
    }
    const grid = mountGrid(body, state, before => L.api('tag_posts', before ? { tag, before } : { tag }), { key, base, emptyText: t('tagEmpty'),
      onPage(result) { if (typeof result.n === 'number') { state.n = result.n; paintCount(); } } });
    const stopPull = L.pull(body, () => grid.refresh());
    restore(saved?.tag === tag ? saved : null, () => dead);
    cleanup = () => { dead = true; state.scroll = window.scrollY; grid.stop(); stopPull(); };
  }

  // ── 이어 보기: 격자에서 누른 글부터 아래로 (피드 카드 그대로) ──
  function renderTrail(root, { id, key, title, back }) {
    if (typeof L.feedCards !== 'function') { location.replace('#/feed/' + encodeURIComponent(id)); return; }
    const source = sources[key];
    const saved = L.unstash('explore-trail');
    const state = saved?.key === key && saved.id === id ? saved : { key, id, posts: [], at: 0, done: false, scroll: 0 };
    L.stash('explore-trail', state);
    root.innerHTML = '<section class="ex ex-trail" data-explore-trail>' + L.bar({ title, back }) +
      '<div data-posts></div><div class="ex-page" data-page aria-live="polite"></div><div class="ex-sentinel" data-sentinel aria-hidden="true"></div></section>';
    const list = root.querySelector('[data-posts]'), page = root.querySelector('[data-page]'), sentinel = root.querySelector('[data-sentinel]');
    let dead = false, busy = false, stop;
    const queue = () => {
      const all = source ? source.state.posts.map(post => post.id) : [];
      const start = all.indexOf(id);
      return start >= 0 ? all.slice(start) : [id];
    };
    const options = { onGone(gone) {
      state.posts = state.posts.filter(post => post.id !== gone);
      if (source) { const at = source.state.posts.findIndex(post => post.id === gone); if (at >= 0) source.state.posts.splice(at, 1); }
      if (!list.childElementCount && state.done) L.back(back);
    } };
    async function extend() {       // 격자의 다음 쪽을 받아 이어 볼 글을 늘린다
      if (!source || source.state.done) return false;
      const result = await source.load(source.state.next ?? undefined);
      if (!Array.isArray(result?.posts)) { source.state.done = true; return false; }
      const known = new Set(source.state.posts.map(post => post.id));
      source.state.posts.push(...result.posts.filter(post => post && post.id != null && U.image(post.thumb) && !known.has(post.id)));
      source.state.next = result.before ?? null;
      source.state.done = !source.state.next || !result.posts.length;
      return true;
    }
    async function next() {
      if (busy || dead || state.done) return;
      busy = true;
      let added = 0;
      if (!state.posts.length) page.innerHTML = '<p class="ex-note" role="status">' + U.t('loading') + '</p>';
      while (added < STEP && !dead) {
        let pid = queue()[state.at];
        if (pid == null) {
          if (!await extend() || dead) { state.done = true; break; }
          pid = queue()[state.at];
          if (pid == null) continue;
        }
        state.at++;
        const result = await L.api('post_get', { id: pid });
        if (dead) return;
        if (!result.post) continue;        // 그 사이에 지워졌거나 볼 수 없는 글은 건너뜀
        state.posts.push(result.post);
        L.feedCards(list, [result.post], options);
        added++;
      }
      busy = false;
      if (dead) return;
      page.innerHTML = state.posts.length ? '' : '<p class="ex-note" role="status">' + U.t('empty') + '</p>';
      stop?.();
      stop = state.done ? null : L.more(sentinel, next);
    }
    if (state.posts.length) {
      L.feedCards(list, state.posts, options);
      restore(saved, () => dead);
      stop = state.done ? null : L.more(sentinel, next);
    } else void next();
    cleanup = () => { dead = true; state.scroll = window.scrollY; stop?.(); };
  }

  const leave = () => { try { cleanup?.(); } catch (error) { console.error(error); } cleanup = null; };
  L.screen('explore', { nav: 'feed', auth: false, bar: 'own', keepScroll: true, title: 'explore.title', render: renderExplore, leave });
  L.screen('tag', { nav: 'feed', auth: false, bar: 'own', keepScroll: true, title: 'explore.tags', render: renderTag, leave });
})();
