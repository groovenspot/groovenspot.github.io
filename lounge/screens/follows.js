/* 팔로워·팔로잉·추천·요청 목록 (4차 · SPEC4 2장·5장) — 주인: 프로필 작업창(B).
   내보내는 것: L.userRow(person, opt) · L.followButton(person, opt) · L.profileFollows */
(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('follows', {
    mutuals: ['함께 아는 친구', 'Mutual connections'],
    mutualCount: ['함께 아는 친구 {n}명', '{n} mutual connections'],
    requests: ['팔로우 요청', 'Follow requests'],
    requestCount: ['팔로우 요청 {n}건', 'Follow requests ({n})'],
    suggest: ['추천 계정', 'Suggested accounts'],
    search: ['계정 검색', 'Search accounts'],
    more: ['더 보기', 'Load more'],
    accept: ['수락', 'Accept'],
    decline: ['삭제', 'Delete request'],
    remove: ['팔로워 삭제', 'Remove follower'],
    hide: ['추천 숨기기', 'Hide suggestion'],
    floor: ['같은 층을 좋아해요', 'Likes the same floor'],
    restricted: ['이 팔로우 목록을 볼 수 없어요.', 'You can’t view this follow list.'],
    limit: ['오늘 팔로우할 수 있는 횟수를 다 썼어요.', 'You’ve reached today’s follow limit.'],
    requested: ['요청됨', 'Requested'],
    followBack: ['맞팔로우', 'Follow back']
  });
  const w = U.words('follows4', {
    find: ['검색', 'Search'],
    removeShort: ['삭제', 'Remove'],
    removeAsk: ['팔로워를 삭제할까요?', 'Remove this follower?'],
    removeBody: ['{nick}님에게는 알리지 않아요.', 'We won’t tell {nick} they were removed.'],
    cancelRequest: ['팔로우 요청 취소', 'Cancel follow request'],
    by: ['{a}님이 팔로우합니다', 'Followed by {a}'],
    fresh: ['새로 가입했어요', 'New to the lounge'],
    noMatch: ['찾는 계정이 없어요', 'No accounts found'],
    none: ['아직 아무도 없어요', 'No one here yet']
  });
  L.i18n({
    ja: { 'follows4.find': '検索', 'follows4.removeShort': '削除', 'follows4.removeAsk': 'このフォロワーを削除しますか？',
      'follows4.removeBody': '{nick}さんには通知されません。', 'follows4.cancelRequest': 'フォローリクエストを取り消す',
      'follows4.by': '{a}さんがフォロー中', 'follows4.fresh': '新しく参加しました', 'follows4.noMatch': 'アカウントが見つかりません',
      'follows4.none': 'まだ誰もいません' },
    zh: { 'follows4.find': '搜索', 'follows4.removeShort': '移除', 'follows4.removeAsk': '要移除这位粉丝吗？',
      'follows4.removeBody': '不会通知 {nick}。', 'follows4.cancelRequest': '取消关注请求',
      'follows4.by': '{a} 已关注', 'follows4.fresh': '新加入', 'follows4.noMatch': '没有找到账号', 'follows4.none': '这里还没有人' }
  });
  const esc = L.esc;
  const profilePath = nick => '#/u/' + encodeURIComponent(nick);
  const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

  function avatar({ nick, photo }) {
    const src = U.image(photo);
    return src ? '<img class="shell-avatar" src="' + esc(src) + '" alt="">' :
      '<span class="shell-avatar" aria-hidden="true">' + esc(Array.from(nick || '')[0] || 'G') + '</span>';
  }

  function fail(result) {
    if (result?.error === 'follow_limit') L.toast(L.t('follows.limit'));
    else U.error(result);
  }

  // ── 팔로우 버튼 (SPEC4 2장) ── person = { nick, following, requested, me, followsMe } 또는 { nick, state }
  //  HTML 을 돌려준다. 누르면 서버 호출 뒤 같은 사람의 버튼이 모두 바뀌고 'lounge:follow' 이벤트(detail {nick, prev, state, result})가 버튼에서 올라간다.
  //  opt: { caret: '팔로잉 ▾' 화살표, cls: 덧붙일 class, attrs: 덧붙일 속성 }
  const stateOf = person => ['following', 'requested', 'none'].includes(person?.state) ? person.state
    : person?.requested ? 'requested' : person?.following === true ? 'following' : 'none';
  const followText = (state, back) => L.t(state === 'following' ? 'user.following' : state === 'requested' ? 'follows.requested'
    : back ? 'follows.followBack' : 'user.follow');
  const followInner = (state, back, caret) => esc(followText(state, back)) + (caret && state === 'following' ? L.icon('down', { size: 14 }) : '');

  function followButton(person, opt = {}) {
    if (!person?.nick || person.me === true || person.self === true || same(L.me?.nick, person.nick)) return '';
    const state = stateOf(person), back = person.followsMe === true;
    return '<button type="button" class="pf-btn pf-follow' + (state === 'none' ? ' is-hot' : '') + (opt.cls ? ' ' + opt.cls : '') +
      '" data-ui-follow="' + esc(person.nick) + '" data-state="' + state + '"' + (back ? ' data-back' : '') + (opt.caret ? ' data-caret' : '') +
      ' aria-pressed="' + (state === 'following') + '"' + (opt.attrs ? ' ' + opt.attrs : '') + '><span class="pf-btn-in">' +
      followInner(state, back, opt.caret) + '</span></button>';
  }

  function paintFollow(nick, state) {
    for (const button of document.querySelectorAll('[data-ui-follow]')) {
      if (!same(button.dataset.uiFollow, nick)) continue;
      button.dataset.state = state;
      button.classList.toggle('is-hot', state === 'none');
      button.setAttribute('aria-pressed', String(state === 'following'));
      button.querySelector('.pf-btn-in').innerHTML = followInner(state, button.hasAttribute('data-back'), button.hasAttribute('data-caret'));
    }
  }

  async function changeFollow(button, action) {
    const nick = button.dataset.uiFollow, prev = button.dataset.state;
    if (button.disabled) return;
    button.disabled = true;
    const result = await L.api(action, { nick });
    button.disabled = false;
    if (result.error) { fail(result); return; }
    const state = action !== 'follow' ? 'none' : ['following', 'requested'].includes(result.state) ? result.state
      : result.following === false ? 'none' : 'following';
    paintFollow(nick, state);
    (button.isConnected ? button : document).dispatchEvent(new CustomEvent('lounge:follow',
      { bubbles: true, detail: { nick, prev, state, result } }));
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-ui-follow]');
    if (!button) return;
    event.preventDefault();
    if (button.disabled || L.needLogin()) return;
    const state = button.dataset.state;
    // 팔로잉 → 바로 끊지 않고 메뉴에서 한 번 더 고른다 (P15)
    if (state === 'following') {
      L.menu([{ label: L.t('user.unfollow'), danger: true, on: () => changeFollow(button, 'unfollow') }], { title: button.dataset.uiFollow });
      return;
    }
    void changeFollow(button, state === 'requested' && L.open('follow2') ? 'follow_cancel' : 'follow');
  });

  // ── 사람 한 줄 (SPEC4 2장) ── 좋아요 목록·검색·팔로워 목록 공용. HTML 을 돌려준다.
  //  opt: { follow: false 면 버튼 없음, sub: 둘째 줄 HTML(없으면 소개 첫 줄), extra: 오른쪽에 덧붙일 HTML, ring: 스토리 테두리 }
  function userRow(person, opt = {}) {
    if (!person?.nick) return '';
    const sub = opt.sub != null ? opt.sub : person.bio ? esc(String(person.bio).split(/\r?\n/)[0]) : '';
    return '<div class="pf-row" data-user-row="' + esc(person.nick) + '"><a class="pf-person profile3-person" href="' + esc(profilePath(person.nick)) + '">' +
      L.avatar(person, 44, { ring: opt.ring === true }) + '<span class="pf-person-text"><strong>' + L.whoTag(person) + '</strong>' +
      (sub ? '<small>' + sub + '</small>' : '') + '</span></a>' +
      (opt.follow === false ? '' : followButton(person, { cls: 'pf-btn-small' })) + (opt.extra || '') + '</div>';
  }
  L.userRow = userRow;
  L.followButton = followButton;

  async function action(button, name, nick, update) {
    if (button.disabled || L.needLogin()) return;
    button.disabled = true;
    const result = await L.api(name, { nick });
    if (!button.isConnected) return;
    button.disabled = false;
    if (result.error) fail(result);
    else update();
  }

  const empty = (icon, text) => '<div class="pf-empty"><span class="pf-empty-icon" aria-hidden="true">' + L.icon(icon, { size: 30 }) +
    '</span><p>' + text + '</p></div>';

  async function enabled() {
    return (await L.api('config')).open?.follow2 === true;
  }

  async function requests(root, embedded = false) {
    const member = L.me;
    if (!member) return;
    let view = root;
    if (!embedded) {
      root.innerHTML = L.bar({ back: 'me', title: L.t('follows.requests') }) + '<div class="pf pf-list" data-requests></div>';
      view = root.querySelector('[data-requests]');
    }
    if (!await enabled() || !root.isConnected || L.me !== member) {
      if (!embedded && root.isConnected) view.innerHTML = U.status('soon');
      return;
    }
    if (embedded) {
      const row = document.createElement('div');
      row.className = 'pf';
      root.prepend(row);
      view = row;
    }
    view.innerHTML = U.status('loading', true);
    const result = await L.api('follow_requests');
    if (!view.isConnected || L.me !== member) return;
    if (result.error) {
      if (!embedded) view.innerHTML = U.status('error');
      else view.remove();
      return;
    }
    const rows = (result.requests || []).filter(row => row?.nick);
    view.innerHTML = embedded
      ? '<details class="profile3-requests pf-requests"><summary>' + t('requestCount', { n: rows.length }) + '</summary><div class="pf-rows"></div></details>'
      : '<h2 class="pf-list-title" data-request-count>' + t('requestCount', { n: rows.length }) + '</h2><div class="pf-rows"></div>';
    const panel = view.querySelector('.pf-rows');
    const counter = view.querySelector(embedded ? 'summary' : '[data-request-count]');
    const none = () => { panel.innerHTML = embedded ? U.status('empty') : empty('userPlus', w('none')); };
    if (!rows.length) none();
    for (const row of rows) {
      panel.insertAdjacentHTML('beforeend', userRow(row, { follow: false,
        extra: '<button type="button" class="pf-btn pf-btn-small is-hot" data-accept><span class="pf-btn-in">' + t('accept') + '</span></button>' +
          '<button type="button" class="pf-btn pf-btn-small" data-decline><span class="pf-btn-in">' + t('decline') + '</span></button>' }));
      const item = panel.lastElementChild;
      const remove = () => {
        rows.splice(rows.indexOf(row), 1);
        const next = item.nextElementSibling || item.previousElementSibling;
        item.remove();
        counter.textContent = L.t('follows.requestCount', { n: rows.length });
        if (!rows.length) none();
        (next?.querySelector('a') || (embedded ? counter : null))?.focus();
      };
      for (const [attr, name] of [['accept', 'follow_accept'], ['decline', 'follow_decline']]) {
        item.querySelector('[data-' + attr + ']').onclick = event => {
          if (item.hasAttribute('aria-busy')) return;
          item.setAttribute('aria-busy', 'true');
          void action(event.currentTarget, name, row.nick, remove).finally(() => item.removeAttribute('aria-busy'));
        };
      }
    }
  }

  // 팔로워·팔로잉은 한 화면의 탭 2개 (P33). 함께 아는 친구·추천은 탭 없이 같은 목록 모양.
  function listScreen(name, titleKey) {
    return async (root, { id } = {}) => {
      const nick = id || L.me.nick;
      const mine = same(nick, L.me.nick);
      const tabbed = name === 'followers' || name === 'following';
      const stashKey = 'follows:' + name + ':' + nick.toLowerCase();
      const kept = L.profileKept ? L.profileKept(stashKey) : null;
      const classicLists = tabbed && L.open('l26_follow_counts');
      const myBack = classicLists && L.open('l26_shell') ? 'l26_my' : 'me';
      root.innerHTML = L.bar({ back: name === 'suggest' || mine ? myBack : 'u/' + nick,
        title: tabbed || name === 'mutuals' ? nick : L.t(titleKey), sub: name === 'mutuals' ? t('mutuals') : '' }) +
        '<div class="pf pf-list" data-follow-list>' + U.status('loading', true) + '</div>';
      const view = root.querySelector('[data-follow-list]');
      const follow2 = await enabled();
      if (!follow2 && !classicLists) { if (view.isConnected) view.innerHTML = U.status('soon'); return; }
      if (!view.isConnected || !L.me) return;
      const tabs = tabbed ? ['followers', 'following'] : [name];
      const state = kept?.state || { tab: name, query: '', lists: Object.fromEntries(tabs.map(tab =>
        [tab, { rows: new Map(), cursor: null, loaded: false, n: null, error: '' }])) };
      view.innerHTML = (tabbed ? '<div class="pf-ltabs" role="tablist">' + tabs.map(tab =>
        '<button type="button" role="tab" data-list-tab="' + tab + '" aria-selected="false"><span>' + esc(L.t('user.' + tab)) +
        '</span> <b data-tab-count></b></button>').join('') + '</div>' : '') +
        (name === 'suggest' ? '' : '<label class="pf-search">' + L.icon('search', { size: 18 }) + '<input type="search" maxlength="30" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="' +
          w('find') + '" aria-label="' + t('search') + '"></label>') +
        '<div data-result role="status"></div><div data-list class="pf-rows"></div><div class="pf-more-row" data-more hidden><i></i></div>';
      const input = view.querySelector('input[type=search]');
      const list = view.querySelector('[data-list]');
      const info = view.querySelector('[data-result]');
      const more = view.querySelector('[data-more]');
      let generation = 0, timer = 0;
      const current = () => state.lists[state.tab];
      const remote = () => state.tab === 'followers' || state.tab === 'following';
      const ownFollowers = () => state.tab === 'followers' && mine;

      function extras(row) {
        if (!follow2 || (classicLists && L.isPreview())) return '';
        if (ownFollowers()) return (stateOf(row) === 'none' ? followButton(row, { cls: 'pf-btn-small' }) : '') +
          '<button type="button" class="pf-btn pf-btn-small" data-remove aria-label="' + t('remove') + '"><span class="pf-btn-in">' + w('removeShort') + '</span></button>';
        if (state.tab === 'suggest') return followButton(row, { cls: 'pf-btn-small' }) +
          '<button type="button" class="pf-x" data-remove aria-label="' + t('hide') + '">' + L.icon('close', { size: 16 }) + '</button>';
        return followButton(row, { cls: 'pf-btn-small' });
      }
      function subline(row) {
        if (state.tab !== 'suggest') return undefined;
        return row.reason === 'mutual' && typeof row.by === 'string' && row.by ? w('by', { a: row.by })
          : row.reason === 'mutual' && Number(row.mutual) > 0 ? t('mutualCount', { n: Number(row.mutual) })
            : row.reason === 'floor' ? t('floor') : row.reason === 'new' ? w('fresh') : undefined;
      }

      function paint() {
        const data = current(), needle = state.query.toLowerCase();
        for (const tab of view.querySelectorAll('[data-list-tab]')) {
          const on = tab.dataset.listTab === state.tab, n = state.lists[tab.dataset.listTab].n;
          tab.setAttribute('aria-selected', String(on));
          tab.querySelector('[data-tab-count]').textContent = Number.isFinite(n) && !state.query ? L.count(n) : '';
        }
        list.replaceChildren();
        for (const row of data.rows.values()) {
          if (needle && !row.nick.toLowerCase().includes(needle)) continue;   // 서버가 q 를 몰라도 불러온 것 안에서 거른다
          list.insertAdjacentHTML('beforeend', userRow(row, { follow: false, sub: subline(row), extra: extras(row) }));
          const item = list.lastElementChild, button = item.querySelector('[data-remove]');
          if (button) button.onclick = async event => {
            const target = event.currentTarget;
            if (ownFollowers() && !await L.confirm(L.t('follows4.removeAsk'), { ok: L.t('follows4.removeShort'), danger: true,
              body: L.t('follows4.removeBody', { nick: row.nick }) })) return;   // 확인 뒤에만 삭제 (P37)
            void action(target, ownFollowers() ? 'follower_remove' : 'suggest_hide', row.nick, () => {
              data.rows.delete(row.nick.toLowerCase());
              if (Number.isFinite(data.n)) data.n = Math.max(0, data.n - 1);
              paint();
            });
          };
        }
        more.hidden = data.cursor === null;
        info.innerHTML = data.error ? '<p class="pf-list-status">' + esc(data.error) + '</p>'
          : !data.loaded ? U.status('loading', true)
            : list.children.length ? '' : state.query ? empty('search', w('noMatch')) : empty('user', L.t('screens.empty'));
      }

      async function load(append = false) {
        const tab = state.tab, data = current();
        if (append && (data.pending || data.cursor == null)) return;
        const version = ++generation;
        const before = append ? data.cursor : null;
        data.pending = true;
        if (!append) { data.rows.clear(); data.cursor = null; data.loaded = false; data.error = ''; paint(); }
        const args = tab === 'suggest' ? {} : { nick, ...(remote() && state.query ? { q: state.query } : {}),
          ...(before !== null ? { before } : {}) };
        const result = await L.api(tab, args);
        data.pending = false;
        if (!view.isConnected || version !== generation) return;
        data.loaded = true;
        if (result.error) {
          data.error = L.t(result.error === 'forbidden' || result.error === 'not_found' ? 'follows.restricted' : 'screens.error');
          data.cursor = null;
          if (result.error === 'auth') L.needLogin();
          paint();
          return;
        }
        const rows = result.list || (classicLists && remote() && (result.people || result[tab]?.map(nick => ({ nick })))) || [];
        for (const row of rows) if (row?.nick) data.rows.set(row.nick.toLowerCase(), row);
        if (!state.query && Number.isFinite(result.n)) data.n = result.n;
        data.cursor = remote() && result.before != null && JSON.stringify(result.before) !== JSON.stringify(before) ? result.before : null;
        paint();
        // 한 쪽이 짧아 '더 불러오기' 표시가 계속 화면 안에 있으면 관찰자가 다시 알려 주지 않으므로 직접 이어서 부른다.
        setTimeout(() => {
          if (view.isConnected && state.tab === tab && data.cursor != null && more.getBoundingClientRect().top < innerHeight + 400) void load(true);
        }, 0);
      }

      for (const tab of view.querySelectorAll('[data-list-tab]')) tab.onclick = () => {
        if (state.tab === tab.dataset.listTab) return;
        state.tab = tab.dataset.listTab;
        if (current().loaded && !current().stale) paint(); else { current().stale = false; void load(); }
      };
      if (input) {
        input.value = state.query;
        input.oninput = () => {   // 치는 대로 검색 (P34)
          clearTimeout(timer);
          timer = setTimeout(() => {
            const next = input.value.trim();
            if (next === state.query) return;
            state.query = next;
            for (const tab of tabs) if (tab !== state.tab) state.lists[tab].stale = true;
            if (remote()) void load(); else paint();
          }, 220);
        };
      }
      const stopMore = L.more(more, () => load(true));
      const keep = event => {
        if (event.target.closest('a[href^="#/"]') && L.stash) L.stash(stashKey, { state, y: window.scrollY });
      };
      view.addEventListener('click', keep, true);
      active = () => { stopMore(); clearTimeout(timer); };
      if (kept) {
        paint();
        requestAnimationFrame(() => window.scrollTo(0, kept.y || 0));
      } else await load();
    };
  }

  let active;
  for (const [name, title] of [['followers', 'user.followers'], ['following', 'user.following'],
    ['mutuals', 'follows.mutuals'], ['suggest', 'follows.suggest']]) {
    L.screen(name, { title, auth: true, nav: 'me', bar: 'own', keepScroll: true, render: listScreen(name, title),
      leave() { active?.(); active = null; } });
  }
  L.screen('requests', { title: 'follows.requests', auth: true, nav: 'me', bar: 'own', render(root) { return requests(root); } });
  L.profileFollows = { avatar, requests, fail, empty };
})();
