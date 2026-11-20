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
  const esc = L.esc;
  const profilePath = nick => '#/u/' + encodeURIComponent(nick);
  const person = row => '<a class="profile3-person" href="' + esc(profilePath(row.nick)) + '">' +
    avatar(row) + '<span><strong>' + esc(row.nick) + '</strong>' +
    (row.bio ? '<small class="muted shell-bio">' + esc(row.bio) + '</small>' : '') + '</span></a>';

  function avatar({ nick, photo }) {
    const src = U.image(photo);
    return src ? '<img class="shell-avatar" src="' + esc(src) + '" alt="">' :
      '<span class="shell-avatar" aria-hidden="true">' + esc(Array.from(nick || '')[0] || 'G') + '</span>';
  }

  function fail(result) {
    if (result?.error === 'follow_limit') L.toast(L.t('follows.limit'));
    else U.error(result);
  }

  async function action(button, name, nick, update) {
    if (button.disabled || L.needLogin()) return;
    button.disabled = true;
    const result = await L.api(name, { nick });
    if (!button.isConnected) return;
    button.disabled = false;
    if (result.error) fail(result);
    else update();
  }

  function notice(message) {
    return '<p class="muted" role="status">' + message + '</p>';
  }

  async function enabled() {
    return (await L.api('config')).open?.follow2 === true;
  }

  async function requests(root, embedded = false) {
    if (!L.me) return;
    if (!await enabled() || !root.isConnected || !L.me) {
      if (!embedded && root.isConnected) root.innerHTML = '<h1>' + t('requests') + '</h1>' + notice(U.t('soon'));
      return;
    }
    if (embedded) {
      const row = document.createElement('div');
      root.prepend(row);
      root = row;
    }
    root.innerHTML = U.status('loading', true);
    const result = await L.api('follow_requests');
    if (!root.isConnected || !L.me) return;
    if (result.error) {
      if (!embedded) root.innerHTML = U.status('error');
      else root.remove();
      return;
    }
    const rows = (result.requests || []).filter(row => row?.nick);
    function paint() {
      root.innerHTML = embedded
        ? '<details class="shell-card profile3-requests"><summary>' + t('requestCount', { n: rows.length }) + '</summary><div></div></details>'
        : '<section class="shell-card"><h1>' + t('requestCount', { n: rows.length }) + '</h1><div></div></section>';
      const panel = root.querySelector('div');
      if (!rows.length) panel.innerHTML = U.status('empty');
      for (const row of rows) {
        const item = document.createElement('div');
        item.className = 'profile3-list-row';
        item.innerHTML = person(row) + '<div class="shell-actions">' +
          U.button(t('accept'), 'data-accept', true) + U.button(t('decline'), 'data-decline') + '</div>';
        const remove = () => {
          rows.splice(rows.indexOf(row), 1);
          const next = item.nextElementSibling || item.previousElementSibling;
          item.remove();
          root.querySelector(embedded ? 'summary' : 'h1').textContent = L.t('follows.requestCount', { n: rows.length });
          if (!rows.length) panel.innerHTML = U.status('empty');
          (next?.querySelector('a') || root.querySelector('summary'))?.focus();
        };
        for (const [attr, name] of [['accept', 'follow_accept'], ['decline', 'follow_decline']]) {
          item.querySelector('[data-' + attr + ']').onclick = event => {
            if (item.hasAttribute('aria-busy')) return;
            item.setAttribute('aria-busy', 'true');
            void action(event.currentTarget, name, row.nick, remove).finally(() => item.removeAttribute('aria-busy'));
          };
        }
        panel.append(item);
      }
    }
    paint();
  }

  function listScreen(name, titleKey) {
    return async (root, { id } = {}) => {
      const title = esc(L.t(titleKey));
      const nick = id || L.me.nick;
      const view = U.mount(root, '<div class="shell-actions"><h1>' + title + '</h1>' +
        U.link(name === 'suggest' ? '#/me' : profilePath(nick), esc(L.t('user.title'))) + '</div>');
      if (!await enabled()) { if (view.isConnected) view.innerHTML = U.status('soon'); return; }
      if (!view.isConnected || !L.me) return;
      const remoteSearch = name === 'followers' || name === 'following';
      const ownFollowers = name === 'followers' && nick.toLowerCase() === L.me.nick.toLowerCase();
      view.innerHTML = '<form role="search" class="shell-actions profile3-search"><label class="sr-only" for="profile3-search">' +
        t('search') + '</label><input id="profile3-search" type="search" maxlength="60" placeholder="' + t('search') +
        '"><button type="submit" class="btn">' + t('search') + '</button></form><p data-result role="status"></p>' +
        '<ul data-list class="lounge-list shell-ledger"></ul>' + U.button(t('more'), 'data-more hidden');
      const form = view.querySelector('form');
      const input = form.querySelector('input');
      const list = view.querySelector('[data-list]');
      const info = view.querySelector('[data-result]');
      const more = view.querySelector('[data-more]');
      const rows = new Map();
      let cursor = null, query = '', pending = false, generation = 0, filteredOnly = false;
      let observer;

      function paint() {
        list.replaceChildren();
        for (const row of rows.values()) {
          if (!remoteSearch && !row.nick.toLowerCase().includes(query.toLowerCase())) continue;
          const item = document.createElement('li');
          item.className = 'profile3-list-row';
          const reason = name !== 'suggest' ? '' : row.reason === 'mutual' && row.mutual
            ? t('mutualCount', { n: Number(row.mutual) }) : row.reason === 'floor' ? t('floor') : '';
          item.innerHTML = person(row) + (reason ? '<p class="muted">' + reason + '</p>' : '') +
            (ownFollowers ? U.button(t('remove'), 'data-remove') : name === 'suggest' ? U.button(t('hide'), 'data-remove') : '');
          const button = item.querySelector('[data-remove]');
          if (button) button.onclick = event => action(event.currentTarget, ownFollowers ? 'follower_remove' : 'suggest_hide', row.nick, () => {
            rows.delete(row.nick.toLowerCase());
            paint();
          });
          list.append(item);
        }
        info.textContent = list.children.length ? '' : L.t('screens.empty');
      }

      async function load(append = false) {
        if (append && (pending || cursor == null)) return;
        const version = ++generation;
        pending = true;
        more.disabled = true;
        const before = append ? cursor : null;
        if (!append) {
          rows.clear();
          list.replaceChildren();
          info.textContent = L.t('screens.loading');
          more.hidden = true;
          cursor = null;
        }
        const args = name === 'suggest' ? {} : { nick, ...(remoteSearch && query ? { q: query } : {}),
          ...(before !== null ? { before } : {}) };
        const result = await L.api(name, args);
        if (!view.isConnected || version !== generation) return;
        pending = false;
        more.disabled = false;
        if (result.error) {
          info.textContent = L.t(result.error === 'forbidden' || result.error === 'not_found' ? 'follows.restricted' : 'screens.error');
          more.hidden = before === null;
          if (result.error === 'auth') L.needLogin();
          return;
        }
        filteredOnly = !remoteSearch;
        for (const row of result.list || []) if (row?.nick) rows.set(row.nick.toLowerCase(), row);
        cursor = remoteSearch && result.before != null && JSON.stringify(result.before) !== JSON.stringify(before) ? result.before : null;
        more.hidden = cursor === null;
        paint();
      }

      form.onsubmit = event => {
        event.preventDefault();
        query = input.value.trim();
        if (filteredOnly) paint();
        else void load();
      };
      more.onclick = () => load(true);
      if (remoteSearch && typeof IntersectionObserver === 'function') {
        observer = new IntersectionObserver(entries => {
          if (!view.isConnected) { observer.disconnect(); return; }
          if (entries.some(entry => entry.isIntersecting) && !more.hidden) void load(true);
        });
        observer.observe(more);
        active = () => observer.disconnect();
      }
      await load();
    };
  }

  let active;
  for (const [name, title] of [['followers', 'user.followers'], ['following', 'user.following'],
    ['mutuals', 'follows.mutuals'], ['suggest', 'follows.suggest']]) {
    L.screen(name, { title, auth: true, nav: 'me', render: listScreen(name, title),
      leave() { active?.(); active = null; } });
  }
  L.screen('requests', { title: 'follows.requests', auth: true, nav: 'me', render(root) { return requests(root); } });
  L.profileFollows = { avatar, requests, fail };
})();
