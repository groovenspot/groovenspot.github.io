(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('user', {
    title: ['프로필', 'Profile'], followers: ['팔로워', 'Followers'], following: ['팔로잉', 'Following'],
    follow: ['팔로우', 'Follow'], unfollow: ['팔로우 취소', 'Unfollow'],
    menu: ['신고·차단 메뉴', 'Report and block menu'], block: ['차단', 'Block'],
    unblock: ['차단 해제', 'Unblock'], blocked: ['차단했어요', 'Account blocked'],
    blocks: ['차단 목록', 'Blocked accounts'], message: ['메시지', 'Message'],
    missing: ['프로필을 찾을 수 없어요', 'Profile not found']
  });

  async function changeBlock(button, action, nick) {
    if (L.needLogin() || button.disabled) return false;
    button.disabled = true;
    const result = await L.api(action, { nick });
    button.disabled = false;
    if (!button.isConnected) return false;
    if (!result.ok || result.error) {
      U.error(result);
      return false;
    }
    return true;
  }

  async function blocks(root) {
    const view = U.mount(root, '<h1>' + t('blocks') + '</h1>');
    const data = await L.api('blocks');
    if (!view.isConnected) return;
    if (data.error) {
      view.innerHTML = U.status(data.error === 'action' ? 'soon' : 'error');
      return;
    }
    const rows = Array.isArray(data.blocks) ? data.blocks.filter(row => row?.nick) : [];
    if (!rows.length) {
      view.innerHTML = U.status('empty');
      return;
    }
    const list = document.createElement('ul');
    list.className = 'lounge-list shell-ledger';
    for (const { nick } of rows) {
      const row = document.createElement('li');
      row.className = 'shell-row shell-card';
      row.innerHTML = '<strong>' + L.esc(nick) + '</strong>' + U.button(t('unblock'), 'data-unblock');
      row.querySelector('button').onclick = async event => {
        if (await changeBlock(event.currentTarget, 'unblock', nick)) await L.route();
      };
      list.append(row);
    }
    view.replaceChildren(list);
  }

  async function render(root, { id: nick } = {}) {
    const view = U.mount(root, '<h1>' + t('title') + '</h1>' + U.link('#/feed', L.esc(L.t('nav.feed'))));
    const response = nick ? await L.api('user', { nick }) : {};
    if (!view.isConnected) return;
    const user = response?.user;
    if (!user) {
      view.innerHTML = response?.error === 'network' ? U.status('error') : '<p role="status">' + t('missing') + '</p>';
      if (!nick || !L.me || !['not_found', 'missing'].includes(response.error)) return;
      const data = await L.api('blocks');
      if (!view.isConnected) return;
      const blocked = Array.isArray(data.blocks) && data.blocks.find(row =>
        typeof row?.nick === 'string' && row.nick.toLowerCase() === nick.toLowerCase());
      if (blocked) {
        view.innerHTML += U.button(t('unblock'), 'data-unblock');
        view.querySelector('[data-unblock]').onclick = async event => {
          if (await changeBlock(event.currentTarget, 'unblock', blocked.nick)) await L.route();
        };
      }
      return;
    }
    const photo = U.image(user.photo);
    const own = () => L.me?.nick?.toLowerCase() === user.nick?.toLowerCase();
    view.innerHTML = '<article style="' + U.card + '">' + (photo ? '<img alt="" src="' + L.esc(photo) +
      '" style="width:76px;height:76px;object-fit:cover;border-radius:50%;border:2px solid var(--g)">' : '') +
      '<h2>' + L.esc(user.nick) + '</h2><p style="white-space:pre-wrap">' + L.esc(user.bio) + '</p>' +
      '<p class="muted">' + L.esc([user.floor, user.joinedMonth].filter(Boolean).join(' · ')) + '</p>' +
      '<p>' + (user.badges || []).filter(badge => badge.got !== false && badge.got !== null && badge.got !== 0).map(badge =>
        L.esc(badge.label || badge)).join(' · ') + '</p><p data-counts></p>' +
      (own() ? '' : '<div style="display:flex;flex-wrap:wrap;gap:8px">' + U.button('', 'data-follow', true) +
        (L.open('dm') ? U.link('#/dm/' + encodeURIComponent(user.nick), t('message')) : '') +
        U.button(t('menu'), 'data-menu') + '</div>') + '</article>';

    const follow = view.querySelector('[data-follow]');
    let following = Boolean(user.me?.following);
    function paint() {
      view.querySelector('[data-counts]').innerHTML = '<b>' + t('followers') + ' ' + (Number(user.followers) || 0) +
        '</b> · ' + t('following') + ' ' + (Number(user.following) || 0);
      if (follow) {
        follow.textContent = L.t('user.' + (following ? 'unfollow' : 'follow'));
        follow.setAttribute('aria-pressed', following);
      }
    }
    paint();
    if (!follow) return;
    follow.onclick = async () => {
      if (L.needLogin() || follow.disabled) return;
      follow.disabled = true;
      const result = await L.api(following ? 'unfollow' : 'follow', { nick: user.nick });
      if (!view.isConnected) return;
      follow.disabled = false;
      if (!result || result.error) return U.error(result);
      const next = result.following ?? !following;
      user.followers = result.followers ?? Math.max(0, (Number(user.followers) || 0) + Number(next) - Number(following));
      following = next;
      paint();
    };
    view.querySelector('[data-menu]').onclick = async () => {
      const blockAvailable = !L.me || (await L.api('blocks')).error !== 'action';
      if (!view.isConnected) return;
      const el = U.sheet('<h2>' + t('menu') + '</h2>' + U.button(U.t('report'), 'data-report') +
        ' ' + U.button(t('block') + (blockAvailable ? '' : ' · ' + U.t('soon')),
          'data-block' + (blockAvailable ? '' : ' disabled')));
      el.querySelector('[data-report]').onclick = () => {
        if (L.needLogin()) return;
        // Moderation actions identify an account by its stable member ID.
        if (!user.id) return U.error();
        U.report('user', user.id);
      };
      el.querySelector('[data-block]').onclick = async event => {
        if (await changeBlock(event.currentTarget, 'block', user.nick)) {
          L.closeSheet();
          await L.route();
          L.toast(L.t('user.blocked'));
        }
      };
    };
  }
  L.screen('user', { nav: 'feed', auth: false, title: 'user.title', render });
  L.screen('blocks', { nav: 'me', auth: true, title: 'user.blocks', render: blocks });
})();
