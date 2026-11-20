(() => {
  const L = Lounge, U = LoungeScreenUI, P = LoungePostUI;
  U.words('share', {
    title: ['공유', 'Share'], send: ['보내기', 'Send'], search: ['받을 사람 검색', 'Search recipients'],
    recent: ['받을 사람', 'Recipients'], message: ['메시지 한 줄 (선택)', 'Add a message (optional)'],
    none: ['받을 사람이 없어요.', 'No recipients found.'], max: ['최대 10명에게 보낼 수 있어요.', 'Select up to 10 people.'],
    sent: ['{n}명에게 보냈어요.', 'Sent to {n}.'], skipped: ['보내지 못한 사람: {names}', 'Could not send to: {names}'],
    limit: ['오늘 보낼 수 있는 횟수를 다 썼어요.', 'You’ve reached today’s sharing limit.'],
    copy: ['링크 복사', 'Copy link'], copied: ['링크를 복사했어요.', 'Link copied.'],
    external: ['외부 공유', 'Share outside Lounge'], story: ['스토리 이미지 만들기', 'Create story image'],
    download: ['이미지 저장', 'Download image'], save: ['저장', 'Save'], unsave: ['저장 취소', 'Remove from saved'],
    saved: ['저장됨', 'Saved'], empty: ['저장한 글이 없어요.', 'You haven’t saved any posts.'],
    publicPost: ['공개 글', 'Public post'], post: ['게시물', 'Post'], profile: ['프로필', 'Profile'],
    qr: ['프로필 QR', 'Profile QR'], gonePost: ['볼 수 없는 게시물', 'This post is unavailable'],
    goneProfile: ['볼 수 없는 프로필', 'This profile is unavailable']
  });
  const t = (key, values) => L.t('share.' + key, values);
  const text = (key, values) => L.esc(t(key, values));

  const style = document.createElement('style');
  style.textContent = `
    .share-sheet { overflow-wrap:anywhere; }
    .share-sheet > h2 { margin:0 0 12px; }
    .share-sheet form, .share-sheet label, .share-output { display:grid; gap:8px; min-width:0; }
    .share-sheet form { gap:12px; }
    .share-sheet input { width:100%; min-height:44px; }
    .share-sheet .btn, .share-ref { min-height:44px; }
    .share-targets { display:grid; grid-auto-flow:column; grid-auto-columns:64px; gap:8px; overflow-x:auto; padding:4px; }
    .share-target { min-height:70px; min-width:44px; display:grid; align-content:start; justify-items:center; gap:4px;
      text-align:center; border:0; padding:2px; background:none; color:inherit; border-radius:8px; cursor:pointer; font:inherit; }
    .share-target .share-avatar { display:grid; place-items:center; width:44px; height:44px; border-radius:50%; overflow:hidden;
      background:var(--bg-2); border:1px solid var(--line-2); font-weight:800; }
    .share-avatar img, .share-thumb { width:100%; height:100%; object-fit:cover; }
    .share-target[aria-pressed="true"] .share-avatar { border:3px solid var(--g); }
    .share-target .share-name { max-width:100%; font-size:.8em; overflow-wrap:anywhere; }
    .share-actions { display:flex; flex-wrap:wrap; gap:8px; margin-block:14px 8px; }
    .share-selection { display:flex; flex-wrap:wrap; gap:6px; }
    .share-output canvas { display:block; width:min(100%,280px); height:auto; border-radius:12px; }
    .share-output canvas[data-profile-qr] { image-rendering:pixelated; }
    .share-ref { color:inherit; display:flex; align-items:center; gap:8px; padding:8px; margin:6px 0;
      overflow-wrap:anywhere; text-decoration:none; border:1px solid currentColor; border-radius:10px; min-width:0; }
    .share-ref span { min-width:0; }
    .share-ref img { flex:none; width:44px; height:44px; object-fit:cover; border-radius:7px; }
    .share-card { display:grid; gap:8px; min-width:0; padding:12px; overflow-wrap:anywhere; }
    .share-card p { white-space:pre-wrap; }
    #sheet > .share-sheet { animation:share-slide .22s ease-out; }
    @keyframes share-slide { from { transform:translateY(24px); opacity:.6; } }
    @media (prefers-reduced-motion:reduce) { #sheet > .share-sheet { animation:none; } }
  `;
  document.head.append(style);

  const config = () => L.api('config');
  const publicApi = window.LOUNGE_API || 'https://groove-lounge-api.groovenspotbusan.workers.dev/';
  const enabled = result => result?.open?.share === true;
  const postPath = id => '#/feed/' + encodeURIComponent(id);
  const profilePath = nick => '#/user/' + encodeURIComponent(nick);
  const publicPath = id => '#/p/' + encodeURIComponent(id);
  const url = path => new URL('/lounge/' + path, location.origin).href;
  const authorOf = post => post.author?.nick || post.author?.name || 'GROOVE';
  const thumbOf = post => P.photo(post.thumb || post.photos?.[0]).thumb;
  const isPrivate = post => post.private === true || post.author?.private === true || post.hidden === true;
  const idOf = value => typeof value === 'string' ? value : value?.id;
  const nickOf = value => typeof value === 'string' ? value : value?.nick;
  const activeSaves = new Set();
  const marker = '[data-share-save]';

  function paintSave(button, saved) {
    button.setAttribute('aria-pressed', String(saved));
    button.textContent = t(saved ? 'unsave' : 'save');
  }

  function saveButton(post, done) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.dataset.shareSave = post.id;
    paintSave(button, post.saved === true);
    button.onclick = async () => {
      if (activeSaves.has(post.id) || L.needLogin()) return;
      const member = L.me;
      const saved = button.getAttribute('aria-pressed') === 'true';
      activeSaves.add(post.id);
      button.disabled = true;
      try {
        const result = await L.api(saved ? 'unsave' : 'save', { post: post.id });
        if (result.ok !== true) { if (button.isConnected) U.error(result); return; }
        if (L.me !== member) return;
        post.saved = !saved;
        document.querySelectorAll(marker).forEach(other => {
          if (other.dataset.shareSave === post.id) paintSave(other, post.saved);
        });
        done?.(post.saved);
      } finally {
        activeSaves.delete(post.id);
        button.disabled = false;
      }
    };
    return button;
  }

  function actions(container, post, settings, done) {
    if (!container?.isConnected || !post?.id || !enabled(settings)) return;
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'btn';
    share.dataset.sharePost = '';
    share.textContent = t('title');
    share.onclick = () => {
      post.saved = save.getAttribute('aria-pressed') === 'true';
      void open({ post }, done);
    };
    const save = saveButton(post, done);
    container.append(share, save);
  }

  function avatar(target) {
    const photo = U.image(target.photo);
    return '<span class="share-avatar" aria-hidden="true">' + (photo
      ? '<img alt="" referrerpolicy="no-referrer" src="' + L.esc(photo) + '">'
      : L.esc(Array.from(target.nick)[0])) + '</span>';
  }

  function recipients(panel, ref) {
    const form = panel.querySelector('form');
    if (!form) return;
    const search = form.elements.q, message = form.elements.message;
    const results = form.querySelector('[data-share-targets]'), picks = form.querySelector('[data-share-picks]');
    const notice = form.querySelector('[role=status]'), send = form.querySelector('button[type=submit]');
    const selected = new Map();
    let rows = [], requestVersion = 0, debounce, busy = false;

    function remove(nick) {
      selected.delete(nick);
      paint();
    }

    function paint() {
      results.innerHTML = rows.length ? rows.map((target, i) =>
        '<button type="button" class="share-target" data-target="' + i + '" aria-pressed="' + selected.has(target.nick) + '">' +
        avatar(target) + '<span class="share-name">' + L.esc(target.nick) + '</span></button>').join('') :
        '<span class="muted">' + text('none') + '</span>';
      results.querySelectorAll('[data-target]').forEach(button => {
        button.onclick = () => {
          const target = rows[Number(button.dataset.target)];
          if (selected.has(target.nick)) return remove(target.nick);
          if (selected.size >= 10) { notice.textContent = t('max'); return; }
          selected.set(target.nick, target);
          paint();
          results.querySelector('[data-target="' + button.dataset.target + '"]')?.focus();
        };
      });
      picks.innerHTML = [...selected.keys()].map(nick => U.button(L.esc(nick) + ' ×', 'data-pick="' + L.esc(nick) + '"')).join('');
      picks.querySelectorAll('[data-pick]').forEach(button => { button.onclick = () => remove(button.dataset.pick); });
      send.disabled = busy || !selected.size;
    }

    async function load(q, version) {
      if (!panel.isConnected) return;
      const response = await L.api('share_targets', q ? { q } : {});
      if (!panel.isConnected || version !== requestVersion) return;
      if (response.error) { notice.textContent = U.t('error'); return; }
      rows = (response.list || []).filter(target => typeof target.nick === 'string' && target.nick)
        .slice(0, q ? undefined : 8);
      paint();
    }

    search.oninput = () => {
      clearTimeout(debounce);
      const version = ++requestVersion;
      debounce = setTimeout(() => void load(search.value.trim(), version), 220);
    };
    form.onsubmit = async event => {
      event.preventDefault();
      if (busy || !selected.size) return;
      busy = true;
      form.inert = true;
      send.disabled = true;
      notice.textContent = U.t('loading');
      const body = { ...ref, to: [...selected.keys()] };
      if (message.value.trim()) body.text = message.value.trim();
      const result = await L.api('share_dm', body);
      if (!panel.isConnected) return;
      busy = false;
      form.inert = false;
      if (result.ok !== true) {
        notice.textContent = result.error === 'share_limit' ? t('limit') : U.t('error');
        paint();
        return;
      }
      const skipped = (result.skipped || []).map(item => item.nick);
      const count = Array.isArray(result.sent) ? result.sent.length : Number(result.sent) || 0;
      for (const nick of body.to) if (!skipped.includes(nick)) selected.delete(nick);
      if (count && !skipped.length) message.value = '';
      notice.textContent = [t('sent', { n: count }), skipped.length && t('skipped', { names: skipped.join(', ') })]
        .filter(Boolean).join(' ');
      paint();
    };
    void load('', requestVersion);
  }

  async function publicPost(id) {
    try {
      const response = await fetch(publicApi, {
        method: 'POST', credentials: 'omit', headers: { 'content-type': 'text/plain' },
        body: JSON.stringify({ a: 'post_public', id })
      });
      const { post } = await response.json();
      return response.ok && post?.id === id && !isPrivate(post) ? post : null;
    } catch (_) { return null; }
  }

  async function paintStory(canvas, post, href) {
    // Same 9:16 canvas and PNG export as the recap card in rewards.js.
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#21132c');
    gradient.addColorStop(.56, '#120e17');
    gradient.addColorStop(1, '#2d1810');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    const label = (value, y, size, color = '#fff3ec') => {
      ctx.font = '800 ' + size + 'px system-ui, sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(value, 92, y, 896);
    };
    label('GROOVE LOUNGE', 168, 62, '#ffad73');
    label(authorOf(post), 278, 72);
    let captionY = 446;
    const source = thumbOf(post);
    if (source) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = source;
      if (await image.decode().then(() => true, () => false)) {
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 92, 354, 896, 896);
        captionY = 1358;
      }
    }
    const caption = Array.from(post.text || '').slice(0, 220).join('');
    ctx.font = '800 46px system-ui, sans-serif';
    const lines = [''];
    for (const char of caption) {
      if (char === '\n' || ctx.measureText(lines.at(-1) + char).width > 896) {
        if (lines.length === 5) {
          lines[4] = lines[4].trimEnd() + '…';
          break;
        }
        lines.push(char.trimStart());
      } else lines[lines.length - 1] += char;
    }
    lines.forEach((line, i) => label(line, captionY + 64 * i, 46));
    label(href, 1810, 36, '#e0bbf8');
  }

  let qrReady;
  function loadQr() {
    if (typeof window.qrcode === 'function') return Promise.resolve(window.qrcode);
    qrReady ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/qrcode-generator-1.4.4.js';
      script.onload = () => typeof window.qrcode === 'function' ? resolve(window.qrcode) : reject(new Error('qr'));
      script.onerror = () => reject(new Error('qr'));
      document.head.append(script);
    }).catch(error => { qrReady = null; throw error; });
    return qrReady;
  }

  function showQr(output, makeQr, href) {
    const qr = makeQr(0, 'M');
    qr.addData(href, 'Byte');
    qr.make();
    const n = qr.getModuleCount(), cell = 8;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = (n + 8) * cell;
    canvas.dataset.profileQr = '';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('qr'));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
      if (qr.isDark(row, col)) ctx.fillRect((col + 4) * cell, (row + 4) * cell, cell, cell);
    }
    const link = document.createElement('a');
    link.href = href;
    link.textContent = href;
    output.replaceChildren(canvas, link);
    link.onclick = event => { event.preventDefault(); L.closeSheet(); L.go(new URL(href).hash); };
  }

  let opening = 0;
  async function open({ post, profile } = {}, onSave) {
    const id = idOf(post), nick = nickOf(profile);
    if (Boolean(id) === Boolean(nick)) return;
    const version = ++opening, hash = location.hash;
    if (!enabled(await config()) || version !== opening || hash !== location.hash) return;
    const record = id ? (typeof post === 'string' ? { id } : post) : null;
    const panel = L.sheet('<h2>' + text('title') + '</h2>' + (L.me
      ? '<form><label>' + text('search') + '<input name="q" type="search" maxlength="100" autocomplete="off"></label>' +
        '<div class="share-targets" data-share-targets role="group" aria-label="' + text('recent') + '"></div>' +
        '<div class="share-selection" data-share-picks></div><label>' + text('message') +
        '<input name="message" maxlength="500"></label><button class="btn btn-hot" type="submit" disabled>' + text('send') +
        '</button><p role="status"></p></form>'
      : U.button(L.esc(L.t('core.login')), 'data-share-login')) +
      '<div class="share-actions"></div><div class="share-output"></div><p data-share-status role="status"></p>' +
      U.button(L.esc(L.t('core.close')), 'data-share-close'));
    panel.classList.add('share-sheet');
    panel.querySelector('[data-share-close]').onclick = L.closeSheet;
    const login = panel.querySelector('[data-share-login]');
    if (login) login.onclick = L.needLogin;
    recipients(panel, id ? { post: id } : { profile: nick });

    const controls = panel.querySelector('.share-actions'), output = panel.querySelector('.share-output');
    const status = panel.querySelector('[data-share-status]');
    function action(key, handler) {
      const button = document.createElement('button');
      button.className = 'btn';
      button.type = 'button';
      button.dataset.shareAction = key;
      button.textContent = t(key);
      button.onclick = async () => {
        button.disabled = true;
        status.textContent = '';
        try { await handler(); }
        catch (error) { if (panel.isConnected && error.name !== 'AbortError') status.textContent = U.t('error'); }
        finally { button.disabled = false; }
      };
      controls.prepend(button);
    }

    if (record) {
      controls.append(saveButton(record, onSave));
      const saved = document.createElement('a');
      saved.href = '#/saved';
      saved.className = 'btn';
      saved.textContent = t('saved');
      controls.append(saved);
      if (isPrivate(record) || !await publicPost(id) || !panel.isConnected) return;
      const href = url(publicPath(id));
      async function checked(work) {
        const current = await publicPost(id);
        if (!panel.isConnected) return;
        if (!current) {
          controls.querySelectorAll('[data-share-action]').forEach(button => button.remove());
          output.replaceChildren();
          status.textContent = t('gonePost');
          return;
        }
        await work(current);
      }
      action('story', () => checked(async current => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', t('story'));
        await paintStory(canvas, current, href);
        if (!panel.isConnected) return;
        const link = document.createElement('a');
        link.className = 'btn';
        link.download = 'groove-story.png';
        link.href = canvas.toDataURL('image/png');
        link.textContent = t('download');
        output.replaceChildren(canvas, link);
      }));
      if (typeof navigator.share === 'function') action('external', () => checked(current =>
        navigator.share({ title: authorOf(current) + ' · GROOVE LOUNGE', url: href })));
      action('copy', () => checked(async () => {
        try {
          await navigator.clipboard.writeText(href);
          status.textContent = t('copied');
        } catch (_) {
          const field = document.createElement('input');
          field.readOnly = true;
          field.value = href;
          field.setAttribute('aria-label', t('copy'));
          output.replaceChildren(field);
          field.select();
        }
      }));
    } else if (profile?.private !== true) {
      const lookup = () => L.api('user', { nick });
      if ((await lookup()).user?.private !== false || !panel.isConnected) return;
      action('qr', async () => {
        const current = (await lookup()).user;
        if (!panel.isConnected) return;
        if (current?.private !== false) {
          controls.querySelector('[data-share-action=qr]')?.remove();
          output.replaceChildren();
          status.textContent = t('goneProfile');
          return;
        }
        const makeQr = await loadQr();
        if (panel.isConnected) showQr(output, makeQr, url(profilePath(current.nick || nick)));
      });
    }
  }

  function reference(ref) {
    if (!ref || !['post', 'profile'].includes(ref.kind)) return '';
    const isPost = ref.kind === 'post';
    if (ref.gone || !ref.id) return '<span class="share-ref">' + text('gonePost') + '</span>';
    const href = isPost ? postPath(ref.id) : profilePath(ref.author || ref.id);
    const thumb = U.image(ref.thumb);
    return '<a class="share-ref" href="' + href + '">' + (thumb
      ? '<img alt="" src="' + L.esc(thumb) + '" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '<span><strong>' + text(isPost ? 'post' : 'profile') + '</strong><br>' +
      L.esc(ref.author) + (ref.text ? '<br>' + L.esc(ref.text) : '') + '</span></a>';
  }

  async function renderSaved(root) {
    const settings = await config();
    if (!root.isConnected) return;
    if (!enabled(settings)) { root.textContent = L.t('core.soon'); return; }
    const view = P.mount(root, text('saved'), U.link('#/feed', L.esc(L.t('nav.feed'))));
    if (L.needLogin()) return;
    view.innerHTML = '<div class="post-stack" data-saved-posts></div><div data-saved-page></div>';
    const list = view.querySelector('[data-saved-posts]'), page = view.querySelector('[data-saved-page]');
    const seen = new Set();
    async function load(before) {
      page.innerHTML = U.status('loading', true);
      const result = await L.api('saved', before == null ? {} : { before });
      if (!view.isConnected) return;
      if (result.error) {
        page.innerHTML = U.status('error') + U.button(L.esc(L.t('feed.more')), 'data-saved-more');
        page.querySelector('button').onclick = () => load(before);
        return;
      }
      for (const post of result.posts || []) {
        if (!post.id || seen.has(post.id)) continue;
        seen.add(post.id);
        post.saved = true;
        const card = document.createElement('article'), thumb = thumbOf(post);
        card.className = 'post-card share-card';
        card.innerHTML = '<strong>' + L.esc(authorOf(post)) + '</strong>' +
          (thumb ? P.image(thumb, '', false) : '') + '<p>' + L.esc(post.text) + '</p><div class="post-bar">' +
          U.link(postPath(post.id), text('post')) + '</div>';
        list.append(card);
        actions(card.querySelector('.post-bar'), post, settings, saved => {
          if (saved) return;
          card.remove();
          if (!list.children.length && !page.querySelector('button')) page.textContent = t('empty');
        });
      }
      const next = result.before;
      page.innerHTML = next != null && next !== before ? U.button(L.esc(L.t('feed.more')), 'data-saved-more') :
        (list.children.length ? '' : P.state(text('empty')));
      const more = page.querySelector('button');
      if (more) more.onclick = () => { more.disabled = true; void load(next); };
    }
    await load();
  }

  async function renderPublic(root, { id }) {
    const settings = await config();
    if (!root.isConnected) return;
    if (!enabled(settings)) { root.textContent = L.t('core.soon'); return; }
    const view = P.mount(root, text('publicPost'), U.link('#/feed', L.esc(L.t('nav.feed'))));
    view.innerHTML = U.status('loading', true);
    const post = id && await publicPost(id);
    if (!view.isConnected) return;
    if (!post) { view.innerHTML = P.state(text('gonePost')); return; }
    const media = (post.photos || []).map(P.photo).filter(photo => photo.src);
    view.innerHTML = '<article class="post-card share-card"><strong>' + L.esc(authorOf(post)) + '</strong>' +
      media.map(photo => P.image(photo.src, '', false, photo)).join('') +
      '<p>' + L.esc(post.text) + '</p></article>';
  }

  window.LoungeShare = { open, actions, reference };
  L.screen('saved', { nav: 'me', title: 'share.saved', render: renderSaved });
  L.screen('p', { nav: 'feed', title: 'share.publicPost', render: renderPublic });
})();
