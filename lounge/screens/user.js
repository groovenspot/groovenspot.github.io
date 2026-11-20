(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('user', {
    title: ['프로필', 'Profile'], followers: ['팔로워', 'Followers'], following: ['팔로잉', 'Following'],
    follow: ['팔로우', 'Follow'], unfollow: ['팔로우 취소', 'Unfollow'],
    menu: ['신고·차단 메뉴', 'Report and block menu'], block: ['차단 · 준비 중', 'Block · Coming soon'],
    missing: ['프로필을 찾을 수 없어요', 'Profile not found']
  });

  async function render(root, { id: nick } = {}) {
    const view = U.mount(root, '<h1>' + t('title') + '</h1>' + U.link('#/feed', L.esc(L.t('nav.feed'))));
    const response = nick ? await L.api('user', { nick }) : {};
    if (!view.isConnected) return;
    const user = response?.user;
    if (!user) {
      view.innerHTML = response?.error === 'network' ? U.status('error') : '<p role="status">' + t('missing') + '</p>';
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
    view.querySelector('[data-menu]').onclick = () => {
      const el = U.sheet('<h2>' + t('menu') + '</h2>' + U.button(U.t('report'), 'data-report') +
        ' ' + U.button(t('block'), 'disabled'));
      el.querySelector('[data-report]').onclick = () => {
        if (L.needLogin()) return;
        // Moderation actions identify an account by its stable member ID.
        if (!user.id) return U.error();
        U.report('user', user.id);
      };
    };
  }
  L.screen('user', { nav: 'feed', auth: false, title: 'user.title', render });
})();
