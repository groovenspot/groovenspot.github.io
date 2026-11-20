(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('user', {
    title: ['프로필', 'Profile'], followers: ['팔로워', 'Followers'], following: ['팔로잉', 'Following'],
    follow: ['팔로우', 'Follow'], unfollow: ['팔로우 취소', 'Unfollow'],
    menu: ['신고·차단 메뉴', 'Report and block menu'], block: ['차단', 'Block'],
    unblock: ['차단 해제', 'Unblock'], blocked: ['차단했어요', 'Account blocked'],
    blocks: ['차단 목록', 'Blocked accounts'], message: ['메시지', 'Message'],
    missing: ['프로필을 찾을 수 없어요', 'Profile not found'],
    vipAdd: ['VIP 달기', 'Add VIP'], vipRemove: ['VIP 떼기', 'Remove VIP']
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

  async function showFollows(nick, field) {
    const panel = U.sheet('<h2>' + t(field) + '</h2><div data-follows>' + U.status('loading') + '</div>');
    const content = panel.querySelector('[data-follows]');
    const data = await L.api(field, { nick });
    if (!content.isConnected) return;
    if (data.error) { content.innerHTML = U.status('error'); return; }
    const people = data.people || data[field]?.map(nick => ({ nick })) || [];
    content.innerHTML = people.length ? '<ul class="lounge-list shell-ledger">' + people.map(person =>
      '<li class="shell-card"><a href="#/u/' + L.esc(encodeURIComponent(person.nick)) + '">' +
      L.whoTag(person) + '</a></li>').join('') + '</ul>' : U.status('empty');
    content.querySelectorAll('a').forEach(link => { link.onclick = () => L.closeSheet(); });
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
    for (const person of rows) {
      const { nick } = person;
      const row = document.createElement('li');
      row.className = 'shell-row shell-card';
      row.innerHTML = '<strong>' + L.whoTag(person) + '</strong>' + U.button(t('unblock'), 'data-unblock');
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
      '<h2 data-user-name>' + L.whoTag(user) + '</h2><p style="white-space:pre-wrap">' + L.esc(user.bio) + '</p>' +
      '<p class="muted">' + L.esc([user.floor, user.joinedMonth].filter(Boolean).join(' · ')) + '</p>' +
      '<p>' + (user.badges || []).filter(badge => badge.got !== false && badge.got !== null && badge.got !== 0).map(badge =>
        L.esc(badge.label || badge)).join(' · ') + '</p><p data-counts></p>' +
      (own() ? '' : '<div style="display:flex;flex-wrap:wrap;gap:8px">' + U.button('', 'data-follow', true) +
        (L.open('dm') ? U.link('#/dm/' + encodeURIComponent(user.nick), t('message')) : '') +
        U.button('⋯', 'data-menu aria-haspopup="dialog" aria-label="' + t('menu') + '"') + '</div>') + '</article>';

    const follow = view.querySelector('[data-follow]');
    let following = Boolean(user.me?.following);
    function paint() {
      const counts = view.querySelector('[data-counts]');
      const fields = ['followers', 'following'];
      counts.innerHTML = fields.map(field => U.button(t(field) + ' ' + (Number(user[field]) || 0),
        'data-follow-list="' + field + '"')).join(' ');
      counts.querySelectorAll('[data-follow-list]').forEach(button => {
        button.onclick = () => { if (!L.needLogin()) void showFollows(user.nick, button.dataset.followList); };
      });
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
      const [blocks, admin] = await Promise.all([
        L.me ? L.api('blocks') : {},
        user.tag?.kind !== 'staff' ? L.staffAdmin() : ''
      ]);
      const blockAvailable = blocks.error !== 'action';
      if (!view.isConnected) return;
      const el = U.sheet('<h2>' + t('menu') + '</h2>' + U.button(U.t('report'), 'data-report') +
        ' ' + U.button(t('block') + (blockAvailable ? '' : ' · ' + U.t('soon')),
          'data-block' + (blockAvailable ? '' : ' disabled')) +
        (admin ? ' ' + U.button(t(user.tag?.kind === 'vip' ? 'vipRemove' : 'vipAdd'), 'data-vip') : ''));
      const vipButton = el.querySelector('[data-vip]');
      if (vipButton) vipButton.onclick = async () => {
        vipButton.disabled = true;
        const currentAdmin = await L.staffAdmin();
        const result = currentAdmin ? await L.api('adm_vip_set', { admin: currentAdmin, mid: user.id, vip: user.tag?.kind !== 'vip' })
          : { error: 'forbidden' };
        if (!vipButton.isConnected) return;
        vipButton.disabled = false;
        if (result.error) return U.error(result);
        user.tag = result.vip ? { kind: 'vip', label: 'VIP' } : null;
        view.querySelector('[data-user-name]').innerHTML = L.whoTag(user);
        L.closeSheet();
      };
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
