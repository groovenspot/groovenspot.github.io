(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('feed', {
    official: ['공식', 'Official'], photos: ['어젯밤 사진', 'Last night’s photos'],
    like: ['좋아요', 'Like'], comments: ['댓글', 'Comments'], more: ['더 보기', 'Load more'],
    write: ['댓글 쓰기', 'Write a comment'], send: ['보내기', 'Send'],
    following: ['팔로잉', 'Following'], all: ['전체', 'All'], filters: ['피드 보기', 'Filter feed'],
    compose: ['글쓰기', 'Write a post'], member: ['손님 사진', 'Guest photo'],
    challenge: ['포토 챌린지', 'Photo challenge'], delete: ['내 글 지우기', 'Delete my post'],
    confirm: ['이 글을 지울까요?', 'Delete this post?'], youtube: ['유튜브에서 보기', 'Watch on YouTube'],
    take: ['사진을 내려 주세요', 'Take this photo down'], photo: ['사진 {n} 크게 보기', 'Enlarge photo {n}']
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
    const view = U.mount(root, '<h1>' + L.esc(L.t('nav.feed')) + '</h1>' +
      (id ? U.link('#/feed', t('all')) : U.link('#/photos', t('photos'))) + '<div data-post-tools></div>');
    view.innerHTML = '<div data-posts></div><div data-page aria-live="polite"></div>';
    const list = view.querySelector('[data-posts]'), page = view.querySelector('[data-page]');
    const tools = view.parentElement.querySelector('[data-post-tools]');
    const ids = new Set();
    let tab = 'all', version = 0, config, memberPosts;

    function paintTools() {
      if (!config || id) return;
      const canPost = config.open?.posts || memberPosts;
      tools.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">' +
        (canPost ? U.link('#/compose', t('compose')) : '<span class="muted">' + t('compose') + ' · ' + U.t('soon') + '</span>') +
        (config.open?.challenge ? U.link('#/challenge', t('challenge')) : '') + '</div>' +
        '<div role="group" aria-label="' + t('filters') + '" style="display:flex;gap:6px;flex-wrap:wrap">' +
        ['following', 'all', '2F', '3F'].map(key => U.button(
          key === 'all' || key === 'following' ? t(key) : key,
          'data-tab="' + key + '" aria-pressed="' + (key === tab) + '"', key === tab
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
      card.style.cssText = U.card;
      const date = U.time(post.at, { dateStyle: 'medium', timeStyle: 'short' });
      const album = post.kind === 'album';
      const member = post.kind === 'member';
      const images = (post.photos || []).map(photo => U.image(photo?.url || photo?.key || photo)).filter(Boolean);
      card.innerHTML = '<header><strong>' + L.esc(post.author?.nick || post.author?.name || 'GROOVE') +
        '</strong> <small class="muted">' + (album ? t('photos') : member ? t('member') : t('official')) +
        ' · ' + date + ' ' + L.esc(post.floor) + '</small></header><p style="white-space:pre-wrap">' + L.esc(post.text) +
        '</p>' + images.map((src, index) => {
          const img = '<img loading="lazy" referrerpolicy="no-referrer" alt="' + (member ? t('photo', { n: index + 1 }) : '') +
            '" style="' + U.media + '" src="' + L.esc(src) + '">';
          return member ? U.button(img, 'data-member-photo="' + index + '" style="display:block;padding:4px;width:100%;margin-bottom:8px"') :
            '<div style="margin-bottom:8px">' + img + '</div>';
        }).join('') + (album ? '<p>' + U.link('#/photos/' + encodeURIComponent(post.albumId ?? post.id), t('photos')) + '</p>' : '') +
        (post.challenge ? '<p>' + U.link('#/challenge', t('challenge')) + '</p>' : '') +
        (/^[A-Za-z0-9_-]{11}$/.test(post.youtube || '') ?
          '<p>' + U.link('https://www.youtube.com/watch?v=' + post.youtube, t('youtube')) + '</p>' : '') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + U.button('', 'data-like') +
        U.button(t('comments') + ' ' + (Number(post.comments) || 0), 'data-comments-button') +
        U.button(U.t('report'), 'data-report') +
        (member && post.mine ? U.button(t('delete'), 'data-delete') : '') + '</div>';
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
          done: () => { if (hidden) card.remove(); }
        });
      };
      card.querySelectorAll('[data-member-photo]').forEach(button => {
        button.onclick = () => {
          const src = images[Number(button.dataset.memberPhoto)];
          const key = new URL(src).pathname.match(/^\/img\/(p\/[\w:-]+\/[\w-]+\.(?:jpg|webp))$/)?.[1];
          const sheet = U.sheet('<img alt="' + t('photo', { n: Number(button.dataset.memberPhoto) + 1 }) +
            '" style="' + U.media + ';max-height:65vh;object-fit:contain;margin:12px 0" src="' + L.esc(src) +
            '">' + (key ? U.button(t('take'), 'data-take') : ''));
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
          card.remove();
          L.closeSheet();
        };
      };
      list.append(card);
    }

    async function load(before) {
      const request = ++version;
      page.innerHTML = U.status('loading', true);
      const response = await (id ? L.api('post_get', { id }) : L.api('feed', {
        ...(before != null && { before }), ...(tab !== 'all' && { tab })
      }));
      if (!view.isConnected || request !== version) return;
      if (id) {
        page.innerHTML = response.post ? '' : U.status(response.error === 'missing' ? 'empty' : 'error');
        if (response.post) append(response.post);
        return;
      }
      if (typeof response.memberPosts === 'boolean' && memberPosts !== response.memberPosts) {
        memberPosts = response.memberPosts;
        paintTools();
      }
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
    if (!id) L.api('config').then(result => {
      if (!view.isConnected) return;
      config = result;
      paintTools();
    });
  }
  L.screen('feed', { nav: 'feed', auth: false, title: 'nav.feed', render });
})();
