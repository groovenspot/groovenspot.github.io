(function (L) {
  const words = {
    recap: ['어젯밤', 'Last night', '昨夜', '昨夜'],
    music: ['음악', 'Music', '音楽', '音乐'],
    guests: ['손님 피드', 'Guest feed', 'ゲストの投稿', '访客动态'],
    chat: ['채팅', 'Chat', 'チャット', '聊天'],
    play: ['놀거리 열기', 'Explore games', '遊びを開く', '查看游戏'],
    compose: ['글 쓰기', 'Write a post', '投稿する', '发帖'],
    viewFeed: ['피드 전체 보기', 'Open the feed', 'フィードを見る', '查看动态'],
    noGuests: ['아직 볼 수 있는 손님 글이 없어요.', 'No guest posts to show yet.', '表示できるゲストの投稿はまだありません。', '暂无可显示的访客帖子。'],
    photoPost: ['사진 게시물', 'Photo post', '写真の投稿', '照片帖子'],
    timetable: ['공식 타임테이블', 'Official timetable', '公式タイムテーブル', '官方时间表'],
    group: ['게시물 {n}개', '{n} posts', '{n} 件の投稿', '{n} 条帖子'],
    pending: ['리플레이는 한국 시간 정오에 올라와요.', 'The replay arrives at noon in Korea.', 'リプレイは韓国時間の正午に公開されます。', '回顾将于韩国时间中午发布。'],
    noRecap: ['공개된 리플레이가 아직 없어요.', 'No replay has been published yet.', '公開済みのリプレイはまだありません。', '暂无已发布的回顾。'],
    sparse: ['공개할 수 있는 영업 기록이 아직 없어요.', 'There are no records available to share for this night yet.', '公開できる営業記録はまだありません。', '这晚暂无可公开的营业记录。'],
    schedule: ['DJ 일정', 'DJ lineup', 'DJラインナップ', 'DJ 排期'],
    votes: ['지난 투표 결과', 'Past poll results', '過去の投票結果', '往期投票结果'],
    visits: ['인증 방문 {n}명', '{n} verified visits', '認証済みの来店 {n} 人', '{n} 位已验证来访者'],
    photo: ['공식 현장 사진', 'Official venue photo', '公式の会場写真', '官方现场照片'],
    unavailable: ['불러오지 못했어요.', 'Couldn’t load this section.', '読み込めませんでした。', '此板块加载失败。'],
    loading: ['불러오는 중', 'Loading', '読み込み中', '加载中']
  };
  L.i18n(Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((lang, index) => [lang,
    Object.fromEntries(Object.entries(words).map(([key, values]) => ['community.' + key, values[index]]))])));
  const esc = L.esc;
  const t = (key, vars) => esc(L.t('community.' + key, vars));
  const sessions = 'https://www.youtube.com/playlist?list=PLOztxiMT6--k';

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

  function replay(view, result) {
    if (!view.isConnected) return;
    const recap = result.recap, day = result.biz_day;
    if (result.error) {
      view.textContent = t('unavailable');
      return;
    }
    if (!recap) {
      view.textContent = t(result.pending ? 'pending' : 'noRecap');
      return;
    }
    const slots = recap.timetable || [];
    const photos = (recap.photos || []).filter(url =>
      /^https:\/\/groove-staff-api\.groovenspotbusan\.workers\.dev\/lounge-media\/[a-f0-9]{12}\/cf[a-z0-9]+$/.test(url));
    const votes = recap.votes || [];
    const hasRecords = Boolean(slots.length || votes.length || recap.verified_visits);
    const empty = '<p data-replay-empty' + (hasRecords || photos.length ? ' hidden' : '') + '>' + t('sparse') + '</p>';
    view.innerHTML = '<time datetime="' + esc(day) + '">' + esc(day) + '</time>' +
      (recap.verified_visits ? '<p class="community-visits">' + t('visits', { n: recap.verified_visits }) + '</p>' : '') +
      (photos.length ? '<div class="community-photos">' + photos.map(url =>
        '<img src="' + esc(url) + '" alt="' + t('photo') + '" loading="lazy" referrerpolicy="no-referrer">').join('') + '</div>' : '') +
      (slots.length ? '<details><summary>' + t('schedule') + '</summary><ul>' + slots.map(({ at, floor, dj }) =>
        '<li><time>' + esc(at) + '</time> <b data-l26-floor="' + esc(floor) + '">' + esc(floor) + '</b> ' +
        esc(dj) + '</li>').join('') + '</ul></details>' : '') +
      (votes.length ? '<details><summary>' + t('votes') + '</summary>' + votes.map(vote =>
        '<h3>' + esc(vote.title) + '</h3><ul>' + vote.choices.map(({ label, n }) =>
          '<li>' + esc(label) + ' <b>' + esc(n) + '</b></li>').join('') + '</ul>').join('') + '</details>' : '') + empty;
    for (const image of view.querySelectorAll('img')) {
      image.addEventListener('error', () => {
        const tray = image.parentElement;
        image.remove();
        if (tray.children.length) return;
        tray.remove();
        if (!hasRecords) view.querySelector('[data-replay-empty]').hidden = false;
      }, { once: true });
    }
    if (L.me) L.api('l26_recap_view', { biz_day: day });
  }

  function preview(view, result) {
    if (!view.isConnected) return;
    if (!result.ok) {
      view.textContent = t('unavailable');
      return;
    }
    const postLink = (id, body) => '<a class="community-post" data-community-post="' + esc(id) +
      '" href="#/feed/' + encodeURIComponent(id) + '">' + body + '</a>';
    const guests = result.guests || [];
    const timetables = result.timetables || [];
    view.innerHTML = (guests.length ? guests.map(post => postLink(post.id,
      '<b>' + esc(post.nick) + '</b><span>' + esc(post.text || t('photoPost')) + '</span>')).join('') :
      '<p class="muted">' + t('noGuests') + '</p>') +
      (timetables.length ? '<div class="community-timetables"><h3>' + t('timetable') + '</h3>' + timetables.map(group =>
        postLink(group.id, '<time datetime="' + esc(group.biz_day) + '">' + esc(group.biz_day) +
          '</time><span>' + t('group', { n: group.count }) + '</span>')).join('') + '</div>' : '');
  }

  function render(root) {
    stylesheet();
    root.className = 'l26-screen l26-community';
    const recap = L.open('l26_recap'), openchat = L.open('openchat');
    const canCompose = L.open('posts');
    const chatLabel = L.t(openchat ? 'nav.openchat' : 'nav.rooms');
    const playLabel = L.t('nav.l26_play');
    root.innerHTML = '<h1>' + L.t('nav.l26_lounge') + '</h1>' +
      (recap ? '<section class="community-card community-replay"><h2>' + t('recap') +
        '</h2><div data-community-replay aria-live="polite"><span class="muted">' + t('loading') + '</span></div></section>' : '') +
      '<section class="community-card community-music"><h2>' + t('music') + '</h2><a class="btn" href="' + sessions +
      '" target="_blank" rel="noopener noreferrer">GROOVE SESSIONS ↗</a></section>' +
      '<section class="community-card"><h2>' + t('guests') + '</h2><div data-community-stories hidden></div>' +
      '<div class="community-feed" data-community-feed aria-live="polite"><p class="muted">' + t('loading') + '</p></div>' +
      '<div class="community-actions">' + (canCompose ? link('compose', t('compose'), 'btn btn-hot') : '') +
      link('feed', t('viewFeed')) + '</div></section>' +
      '<div class="community-shortcuts"><section class="community-card"><h2>' + t('chat') + '</h2>' +
      link('rooms', chatLabel) + '</section><section class="community-card"><h2>' + playLabel + '</h2>' +
      link(L.open('l26_play') ? 'l26_play' : 'play', t('play')) + '</section></div>';

    const feed = root.querySelector('[data-community-feed]');
    L.api('feed', { community: true }).then(result => preview(feed, result));
    feed.addEventListener('click', event => {
      const post = event.target.closest('[data-community-post]');
      if (L.me && post) L.api('post_get', { id: post.dataset.communityPost, community: true });
    });
    L.storyTray?.(root.querySelector('[data-community-stories]'));
    if (recap) {
      const node = root.querySelector('[data-community-replay]');
      L.api('l26_recap').then(result => replay(node, result));
    }
  }

  L.screen('l26_lounge', { title: 'nav.l26_lounge', render });
})(window.Lounge);
