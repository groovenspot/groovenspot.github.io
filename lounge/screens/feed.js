(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('feed', {
    official: ['공식', 'Official'], photos: ['어젯밤 사진', 'Last night’s photos'],
    like: ['좋아요', 'Like'], comments: ['댓글', 'Comments'], more: ['더 보기', 'Load more'],
    write: ['댓글 쓰기', 'Write a comment'], send: ['보내기', 'Send']
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

  function render(root) {
    const view = U.mount(root, '<h1>' + L.esc(L.t('nav.feed')) + '</h1>' + U.link('#/photos', t('photos')));
    view.innerHTML = '<div data-posts></div><div data-page aria-live="polite"></div>';
    const list = view.querySelector('[data-posts]'), page = view.querySelector('[data-page]');
    const ids = new Set();

    function append(post) {
      const card = document.createElement('article');
      card.dataset.post = post.id;
      card.style.cssText = U.card;
      const date = U.time(post.at, { dateStyle: 'medium', timeStyle: 'short' });
      const album = post.kind === 'album';
      card.innerHTML = '<header><strong>' + L.esc(post.author?.nick || post.author?.name || 'GROOVE') +
        '</strong> <small class="muted">' + (album ? t('photos') : t('official')) + ' · ' + date + ' ' + L.esc(post.floor) +
        '</small></header><p style="white-space:pre-wrap">' + L.esc(post.text) + '</p>' + (post.photos || []).map(photo => {
          const src = U.image(photo?.url || photo?.key || photo);
          return src ? '<img loading="lazy" alt="" style="' + U.media + ';margin-bottom:8px" src="' + L.esc(src) + '">' : '';
        }).join('') + (album ? '<p>' + U.link('#/photos/' + encodeURIComponent(post.albumId ?? post.id), t('photos')) + '</p>' : '') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + U.button('', 'data-like') +
        U.button(t('comments') + ' ' + (Number(post.comments) || 0), 'data-comments-button') +
        U.button(U.t('report'), 'data-report') + '</div>';
      const like = card.querySelector('[data-like]');
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
      card.querySelector('[data-report]').onclick = () => U.report('post', post.id);
      list.append(card);
    }

    async function load(before) {
      page.innerHTML = U.status('loading', true);
      const response = await L.api('feed', before == null ? {} : { before });
      if (!view.isConnected) return;
      if (!Array.isArray(response?.posts)) {
        page.innerHTML = U.status(response?.error === 'action' ? 'empty' : 'error');
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
        ? U.button(t('more')) : ids.size ? '' : U.status('empty');
      const more = page.querySelector('button');
      if (more) more.onclick = () => load(next);
    }
    load();
  }
  L.screen('feed', { nav: 'feed', auth: false, title: 'nav.feed', render });
})();
