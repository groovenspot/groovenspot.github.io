(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('dj', {
    list: ['DJ 목록', 'DJs'], profile: ['DJ 프로필', 'DJ profile'],
    follow: ['팔로우', 'Follow'], unfollow: ['팔로우 취소', 'Unfollow'],
    today: ['오늘 타임', 'Tonight’s sets'], next: ['다음 타임', 'Next set'], now: ['지금 틀고 있어요', 'Playing now'],
    videos: ['최근 유튜브 세트', 'Recent YouTube sets'], instagram: ['인스타그램', 'Instagram'],
    missing: ['DJ를 찾을 수 없어요', 'DJ not found']
  });
  const followerLabels = ['팔로워 {n}명', '{n} followers', 'フォロワー {n} 人', '{n} 位粉丝'];
  const oneFollower = ['팔로워 1명', '1 follower', 'フォロワー 1 人', '1 位粉丝'];
  L.i18n(Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((lang, i) => [lang, {
    'dj.followers': followerLabels[i],
    'dj.oneFollower': oneFollower[i]
  }])));
  // The public video catalog uses stage names in Latin script for these DJs.
  const videoNames = new Map([
    ['뮤트', 'mute'], ['비누', 'binu'], ['우지', 'uzi'], ['이지', 'ezzy'],
    ['타로', 'taro'], ['로드', 'road'], ['제트', 'zet']
  ]);
  const path = key => '#/dj/' + encodeURIComponent(key);

  function instagram(value) {
    if (typeof value !== 'string') return '';
    const handle = value.trim().replace(/^(?:https:\/\/(?:www\.)?instagram\.com\/|@)/i, '').replace(/\/$/, '');
    return /^[a-z0-9_.]{1,30}$/i.test(handle) && handle !== '.' && handle !== '..'
      ? 'https://www.instagram.com/' + handle + '/' : '';
  }

  async function list(root) {
    const view = U.mount(root, '<h1>' + t('list') + '</h1>');
    const { djs, error } = await L.api('djs');
    if (!view.isConnected) return;
    if (error || !Array.isArray(djs)) {
      view.innerHTML = U.status('error');
      return;
    }
    view.innerHTML = djs.length ? '<ul class="lounge-list shell-ledger">' + djs.map(dj =>
      '<li class="shell-card shell-row">' + U.link(path(dj.key), L.djMark(dj.name, '', 'is-sm') + '<span>' + L.esc(dj.name) + '</span>') +
      '<span class="muted">' + L.esc(dj.floor) + '</span></li>').join('') + '</ul>' : U.status('empty');
  }

  async function recentSets(dj) {
    const name = videoNames.get(dj.name) || dj.name.trim().toLowerCase();
    try {
      const res = await fetch('/data/videos.json');
      if (!res.ok) return U.status('error');
      const catalog = await res.json();
      const clips = catalog.filter(clip => typeof clip?.dj === 'string' && clip.dj.trim().toLowerCase() === name &&
        typeof clip.youtube === 'string' && /^[\w-]{11}$/.test(clip.youtube))
        .sort((a, b) => Number(b.session) - Number(a.session)).slice(0, 3);
      return clips.length ? '<ul class="lounge-list">' + clips.map(clip =>
        '<li><a href="https://www.youtube.com/watch?v=' + clip.youtube + '" target="_blank" rel="noopener noreferrer">' +
        L.esc(clip.title || dj.name) + '</a></li>').join('') + '</ul>' : U.status('empty');
    } catch {
      return U.status('error');
    }
  }

  async function profile(root, { id: key }) {
    const view = U.mount(root, '<h1>' + t('profile') + '</h1>' + U.link('#/djs', t('list')));
    const { dj, error } = key ? await L.api('dj_get', { key }) : { error: 'key' };
    if (!view.isConnected) return;
    if (!dj) {
      view.innerHTML = ['key', 'missing'].includes(error)
        ? '<p role="status">' + t('missing') + '</p>' : U.status('error');
      return;
    }
    const ig = instagram(dj.ig);
    const slots = Array.isArray(dj.slots) ? dj.slots : [];
    const floor = dj.floor || dj.now?.floor || dj.next?.floor || slots[0]?.floor;
    const slotText = slot => L.esc([slot.floor, slot.at].filter(Boolean).join(' · '));
    view.innerHTML = '<div class="lounge-list"><section class="shell-card">' + L.djMark(dj.name, '', 'is-hero') + '<h2>' + L.esc(dj.name) + '</h2>' +
      (floor ? '<p class="muted">' + L.esc(floor) + '</p>' : '') +
      (L.open('l26_follow_counts') ? '<p class="l26-follow-count" data-dj-follower-count aria-live="polite" hidden></p>' : '') +
      '<div class="shell-actions">' + U.button('', 'data-dj-follow', true) +
      (ig ? '<a class="btn" href="' + L.esc(ig) + '" target="_blank" rel="noopener noreferrer">' + t('instagram') + '</a>' : '') +
      '</div></section><section class="shell-card"><h2>' + t('today') + '</h2>' +
      (dj.day ? '<p class="muted">' + L.esc(dj.day) + '</p>' : '') +
      (dj.now ? '<p>' + t('now') + ' · ' + slotText(dj.now) + '</p>' : '') +
      (slots.length ? '<ul>' + slots.map(slot => '<li>' + slotText(slot) + '</li>').join('') + '</ul>' : U.status('empty')) +
      '<h2>' + t('next') + '</h2><p>' + (dj.next ? slotText(dj.next) : '—') + '</p></section>' +
      '<section class="shell-card"><h2>' + t('videos') + '</h2><div data-dj-videos>' + U.status('loading', true) +
      '</div></section></div>';

    let following = Boolean(dj.following);
    const button = view.querySelector('[data-dj-follow]');
    const count = view.querySelector('[data-dj-follower-count]');
    function paintFollow(followers) {
      if (count) {
        count.hidden = !Number.isInteger(followers);
        const label = followers === 1 ? 'dj.oneFollower' : 'dj.followers';
        count.textContent = count.hidden ? '' : L.t(label, { n: new Intl.NumberFormat(L.lang).format(followers) });
      }
      button.textContent = L.t('dj.' + (following ? 'unfollow' : 'follow'));
      button.setAttribute('aria-pressed', following);
    }
    paintFollow(dj.followers);
    if (count && L.isPreview()) button.disabled = true;
    button.onclick = async () => {
      if (L.needLogin() || button.disabled) return;
      button.disabled = true;
      const result = await L.api(following ? 'dj_unfollow' : 'dj_follow', { key });
      if (!view.isConnected) return;
      button.disabled = false;
      if (result.error) return U.error(result);
      following = Boolean(result.following);
      paintFollow(result.followers);
    };
    const videos = await recentSets(dj);
    if (view.isConnected) view.querySelector('[data-dj-videos]').innerHTML = videos;
  }

  L.screen('djs', { nav: 'play', title: 'dj.list', render: list });
  L.screen('dj', { nav: 'play', title: 'dj.profile', render: profile });
})();
