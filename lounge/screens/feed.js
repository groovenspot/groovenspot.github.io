// Shared styles for the four photo-post screens, loaded before the screen registrations.
const LoungePostUI = (() => {
  const L = Lounge, U = LoungeScreenUI;
  const css = document.createElement('style');
  css.textContent = `
    .post-screen { --post-gap:12px; --post-floor:var(--g); font-size:15px; line-height:1.5; }
    .post-screen [data-floor="3F"] { --post-floor:var(--s); }
    .post-screen [data-floor="2F"] { --post-floor:var(--g); }
    .post-screen .btn { min-width:44px; min-height:44px; padding:7px 12px; font-size:14px; line-height:1.25; }
    .post-screen .post-head, .post-screen .post-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; min-width:0; }
    .post-screen .post-head { justify-content:space-between; margin-bottom:var(--post-gap); }
    .post-screen .post-head h1 { font-size:clamp(22px,6vw,27px); font-weight:900; line-height:1.15; }
    .post-screen .post-head .post-close { width:44px; padding:0; font-size:25px; font-weight:500; }
    .post-screen .post-head:has(.post-close) h1 { flex:1; font-size:clamp(18px,5.5vw,23px); }
    .post-screen [data-post-tools] { display:grid; gap:var(--post-gap); margin-bottom:var(--post-gap); }
    .post-screen .post-tabs { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) repeat(2,minmax(44px,.7fr)); gap:6px; }
    .post-screen .post-tabs .btn { min-width:0; border-radius:999px; padding-inline:4px; }
    .post-screen .post-tabs .btn[aria-pressed="true"], .post-screen .post-floor-option input:checked + span {
      background:color-mix(in srgb,var(--post-floor) 20%,var(--card)); border-color:var(--post-floor); color:var(--txt);
    }
    .post-screen .post-tabs [data-floor], .post-screen .post-floor-option[data-floor] span {
      border-color:color-mix(in srgb,var(--post-floor) 52%,var(--line));
    }
    .post-screen .post-tabs [data-floor][aria-pressed="false"] { color:color-mix(in srgb,var(--post-floor) 75%,white); }
    .post-screen .post-stack { display:grid; gap:var(--post-gap); }
    .post-screen .post-card { min-width:0; border:1px solid var(--line); border-radius:var(--radius); background:var(--card); }
    .post-screen .post-pad { padding:14px; }
    .post-screen .post-card-header { display:grid; grid-template-columns:36px minmax(0,1fr); align-items:center; gap:10px; padding:10px 14px; min-height:56px; }
    .post-screen .post-avatar {
      display:grid; place-items:center; width:36px; height:36px; border-radius:50%; font-size:15px; font-weight:900;
      background:color-mix(in srgb,var(--post-floor) 23%,var(--card)); color:color-mix(in srgb,var(--post-floor) 70%, white);
    }
    .post-screen [data-kind="official"] .post-avatar { background:var(--post-floor); color:var(--g-ink); }
    .post-screen .post-author { display:flex; align-items:center; flex-wrap:wrap; gap:4px 6px; font-weight:900; font-size:14px; line-height:1.25; }
    .post-screen .post-badge, .post-screen .post-floor { display:inline-flex; border-radius:6px; padding:2px 6px; font-size:11px; font-weight:800; }
    .post-screen .post-badge { background:var(--txt); color:var(--g-ink); }
    .post-screen .post-floor { color:color-mix(in srgb,var(--post-floor) 72%,white); background:color-mix(in srgb,var(--post-floor) 16%,var(--card)); }
    .post-screen .post-meta { display:flex; align-items:center; gap:4px 8px; flex-wrap:wrap; font-size:12px; margin-top:3px; color:var(--muted); }
    .post-screen .post-caption { white-space:pre-wrap; font-size:14px; line-height:1.55; }
    .post-screen .post-card-body { display:grid; gap:9px; padding:12px 14px 14px; }
    .post-screen .post-actions { gap:6px; }
    .post-screen .post-actions .btn { padding-inline:9px; }
    .post-screen .post-actions [data-like][aria-pressed="true"] { color:var(--bad); border-color:color-mix(in srgb,var(--bad) 48%,var(--line)); }
    .post-screen .post-media { display:block; width:100%; height:auto; aspect-ratio:1; object-fit:cover; background:var(--bg-2); border:0; }
    .post-screen .post-cover { aspect-ratio:16/9; }
    .post-screen .post-feed-media { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:3px; }
    .post-screen .post-feed-media > :first-child { grid-column:1/-1; }
    .post-carousel { min-width:0; }
    .post-carousel-track { display:grid; grid-auto-flow:column; grid-auto-columns:100%; overflow-x:auto;
      scroll-snap-type:x mandatory; overscroll-behavior-inline:contain; overflow-anchor:none; scrollbar-width:none;
      -webkit-overflow-scrolling:touch; }
    .post-carousel-track::-webkit-scrollbar { display:none; }
    .post-slide { min-width:0; display:grid; place-items:center; scroll-snap-align:start; scroll-snap-stop:always; }
    .post-slide > :is(a.post-video,button.post-photo-button) { width:100%; min-height:44px; }
    .post-slide > button.post-photo-button { display:block; border:0; padding:0; background:var(--bg-2); cursor:pointer; }
    .post-slide-more { background:var(--bg-2); }
    .post-carousel-progress { display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:5px; min-height:24px; padding:4px 8px; }
    .post-carousel-progress span[aria-hidden] { width:6px; height:6px; border-radius:50%; background:var(--muted); }
    .post-carousel-progress span[data-current] { background:var(--g); }
    .post-screen .post-video { position:relative; display:block; color:var(--txt); }
    .post-screen .post-video span { position:absolute; inset:auto auto 12px 12px; padding:6px 9px; border-radius:8px;
      background:var(--bg); font-size:13px; font-weight:800; }
    .post-screen .post-feed-media .post-photo-button, .post-screen .post-album-grid .post-photo-button {
      display:block; width:100%; min-width:44px; min-height:44px; padding:0; border:0; cursor:pointer; background:var(--bg-2);
    }
    .post-screen .post-feed-media button:focus-visible, .post-screen .post-album-grid button:focus-visible { outline-offset:-4px; }
    .post-screen .post-album-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    .post-screen .post-album-grid button, .post-screen .post-album-grid img { border-radius:14px; }
    .post-screen .post-album-list { display:grid; grid-template-columns:minmax(0,1fr); gap:var(--post-gap); }
    .post-screen .post-album-cover .post-media { border-radius:17px 17px 0 0; }
    .post-screen .post-album-list .post-pad { display:grid; gap:5px; }
    .post-screen .post-album-list .btn { justify-self:start; margin-top:4px; }
    .post-screen .post-section { margin:0 0 8px; }
    .post-screen .post-state { border:1px dashed var(--line-2); border-radius:var(--radius); padding:18px 14px; color:var(--muted); font-size:14px; }
    .post-screen [data-posts]:not(:empty) + [data-page]:not(:empty),
    .post-screen .post-album-list + [data-page]:not(:empty) { margin-top:var(--post-gap); }
    .post-screen [data-page] > .btn { width:100%; }
    .post-screen .post-skeleton { display:grid; gap:10px; padding:14px; }
    .post-screen .post-shimmer { display:block; border-radius:8px; background:color-mix(in srgb,var(--card) 85%,var(--muted));
      animation:post-loading 1.25s ease-in-out infinite alternate; }
    .post-screen .post-skeleton-label { width:38%; height:14px; }
    .post-screen .post-skeleton-line { width:65%; height:11px; }
    .post-screen .post-skeleton .post-skeleton-media { border-radius:14px; }
    .post-screen .post-skeleton.post-feed-skeleton { padding:0; gap:0; }
    .post-screen .post-skeleton.post-feed-skeleton .post-skeleton-media { border-radius:0; }
    .post-screen .post-feed-skeleton .post-card-header { min-height:60px; }
    .post-screen .post-feed-skeleton .post-avatar { border-radius:50%; background:color-mix(in srgb,var(--card) 74%,var(--muted)); }
    .post-screen .post-feed-skeleton .post-skeleton-label + .post-skeleton-line { margin-top:7px; }
    @keyframes post-loading { to { background:color-mix(in srgb,var(--card) 72%,var(--muted)); } }
    @media (prefers-reduced-motion:reduce) { .post-screen .post-shimmer { animation:none; } }
    .post-screen .post-form { display:grid; gap:14px; }
    .post-screen .post-form label, .post-screen .post-form legend { font-size:14px; font-weight:800; }
    .post-screen .post-field { display:grid; gap:5px; min-width:0; }
    .post-screen .post-field textarea { resize:vertical; }
    .post-screen .post-field select { min-height:44px; text-overflow:ellipsis; }
    .post-screen .post-preview {
      display:grid; place-items:center; width:100%; aspect-ratio:6/5; min-width:0;
      padding:0; overflow:hidden; background:var(--bg-2); border:1px solid var(--line-2); border-radius:16px;
    }
    .post-screen .post-preview-empty { border-style:dashed; color:var(--muted); align-content:center; gap:6px; }
    .post-screen .post-preview-empty [aria-hidden] { font-size:27px; color:var(--g); line-height:1; }
    .post-screen .post-preview .post-media { aspect-ratio:6/5; object-fit:contain; }
    .post-screen .post-thumbnails { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:6px; }
    .post-screen .post-thumb { position:relative; display:grid; place-items:center; min-width:44px; min-height:44px; width:100%; aspect-ratio:1;
      padding:0; border:1px solid var(--line-2); border-radius:12px; overflow:hidden; color:var(--txt); background:var(--bg-2); }
    .post-screen .post-thumb > span { position:absolute; inset:2px 2px auto auto; border-radius:50%; width:20px; height:20px;
      background:var(--bg); line-height:20px; text-align:center; }
    .post-screen .post-thumb:first-child:has(img) { border-color:var(--g); }
    .post-screen .post-thumb-add { font-size:24px; color:var(--g); border-style:dashed; }
    .post-screen .post-photo-count { font-size:12px; color:var(--muted); }
    .post-screen .post-floors { border:0; padding:0; margin:0; min-width:0; }
    .post-screen .post-floor-option { position:relative; }
    .post-screen .post-floor-option span { display:flex; align-items:center; justify-content:center; min-width:44px; min-height:44px;
      padding:4px 10px; border:1px solid var(--line-2); border-radius:999px; cursor:pointer; }
    .post-screen .post-floor-option input:focus-visible + span { outline:2px solid var(--g); outline-offset:3px; }
    .post-screen .post-note { padding:10px 12px; border:1px solid color-mix(in srgb,var(--g) 30%,var(--line));
      border-radius:14px; background:color-mix(in srgb,var(--g) 6%,var(--card)); font-size:13px; }
    .post-screen .post-challenge { display:grid; gap:10px; }
    .post-screen .post-challenge h3 { margin:0; font-size:14px; }
    .post-screen .post-ranking { display:grid; gap:7px; padding:0; margin:0; list-style:none; }
    .post-screen .post-ranking a { display:grid; grid-template-columns:25px 56px minmax(0,1fr); align-items:center; gap:8px; min-height:56px;
      border:1px solid var(--line); border-radius:12px; overflow:hidden; color:var(--txt); text-decoration:none; }
    .post-screen .post-ranking .post-rank { justify-self:end; color:var(--muted); font-size:12px; font-weight:900; }
    .post-screen .post-ranking .post-media { border-radius:7px; }
    .post-screen .post-ranking .post-rank-body { padding:5px 8px 5px 0; font-size:14px; line-height:1.3; }
    .post-screen .post-ranking .post-winner { border-color:color-mix(in srgb,var(--g) 56%,var(--line)); }
  `;
  document.head.append(css);

  function mount(root, title, actions = '', leading = '') {
    const view = U.mount(root, '<header class="post-head" data-post-layout>' + leading +
      '<h1>' + title + '</h1>' + actions + '</header>');
    view.parentElement.classList.add('post-screen');
    return view;
  }

  function photo(value) {
    const src = U.image(value?.src || value?.url || value?.key || value);
    return { src, thumb: U.image(value?.thumb) || src, w: value?.w, h: value?.h };
  }

  function dimensions(value, width, height) {
    const usable = Number.isSafeInteger(value?.w) && value.w > 0 && Number.isSafeInteger(value?.h) && value.h > 0;
    return ' width="' + (usable ? value.w : width) + '" height="' + (usable ? value.h : height) + '"';
  }

  function image(src, alt = '', cover = false, size) {
    return '<img class="post-media' + (cover ? ' post-cover' : '') + '"' + dimensions(size, cover ? 640 : 512, cover ? 360 : 512) +
      ' loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="' +
      alt + '" src="' + L.esc(src) + '">';
  }

  function zoomImage(src, alt, size) {
    return '<img' + dimensions(size, 512, 512) + ' loading="lazy" referrerpolicy="no-referrer" alt="' + alt +
      '" style="' + U.media + ';height:auto;aspect-ratio:1;max-height:65vh;object-fit:contain" src="' + L.esc(src) + '">';
  }

  // dots: 점을 그릴 자리(없으면 사진 아래에 만든다) · badge: '1/5' 를 적을 자리(없으면 점 옆 작은 글자)
  function carousel(container, slides, { start = 0, more, load, onIndex, dots, badge } = {}) {
    container.classList.add('post-carousel');
    container.innerHTML = '<div class="post-carousel-track" role="region" tabindex="0" aria-label="' +
      L.esc(L.t('feed.photos')) + '"></div>' + (dots ? '' : '<div class="post-carousel-progress" aria-hidden="true"></div>');
    const track = container.firstElementChild, progress = dots || container.lastElementChild;
    if (dots) { dots.classList.add('post-carousel-progress'); dots.setAttribute('aria-hidden', 'true'); }
    let end, requested = false, finger, index = -1, shownCount = -1;
    const slide = markup => {
      const item = document.createElement('div');
      item.className = 'post-slide';
      item.innerHTML = markup;
      return item;
    };
    if (more) {
      end = slide(U.link(more, L.esc(L.t('feed.morePhotos'))));
      end.classList.add('post-slide-more');
      track.append(end);
    }
    function update() {
      const count = Math.max(0, track.childElementCount - Number(Boolean(end)));
      const next = Math.max(0, Math.min(track.childElementCount - 1, Math.round(track.scrollLeft / (track.clientWidth || 1))));
      if (next === index && count === shownCount) return;
      if (next !== index) {
        index = next;
        if (next < count) onIndex?.(next);
      }
      shownCount = count;
      progress.hidden = count < 2;
      progress.innerHTML = count > 1
        ? Array.from({ length: count }, (_, i) => '<span aria-hidden="true"' + (i === index ? ' data-current' : '') + '></span>').join('') +
          (!badge && index < count ? '<small>' + (index + 1) + '/' + count + '</small>' : '') : '';
      if (badge) {
        badge.hidden = count < 2 || index >= count;
        badge.textContent = (index + 1) + '/' + count;
      }
    }
    track.prepend(...slides.map(slide));
    update();
    async function expand() {
      if (!load || requested) return;
      requested = true;
      const items = await load();
      if (!container.isConnected || !items || !end) return;
      const cover = track.firstElementChild;
      if (!items.length) cover.remove();
      else if (slides[0] !== items[0]) cover.innerHTML = items[0];
      if (items.length > 1) {
        // Keep the two existing snap areas in place while WebKit finishes the swipe.
        const moreSlide = end.cloneNode(true);
        end.classList.remove('post-slide-more');
        end.innerHTML = items[1];
        track.append(...items.slice(2).map(slide), moreSlide);
        end = moreSlide;
      }
      update();
    }
    track.addEventListener('scroll', () => {
      update();
      if (track.scrollLeft > 4) void expand();
    }, { passive: true });
    if (load) {
      track.addEventListener('touchstart', event => {
        finger = event.touches.length === 1 ? event.touches[0] : null;
      }, { passive: true });
      track.addEventListener('touchmove', event => {
        if (!finger || event.touches.length !== 1) return;
        const next = event.touches[0], x = finger.clientX - next.clientX;
        if (x > 12 && x > Math.abs(finger.clientY - next.clientY)) void expand();
      }, { passive: true });
    }
    track.addEventListener('keydown', event => {
      if (event.altKey || event.metaKey || event.ctrlKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowRight') void expand();
      track.scrollLeft = (index + (event.key === 'ArrowRight' ? 1 : -1)) * track.clientWidth;
      update();
    });
    if (start) {
      track.scrollLeft = start * track.clientWidth;
      update();
    }
    return {
      remove(button) {
        button.closest('.post-slide')?.remove();
        if (!track.childElementCount) container.remove();
        else update();
      },
      get index() { return Math.max(0, index); }
    };
  }

  // 위 막대가 있는 화면 틀 (4차): 공통 헤더 대신 L.bar 를 쓰는 화면(bar: 'own')용
  function page(root, bar) {
    const view = document.createElement('section');
    view.className = 'post-screen feed4-page';
    view.innerHTML = L.bar(bar) + '<div data-content></div>';
    root.replaceChildren(view);
    return view.querySelector('[data-content]');
  }

  function state(message) {
    return '<p class="post-state" role="status">' + message + '</p>';
  }

  function skeleton(media = '') {
    const feed = media === 'feed';
    const lines = '<span class="post-shimmer post-skeleton-label" aria-hidden="true"></span>' +
      '<span class="post-shimmer post-skeleton-line" aria-hidden="true"></span>';
    return '<div class="post-card post-skeleton' + (feed ? ' post-feed-skeleton' : '') +
      '" role="status" data-post-skeleton><span class="sr-only">' + U.t('loading') + '</span>' +
      (feed ? '<div class="post-card-header" aria-hidden="true"><span class="post-avatar post-shimmer"></span><div>' +
        lines + '</div></div>' : lines) +
      (media ? '<span class="post-shimmer post-media post-skeleton-media' + (media === 'cover' ? ' post-cover' : '') +
        '" aria-hidden="true"></span>' : '') +
      (feed ? '<div class="post-card-body"><span class="post-shimmer post-skeleton-line" aria-hidden="true"></span></div>' : '') + '</div>';
  }

  return { mount, page, image, photo, zoomImage, carousel, state, skeleton };
})();

// ── 4차: 인스타그램 방식 피드 (SPEC4 2·4·9장) ── 카드·댓글 시트·좋아요 목록·피드 화면. 모양은 css/feed.css.
(() => {
  const L = Lounge, U = LoungeScreenUI;
  const P = LoungePostUI;
  const t = U.words('feed', {
    official: ['공식', 'Official'], photos: ['어젯밤 사진', 'Last night’s photos'],
    morePhotos: ['사진 더보기', 'More photos'],
    like: ['좋아요', 'Like'], comments: ['댓글', 'Comments'], more: ['더 보기', 'Load more'],
    write: ['댓글 쓰기', 'Write a comment'], send: ['보내기', 'Send'],
    following: ['팔로잉', 'Following'], all: ['전체', 'All'], filters: ['피드 보기', 'Filter feed'],
    compose: ['글쓰기', 'Write a post'], member: ['손님 사진', 'Guest photo'],
    challenge: ['포토 챌린지', 'Photo challenge'], delete: ['내 글 지우기', 'Delete my post'],
    confirm: ['이 글을 지울까요?', 'Delete this post?'], youtube: ['유튜브에서 보기', 'Watch on YouTube'],
    take: ['사진을 내려 주세요', 'Take this photo down'], photo: ['사진 {n} 크게 보기', 'Enlarge photo {n}'],
    moreEmpty: ['팔로우한 사람의 사진 글이 여기 보여요.', 'Posts by people you follow will appear here.'],
    floorEmpty: ['{floor} 글이 아직 없어요.', 'No {floor} posts yet.'],
    feedEmpty: ['피드에 아직 글이 없어요.', 'No posts in the feed yet.'],
    missing: ['이 글을 볼 수 없어요.', 'This post is unavailable.']
  });
  const w = U.words('feed4', {
    post: ['게시물', 'Post'], search: ['검색', 'Search'], albums: ['사진첩', 'Photos'], challenge: ['챌린지', 'Challenge'],
    follow: ['팔로우', 'Follow'], requested: ['요청됨', 'Requested'], menu: ['게시물 메뉴', 'Post options'],
    likes: ['좋아요 {n}개', '{n} likes'], likedBy: ['{nick}님 외 {n}명이 좋아합니다', 'Liked by {nick} and {n} others'],
    likedBy1: ['{nick}님이 좋아합니다', 'Liked by {nick}'], capMore: ['더 보기', 'more'],
    allComments: ['댓글 {n}개 모두 보기', 'View all {n} comments'], addComment: ['댓글 달기…', 'Add a comment…'],
    submit: ['게시', 'Post'], noComments: ['아직 댓글이 없어요', 'No comments yet'],
    firstComment: ['첫 댓글을 남겨 보세요.', 'Start the conversation.'], reply: ['답글 달기', 'Reply'],
    replying: ['{nick}님에게 답글 남기는 중', 'Replying to {nick}'], delete: ['삭제', 'Delete'], report: ['신고', 'Report'],
    cLike: ['댓글 좋아요', 'Like comment'], cMore: ['댓글 메뉴', 'Comment options'],
    cDeleted: ['댓글을 지웠어요.', 'Comment deleted.'], likesTitle: ['좋아요', 'Likes'],
    noLikes: ['아직 좋아요가 없어요.', 'No likes yet.'], edit: ['수정', 'Edit'],
    pin: ['프로필에 고정', 'Pin to profile'], unpin: ['프로필 고정 해제', 'Unpin from profile'],
    pinned: ['프로필에 고정했어요.', 'Pinned to your profile.'], unpinned: ['고정을 해제했어요.', 'Unpinned.'],
    pinLimit: ['고정은 3개까지 할 수 있어요.', 'You can pin up to 3 posts.'],
    save: ['저장', 'Save'], unsave: ['저장 취소', 'Remove from saved'], share: ['공유', 'Share'],
    copy: ['링크 복사', 'Copy link'], copied: ['링크를 복사했어요.', 'Link copied.'],
    newPosts: ['새 게시물', 'New posts'], end: ['모두 확인했어요', 'You’re all caught up'],
    endBody: ['새 글이 올라오면 여기에 보여요.', 'New posts will show up here.'],
    play: ['영상 재생', 'Play video'], edited: ['수정됨', 'Edited'], video: ['영상', 'Video'],
    tagged: ['태그된 사람', 'Tagged people'], taggedN: ['태그된 사람 {n}명', '{n} tagged people'], pending: ['승인 대기', 'Awaiting approval'],
    saved: ['저장했어요', 'Saved'], toCollection: ['모음에 저장', 'Save to collection'], collections: ['모음에 저장', 'Save to collection'],
    newCollection: ['새 모음 이름', 'New collection name'], create: ['만들기', 'Create'], items: ['{n}개', '{n} posts'],
    savedTo: ['‘{title}’ 모음에 저장했어요.', 'Saved to “{title}”.'], collectionLimit: ['모음은 20개까지 만들 수 있어요.', 'You can create up to 20 collections.'],
    noCollections: ['아직 모음이 없어요. 아래에서 새로 만들어 보세요.', 'No collections yet. Create one below.'],
    gone: ['게시물을 볼 수 없어요', 'This post isn’t available'], goneBody: ['지워졌거나 볼 수 없는 글이에요.', 'It may have been deleted or isn’t visible to you.'],
    followTitle: ['팔로우한 사람이 올린 글이 아직 없어요', 'No posts from people you follow yet'], suggest: ['추천 계정 보기', 'See suggested accounts']
  });
  L.i18n({
    ja: {
      'feed4.post': '投稿', 'feed4.search': '検索', 'feed4.albums': 'アルバム', 'feed4.challenge': 'チャレンジ',
      'feed4.follow': 'フォロー', 'feed4.requested': 'リクエスト済み', 'feed4.menu': '投稿メニュー',
      'feed4.likes': 'いいね！{n}件', 'feed4.likedBy': '{nick}さん、他{n}人が「いいね！」しました',
      'feed4.likedBy1': '{nick}さんが「いいね！」しました', 'feed4.capMore': '続きを読む',
      'feed4.allComments': 'コメント{n}件をすべて見る', 'feed4.addComment': 'コメントを追加…', 'feed4.submit': '投稿する',
      'feed4.noComments': 'まだコメントはありません', 'feed4.firstComment': '最初のコメントを書いてみましょう。',
      'feed4.reply': '返信する', 'feed4.replying': '{nick}さんに返信中', 'feed4.delete': '削除', 'feed4.report': '報告',
      'feed4.cLike': 'コメントにいいね', 'feed4.cMore': 'コメントメニュー', 'feed4.cDeleted': 'コメントを削除しました。',
      'feed4.likesTitle': 'いいね！', 'feed4.noLikes': 'まだ「いいね！」はありません。', 'feed4.edit': '編集',
      'feed4.pin': 'プロフィールに固定', 'feed4.unpin': '固定を解除', 'feed4.pinned': 'プロフィールに固定しました。',
      'feed4.unpinned': '固定を解除しました。', 'feed4.pinLimit': '固定できるのは3件までです。',
      'feed4.save': '保存', 'feed4.unsave': '保存を取り消す', 'feed4.share': 'シェア', 'feed4.copy': 'リンクをコピー',
      'feed4.copied': 'リンクをコピーしました。', 'feed4.newPosts': '新しい投稿', 'feed4.end': 'すべてチェックしました',
      'feed4.endBody': '新しい投稿があるとここに表示されます。', 'feed4.play': '動画を再生', 'feed4.edited': '編集済み', 'feed4.video': '動画',
      'feed4.tagged': 'タグ付けされた人', 'feed4.taggedN': 'タグ付けされた人 {n}人', 'feed4.pending': '承認待ち',
      'feed4.saved': '保存しました', 'feed4.toCollection': 'コレクションに保存', 'feed4.collections': 'コレクションに保存',
      'feed4.newCollection': '新しいコレクション名', 'feed4.create': '作成', 'feed4.items': '{n}件',
      'feed4.savedTo': '「{title}」に保存しました。', 'feed4.collectionLimit': 'コレクションは20個まで作成できます。',
      'feed4.noCollections': 'まだコレクションがありません。下で作成できます。',
      'feed4.gone': 'この投稿は表示できません', 'feed4.goneBody': '削除されたか、表示できない投稿です。',
      'feed4.followTitle': 'フォロー中の人の投稿はまだありません', 'feed4.suggest': 'おすすめアカウントを見る'
    },
    zh: {
      'feed4.post': '帖子', 'feed4.search': '搜索', 'feed4.albums': '相册', 'feed4.challenge': '挑战',
      'feed4.follow': '关注', 'feed4.requested': '已请求', 'feed4.menu': '帖子选项',
      'feed4.likes': '{n} 次赞', 'feed4.likedBy': '{nick} 和其他 {n} 人赞了', 'feed4.likedBy1': '{nick} 赞了',
      'feed4.capMore': '展开', 'feed4.allComments': '查看全部 {n} 条评论', 'feed4.addComment': '添加评论…', 'feed4.submit': '发布',
      'feed4.noComments': '还没有评论', 'feed4.firstComment': '来写第一条评论吧。', 'feed4.reply': '回复',
      'feed4.replying': '正在回复 {nick}', 'feed4.delete': '删除', 'feed4.report': '举报',
      'feed4.cLike': '赞评论', 'feed4.cMore': '评论选项', 'feed4.cDeleted': '已删除评论。', 'feed4.likesTitle': '赞',
      'feed4.noLikes': '还没有人点赞。', 'feed4.edit': '编辑', 'feed4.pin': '置顶到主页', 'feed4.unpin': '取消置顶',
      'feed4.pinned': '已置顶到主页。', 'feed4.unpinned': '已取消置顶。', 'feed4.pinLimit': '最多可置顶 3 条帖子。',
      'feed4.save': '收藏', 'feed4.unsave': '取消收藏', 'feed4.share': '分享', 'feed4.copy': '复制链接',
      'feed4.copied': '链接已复制。', 'feed4.newPosts': '新帖子', 'feed4.end': '你已看完全部内容',
      'feed4.endBody': '有新帖子时会显示在这里。', 'feed4.play': '播放视频', 'feed4.edited': '已编辑', 'feed4.video': '视频',
      'feed4.tagged': '被标记的人', 'feed4.taggedN': '{n} 位被标记的人', 'feed4.pending': '等待确认',
      'feed4.saved': '已收藏', 'feed4.toCollection': '收藏到合集', 'feed4.collections': '收藏到合集',
      'feed4.newCollection': '新合集名称', 'feed4.create': '创建', 'feed4.items': '{n} 条',
      'feed4.savedTo': '已收藏到“{title}”。', 'feed4.collectionLimit': '最多可创建 20 个合集。',
      'feed4.noCollections': '还没有合集，可在下方新建。',
      'feed4.gone': '无法查看此帖子', 'feed4.goneBody': '帖子可能已被删除或无法查看。',
      'feed4.followTitle': '你关注的人还没有发帖', 'feed4.suggest': '查看推荐账号'
    }
  });

  // 낱말 속 {자리} 에 HTML 을 끼워 넣기 (낱말은 이스케이프, 끼우는 값은 이미 안전한 HTML)
  function rich(key, parts) {
    let text = L.esc(L.t('feed4.' + key));
    for (const [name, html] of Object.entries(parts)) text = text.split('{' + name + '}').join(html);
    return text;
  }
  const profileLink = nick => '#/u/' + encodeURIComponent(nick);
  function stamp(at) {
    const time = typeof at === 'number' ? at : Date.parse(at);
    return Number.isFinite(time) && Math.abs(time) < 8e15 ? ' datetime="' + new Date(time).toISOString() + '"' : '';
  }
  const clampRatio = ratio => Math.min(1.91, Math.max(0.8, ratio));   // 세로 4:5 ~ 가로 1.91:1
  const iconButton = (name, attrs, label, size) => '<button type="button" class="feed4-ico" ' + attrs +
    (label ? ' aria-label="' + label + '"' : '') + '>' + L.icon(name, { size: size || 24 }) + '</button>';
  const spinner = () => '<p class="feed4-wait" role="status" data-loading><span class="sr-only">' + U.t('loading') + '</span><i aria-hidden="true"></i></p>';
  const sheetHead = title => '<header class="feed4-sheet-head"><h2>' + title + '</h2>' +
    iconButton('close', 'data-sheet-close', L.esc(L.t('core.close')), 22) + '</header>';

  // 같은 글의 카드가 여러 곳에 있어도(피드·상세) 숫자를 맞춘다
  const live = new Map();
  function track(id, entry) {
    if (!live.has(id)) live.set(id, new Set());
    live.get(id).add(entry);
  }
  function sync(id) {
    const entries = live.get(id);
    if (!entries) return;
    for (const entry of entries) {
      if (entry.card.isConnected) entry.paint();
      else entries.delete(entry);
    }
    if (!entries.size) live.delete(id);
  }
  function postOf(id) {
    for (const entry of live.get(id) || []) if (entry.card.isConnected) return entry.post;
    return null;
  }
  function setComments(post, count) {
    const value = Math.max(0, count);
    post.comments = value;
    for (const entry of live.get(post.id) || []) entry.post.comments = value;
    sync(post.id);
  }

  // ── 저장 모음 ── 서버가 collections 를 모르면(예전 서버) 어디에도 보이지 않는다
  let collectionsKnown = null, collectionsAsk = null;
  function collectionsOk() {
    if (!L.me) return Promise.resolve(false);
    collectionsAsk ||= L.api('collections').then(result => {
      if (Array.isArray(result.list)) return (collectionsKnown = true);
      if (result.error === 'network' || result.error === 'server') { collectionsAsk = null; return false; }
      return (collectionsKnown = false);
    });
    return collectionsAsk;
  }
  function markSaved(post) {
    post.saved = true;
    document.querySelectorAll('.feed4-bar [data-share-save]').forEach(button => {
      if (button.dataset.shareSave !== String(post.id)) return;
      button.setAttribute('aria-pressed', 'true');
      if (button.querySelector('svg')) {   // share.js 가 그린 책갈피 아이콘: 채운 모양으로
        button.innerHTML = L.icon('bookmark', { fill: true }) + '<span class="sr-only">' + w('unsave') + '</span>';
        button.setAttribute('aria-label', L.t('feed4.unsave'));
      } else button.textContent = L.t('feed4.unsave');
    });
  }
  function openCollections(post) {
    if (L.needLogin()) return;
    const panel = L.sheet(sheetHead(w('collections')) + '<div class="feed4-llist" data-collections data-no-drag>' + spinner() + '</div>' +
      '<form class="feed4-colnew" data-collection-new><input name="title" maxlength="20" required autocomplete="off" placeholder="' + w('newCollection') +
      '" aria-label="' + w('newCollection') + '"><button type="submit" class="feed4-send">' + w('create') + '</button></form>');
    panel.classList.add('feed4-sheet', 'feed4-colsheet');
    panel.querySelector('[data-sheet-close]').onclick = () => L.closeSheet();
    const list = panel.querySelector('[data-collections]'), form = panel.querySelector('form');
    let busy = false;
    async function put(id, title) {
      const result = await L.api('save', { post: post.id, collection: id });
      if (!result || result.ok !== true) { U.error(result); return false; }
      markSaved(post);
      if (panel.isConnected) L.closeSheet();
      L.toast(L.t('feed4.savedTo', { title }));
      return true;
    }
    list.addEventListener('click', async event => {
      const button = event.target.closest('[data-collection]');
      if (!button || busy) return;
      busy = true;
      button.disabled = true;
      if (!await put(button.dataset.collection, button.dataset.title) && button.isConnected) button.disabled = false;
      busy = false;
    });
    form.onsubmit = async event => {
      event.preventDefault();
      const title = form.elements.title.value.trim().slice(0, 20), send = form.querySelector('button');
      if (!title || busy) return;
      busy = true;
      send.disabled = true;
      const made = await L.api('collection_set', { title });
      if (made?.ok === true && made.id != null) await put(made.id, title);
      else if (made?.error === 'collection_limit') L.toast(L.t('feed4.collectionLimit'));
      else U.error(made);
      busy = false;
      if (send.isConnected) send.disabled = false;
    };
    L.api('collections').then(result => {
      if (!panel.isConnected) return;
      if (!Array.isArray(result.list)) return L.closeSheet();
      list.innerHTML = result.list.map(item => {
        const cover = L.photoSrc(item.cover);
        return '<button type="button" class="feed4-col" data-collection="' + L.esc(item.id) + '" data-title="' + L.esc(item.title) + '">' +
          '<span class="feed4-col-cover">' + (cover ? '<img src="' + L.esc(cover) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : L.icon('bookmark', { size: 20 })) +
          '</span><span class="feed4-col-name"><b>' + L.esc(item.title) + '</b><small>' + w('items', { n: L.count(item.count) }) + '</small></span>' +
          L.icon('plus', { size: 20 }) + '</button>';
      }).join('') || '<div class="feed4-cempty"><span>' + w('noCollections') + '</span></div>';
    });
    return panel;
  }
  // 저장 직후 아래에 잠깐 뜨는 줄: '저장했어요 · 모음에 저장'
  let snackTimer;
  function offerCollection(post) {
    let snack = document.querySelector('.feed4-snack');
    if (!snack) {
      snack = document.createElement('div');
      snack.className = 'feed4-snack';
      snack.setAttribute('role', 'status');
      document.body.append(snack);
    }
    snack.innerHTML = '<span>' + w('saved') + '</span><button type="button" data-to-collection>' + w('toCollection') + '</button>';
    snack.hidden = false;
    snack.querySelector('button').onclick = () => { snack.hidden = true; openCollections(post); };
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => { snack.hidden = true; }, 4500);
  }
  window.addEventListener('hashchange', () => { const snack = document.querySelector('.feed4-snack'); if (snack) snack.hidden = true; });

  // ── 글 카드 ──
  function buildCard(post, opt = {}) {
    const card = document.createElement('article');
    card.className = 'feed4-card';
    card.dataset.post = post.id;
    card.dataset.kind = post.kind;
    if (post.floor === '2F' || post.floor === '3F') card.dataset.floor = post.floor;
    const album = post.kind === 'album', member = post.kind === 'member', mine = member && post.mine === true;
    const images = (post.photos || []).map((value, i) => {
      const photo = P.photo(value), size = Array.isArray(post.sizes) ? post.sizes[i] : null;
      return { ...photo, w: size?.[0] || photo.w, h: size?.[1] || photo.h,
        key: value?.src ?? value?.key ?? value?.photo ?? value?.id ?? value };
    }).filter(photo => photo.src).slice(0, album ? 20 : undefined);
    const videoId = /^[A-Za-z0-9_-]{11}$/.test(post.youtube || '') ? post.youtube : '';
    const videoUrl = videoId ? 'https://www.youtube.com/watch?v=' + videoId : '';
    const nick = post.author?.nick || 'GROOVE';
    const person = { ...post.author, nick };
    const linked = member && Boolean(post.author?.nick);
    const albumId = post.albumId ?? post.id;
    const albumLink = '#/photos/' + encodeURIComponent(albumId);
    const sliding = album || images.length > 1;
    const video = post.video;
    const credits = video && Number.isSafeInteger(video.session) ? '<div class="feed4-sub" data-video-session="' + video.session + '">' +
      L.esc(['GROOVE SESSION #' + video.session, video.dj, video.duration].filter(Boolean).join(' · ')) + '</div>' : '';
    const first = images[0];
    const known = post._ratio || (first?.w > 0 && first?.h > 0 ? clampRatio(first.w / first.h) : 0);
    const ratio = videoId ? 16 / 9 : known || 1;

    const imageTag = (photo, alt) => {
      const sized = Number.isSafeInteger(photo.w) && photo.w > 0 && Number.isSafeInteger(photo.h) && photo.h > 0;
      return '<img class="feed4-img" width="' + (sized ? photo.w : 1080) + '" height="' + (sized ? photo.h : 1080) +
        '" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="' + alt + '" src="' + L.esc(photo.thumb) + '">';
    };
    const slide = (photo, index) => {
      if (member) return '<button type="button" class="post-photo-button feed4-photo" data-member-photo="' + index + '">' +
        imageTag(photo, t('photo', { n: index + 1 })) + '</button>';
      if (videoId && index === 0) return '<button type="button" class="feed4-photo feed4-video" data-video-play aria-label="' +
        w('play') + '">' + imageTag(photo, '') + '<span class="feed4-playmark" aria-hidden="true">' + L.icon('play', { fill: true, size: 30 }) + '</span></button>';
      return '<div class="feed4-photo">' + imageTag(photo, '') + '</div>';
    };
    const media = images.map(slide);
    const floorLabel = card.dataset.floor ? post.floor + ' ' + (post.floor === '2F' ? 'GROOVE' : 'SPOT') : '';
    const sub = [floorLabel, album ? t('photos') : ''].filter(Boolean).join(' · ');
    const canFollow = member && !mine && post.author?.following === false && Boolean(L.me);
    const tagged = (Array.isArray(post.tagged) ? post.tagged : []).filter(person => person?.nick);

    card.innerHTML = '<header class="feed4-head">' +
      (linked || person.photo ? L.avatar(person, 34, { link: linked, ring: true })
        : '<span class="ui-avatar feed4-official" style="--s:34px" aria-hidden="true"><span class="ui-avatar-letter">G</span></span>') +
      '<div class="feed4-who"><div class="feed4-name post-author">' +
      (linked ? '<a class="feed4-nick" href="' + profileLink(nick) + '">' + L.whoTag(person) + '</a>'
        : '<strong class="feed4-nick">' + L.whoTag(person) + '</strong>') +
      (post.kind === 'official' ? '<span class="feed4-badge-official">' + t('official') + '</span>' : '') +
      (canFollow ? '<span class="feed4-dot" aria-hidden="true">·</span><button type="button" class="feed4-follow" data-follow="' +
        L.esc(nick) + '">' + w('follow') + '</button>' : '') + '</div>' +
      (sub ? '<div class="feed4-sub">' + L.esc(sub) + '</div>' : '') + credits + '</div>' +
      iconButton('more', 'data-more', w('menu')) + '</header>' +
      (media.length ? '<div class="feed4-media" data-media style="aspect-ratio:' + ratio.toFixed(4) + '"' + (known || videoId ? '' : ' data-auto') + '>' +
        (sliding ? '<div class="feed4-track" data-feed-carousel></div>' : '<div class="feed4-single">' + media[0] + '</div>') +
        (tagged.length ? '<button type="button" class="feed4-tagged" data-tagged aria-label="' + w('taggedN', { n: tagged.length }) + '"><span>' +
          L.icon('user', { size: 16, fill: true }) + '</span></button>' : '') +
        '<span class="feed4-count" data-count hidden></span><span class="feed4-burst" data-burst aria-hidden="true">' +
        L.icon('heart', { fill: true, size: 96 }) + '</span></div>' : '') +
      '<div class="feed4-bar post-actions" data-post-layout><div class="feed4-bar-left" data-bar-left>' +
      '<button type="button" class="feed4-ico" data-like aria-label="' + L.esc(L.t('feed.like')) + '"></button><span class="feed4-n" data-like-n></span>' +
      '<button type="button" class="feed4-ico" data-comments-button>' + L.icon('comment', { size: 25 }) + '</button><span class="feed4-n" data-comment-n></span>' +
      '</div><div class="feed4-dots" data-dots></div><div class="feed4-bar-right" data-bar-right></div></div>' +
      '<div class="feed4-body post-card-body"><button type="button" class="feed4-likes" data-likes hidden></button>' +
      (post.text ? '<div class="feed4-cap' + (opt.detail ? ' is-open' : '') + '" data-cap>' +
        (linked ? '<a class="feed4-nick" href="' + profileLink(nick) + '">' + L.esc(nick) + '</a>' : '<strong class="feed4-nick">' + L.esc(nick) + '</strong>') +
        ' <p>' + L.linkify(post.text) + '</p></div>' : '') +
      (album ? '<a class="feed4-link" href="' + albumLink + '">' + t('morePhotos') + '</a>' : '') +
      (post.challenge ? '<a class="feed4-link" href="#/challenge">' + t('challenge') + '</a>' : '') +
      (videoUrl && !images.length ? '<button type="button" class="feed4-link" data-video-play>' + w('play') + '</button>' : '') +
      (opt.detail ? '' : '<button type="button" class="feed4-allc" data-comments-all hidden></button><div class="feed4-preview" data-preview></div>') +
      '<div class="feed4-time"><time' + stamp(post.at) + '>' + L.esc(L.ago(post.at, true)) + '</time>' +
      (post.edited ? '<span> · ' + w('edited') + '</span>' : '') + '</div></div>';

    const mediaBox = card.querySelector('[data-media]');
    const like = card.querySelector('[data-like]'), likeN = card.querySelector('[data-like-n]');
    const commentButton = card.querySelector('[data-comments-button]'), commentN = card.querySelector('[data-comment-n]');
    const likesLine = card.querySelector('[data-likes]'), allComments = card.querySelector('[data-comments-all]');
    const preview = card.querySelector('[data-preview]');
    let current = 0, busy = false;

    // 사진: 옆으로 넘기기 · 사진 위 '1/5' · 아래 점
    const trackBox = card.querySelector('[data-feed-carousel]');
    const carousel = trackBox && P.carousel(trackBox, media, {
      dots: card.querySelector('[data-dots]'), badge: card.querySelector('[data-count]'),
      onIndex: index => { current = index; },
      ...(album && {
        more: albumLink,
        load: media.length === 1 ? async () => {
          const result = await L.api('album_get', { id: albumId });
          if (result.error) return null;
          const seen = new Set();
          const loaded = (result.album?.photos || result.photos || []).map(value => ({
            ...P.photo(value), key: value?.src ?? value?.key ?? value?.photo ?? value?.id ?? value
          })).filter(photo => {
            if (!photo.src || seen.has(photo.src)) return false;
            seen.add(photo.src);
            return true;
          }).slice(0, 20);
          images.splice(0, images.length, ...loaded);
          return loaded.map(slide);
        } : undefined
      })
    });
    // 크기를 모르는 사진은 불러온 뒤 실제 비율로(4:5~1.91:1), 다음에 그릴 때는 기억한 비율로
    if (mediaBox?.hasAttribute('data-auto')) {
      const firstImage = mediaBox.querySelector('img');
      const fit = () => {
        if (!firstImage.naturalWidth || !firstImage.naturalHeight) return;
        post._ratio = clampRatio(firstImage.naturalWidth / firstImage.naturalHeight);
        mediaBox.style.aspectRatio = post._ratio.toFixed(4);
        mediaBox.removeAttribute('data-auto');
      };
      if (firstImage?.complete) fit(); else firstImage?.addEventListener('load', fit, { once: true });
    }

    function paint() {
      const likes = Number(post.likes) || 0, comments = Number(post.comments) || 0;
      like.setAttribute('aria-pressed', String(Boolean(post.liked)));
      like.innerHTML = L.icon('heart', { fill: Boolean(post.liked), size: 26 });
      likeN.textContent = likes ? L.count(likes) : '';
      commentButton.setAttribute('aria-label', L.t('feed.comments') + ' ' + comments);
      commentN.textContent = comments ? L.count(comments) : '';
      const by = likes > 0 && post.likedBy?.nick ? post.likedBy : null;
      likesLine.hidden = !likes;
      likesLine.innerHTML = by
        ? L.avatar(by, 18) + '<span>' + (likes > 1
          ? rich('likedBy', { nick: '<b>' + L.esc(by.nick) + '</b>', n: '<b>' + L.count(likes - 1) + '</b>' })
          : rich('likedBy1', { nick: '<b>' + L.esc(by.nick) + '</b>' })) + '</span>'
        : '<b>' + w('likes', { n: L.count(likes) }) + '</b>';
      if (allComments) {
        allComments.hidden = !comments;
        allComments.textContent = L.t('feed4.allComments', { n: L.count(comments) });
      }
      if (preview) preview.innerHTML = (comments ? post.preview || [] : []).slice(-2).map(comment => '<div class="feed4-pv"><b>' +
        L.esc(comment.author?.nick || comment.nick) + '</b> <span>' + L.linkify(comment.text) + '</span></div>').join('');
    }
    paint();
    track(post.id, { card, post, paint });

    async function setLike(want) {
      if (L.needLogin()) return false;
      const was = Boolean(post.liked), likes = Number(post.likes) || 0;
      if (busy || want === was) return true;
      post.liked = !was;
      post.likes = Math.max(0, likes + (was ? -1 : 1));
      busy = true;
      like.disabled = true;
      paint();
      const result = await L.api(was ? 'unlike' : 'like', { id: post.id });
      busy = false;
      like.disabled = false;
      if (!result || result.error) {
        post.liked = was;
        post.likes = likes;
        if (card.isConnected) U.error(result);
      } else {
        if (typeof result.liked === 'boolean') post.liked = result.liked;
        if (typeof result.likes === 'number') post.likes = result.likes;
      }
      sync(post.id);
      return true;
    }
    like.onclick = () => { void setLike(!post.liked); };
    likesLine.onclick = () => L.openLikes(post.id);

    function openComments(focus) {
      if (opt.detail) {
        const field = document.querySelector('[data-detail-comments] textarea');
        field?.scrollIntoView({ block: 'center' });
        field?.focus({ preventScroll: true });
      } else L.openComments(post.id, { post, focus });
    }
    commentButton.onclick = () => openComments(!Number(post.comments));
    if (allComments) allComments.onclick = () => openComments(false);
    if (preview) preview.onclick = event => { if (!event.target.closest('a')) openComments(false); };

    // 글은 2줄까지: 넘치면 둘째 줄 끝에 맞춰 자르고 바로 뒤에 회색 '… 더 보기' (누르면 전체)
    const caption = card.querySelector('[data-cap]');
    if (caption && !opt.detail) {
      const para = caption.querySelector('p'), full = String(post.text), chars = Array.from(full);
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'feed4-capmore';
      more.dataset.capMore = '';
      more.innerHTML = '<i aria-hidden="true">… </i>' + w('capMore');
      const cut = () => {
        if (!caption.isConnected || caption.classList.contains('is-open')) return;
        const limit = (parseFloat(getComputedStyle(caption).lineHeight) || 20.3) * 2 + 1;
        const fits = () => caption.offsetHeight <= limit;
        more.remove();
        caption.classList.add('is-cut');
        para.innerHTML = L.linkify(full);
        if (fits()) return;
        caption.append(more);
        let low = 0, high = chars.length - 1;
        while (low < high) {
          const middle = (low + high + 1) >> 1;
          para.innerHTML = L.linkify(chars.slice(0, middle).join('').trimEnd());
          if (fits()) low = middle; else high = middle - 1;
        }
        let text = chars.slice(0, low).join('');
        const token = text.match(/(?:^|\s)([@#]\S*)$/);   // @닉네임·#태그 중간에서 끊기면 그 낱말 앞에서
        if (token && !/\s/.test(chars[low] || ' ')) text = text.slice(0, text.length - token[1].length);
        para.innerHTML = L.linkify(text.trimEnd());
      };
      more.onclick = () => {
        caption.classList.remove('is-cut');
        caption.classList.add('is-open');
        more.remove();
        para.innerHTML = L.linkify(full);
      };
      requestAnimationFrame(cut);
      if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => requestAnimationFrame(cut));
    }

    // 사진: 두 번 누르면 좋아요(+하트), 손님 사진은 한 번 누르면 크게 보기
    function burst() {
      const heart = card.querySelector('[data-burst]');
      if (!heart) return;
      heart.classList.remove('is-on');
      void heart.offsetWidth;
      heart.classList.add('is-on');
    }
    function zoom(index) {
      const photo = images[index];
      if (!photo) return;
      const sheet = U.sheet('<figure style="margin:12px 0">' + P.zoomImage(photo.src, t('photo', { n: index + 1 }), photo) + '</figure>' +
        (takeKey(photo) ? U.button(t('take'), 'data-take') : ''));
      const take = sheet.querySelector('[data-take]');
      if (take) take.onclick = () => takeDown(index);
    }
    const takeKey = photo => {
      if (album) return typeof photo.key === 'string' ? photo.key : '';
      if (!member) return '';
      try { return new URL(photo.src).pathname.match(/^\/img\/(p\/[\w:-]+\/[\w-]+\.(?:jpg|webp))$/)?.[1] || ''; } catch { return ''; }
    };
    function takeDown(index) {
      const photo = images[index], key = photo && takeKey(photo);
      if (!key) return;
      U.reason({
        title: t('take'), reasons: album ? ['me', 'sexual', 'abuse', 'illegal', 'etc'] : ['me'],
        submit: why => album ? L.api('takedown', { photo: key, why }) : L.api('report', { kind: 'photo', id: key, why }),
        done: () => {
          const target = mediaBox?.querySelectorAll('.post-slide:not(.post-slide-more) > *, .feed4-single > *')[index];
          images.splice(index, 1);
          if (carousel && target) {
            carousel.remove(target);
            if (!images.length) mediaBox.remove();
          } else mediaBox?.remove();
          card.querySelectorAll('[data-member-photo]').forEach((button, i) => { button.dataset.memberPhoto = i; });
        }
      });
    }
    if (mediaBox) {
      let lastTap = -1000, timer;
      mediaBox.addEventListener('click', event => {
        const play = event.target.closest('[data-video-play]');
        if (play) return playVideo();
        if (event.target.closest('[data-tagged]')) return openTagged();
        if (event.target.closest('a, iframe')) return;
        if (event.timeStamp - lastTap < 320) {
          lastTap = -1000;
          clearTimeout(timer);
          if (!L.me) { L.needLogin(); return; }
          burst();
          void setLike(true);
          return;
        }
        lastTap = event.timeStamp;
        const button = event.target.closest('[data-member-photo]');
        if (button) {
          clearTimeout(timer);
          timer = setTimeout(() => { if (card.isConnected) zoom(Number(button.dataset.memberPhoto)); }, 300);
        }
      });
    }
    // 태그된 사람 목록 (글쓴이 본인에게는 아직 승인 안 된 태그도 '승인 대기'로 보인다)
    function openTagged() {
      const panel = L.sheet(sheetHead(w('tagged')) + '<div class="feed4-llist" data-tagged-list>' + tagged.map(person =>
        '<a class="feed4-urow" href="' + profileLink(person.nick) + '">' + L.avatar(person, 44) + '<span>' + L.esc(person.nick) + '</span>' +
        (person.pending ? '<em class="feed4-pending">' + w('pending') + '</em>' : '') + '</a>').join('') + '</div>');
      panel.classList.add('feed4-sheet', 'is-auto');
      panel.querySelector('[data-sheet-close]').onclick = () => L.closeSheet();
    }
    // 공식 유튜브 글: 앱 안에서 재생 (눌렀을 때만 youtube-nocookie 를 부른다)
    function playVideo() {
      if (!videoId) return;
      const frame = '<iframe class="feed4-frame" data-video-frame title="' + L.esc(post.text || 'YouTube') + '" src="https://www.youtube-nocookie.com/embed/' +
        videoId + '?autoplay=1&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
      let box = mediaBox;
      if (!box) {
        box = document.createElement('div');
        box.className = 'feed4-media';
        box.style.aspectRatio = '16/9';
        card.querySelector('.feed4-head').after(box);
      }
      const holder = box.querySelector('[data-video-play]')?.parentElement || box;
      holder.innerHTML = frame;
      card.querySelectorAll('.feed4-body [data-video-play]').forEach(button => button.remove());
    }
    card.querySelectorAll('.feed4-body [data-video-play]').forEach(button => { button.onclick = playVideo; });

    const face = card.querySelector('.feed4-head > a.ui-avatar[data-story]');
    if (face) face.addEventListener('click', event => {
      if (!L.storyOpen || !L.open('stories')) return;
      event.preventDefault();
      L.storyOpen(nick);
    });
    // 팔로우
    const follow = card.querySelector('[data-follow]');
    if (follow) follow.onclick = async () => {
      if (L.needLogin() || follow.disabled) return;
      follow.disabled = true;
      const result = await L.api('follow', { nick });
      follow.disabled = false;
      if (!result || result.error) return U.error(result);
      const requested = result.requested === true || result.state === 'requested';
      for (const entries of live.values()) for (const entry of entries) {
        if (entry.post.author?.nick !== nick) continue;
        if (!requested) entry.post.author.following = true;
        const other = entry.card.querySelector('[data-follow]');
        if (!other) continue;
        if (requested) { other.textContent = L.t('feed4.requested'); other.disabled = true; }
        else { other.previousElementSibling?.remove(); other.remove(); }
      }
    };

    // 저장·공유 (share.js 가 만든 버튼을 아이콘 줄 자리에 옮겨 놓는다 — 모양은 css/feed.css)
    const bar = card.querySelector('.feed4-bar');
    (opt.settings || (opt.settings = L.api('config'))).then(settings => {
      if (!card.isConnected || !window.LoungeShare) return;
      window.LoungeShare.actions(bar, post, settings, saved => {
        if (saved) collectionsOk().then(ok => { if (ok && card.isConnected) offerCollection(post); });
      });
      const share = bar.querySelector(':scope > [data-share-post]'), save = bar.querySelector(':scope > [data-share-save]');
      const right = card.querySelector('[data-bar-right]');
      if (share) card.querySelector('[data-bar-left]').append(share);
      if (!save) return;
      right.append(save);
      if (L.me) void collectionsOk();
      // 책갈피를 길게 누르면 모음 고르기 (모음을 아는 서버일 때만 — 아니면 평소처럼 저장만)
      let timer, held = false;
      const cancel = () => clearTimeout(timer);
      save.addEventListener('pointerdown', () => {
        held = false;
        cancel();
        timer = setTimeout(() => {
          if (collectionsKnown !== true || !card.isConnected) return;
          held = true;
          setTimeout(() => { held = false; }, 1200);   // 손을 뗄 때 클릭이 안 생기는 기기에서도 다음 누르기를 막지 않게
          openCollections(post);
        }, 500);
      });
      for (const name of ['pointerup', 'pointerleave', 'pointercancel']) save.addEventListener(name, cancel);
      save.addEventListener('contextmenu', event => event.preventDefault());
      right.addEventListener('click', event => {   // 길게 누른 손을 뗄 때 생기는 클릭은 저장 버튼에 닿지 않게
        if (!held) return;
        held = false;
        event.stopPropagation();
        event.preventDefault();
      }, true);
    });

    // ⋯ 메뉴
    function gone() {
      card.remove();
      opt.onGone?.(post.id);
    }
    async function copyLink() {
      const href = new URL('/lounge/#/feed/' + encodeURIComponent(post.id), location.origin).href;
      try {
        await navigator.clipboard.writeText(href);
        L.toast(L.t('feed4.copied'));
      } catch {
        const sheet = U.sheet('<h2>' + w('copy') + '</h2><input readonly aria-label="' + w('copy') + '" value="' + L.esc(href) + '">');
        sheet.querySelector('input').select();
      }
    }
    function report() {
      if (L.needLogin()) return;
      let hidden = false;
      U.reason({
        title: U.t('report'), reasons: ['ad', 'sexual', 'abuse', 'illegal', 'etc'],
        submit: async why => {
          const result = await L.api('report', { kind: 'post', id: post.id, why });
          hidden = result.hidden === true;
          return result;
        },
        done: () => { if (hidden) gone(); }
      });
    }
    async function remove() {
      if (!await L.confirm(L.t('feed.confirm'), { ok: L.t('feed4.delete'), danger: true })) return;
      const result = await L.api('post_del', { id: post.id });
      if (!result || result.error) return U.error(result);
      gone();
    }
    async function pin() {
      const result = await L.api(post.pinned ? 'post_unpin' : 'post_pin', { id: post.id });
      if (!result || result.error) {
        if (result?.error === 'pin_limit') L.toast(L.t('feed4.pinLimit')); else U.error(result);
        return;
      }
      post.pinned = !post.pinned;
      L.toast(L.t(post.pinned ? 'feed4.pinned' : 'feed4.unpinned'));
    }
    card.querySelector('[data-more]').onclick = () => {
      const save = card.querySelector('[data-share-save]'), share = card.querySelector('[data-share-post]');
      const takeable = images[current] && takeKey(images[current]);
      L.menu([
        mine && post.canEdit === true && { label: L.t('feed4.edit'), icon: 'edit', on: () => L.go('compose?edit=' + encodeURIComponent(post.id)) },
        mine && typeof post.pinned === 'boolean' && L.open('profile2') && { label: L.t(post.pinned ? 'feed4.unpin' : 'feed4.pin'), icon: 'pin', on: pin },
        save && { label: L.t(save.getAttribute('aria-pressed') === 'true' ? 'feed4.unsave' : 'feed4.save'), icon: 'bookmark', on: () => save.click() },
        save && collectionsKnown === true && { label: L.t('feed4.toCollection'), icon: 'layers', on: () => openCollections(post) },
        tagged.length > 0 && { label: L.t('feed4.tagged'), icon: 'tagged', on: openTagged },
        share && { label: L.t('feed4.share'), icon: 'send', on: () => share.click() },
        { label: L.t('feed4.copy'), icon: 'link', on: copyLink },
        videoUrl && { label: L.t('feed.youtube'), icon: 'play', on: () => window.open(videoUrl, '_blank', 'noopener') },
        !mine && { label: L.t('screens.report'), icon: 'flag', danger: true, on: report },
        !mine && takeable && { label: L.t('feed.take'), icon: 'image', danger: true, on: () => takeDown(current) },
        mine && { label: L.t('feed4.delete'), icon: 'trash', danger: true, on: remove }
      ]);
    };
    return card;
  }

  // 다른 화면(프로필 '글 넘겨 보기'·태그)도 같은 카드를 쓴다: L.feedCards(container, posts, { onGone(id), detail, bleed })
  L.feedCards = function (container, posts, opt = {}) {
    container.classList.add('feed4-cards');
    if (opt.bleed !== false) container.classList.add('feed4-bleed');
    const cards = (posts || []).map(post => buildCard(post, opt));
    container.append(...cards);
    return cards;
  };

  // ── 댓글 (시트·상세 화면 공용) ──
  function commentsUI(host, post, { sheet = false, initial, focus } = {}) {
    host.innerHTML = '<div class="feed4-clist" data-comments' + (sheet ? ' data-no-drag' : '') + '>' + spinner() + '</div>' +
      '<div class="feed4-replying" data-replying hidden><span></span>' + iconButton('close', 'data-reply-cancel', L.esc(L.t('ui.cancel')), 18) + '</div>' +
      '<form class="feed4-cform' + (sheet ? '' : ' is-page') + '">' + (L.me ? L.avatar(L.me, 32) : '') +
      '<textarea name="text" rows="1" maxlength="200" required placeholder="' + w('addComment') + '" aria-label="' + t('write') + '"></textarea>' +
      '<button type="submit" class="feed4-send">' + w('submit') + '</button></form>';
    const list = host.querySelector('[data-comments]'), form = host.querySelector('form'), field = form.elements.text;
    const replying = host.querySelector('[data-replying]');
    let rows = [], canReply = false, replyTo = null;
    const idOf = comment => String(comment.id ?? comment.cid);
    const nickOf = comment => comment.author?.nick || comment.nick || '';
    const find = id => rows.find(comment => idOf(comment) === id);

    function row(comment, child) {
      const nick = nickOf(comment), id = idOf(comment), person = { ...comment.author, nick };
      const canDelete = comment.canDelete ?? comment.mine === true;
      const likes = Number(comment.likes) || 0;
      return '<article class="feed4-c' + (child ? ' is-reply' : '') + '" data-cid="' + L.esc(id) + '">' +
        L.avatar(person, child ? 26 : 32, { link: true }) + '<div class="feed4-c-main"><div class="feed4-c-text">' +
        '<a class="feed4-nick" href="' + profileLink(nick) + '">' + L.whoTag(person) + '</a> <p>' + L.linkify(comment.text) + '</p></div>' +
        '<div class="feed4-c-meta"><time>' + L.esc(L.ago(comment.at)) + '</time><span data-c-likes' + (likes ? '' : ' hidden') + '>' +
        w('likes', { n: L.count(likes) }) + '</span>' + (canReply ? '<button type="button" data-c-reply>' + w('reply') + '</button>' : '') +
        '<button type="button" class="feed4-c-more" data-c-more aria-expanded="false" aria-label="' + w('cMore') + '">' + L.icon('more', { size: 16 }) + '</button></div>' +
        '<div class="feed4-c-acts" data-c-acts hidden>' + (canDelete ? '<button type="button" data-c-del>' + w('delete') + '</button>' : '') +
        (comment.mine === true ? '' : '<button type="button" data-c-report>' + w('report') + '</button>') + '</div></div>' +
        (typeof comment.likes === 'number' ? '<button type="button" class="feed4-c-like" data-c-like aria-pressed="' + Boolean(comment.liked) +
          '" aria-label="' + w('cLike') + '">' + L.icon('heart', { size: 16, fill: Boolean(comment.liked) }) + '</button>' : '') + '</article>';
    }
    function draw() {
      canReply = canReply || rows.some(comment => 'parent' in comment);
      const ids = new Set(rows.map(idOf));
      const tops = rows.filter(comment => !comment.parent || !ids.has(String(comment.parent)));
      list.innerHTML = rows.length ? tops.map(comment => row(comment) +
        rows.filter(child => child.parent && String(child.parent) === idOf(comment)).map(child => row(child, true)).join('')).join('')
        : '<div class="feed4-cempty"><strong>' + w('noComments') + '</strong><span>' + w('firstComment') + '</span></div>';
    }
    // fresh: 시트를 열 때는 서버가 센 댓글 수로 카드를 맞춘다 (방금 내가 쓴 직후에는 이미 더해 뒀으므로 건너뜀)
    async function load(fresh = true) {
      const data = await L.api('post_get', { id: post.id });
      if (!host.isConnected) return false;
      if (!Array.isArray(data.comments)) {
        list.innerHTML = '<div class="feed4-cempty" role="status"><span>' + L.esc(L.t('ui.error')) + '</span><button type="button" class="btn" data-c-retry>' +
          L.esc(L.t('ui.retry')) + '</button></div>';
        list.querySelector('[data-c-retry]').onclick = () => { list.innerHTML = spinner(); void load(fresh); };
        return false;
      }
      rows = data.comments;
      if (fresh && typeof data.post?.comments === 'number') setComments(post, data.post.comments);   // 그사이 남이 쓴 댓글까지 맞춘다
      draw();
      return true;
    }
    function setReply(comment) {
      replyTo = comment || null;
      replying.hidden = !replyTo;
      if (!replyTo) return;
      replying.firstElementChild.textContent = L.t('feed4.replying', { nick: nickOf(replyTo) });
      if (!field.value.trim()) field.value = '@' + nickOf(replyTo) + ' ';
      field.focus();
    }
    host.querySelector('[data-reply-cancel]').onclick = () => setReply(null);
    function toggleActions(item, open) {
      const acts = item.querySelector('[data-c-acts]'), more = item.querySelector('[data-c-more]');
      const show = open ?? acts.hidden;
      list.querySelectorAll('[data-c-acts]').forEach(other => { other.hidden = true; });
      list.querySelectorAll('[data-c-more]').forEach(other => other.setAttribute('aria-expanded', 'false'));
      acts.hidden = !show;
      more.setAttribute('aria-expanded', String(show));
    }
    list.addEventListener('click', async event => {
      const item = event.target.closest('[data-cid]');
      if (!item) return;
      const comment = find(item.dataset.cid);
      if (!comment) return;
      if (event.target.closest('[data-c-more]')) return toggleActions(item);
      if (event.target.closest('[data-c-reply]')) {
        if (L.needLogin()) return;
        return setReply(comment);
      }
      if (event.target.closest('[data-c-report]')) return U.report('comment', comment.id ?? comment.cid);
      const del = event.target.closest('[data-c-del]');
      if (del) {
        if (del.disabled) return;
        del.disabled = true;
        const result = await L.api('comment_del', { cid: comment.id ?? comment.cid });
        if (!result || result.error) { del.disabled = false; return U.error(result); }
        const id = idOf(comment), before = rows.length;
        rows = rows.filter(other => idOf(other) !== id && String(other.parent || '') !== id);
        if (Array.isArray(post.preview)) post.preview = post.preview.filter(other => String(other.id) !== id);
        setComments(post, (Number(post.comments) || 0) - (before - rows.length));
        if (replyTo && !find(idOf(replyTo))) setReply(null);
        if (host.isConnected) draw();
        L.toast(L.t('feed4.cDeleted'));
        return;
      }
      const heart = event.target.closest('[data-c-like]');
      if (heart) {
        if (L.needLogin() || heart.disabled) return;
        const was = Boolean(comment.liked), likes = Number(comment.likes) || 0;
        const paintHeart = () => {
          heart.setAttribute('aria-pressed', String(Boolean(comment.liked)));
          heart.innerHTML = L.icon('heart', { size: 16, fill: Boolean(comment.liked) });
          const label = item.querySelector('[data-c-likes]');
          label.hidden = !comment.likes;
          label.textContent = L.t('feed4.likes', { n: L.count(comment.likes) });
        };
        comment.liked = !was;
        comment.likes = Math.max(0, likes + (was ? -1 : 1));
        heart.disabled = true;
        paintHeart();
        const result = await L.api(was ? 'comment_unlike' : 'comment_like', { cid: comment.id ?? comment.cid });
        heart.disabled = false;
        if (!result || result.error) {
          comment.liked = was;
          comment.likes = likes;
          U.error(result);
        } else {
          if (typeof result.liked === 'boolean') comment.liked = result.liked;
          if (typeof result.likes === 'number') comment.likes = result.likes;
        }
        if (heart.isConnected) paintHeart();
      }
    });
    // 길게 누르면 삭제·신고 (⋯ 버튼과 같은 동작)
    let press, pressAt;
    const cancelPress = () => clearTimeout(press);
    list.addEventListener('pointerdown', event => {
      const item = event.target.closest('[data-cid]');
      cancelPress();
      if (!item || event.target.closest('a, button')) return;
      pressAt = [event.clientX, event.clientY];
      press = setTimeout(() => { if (item.isConnected) toggleActions(item, true); }, 550);
    });
    list.addEventListener('pointermove', event => {
      if (pressAt && Math.hypot(event.clientX - pressAt[0], event.clientY - pressAt[1]) > 10) cancelPress();
    });
    for (const name of ['pointerup', 'pointercancel', 'pointerleave', 'scroll']) list.addEventListener(name, cancelPress, { passive: true });

    field.addEventListener('input', () => {
      field.style.height = 'auto';
      field.style.height = Math.min(field.scrollHeight, 96) + 'px';
    });
    form.onsubmit = async event => {
      event.preventDefault();
      if (L.needLogin()) return;
      const text = field.value.trim(), send = form.querySelector('[type=submit]');
      if (!text || send.disabled) return;
      send.disabled = true;
      const parent = replyTo ? String(replyTo.parent || '') || idOf(replyTo) : '';
      const result = await L.api('comment', { id: post.id, text, ...(parent && { parent }) });
      if (!host.isConnected) return;
      send.disabled = false;
      if (result?.error === 'parent') {   // 답하려던 댓글이 그사이 지워짐
        setReply(null);
        await load();
      }
      if (!result || result.error) return U.error(result);
      const made = result.comment;   // 서버가 돌려준 글(연락처 가림 뒤)을 보여 준다
      if (!parent && made && Array.isArray(post.preview)) {
        post.preview = [...post.preview, { id: made.id ?? result.cid, author: { nick: made.author?.nick || L.me?.nick }, text: made.text }].slice(-2);
      }
      field.value = '';
      field.style.height = 'auto';
      setReply(null);
      setComments(post, (Number(post.comments) || 0) + 1);
      if (result.comment && 'parent' in result.comment) canReply = true;
      if (await load(false) && !parent) {
        if (sheet) list.scrollTop = list.scrollHeight;
        else list.lastElementChild?.scrollIntoView({ block: 'nearest' });
      }
    };

    if (Array.isArray(initial)) { rows = initial; draw(); }
    else void load().then(() => { if (focus && host.isConnected) field.focus(); });
    if (focus && Array.isArray(initial)) field.focus();
    return { reload: load, field };
  }

  // 댓글 시트: L.openComments(postId, { focus, post })
  L.openComments = function (id, opt = {}) {
    const post = opt.post || postOf(id) || { id };
    const panel = L.sheet(sheetHead(t('comments')) + '<div class="feed4-chost" data-comment-host></div>');
    panel.classList.add('feed4-sheet', 'feed4-csheet');
    panel.querySelector('[data-sheet-close]').onclick = () => L.closeSheet();
    commentsUI(panel.querySelector('[data-comment-host]'), post, { sheet: true, focus: opt.focus === true });
    return panel;
  };

  // 좋아요한 사람 시트: L.openLikes(postId) — 서버가 아직 모르면(action) 조용히 닫는다
  L.openLikes = function (id) {
    if (L.needLogin()) return null;   // 좋아요한 사람 목록은 회원만 (서버 약속)
    const panel = L.sheet(sheetHead(w('likesTitle')) + '<div class="feed4-llist" data-like-list data-no-drag>' + spinner() + '</div><div data-like-more></div>');
    panel.classList.add('feed4-sheet', 'feed4-lsheet');
    panel.querySelector('[data-sheet-close]').onclick = () => L.closeSheet();
    const list = panel.querySelector('[data-like-list]'), more = panel.querySelector('[data-like-more]');
    const seen = new Set();
    let before, stop;
    async function load() {
      const result = await L.api('post_likes', { id, ...(before != null && { before }) });
      if (!panel.isConnected) return;
      if (!Array.isArray(result.list)) {
        stop?.();
        if (before == null) {
          L.closeSheet();
          if (result.error === 'auth') L.needLogin();
        }
        return;
      }
      if (before == null) list.replaceChildren();
      for (const person of result.list) {
        if (!person?.nick || seen.has(person.nick)) continue;
        seen.add(person.nick);
        const made = L.userRow ? L.userRow(person, { follow: true }) : null;
        if (made instanceof Node) list.append(made);
        else list.insertAdjacentHTML('beforeend', typeof made === 'string' && made ? made
          : '<a class="feed4-urow" href="' + profileLink(person.nick) + '">' + L.avatar(person, 44) +
            '<span>' + L.whoTag(person) + '</span></a>');
      }
      if (!seen.size) list.innerHTML = '<div class="feed4-cempty"><span>' + w('noLikes') + '</span></div>';
      const next = result.before;
      stop?.();
      stop = null;
      if (next != null && next !== before && result.list.length) {
        before = next;
        stop = L.more(more, load);
      }
    }
    void load();
    return panel;
  };

  // ── 피드 화면 ──
  const TABS = ['all', 'following', '2F', '3F'], TAB_KEY = 'gl_feed_tab';
  const remembered = () => { try { return localStorage.getItem(TAB_KEY) || ''; } catch { return ''; } };
  const remember = tab => { try { localStorage.setItem(TAB_KEY, tab); } catch { /* 저장을 막아 둔 브라우저 */ } };
  const skeleton = () => '<div class="feed4-skel" role="status" data-post-skeleton><span class="sr-only">' + U.t('loading') + '</span>' +
    '<div class="feed4-skel-head" aria-hidden="true"><i></i><b></b></div><div class="feed4-skel-media post-skeleton-media" aria-hidden="true"></div>' +
    '<div class="feed4-skel-line" aria-hidden="true"></div></div>';
  const notice = (message, retry) => '<div class="feed4-state" role="status"><p>' + message + '</p>' +
    (retry ? '<button type="button" class="btn" data-retry>' + L.esc(L.t('ui.retry')) + '</button>' : '') + '</div>';
  let active = null, again = null, listState = null, trayHeight = 111.6;   // trayHeight: 스토리 줄 높이(css/story.css 기준, 그린 뒤 다시 잰다)
  // 글쓰기 화면이 글을 고치면(lounge:post-edit) 맡아 둔 목록·그려 둔 카드의 그 글도 바꿔 둔다 → 뒤로 돌아오면 고친 글이 보인다
  window.addEventListener('lounge:post-edit', event => {
    const detail = event.detail || {}, id = detail.id ?? detail.post?.id;
    if (id == null) return;
    const patch = { ...(detail.post || {}), ...(typeof detail.text === 'string' && { text: detail.text }),
      ...(Object.hasOwn(detail, 'floor') && { floor: detail.floor }), edited: true };
    delete patch.id;
    const targets = new Set((listState?.posts || []).filter(post => post.id === id));
    for (const entry of live.get(id) || []) targets.add(entry.post);
    for (const post of targets) Object.assign(post, patch);
    for (const entry of live.get(id) || []) {   // 지금 화면에 그려져 있는 카드는 글만 바로 바꾼다
      const text = entry.card.isConnected && entry.card.querySelector('[data-cap] > p');
      if (text && typeof entry.post.text === 'string') text.innerHTML = L.linkify(entry.post.text);
    }
  });

  function renderDetail(root, id) {
    let dead = false;
    active = () => { dead = true; };
    again = () => { if (!root.querySelector('[data-post]')) void load(); };
    root.innerHTML = '<section class="feed4" data-feed>' + L.bar({ title: L.t('feed4.post'), back: 'feed' }) +
      '<div data-posts></div><div data-page aria-live="polite">' + skeleton() + '</div><div class="feed4-detail-comments" data-detail-comments hidden></div></section>';
    const list = root.querySelector('[data-posts]'), page = root.querySelector('[data-page]'), host = root.querySelector('[data-detail-comments]');
    async function load() {
      page.innerHTML = skeleton();
      const response = await L.api('post_get', { id });
      if (dead) return;
      if (!response.post) {   // 지워졌거나 볼 수 없는 글: 위 막대는 그대로 두고 안내만
        page.innerHTML = ['network', 'server'].includes(response.error) ? notice(U.t('error'), true)
          : '<div class="feed4-state" role="status" data-gone><i aria-hidden="true">' + L.icon('image', { size: 28 }) + '</i><strong>' + w('gone') +
            '</strong><p>' + w('goneBody') + '</p></div>';
        const retry = page.querySelector('[data-retry]');
        if (retry) retry.onclick = load;
        return;
      }
      page.innerHTML = '';
      L.feedCards(list, [response.post], { detail: true, onGone: () => { if (!dead) L.back('feed'); } });
      host.hidden = false;
      // 댓글 입력칸을 아래 메뉴 바로 위에 붙인다 (아래 메뉴 높이는 틀이 정하므로 재서 쓴다)
      const tabbar = document.getElementById('tabbar')?.offsetHeight || 0;
      const spare = parseFloat(getComputedStyle(document.getElementById('view')).paddingBottom) - tabbar;
      host.style.setProperty('--feed4-tabbar', tabbar + 'px');
      if (spare > 0) host.style.marginBottom = -spare + 'px';
      commentsUI(host, response.post, { initial: Array.isArray(response.comments) ? response.comments : undefined });
    }
    void load();
  }

  function renderList(root, params) {
    const kept = L.unstash('feed');
    const posted = params.posted != null;   // 방금 글을 올리고 왔으면 맡아 둔 목록 대신 새로 불러와 맨 위(전체 탭)를 보여 준다
    const saved = posted ? null : kept;
    const first = posted ? 'all' : remembered();
    const state = saved || { tab: TABS.includes(first) && (first !== 'following' || L.me) ? first : 'all', posts: [], next: undefined, done: false, scroll: 0 };
    L.stash('feed', state);   // 지금 주소로 맡겨 두고(내용은 계속 바뀐다), 떠날 때 스크롤 위치만 적는다
    listState = state;
    const ids = new Set();
    const settings = L.api('config');
    let dead = false, version = 0, loading = false, config, memberPosts, stopMore, timer, known;

    root.innerHTML = '<section class="feed4" data-feed>' + L.bar({
      left: '<a class="feed4-logo" href="#/tonight">GROOVE LOUNGE</a>',
      titleHtml: '<h1 class="sr-only">' + L.esc(L.t('nav.feed')) + '</h1>',
      right: '<span class="feed4-slot" data-compose-slot></span><a class="ui-bar-btn" href="#/explore" aria-label="' + w('search') + '">' +
        L.icon('search') + '</a>' + L.inboxIcons()
    }) + '<div data-feed-body><div class="feed4-storywrap" data-story-wrap><div class="feed4-story" data-story-tray></div></div><div class="feed4-tabs" data-post-tools></div>' +
      '<button type="button" class="feed4-new" data-new hidden>' + L.icon('back', { size: 16 }) + '<span>' + w('newPosts') + '</span></button>' +
      '<div data-posts></div><div data-page aria-live="polite"></div><div class="feed4-sentinel" data-sentinel aria-hidden="true"></div></div></section>';
    const body = root.querySelector('[data-feed-body]'), tools = root.querySelector('[data-post-tools]');
    const feed = root.querySelector('[data-feed]'), logo = feed.querySelector('.feed4-logo');
    const list = root.querySelector('[data-posts]'), page = root.querySelector('[data-page]');
    const sentinel = root.querySelector('[data-sentinel]'), pill = root.querySelector('[data-new]');
    list.classList.add('feed4-cards', 'feed4-bleed');
    L.paintInbox();

    const sectionLink = (name, icon) =>
      '<a href="#/l26_lounge?section=' + name + '">' + L.icon(icon, { size: 16 }) +
      L.esc(L.t('community.' + name)) + '</a>';
    let shellState = '';
    function paintShell(isOpen = L.open) {
      const shell = isOpen('l26_shell');
      const replay = shell && isOpen('l26_recap');
      const chat = shell ? L.esc(L.t(isOpen('openchat') ? 'nav.openchat' : 'nav.rooms')) : '';
      const next = shell ? replay + ':' + chat : '';
      if (next === shellState) return;
      shellState = next;
      feed.classList.toggle('feed4-l26', shell);
      logo.setAttribute('href', shell ? '#/l26_home' : '#/tonight');
      logo.innerHTML = shell ? 'GROOVE<span> LOUNGE</span>' : 'GROOVE LOUNGE';
      if (shell) logo.setAttribute('aria-label', 'GROOVE LOUNGE');
      else logo.removeAttribute('aria-label');
      feed.querySelector('.feed4-openchat')?.remove();
      feed.querySelector('.feed4-shortcuts')?.remove();
      if (!shell) return;
      feed.querySelector('.ui-bar-side.is-right').insertAdjacentHTML('beforeend',
        '<a class="ui-bar-btn feed4-openchat" href="#/rooms" aria-label="' + chat + '" title="' + chat + '">' +
        L.icon('comment') + '</a>');
      tools.insertAdjacentHTML('afterend', '<div class="feed4-shortcuts">' +
        (replay ? sectionLink('replay', 'image') : '') + sectionLink('music', 'play') + '</div>');
    }
    paintShell();
    // On a direct feed link, core may paint the tabs after the feed has mounted.
    const shellObserver = new MutationObserver(() => paintShell());
    shellObserver.observe(document.getElementById('tabbar'), { childList: true });
    // 스토리 줄(작업창 D): 켜져 있고 로그인했으면 자리를 먼저 잡아 둔다 — 늦게 뜨면서 글을 아래로 밀지 않게
    const tray = root.querySelector('[data-story-tray]'), trayWrap = root.querySelector('[data-story-wrap]');
    let trayStarted = false;
    function startTray() {
      if (trayStarted || !L.storyTray || !L.me) return;
      trayStarted = true;
      trayWrap.style.minHeight = trayHeight + 'px';
      Promise.resolve().then(() => L.storyTray(tray)).catch(error => console.error(error)).then(() => {
        if (dead) return;
        const height = tray.hidden ? 0 : tray.getBoundingClientRect().height;
        if (height) trayHeight = height;
        trayWrap.style.minHeight = '';
      });
    }
    const cardOptions = { settings, onGone(id) {
      state.posts = state.posts.filter(post => post.id !== id);
      if (!list.childElementCount && !loading) page.innerHTML = empty();
    } };

    function paintTools() {
      const canPost = memberPosts ?? config?.open?.posts;
      tools.toggleAttribute('data-ready', Boolean(config));
      root.querySelector('[data-compose-slot]').innerHTML = canPost ? '<a class="ui-bar-btn" href="#/compose" aria-label="' + t('compose') + '">' +
        L.icon('plusBox') + '</a>' : '';
      tools.innerHTML = '<div role="group" class="feed4-tabset" aria-label="' + t('filters') + '">' + TABS.map(key =>
        '<button type="button" class="feed4-tab" data-tab="' + key + '" aria-pressed="' + (key === state.tab) + '">' +
        (key === 'all' || key === 'following' ? t(key) : key) + '</button>').join('') + '</div><div class="feed4-chips">' +
        '<a class="feed4-chip" href="#/photos" aria-label="' + t('photos') + '"><span>' + w('albums') + '</span></a>' +
        (config?.open?.challenge ? '<a class="feed4-chip is-hot" href="#/challenge" aria-label="' + t('challenge') + '"><span>' + w('challenge') + '</span></a>' : '') + '</div>';
      tools.querySelectorAll('[data-tab]').forEach(button => {
        button.onclick = () => {
          const next = button.dataset.tab;
          if (next === state.tab || (next === 'following' && L.needLogin())) return;
          state.tab = next;
          remember(next);
          paintTools();
          tools.querySelector('[aria-pressed="true"]').focus();
          void load(true);
        };
      });
    }
    function empty() {
      if (state.tab === 'following') {
        const suggest = config?.open?.follow2 === true && (L.hasScreen ? L.hasScreen('suggest') : true);
        return '<div class="feed4-state" role="status" data-empty="following"><i aria-hidden="true">' + L.icon('userPlus', { size: 28 }) + '</i><strong>' +
          w('followTitle') + '</strong><p>' + t('moreEmpty') + '</p>' + (suggest ? '<a class="btn btn-hot" href="#/suggest">' + w('suggest') + '</a>' : '') + '</div>';
      }
      if (state.tab === 'all') return notice(t('feedEmpty'));
      return notice(t('floorEmpty', { floor: state.tab }));
    }
    function append(posts) {
      const fresh = posts.filter(post => {
        if (!post || ids.has(post.id)) return false;
        ids.add(post.id);
        return true;
      });
      L.feedCards(list, fresh, cardOptions);
      return fresh;
    }
    function watch() {
      stopMore?.();
      stopMore = state.done ? null : L.more(sentinel, () => load());
    }
    function finish() {
      page.innerHTML = ids.size ? (state.done ? '<div class="feed4-end" data-end><i aria-hidden="true">' + L.icon('check', { size: 26 }) + '</i><strong>' +
        w('end') + '</strong><span>' + w('endBody') + '</span></div>' : '') : empty();
    }
    // reset: 첫 장부터 다시 (탭 바꿈·새로고침). keep: 받아 온 뒤에 목록을 바꿔 깜빡이지 않게
    async function load(reset, keep) {
      const held = keep ? { next: state.next, done: state.done } : null;
      if (reset) {
        version++;
        loading = false;
        stopMore?.();
        if (!keep) {
          ids.clear();
          state.posts = [];
          list.replaceChildren();
        }
        state.next = undefined;
        state.done = false;
        pill.hidden = true;
      }
      if (loading || state.done || dead) return;
      const request = ++version, before = reset ? undefined : state.next, tab = state.tab;
      loading = true;
      if (!keep) page.innerHTML = ids.size ? spinner() : skeleton();
      const response = await L.api('feed', { ...(before != null && { before }), ...(tab !== 'all' && { tab }) });
      await known;   // 스토리 줄 자리를 잡을지 안 뒤에 글을 그린다 (글이 먼저 뜨고 나중에 밀려 내려가지 않게)
      if (dead || request !== version) return;
      loading = false;
      if (typeof response.memberPosts === 'boolean' && memberPosts !== response.memberPosts) {
        memberPosts = response.memberPosts;
        paintTools();
      }
      if (!Array.isArray(response?.posts)) {
        if (keep) {   // 새로고침만 실패: 보던 목록은 그대로 둔다
          Object.assign(state, held);
          watch();
          L.toast(L.t('ui.error'));
          return;
        }
        if (response?.error === 'action') { state.done = true; page.innerHTML = empty(); return; }
        page.innerHTML = notice(U.t('error'), true);
        page.querySelector('[data-retry]').onclick = () => { void load(); };
        return;
      }
      if (keep) {
        ids.clear();
        state.posts = [];
        list.replaceChildren();
      }
      const added = append(response.posts);
      state.posts.push(...added);
      const next = Object.hasOwn(response, 'before') ? response.before :
        response.next ?? response.nextBefore ?? response.posts.at(-1)?.at;
      state.done = !(added.length && next != null && next !== before && response.hasMore !== false);
      state.next = state.done ? undefined : next;
      finish();
      watch();
    }
    const refresh = () => {
      paintShell();
      return load(true, true);
    };
    again = () => { void refresh(); };   // 아래 '피드' 탭을 다시 누르면(틀이 맨 위로 올린 뒤) 새로고침

    // 뒤로 돌아왔으면 보던 글·탭·자리 그대로
    if (L.open('stories')) startTray();
    paintTools();
    if (saved && saved.posts.length) {
      append(saved.posts);
      finish();
      watch();
      window.scrollTo(0, saved.scroll || 0);
    } else void load(true);

    known = settings.then(result => {
      if (dead) return;
      config = result;
      if (result?.open) paintShell(key => result.open[key] === true);
      paintTools();
      if (page.querySelector('[data-empty]')) page.innerHTML = empty();   // 설정을 받은 뒤에야 '추천 계정 보기'를 보일지 안다
      if (result?.open?.stories === true) startTray();
    });
    const stopPull = L.pull(body, refresh);
    pill.onclick = () => {
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      void refresh();
    };
    // 60초마다 새 글이 있는지 본다 (있으면 '새 게시물' 알약만 띄우고 목록은 건드리지 않는다)
    timer = setInterval(async () => {
      if (document.hidden || loading || !ids.size || !pill.hidden) return;
      const tab = state.tab, check = version;
      const response = await L.api('feed', { limit: 1, ...(tab !== 'all' && { tab }) });
      if (dead || check !== version) return;
      const top = response?.posts?.[0];
      if (top && !ids.has(top.id)) pill.hidden = false;
    }, 60_000);

    active = () => {
      dead = true;
      shellObserver.disconnect();
      state.scroll = window.scrollY;
      clearInterval(timer);
      stopMore?.();
      stopPull?.();
    };
  }

  function render(root, params = {}) {
    if (params.id) renderDetail(root, params.id); else renderList(root, params);
  }
  L.screen('feed', { nav: 'feed', auth: false, title: 'nav.feed', bar: 'own', render,
    refresh() { again?.(); }, leave() { active?.(); active = null; again = null; } });
})();
