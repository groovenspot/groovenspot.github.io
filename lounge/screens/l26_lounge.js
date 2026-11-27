(function (L) {
  const words = {
    recap: ['어젯밤', 'Last night', '昨夜', '昨夜'],
    replay: ['리플레이', 'Replay', 'リプレイ', '回顾'],
    music: ['음악', 'Music', '音楽', '音乐'],
    latest: ['최근 공식 영상', 'Recent official sets', '最新の公式映像', '最新官方视频'],
    guests: ['손님 피드', 'Guest feed', 'ゲストの投稿', '访客动态'],
    play: ['놀거리 열기', 'Explore games', '遊びを開く', '查看游戏'],
    compose: ['글 쓰기', 'Write a post', '投稿する', '发帖'],
    viewFeed: ['피드 전체 보기', 'Open the feed', 'フィードを見る', '查看动态'],
    noGuests: ['아직 볼 수 있는 손님 글이 없어요.', 'No guest posts to show yet.', '表示できるゲストの投稿はまだありません。', '暂无可显示的访客帖子。'],
    openPost: ['게시물 열기', 'Open post', '投稿を開く', '打开帖子'],
    timetable: ['공식 타임테이블', 'Official timetable', '公式タイムテーブル', '官方时间表'],
    group: ['게시물 {n}개', '{n} posts', '{n} 件の投稿', '{n} 条帖子'],
    pending: ['리플레이는 한국 시간 정오에 올라와요.', 'The replay arrives at noon in Korea.', 'リプレイは韓国時間の正午に公開されます。', '回顾将于韩国时间中午发布。'],
    noRecap: ['공개된 리플레이가 아직 없어요.', 'No replay has been published yet.', '公開済みのリプレイはまだありません。', '暂无已发布的回顾。'],
    sparse: ['공개할 수 있는 영업 기록이 아직 없어요.', 'There are no records available to share for this night yet.', '公開できる営業記録はまだありません。', '这晚暂无可公开的营业记录。'],
    schedule: ['DJ 일정', 'DJ lineup', 'DJラインナップ', 'DJ 排期'],
    votes: ['지난 투표 결과', 'Past poll results', '過去の投票結果', '往期投票结果'],
    officialVideo: ['YouTube에서 보기', 'Watch on YouTube', 'YouTubeで見る', '在 YouTube 上观看'],
    visits: ['인증 방문 {n}명', '{n} verified visits', '認証済みの来店 {n} 人', '{n} 位已验证来访者'],
    photo: ['공식 현장 사진', 'Official venue photo', '公式の会場写真', '官方现场照片'],
    unavailable: ['불러오지 못했어요.', 'Couldn’t load this section.', '読み込めませんでした。', '此板块加载失败。'],
    loading: ['불러오는 중', 'Loading', '読み込み中', '加载中']
  };
  L.i18n(Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((lang, index) => [lang,
    Object.fromEntries(Object.entries(words).map(([key, values]) => ['community.' + key, values[index]]))])));
  const esc = L.esc;
  const t = (key, vars) => esc(L.t('community.' + key, vars));
  const photoUrl = /^https:\/\/groove-staff-api\.groovenspotbusan\.workers\.dev\/lounge-recap-media\/[a-f0-9]{12}\/cf[a-z0-9]+$/;
  let stopRefresh;

  function link(path, label, cls = 'btn') {
    return '<a class="' + cls + '" href="#/' + path + '">' + label + '</a>';
  }

  function stylesheet() {
    if (document.getElementById('l26-community-css')) return;
    const style = document.createElement('link');
    style.id = 'l26-community-css';
    style.rel = 'stylesheet';
    style.href = '/lounge/css/l26-community.css';
    document.head.append(style);
  }

  let recentVideos;
  function videoCard({ youtube, title, dj, duration, session }, index) {
    const credit = (index === 0 ? 'GROOVE SESSIONS ' + esc(String(session).padStart(3, '0')) + ' · ' : '') + esc(dj);
    return '<a class="community-video" href="https://www.youtube.com/watch?v=' + youtube +
      '" target="_blank" rel="noopener noreferrer"><span class="community-video-art">' +
      '<img data-src="https://i.ytimg.com/vi/' + youtube + '/mqdefault.jpg" width="320" height="180" alt="" decoding="async" referrerpolicy="no-referrer">' +
      '<span class="community-video-play">' + L.icon('play', { size: 22, fill: true }) + '</span>' +
      '<span class="community-video-runtime">' + esc(duration) + '</span></span>' +
      '<span class="community-video-copy"><span class="community-video-meta">' + credit + '</span><strong>' + esc(title) +
      '</strong><span class="sr-only"> ' + t('officialVideo') + '</span></span></a>';
  }

  async function music(view) {
    try {
      if (!recentVideos) {
        const response = await fetch('/data/videos.json');
        if (!response.ok) throw new Error('Video catalog unavailable');
        const catalog = await response.json();
        const videos = catalog.filter(video => video && typeof video.youtube === 'string' &&
          /^[\w-]{11}$/.test(video.youtube) && Number.isFinite(Number(video.session)) &&
          [video.title, video.dj, video.duration].every(value => typeof value === 'string' && value.trim()))
          .sort((a, b) => Number(b.session) - Number(a.session)).slice(0, 2);
        if (!videos.length) throw new Error('No published video in catalog');
        recentVideos = videos;
      }
      if (!view.isConnected) return;
      view.innerHTML = recentVideos.map(videoCard).join('');
      for (const image of view.querySelectorAll('img')) {
        image.addEventListener('error', () => image.remove(), { once: true });
        image.src = image.dataset.src;
      }
    } catch {
      if (view.isConnected) view.innerHTML = '<p class="muted">' + t('unavailable') + '</p>';
    }
  }

  function replay(view, result) {
    const { recap, biz_day: day } = result;
    if (result.error || !recap) {
      view.innerHTML = '<p>' + t(result.error ? 'unavailable' : result.pending ? 'pending' : 'noRecap') + '</p>';
      return;
    }
    const slots = recap.timetable || [];
    const photos = [...new Set((recap.photos || []).filter(url => photoUrl.test(url)))];
    const votes = recap.votes || [];
    const hasRecords = Boolean(slots.length || votes.length || recap.verified_visits);
    view.innerHTML =
      (photos.length ? '<div class="community-photos"' +
        (photos.length > 1 ? ' role="group" tabindex="0" aria-label="' + t('photo') + '"' : '') + '></div>' : '') +
      '<p class="community-meta"><time datetime="' + esc(day) + '">' + esc(day) + '</time>' +
      (recap.verified_visits ? '<span>' + t('visits', { n: recap.verified_visits }) + '</span>' : '') + '</p>' +
      '<p data-replay-empty' + (hasRecords || photos.length ? ' hidden' : '') + '>' + t('sparse') + '</p>' +
      (slots.length || votes.length ? '<div class="community-results">' +
        (slots.length ? '<section><h3>' + t('schedule') + '</h3><ul>' + slots.map(({ at, floor, dj }) =>
          '<li><time>' + esc(at) + '</time><b data-l26-floor="' + esc(floor) + '">' + esc(floor) + '</b><span>' +
          esc(dj) + '</span></li>').join('') + '</ul></section>' : '') +
        (votes.length ? '<section><h3>' + t('votes') + '</h3>' + votes.map(vote =>
          '<h4>' + esc(vote.title) + '</h4><ul>' + vote.choices.map(({ label, n }) =>
            '<li><span>' + esc(label) + '</span><b>' + esc(n) + '</b></li>').join('') + '</ul>').join('') + '</section>' : '') +
        '</div>' : '');

    const tray = view.querySelector('.community-photos');
    for (const url of photos) {
      const image = document.createElement('img');
      image.alt = L.t('community.photo');
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => {
        image.remove();
        if (tray.children.length === 1) tray.removeAttribute('tabindex');
        if (tray.children.length || !tray.isConnected) return;
        tray.remove();
        if (!hasRecords) view.querySelector('[data-replay-empty]').hidden = false;
      }, { once: true });
      tray.append(image);
      image.src = url;
    }
  }

  function watchReplay(view, onReady) {
    let version = 0, last, recordedDay, timer;
    const section = view.closest('section');
    async function refresh() {
      clearTimeout(timer);
      const request = ++version;
      const result = await L.api('l26_recap');
      if (request !== version || !view.isConnected) return;
      section.hidden = result.error === 'closed';
      const current = JSON.stringify(result);
      if (last !== current) {
        last = current;
        replay(view, result);
      }
      onReady();
      if (result.recap && L.me && recordedDay !== result.biz_day) {
        recordedDay = result.biz_day;
        void L.api('l26_recap_view', { biz_day: recordedDay });
      }
      timer = setTimeout(refresh, 30_000);
    }
    function pause() {
      version++;
      clearTimeout(timer);
      last = undefined;
      view.querySelector('.community-photos')?.remove();
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') void refresh();
      else pause();
    }
    function onPageShow(event) {
      if (event.persisted) onVisibility();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', onPageShow);
    onVisibility();
    return () => {
      pause();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('pageshow', onPageShow);
    };
  }

  async function preview(view, groups) {
    const result = await L.api('feed', { community: true });
    if (!view.isConnected) return;
    if (!result.ok) {
      view.innerHTML = '<p class="muted">' + t('unavailable') + '</p>';
      return;
    }
    const timetables = result.timetables || [];
    if (timetables.length) {
      groups.hidden = false;
      groups.innerHTML = '<h3>' + t('timetable') + '</h3>' + timetables.map(group =>
        link('feed/' + encodeURIComponent(group.id), '<time datetime="' + esc(group.biz_day) + '">' + esc(group.biz_day) +
          '</time><span>' + t('group', { n: group.count }) + '</span>', 'community-post')).join('');
    }
    const ids = new Set((result.guests || []).map(({ id }) => id));
    const details = await Promise.all([...ids].map(id => L.api('post_get', { id })));
    if (!view.isConnected) return;
    const posts = details.flatMap(({ post }) => post?.kind === 'member' ? [post] : []);
    if (!posts.length) {
      const failed = details.some(({ error }) => error && error !== 'missing');
      view.innerHTML = '<p class="muted">' + t(failed ? 'unavailable' : 'noGuests') + '</p>';
      return;
    }
    view.replaceChildren();
    const cards = L.feedCards(view, posts, {
      bleed: false,
      onGone: () => {
        if (!view.querySelector('.feed4-card')) view.innerHTML = '<p class="muted">' + t('noGuests') + '</p>';
      }
    });
    for (const card of cards) {
      card.querySelector('.feed4-time').insertAdjacentHTML('beforeend',
        link('feed/' + encodeURIComponent(card.dataset.post), t('openPost'), 'community-detail'));
    }
    const tracked = new Set();
    view.addEventListener('click', event => {
      if (!L.me || !event.target.closest('.community-detail, [data-like], [data-comments-button]')) return;
      const id = event.target.closest('[data-post]')?.dataset.post;
      if (!id || tracked.has(id)) return;
      tracked.add(id);
      void L.api('post_get', { id, community: true });
    });
  }

  function render(root) {
    stylesheet();
    root.className = 'l26-screen l26-community';
    const recap = L.open('l26_recap');
    const chatLabel = esc(L.t(L.open('openchat') ? 'nav.openchat' : 'nav.rooms'));
    root.innerHTML = '<h1>' + esc(L.t('nav.l26_lounge')) + '</h1>' +
      (recap ? '<section class="community-replay"><h2>' + t('recap') +
        '</h2><div data-community-replay aria-live="polite"><p class="muted">' + t('loading') + '</p></div></section>' : '') +
      '<section class="community-music"><header><h2>' + t('music') + '</h2><p>' + t('latest') +
      '</p></header><div data-community-music aria-live="polite"><div class="community-video-art" role="status">' +
      '<span class="sr-only">' + t('loading') + '</span></div></div></section>' +
      '<section class="community-guests"><header><h2>' + t('guests') + '</h2>' +
      (L.open('posts') ? link('compose', t('compose'), 'btn btn-hot') : '') + '</header>' +
      '<div data-community-stories hidden></div>' +
      '<div class="community-feed" data-community-feed aria-live="polite"><p class="muted">' + t('loading') + '</p></div>' +
      link('feed', t('viewFeed'), 'community-more') + '</section>' +
      '<section class="community-timetables" hidden></section>' +
      '<div class="community-shortcuts">' + link('rooms', chatLabel, 'community-more') +
      link(L.open('l26_play') ? 'l26_play' : 'play', t('play'), 'community-more') + '</div>';

    void preview(root.querySelector('[data-community-feed]'), root.querySelector('.community-timetables'));
    L.storyTray?.(root.querySelector('[data-community-stories]'));
    const replayReady = recap ? new Promise(resolve => {
      stopRefresh = watchReplay(root.querySelector('[data-community-replay]'), resolve);
    }) : Promise.resolve();
    const musicView = root.querySelector('[data-community-music]');
    return Promise.all([replayReady, music(musicView)]);
  }

  L.screen('l26_lounge', {
    title: 'nav.l26_lounge',
    async render(root, { section } = {}) {
      const ready = render(root);
      if (section !== 'replay' && section !== 'music') return;
      const style = document.getElementById('l26-community-css');
      const styleReady = style.sheet ? Promise.resolve() : new Promise(resolve => {
        style.addEventListener('load', resolve, { once: true });
        style.addEventListener('error', resolve, { once: true });
      });
      await Promise.all([ready, styleReady]);
      if (!root.isConnected) return;
      const replay = root.querySelector('.community-replay:not([hidden])');
      const target = (section === 'replay' && replay) || root.querySelector('.community-music');
      const heading = target.querySelector('h2');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start' });
    },
    leave() {
      stopRefresh?.();
      stopRefresh = undefined;
    }
  });
})(window.Lounge);
