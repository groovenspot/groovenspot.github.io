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

  return { mount, image, photo, zoomImage, state, skeleton };
})();

(() => {
  const L = Lounge, U = LoungeScreenUI;
  const P = LoungePostUI;
  const t = U.words('feed', {
    official: ['공식', 'Official'], photos: ['어젯밤 사진', 'Last night’s photos'],
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

  async function comments(post, view) {
    const el = U.sheet('<h2>' + t('comments') + '</h2><div data-comments>' + U.status('loading', true) + '</div>');
    const body = el.querySelector('[data-comments]');
    async function refresh() {
      const data = await L.api('post_get', { id: post.id });
      if (!el.isConnected || !view.isConnected) return;
      body.innerHTML = (data.comments?.map(comment => '<article style="' + U.card + '"><strong>' +
        L.esc(comment.author?.nick || comment.nick) + '</strong><p style="white-space:pre-wrap">' + L.esc(comment.text) +
        '</p>' + U.button(U.t('report'), 'data-report') + '</article>').join('') ||
        U.status(data.error && data.error !== 'action' ? 'error' : 'empty')) +
        '<form><label>' + t('write') + '<textarea name="text" maxlength="200" required></textarea></label>' +
        '<button class="btn btn-hot">' + t('send') + '</button></form>';
      body.querySelectorAll('[data-report]').forEach((button, i) => {
        button.onclick = () => U.report('comment', data.comments[i].id ?? data.comments[i].cid);
      });
      body.querySelector('form').onsubmit = async event => {
        event.preventDefault();
        if (L.needLogin()) return;
        const form = event.currentTarget;
        const text = form.elements.text.value.trim();
        if (!text) return;
        const send = form.querySelector('button');
        if (send.disabled) return;
        send.disabled = true;
        const result = await L.api('comment', { id: post.id, text });
        if (!el.isConnected || !view.isConnected) return;
        send.disabled = false;
        if (!result || result.error) return U.error(result);
        post.comments = Number(post.comments || 0) + 1;
        const card = Array.from(view.querySelectorAll('[data-post]')).find(item => item.dataset.post === String(post.id));
        if (card) card.querySelector('[data-comments-button]').textContent = L.t('feed.comments') + ' ' + post.comments;
        await refresh();
      };
    }
    await refresh();
  }

  function render(root, { id } = {}) {
    const view = P.mount(root, L.esc(L.t('nav.feed')), id ? U.link('#/feed', t('all')) : U.link('#/photos', t('photos')));
    view.innerHTML = (id ? '' : '<div data-post-tools></div>') +
      '<div class="post-stack" data-posts></div><div data-page aria-live="polite"></div>';
    const list = view.querySelector('[data-posts]'), page = view.querySelector('[data-page]');
    const tools = view.parentElement.querySelector('[data-post-tools]');
    const ids = new Set();
    const shareSettings = L.api('config');
    let tab = 'all', version = 0, config, memberPosts;

    function paintTools() {
      if (!config || id) return;
      const canPost = memberPosts ?? config.open?.posts;
      tools.innerHTML = '<div class="post-bar" data-post-layout>' +
        (canPost ? U.link('#/compose', t('compose')) : '<span class="muted">' + t('compose') + ' · ' + U.t('soon') + '</span>') +
        (config.open?.challenge ? U.link('#/challenge', t('challenge')) : '') + '</div>' +
        '<div role="group" class="post-tabs" data-post-layout aria-label="' + t('filters') + '">' +
        ['following', 'all', '2F', '3F'].map(key => U.button(
          key === 'all' || key === 'following' ? t(key) : key,
          'data-tab="' + key + '" aria-pressed="' + (key === tab) + '"' + (key.endsWith('F') ? ' data-floor="' + key + '"' : '')
        )).join('') + '</div>';
      tools.querySelectorAll('[data-tab]').forEach(button => {
        button.onclick = () => {
          const next = button.dataset.tab;
          if (next === tab || (next === 'following' && L.needLogin())) return;
          tab = next;
          ids.clear();
          list.replaceChildren();
          paintTools();
          tools.querySelector('[aria-pressed="true"]').focus();
          load();
        };
      });
    }

    function append(post) {
      const card = document.createElement('article');
      card.dataset.post = post.id;
      card.className = 'post-card';
      card.dataset.kind = post.kind;
      if (post.floor === '2F' || post.floor === '3F') card.dataset.floor = post.floor;
      const date = U.time(post.at, { dateStyle: 'medium', timeStyle: 'short' });
      const album = post.kind === 'album';
      const member = post.kind === 'member';
      const images = (post.photos || []).map(P.photo).filter(photo => photo.src);
      const videoUrl = /^[A-Za-z0-9_-]{11}$/.test(post.youtube || '') ? 'https://www.youtube.com/watch?v=' + post.youtube : '';
      const author = post.author?.nick || post.author?.name || 'GROOVE';
      const media = images.map((photo, index) => {
        if (member) return '<button type="button" class="post-photo-button" data-member-photo="' + index + '">' +
          P.image(photo.thumb, t('photo', { n: index + 1 }), false, photo) + '</button>';
        const img = P.image(photo.thumb, '', Boolean(videoUrl), photo);
        return videoUrl && index === 0 ? '<a class="post-video" href="' + videoUrl + '">' + img +
          '<span>' + t('youtube') + '</span></a>' : img;
      }).join('');
      const video = post.video;
      const credits = video && Number.isSafeInteger(video.session) ? '<div class="post-meta" data-video-session="' + video.session + '">' +
        L.esc(['GROOVE SESSION #' + video.session, video.dj, video.duration].filter(Boolean).join(' · ')) + '</div>' : '';
      card.innerHTML = '<header class="post-card-header"><span class="post-avatar" aria-hidden="true">' +
        L.esc(Array.from(author)[0]?.toUpperCase()) + '</span><div><div class="post-author"><strong>' +
        L.esc(author) + '</strong>' + (post.kind === 'official' ? '<span class="post-badge">' + t('official') + '</span>' : '') +
        '</div><div class="post-meta">' +
        (card.dataset.floor ? '<span class="post-floor">' + post.floor + ' ' + (post.floor === '2F' ? 'GROOVE' : 'SPOT') + '</span>' : '') +
        (album || member ? '<span>' + t(album ? 'photos' : 'member') + '</span>' : '') +
        (date ? '<span>' + date + '</span>' : '') + '</div>' + credits + '</div></header>' +
        (media ? '<div class="post-feed-media" data-post-layout>' + media + '</div>' : '') +
        '<div class="post-card-body"><p class="post-caption">' + L.esc(post.text) + '</p><div class="post-bar post-actions" data-post-layout>' +
        U.button('', 'data-like') + U.button(t('comments') + ' ' + (Number(post.comments) || 0), 'data-comments-button') +
        U.button(U.t('report'), 'data-report') + (member && post.mine ? U.button(t('delete'), 'data-delete') : '') +
        '</div>' + (album ? '<div>' + U.link('#/photos/' + encodeURIComponent(post.albumId ?? post.id), t('photos')) + '</div>' : '') +
        (post.challenge ? '<div>' + U.link('#/challenge', t('challenge')) + '</div>' : '') +
        (videoUrl && !images.length ? '<div>' + U.link(videoUrl, t('youtube')) + '</div>' : '') + '</div>';
      const like = card.querySelector('[data-like]');
      shareSettings.then(result => window.LoungeShare?.actions(like.parentElement, post, result));
      function paintLike() {
        like.setAttribute('aria-pressed', Boolean(post.liked));
        like.textContent = (post.liked ? '♥ ' : '♡ ') + L.t('feed.like') + ' ' + (Number(post.likes) || 0);
      }
      paintLike();
      like.onclick = async () => {
        if (L.needLogin() || like.disabled) return;
        const wasLiked = Boolean(post.liked), likes = Number(post.likes) || 0;
        post.liked = !wasLiked;
        post.likes = Math.max(0, likes + (wasLiked ? -1 : 1));
        like.disabled = true;
        paintLike();
        const result = await L.api(wasLiked ? 'unlike' : 'like', { id: post.id });
        if (!card.isConnected) return;
        like.disabled = false;
        if (!result || result.error) {
          post.liked = wasLiked;
          post.likes = likes;
          U.error(result);
        } else {
          if (typeof result.liked === 'boolean') post.liked = result.liked;
          if (typeof result.likes === 'number') post.likes = result.likes;
        }
        paintLike();
      };
      card.querySelector('[data-comments-button]').onclick = () => comments(post, view);
      card.querySelector('[data-report]').onclick = () => {
        if (L.needLogin()) return;
        let hidden = false;
        U.reason({
          title: U.t('report'), reasons: ['ad', 'sexual', 'abuse', 'illegal', 'etc'],
          submit: async why => {
            const result = await L.api('report', { kind: 'post', id: post.id, why });
            hidden = result.hidden === true;
            return result;
          },
          done: () => { if (hidden) removeCard(card); }
        });
      };
      card.querySelectorAll('[data-member-photo]').forEach(button => {
        button.onclick = () => {
          const photo = images[Number(button.dataset.memberPhoto)];
          const src = photo.src;
          const key = new URL(src).pathname.match(/^\/img\/(p\/[\w:-]+\/[\w-]+\.(?:jpg|webp))$/)?.[1];
          const sheet = U.sheet('<figure style="margin:12px 0">' + P.zoomImage(src,
            t('photo', { n: Number(button.dataset.memberPhoto) + 1 }), photo) + '</figure>' +
            (key ? U.button(t('take'), 'data-take') : ''));
          const take = sheet.querySelector('[data-take]');
          if (take) take.onclick = () => U.reason({
            title: t('take'), reasons: ['me'],
            submit: why => L.api('report', { kind: 'photo', id: key, why }),
            done: () => button.remove()
          });
        };
      });
      const del = card.querySelector('[data-delete]');
      if (del) del.onclick = () => {
        const sheet = U.sheet('<h2>' + t('confirm') + '</h2>' + U.button(t('delete'), 'data-confirm', true));
        const confirm = sheet.querySelector('[data-confirm]');
        confirm.onclick = async () => {
          confirm.disabled = true;
          const result = await L.api('post_del', { id: post.id });
          if (!sheet.isConnected) return;
          confirm.disabled = false;
          if (result.error) return U.error(result);
          if (id) L.go('feed');
          removeCard(card);
          L.closeSheet();
        };
      };
      list.append(card);
    }

    function empty() {
      if (id) return P.state(t('missing'));
      if (tab === 'following') return P.state(t('moreEmpty'));
      if (tab === 'all') return P.state(t('feedEmpty'));
      return P.state(t('floorEmpty', { floor: tab }));
    }

    function removeCard(card) {
      card.remove();
      if (!list.childElementCount && !page.firstElementChild) page.innerHTML = empty();
    }

    async function load(before) {
      const request = ++version;
      page.innerHTML = P.skeleton(before == null ? 'feed' : '');
      const response = await (id ? L.api('post_get', { id }) : L.api('feed', {
        ...(before != null && { before }), ...(tab !== 'all' && { tab })
      }));
      if (!view.isConnected || request !== version) return;
      if (id) {
        page.innerHTML = response.post ? '' : response.error === 'missing' ? empty() : P.state(U.t('error'));
        if (response.post) append(response.post);
        return;
      }
      if (typeof response.memberPosts === 'boolean' && memberPosts !== response.memberPosts) {
        memberPosts = response.memberPosts;
        paintTools();
      }
      if (!Array.isArray(response?.posts)) {
        page.innerHTML = response?.error === 'action' ? empty() : P.state(U.t('error'));
        if (response?.error !== 'action') {
          page.insertAdjacentHTML('beforeend', U.button(t('more')));
          page.querySelector('button').onclick = () => load(before);
        }
        return;
      }
      let added = 0;
      for (const post of response.posts) {
        if (ids.has(post.id)) continue;
        ids.add(post.id);
        append(post);
        added++;
      }
      const next = Object.hasOwn(response, 'before') ? response.before :
        response.next ?? response.nextBefore ?? response.posts.at(-1)?.at;
      page.innerHTML = added && next != null && next !== before && response.hasMore !== false
        ? U.button(t('more')) : ids.size ? '' : empty();
      const more = page.querySelector('button');
      if (more) more.onclick = () => load(next);
    }
    load();
    if (!id) shareSettings.then(result => {
      if (!view.isConnected) return;
      config = result;
      paintTools();
    });
  }
  L.screen('feed', { nav: 'feed', auth: false, title: 'nav.feed', render });
})();
