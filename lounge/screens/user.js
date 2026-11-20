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

  const profile = U.words('profile3', {
    posts: ['게시물', 'Posts'],
    tagged: ['태그됨', 'Tagged'],
    share: ['프로필 공유', 'Share profile'],
    locked: ['비공개 계정이에요', 'This account is private'],
    lockedHelp: ['팔로우 요청이 수락되면 게시물을 볼 수 있어요.', 'When your follow request is accepted, you can see their posts.'],
    highlights: ['하이라이트', 'Highlights'],
    post: ['게시물 {n}', 'Post {n}'],
    first: ['첫 방문', 'First visit'],
    visit5: ['5번 방문', '5 visits'],
    visit10: ['10번 방문', '10 visits'],
    attend7: ['7일 연속 출석', '7-day attendance streak'],
    voter: ['5번 투표', '5 votes']
  });
  const esc = L.esc;
  const count = value => Math.max(0, Number(value) || 0);
  const format = value => new Intl.NumberFormat(L.lang).format(count(value));
  const path = (screen, nick) => '#/' + screen + '/' + encodeURIComponent(nick);
  const followingState = user => user.me?.state || (user.me?.following ? 'following' : 'none');
  const earnedBadges = new Set(['first', 'visit5', 'visit10', 'attend7', 'voter']);
  L.profileBadgeLabel = (key, fallback) => earnedBadges.has(key) ? L.t('profile3.' + key) : fallback || key;

  function actionLabel(user) {
    const state = followingState(user);
    if (state === 'following') return L.t('user.following');
    if (state === 'requested') return L.t('follows.requested');
    return L.t(user.me?.followsMe ? 'follows.followBack' : 'user.follow');
  }

  function wireFollow(button, user) {
    button.onclick = async () => {
      if (button.disabled || L.needLogin()) return;
      button.disabled = true;
      const state = L.open('follow2') ? followingState(user) : (followingState(user) === 'following' ? 'following' : 'none');
      const action = state === 'following' ? 'unfollow' : state === 'requested' ? 'follow_cancel' : 'follow';
      const result = await L.api(action, { nick: user.nick });
      if (!button.isConnected) return;
      button.disabled = false;
      if (result.error) return L.profileFollows.fail(result);
      await L.route();
    };
  }

  function wireMenu(button, user, enhanced = false) {
    if (!button) return;
    button.onclick = async () => {
      const [blocks, admin] = await Promise.all([
        L.me ? L.api('blocks') : {},
        user.tag?.kind !== 'staff' ? L.staffAdmin() : ''
      ]);
      const allowed = blocks.error !== 'action';
      if (!button.isConnected) return;
      const actions = U.button(U.t('report'), 'data-report') + ' ' +
        U.button(t('block') + (allowed ? '' : ' · ' + U.t('soon')), 'data-block' + (allowed ? '' : ' disabled')) +
        (admin ? ' ' + U.button(t(user.tag?.kind === 'vip' ? 'vipRemove' : 'vipAdd'), 'data-vip') : '');
      const el = U.sheet('<h2>' + t('menu') + '</h2>' +
        (enhanced ? '<div class="shell-actions">' + actions + '</div>' : actions));
      const vipButton = el.querySelector('[data-vip]');
      if (vipButton) vipButton.onclick = async () => {
        vipButton.disabled = true;
        const currentAdmin = await L.staffAdmin();
        const result = currentAdmin ? await L.api('adm_vip_set', { admin: currentAdmin, mid: user.id, vip: user.tag?.kind !== 'vip' })
          : { error: 'forbidden' };
        if (!vipButton.isConnected) return;
        vipButton.disabled = false;
        if (result.error) return U.error(result);
        L.closeSheet();
        await L.route();
      };
      el.querySelector('[data-report]').onclick = () => {
        if (L.needLogin()) return;
        if (user.id) U.report('user', user.id);
        else U.error();
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

  function stats(user, allowLinks) {
    return ['posts', 'followers', 'following'].map(key => {
      const label = key === 'posts' ? profile('posts') : t(key);
      const body = '<strong>' + esc(format(user[key])) + '</strong><span>' + label + '</span>';
      return allowLinks && key !== 'posts'
        ? '<a href="' + esc(path(key, user.nick)) + '">' + body + '</a>' : '<span>' + body + '</span>';
    }).join('');
  }

  function postTiles(rows, start = 0) {
    return rows.filter(row => typeof row?.id === 'string').map((row, index) => {
      const image = row.thumb || row.photos?.[0];
      const thumb = U.image(typeof image === 'string' ? image : image?.thumb || image?.src);
      return '<a href="' + esc(path('feed', row.id)) + '" aria-label="' + profile('post', { n: start + index + 1 }) +
        '">' + (thumb ? '<img src="' + esc(thumb) + '" alt="" loading="lazy">' : '') +
        (count(row.count) > 1 ? '<span aria-hidden="true">' + esc(format(row.count)) + '</span>' : '') + '</a>';
    }).join('');
  }

  async function highlight(button, id) {
    const panel = U.sheet('<h2></h2><div data-highlight>' + U.status('loading', true) + '</div>');
    panel.querySelector('h2').textContent = button.textContent.trim();
    const response = await L.api('highlight_get', { id });
    if (!panel.isConnected) return;
    const content = panel.querySelector('[data-highlight]');
    const tiles = postTiles(response.highlight?.posts || []);
    content.innerHTML = response.error ? U.status('error') :
      tiles ? '<div class="profile3-grid">' + tiles + '</div>' : U.status('empty');
  }

  function galleries(view, user) {
    const highlights = view.querySelector('[data-highlights]');
    const gallery = view.querySelector('[data-gallery]');
    const more = view.querySelector('[data-gallery-more]');
    const status = view.querySelector('[data-gallery-status]');
    const tabs = [...view.querySelectorAll('[data-profile-tab]')];
    const seen = new Set();
    let version = 0, before = null, mode = 'posts', pending = false;

    async function load(append = false) {
      if (append && (pending || before == null)) return;
      const revision = ++version;
      const cursor = append ? before : null;
      pending = true;
      more.disabled = true;
      status.textContent = L.t('screens.loading');
      if (!append) {
        before = null;
        seen.clear();
        gallery.replaceChildren();
        more.hidden = true;
      }
      const result = await L.api(mode === 'posts' ? 'user_posts' : 'user_tagged',
        { nick: user.nick, ...(cursor != null ? { before: cursor } : {}) });
      if (!view.isConnected || version !== revision) return;
      pending = false;
      more.disabled = false;
      if (result.error) {
        status.textContent = L.t(result.error === 'forbidden' ? 'profile3.locked' : 'screens.error');
        return;
      }
      const entries = (result.posts || []).filter(row => typeof row?.id === 'string' && !seen.has(row.id));
      gallery.insertAdjacentHTML('beforeend', postTiles(entries, seen.size));
      for (const row of entries) seen.add(row.id);
      before = result.before != null && JSON.stringify(result.before) !== JSON.stringify(cursor) ? result.before : null;
      more.hidden = before == null;
      status.textContent = seen.size ? '' : L.t('screens.empty');
    }

    function choose(tab) {
      if (mode === tab.dataset.profileTab) return;
      mode = tab.dataset.profileTab;
      for (const control of tabs) control.setAttribute('aria-pressed', String(control === tab));
      void load();
    }
    for (const tab of tabs) tab.onclick = () => choose(tab);
    more.onclick = () => load(true);

    void L.api('highlights', { nick: user.nick }).then(result => {
      if (!view.isConnected || result.error) return;
      const items = [...(result.auto || []).filter(item => count(item.count) > 0), ...(result.list || [])];
      if (!items.length) return;
      highlights.hidden = false;
      for (const item of items) {
        const cover = U.image(item.cover);
        const title = item.key === 'challenge' ? esc(L.t('challenge.title'))
          : item.key === 'tagged' ? profile('tagged') : esc(item.title);
        const label = '<span class="profile3-highlight-cover">' + (cover ? '<img src="' + esc(cover) + '" alt="" loading="lazy">' :
          '<span aria-hidden="true">✦</span>') + '</span><span>' + title + '</span>';
        const button = document.createElement('button');
        button.className = 'profile3-highlight';
        button.type = 'button';
        button.innerHTML = label;
        const id = item.key ? item.key + ':' + user.id : item.id;
        button.onclick = () => highlight(button, id);
        highlights.append(button);
      }
    });
    return load();
  }

  function enhanced(view, user, own) {
    const follow2 = L.open('follow2');
    const followState = followingState(user);
    const photos = L.profilePhotos.rows(user);
    const mainIndex = Math.max(0, photos.findIndex(photo => photo.main));
    const avatar = photos.length ? '<button class="profile3-avatar-button" type="button" data-profile-avatar aria-label="' +
      esc(L.t('profileEdit.photos')) + '">' + L.profilePhotos.image(photos[mainIndex], '', 'shell-avatar') + '</button>' :
      L.profileFollows.avatar(user);
    const badgeKey = typeof user.badge === 'string' ? user.badge : user.badge?.key;
    const badge = badgeKey ? L.profileBadgeLabel(badgeKey,
      user.badge?.label || (user.badges || []).find(item => item.key === badgeKey)?.label) : '';
    const showInstagram = typeof user.link === 'string' && /^[A-Za-z0-9._]{1,30}$/.test(user.link);
    const shareUI = typeof LoungeShare === 'undefined' ? null : LoungeShare;
    const canShare = own && L.open('share') && typeof shareUI?.open === 'function';
    const mutually = follow2 && L.me && !own && !user.locked && count(user.mutual?.n) > 0;
    const actions = own ? U.link('#/me/edit', esc(L.t('me.edit'))) +
      (canShare ? U.button(profile('share'), 'data-profile-share') : '') :
      U.button(follow2 ? esc(actionLabel(user)) : t(followState === 'following' ? 'unfollow' : 'follow'),
        'data-follow aria-pressed="' + (followState === 'following') + '"', followState === 'none') +
      (L.open('dm') ? U.link(path('dm', user.nick), t('message')) : '') +
      U.button('⋯', 'data-menu aria-haspopup="dialog" aria-label="' + t('menu') + '"');
    const heading = own ? 'h1' : 'h2';
    view.innerHTML = '<section class="shell-card profile3-card"><div class="profile3-header">' + avatar +
      '<div class="profile3-stats">' + stats(user, follow2 && L.me && !user.locked) + '</div></div>' +
      '<div class="profile3-name"><' + heading + ' data-user-name>' + L.whoTag(user) + '</' + heading + '>' +
      (['2F', '3F'].includes(user.floor) ? '<span class="profile3-chip">' + esc(user.floor) + '</span>' : '') +
      (!L.tagLabel(user.tag) && badge ? '<span class="profile3-chip profile3-badge">' + esc(badge) + '</span>' : '') + '</div>' +
      (user.bio ? '<p class="shell-bio">' + esc(user.bio) + '</p>' : '') +
      (showInstagram ? '<a class="shell-link" href="https://www.instagram.com/' + encodeURIComponent(user.link) +
        '/" target="_blank" rel="noopener noreferrer">@' + esc(user.link) + '</a>' : '') +
      '<div class="shell-actions profile3-actions">' + actions + '</div>' +
      (mutually ? '<a class="shell-link profile3-mutual" href="' + esc(path('mutuals', user.nick)) + '">' +
        '<span aria-hidden="true">' + (user.mutual.preview || []).slice(0, 3).map(L.profileFollows.avatar).join('') + '</span>' +
        esc(L.t('follows.mutualCount', { n: format(user.mutual.n) })) + '</a>' : '') +
      (own && follow2 ? '<a class="shell-link" href="#/suggest">' + esc(L.t('follows.suggest')) + '</a>' : '') + '</section>' +
      (user.locked ? '<section class="shell-card profile3-lock"><p aria-hidden="true">🔒</p><h2>' + profile('locked') +
        '</h2><p class="muted">' + profile('lockedHelp') + '</p></section>' :
        '<div class="profile3-highlights" aria-label="' + profile('highlights') + '" data-highlights hidden></div>' +
        '<div class="profile3-tabs" role="group" aria-label="' + profile('posts') + '">' +
        U.button(profile('posts'), 'data-profile-tab="posts" aria-pressed="true"') +
        U.button(profile('tagged'), 'data-profile-tab="tagged" aria-pressed="false"') +
        '</div><p data-gallery-status class="muted" role="status"></p><div class="profile3-grid" data-gallery></div>' +
        U.button(esc(L.t('follows.more')), 'data-gallery-more hidden'));
    const follow = view.querySelector('[data-follow]');
    if (follow) wireFollow(follow, user);
    wireMenu(view.querySelector('[data-menu]'), user, true);
    const share = view.querySelector('[data-profile-share]');
    if (share) share.onclick = () => shareUI.open({ profile: { nick: user.nick, private: Boolean(user.private) } });
    L.profilePhotos.load(view);
    const portrait = view.querySelector('[data-profile-avatar]');
    if (portrait) portrait.onclick = () => L.profilePhotos.open(photos, mainIndex);
    if (!user.locked) return galleries(view, user);
  }

  L.renderProfile3 = enhanced;

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
    const own = Boolean(L.me && (user.me?.self === true ||
      L.me.nick?.toLowerCase() === user.nick?.toLowerCase()));
    if (L.open('profile2')) return enhanced(view, user, own);
    const follow2 = L.open('follow2');
    view.innerHTML = '<article style="' + U.card + '">' + (photo ? '<img alt="" src="' + L.esc(photo) +
      '" style="width:76px;height:76px;object-fit:cover;border-radius:50%;border:2px solid var(--g)">' : '') +
      '<h2 data-user-name>' + L.whoTag(user) + '</h2><p style="white-space:pre-wrap">' + L.esc(user.bio) + '</p>' +
      '<p class="muted">' + L.esc([user.floor, user.joinedMonth].filter(Boolean).join(' · ')) + '</p>' +
      '<p>' + (user.badges || []).filter(badge => badge.got !== false && badge.got !== null && badge.got !== 0).map(badge =>
        L.esc(badge.label || badge)).join(' · ') + '</p>' + (follow2 ? '<div data-counts></div>' : '<p data-counts></p>') +
      (own ? '' : '<div style="display:flex;flex-wrap:wrap;gap:8px">' + U.button('', 'data-follow', true) +
        (L.open('dm') ? U.link('#/dm/' + encodeURIComponent(user.nick), t('message')) : '') +
        U.button('⋯', 'data-menu aria-haspopup="dialog" aria-label="' + t('menu') + '"') + '</div>') + '</article>';

    const follow = view.querySelector('[data-follow]');
    let following = Boolean(user.me?.following);
    function paint() {
      const counts = view.querySelector('[data-counts]');
      if (follow2) {
        counts.innerHTML = '<span class="profile3-stats">' + stats(user, L.me && !user.locked) + '</span>';
        if (follow) {
          follow.textContent = actionLabel(user);
          follow.setAttribute('aria-pressed', String(followingState(user) === 'following'));
        }
        return;
      }
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
    if (follow2) wireFollow(follow, user);
    wireMenu(view.querySelector('[data-menu]'), user);
  }
  L.screen('user', { nav: 'feed', auth: false, title: 'user.title', render });
  L.screen('blocks', { nav: 'me', auth: true, title: 'user.blocks', render: blocks });
})();
