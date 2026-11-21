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
  // 4차(인스타그램 방식 공유 시트) 새 문구 — 새 키라서 네 언어를 여기 같이 둔다
  L.i18n({
    ko: { 'share4.search': '검색', 'share4.story': '스토리 이미지', 'share4.qr': 'QR 코드', 'share4.external': '다른 앱', 'share4.openSaved': '저장함 보기',
      'share4.picked': '{n}명 선택', 'share4.remove': '{nick} 빼기', 'share4.login': '로그인하고 친구에게 보내기' },
    en: { 'share4.search': 'Search', 'share4.story': 'Story image', 'share4.qr': 'QR code', 'share4.external': 'Other apps', 'share4.openSaved': 'View saved',
      'share4.picked': '{n} selected', 'share4.remove': 'Remove {nick}', 'share4.login': 'Log in to send to friends' },
    ja: { 'share4.search': '検索', 'share4.story': 'ストーリー画像', 'share4.qr': 'QRコード', 'share4.external': '他のアプリ', 'share4.openSaved': '保存済みを見る',
      'share4.picked': '{n}人を選択', 'share4.remove': '{nick}を外す', 'share4.login': 'ログインして友だちに送る' },
    zh: { 'share4.search': '搜索', 'share4.story': '快拍图片', 'share4.qr': '二维码', 'share4.external': '其他应用', 'share4.openSaved': '查看收藏',
      'share4.picked': '已选{n}人', 'share4.remove': '移除{nick}', 'share4.login': '登录后发送给好友' }
  });
  const t = (key, values) => L.t('share.' + key, values);
  const t4 = (key, values) => L.esc(L.t('share4.' + key, values));
  const text = (key, values) => L.esc(t(key, values));

  const style = document.createElement('style');
  style.textContent = `
    .share-sheet { overflow-wrap:anywhere; }
    .share-sheet > h2 { margin:0 0 10px; padding-left:42px; font-size:1rem; line-height:24px; text-align:center; }
    .share-sheet form { display:grid; gap:10px; min-width:0; }
    .share-search { position:relative; display:block; }
    .share-search > svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); pointer-events:none; }
    .share-search input { width:100%; min-height:44px; padding:8px 12px 8px 40px; border:0; border-radius:12px; background:#241f1d; }
    .share-sheet .btn, .share-ref { min-height:44px; }
    /* 받을 사람: 4칸 격자 — 아바타 + 닉네임 한 줄(길면 말줄임) */
    .share-targets { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px 2px; padding:4px 0; }
    .share-targets > .muted { grid-column:1/-1; padding:18px 0; text-align:center; }
    .share-target { position:relative; min-width:0; min-height:88px; display:grid; align-content:start; justify-items:center; gap:6px;
      text-align:center; border:0; padding:4px 2px; background:none; color:inherit; border-radius:12px; cursor:pointer; font:inherit;
      -webkit-tap-highlight-color:transparent; }
    .share-target .ui-avatar { pointer-events:none; }
    .share-target .share-name { display:block; width:100%; font-size:.75rem; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; overflow-wrap:normal; }
    .share-target .share-check { position:absolute; top:42px; left:calc(50% + 12px); display:none; place-items:center; width:22px; height:22px;
      border-radius:50%; background:var(--g); color:var(--g-ink); box-shadow:0 0 0 2px var(--card); }
    .share-target[aria-pressed="true"] .share-check { display:grid; }
    .share-target[aria-pressed="true"] .ui-avatar { box-shadow:0 0 0 2px var(--card), 0 0 0 4px var(--g); }
    .share-selection { display:flex; flex-wrap:nowrap; gap:6px; overflow-x:auto; scrollbar-width:none; }
    .share-selection:empty { display:none; }
    .share-selection::-webkit-scrollbar { display:none; }
    .share-selection .btn { flex:none; min-height:32px; padding:0 10px; border-radius:16px; font-size:.75rem; font-weight:700; white-space:nowrap; }
    .share-send { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; }
    .share-send input { min-height:44px; padding:8px 12px; border:0; border-radius:12px; background:#241f1d; }
    .share-send .btn { padding:0 16px; }
    .share-sheet [role=status]:empty { display:none; }
    .share-sheet [role=status] { font-size:.8125rem; color:var(--muted); }
    /* 아래 아이콘 줄: 링크 복사 · 스토리 이미지 · QR · 다른 앱 · 저장 */
    .share-actions { display:flex; gap:4px; margin:12px -18px 0; padding:12px 14px 2px; border-top:1px solid var(--line); overflow-x:auto; scrollbar-width:none; }
    .share-actions:empty { display:none; }
    .share-actions::-webkit-scrollbar { display:none; }
    .share-act { flex:0 0 72px; display:grid; justify-items:center; align-content:start; gap:6px; min-height:76px; padding:2px; border:0; background:none;
      color:var(--txt); font:inherit; font-size:.6875rem; line-height:1.25; text-align:center; cursor:pointer; -webkit-tap-highlight-color:transparent; }
    .share-act > i { display:grid; place-items:center; width:48px; height:48px; border-radius:50%; background:#241f1d; font-style:normal; }
    .share-act:active > i { background:#322b28; }
    .share-act:disabled { opacity:.5; }
    .share-act[aria-pressed="true"] > i { color:var(--g); }
    .share-saved-link { display:inline-flex; align-items:center; min-height:44px; color:#9ecbff; font-size:.8125rem; font-weight:700; text-decoration:none; }
    .share-output { display:grid; gap:8px; min-width:0; justify-items:center; }
    .share-output:empty { display:none; }
    .share-output { margin-top:10px; }
    .share-output canvas { display:block; width:min(100%,240px); height:auto; border-radius:12px; }
    .share-output canvas[data-profile-qr] { image-rendering:pixelated; }
    .share-output > a:not(.btn) { max-width:100%; font-size:.75rem; color:var(--muted); word-break:break-all; text-align:center; }
    .share-output input { width:100%; }
    .share-ref { color:inherit; display:flex; align-items:center; gap:8px; padding:8px; margin:6px 0;
      overflow-wrap:anywhere; text-decoration:none; border:1px solid currentColor; border-radius:10px; min-width:0; }
    .share-ref span { min-width:0; }
    .share-ref img { flex:none; width:44px; height:44px; object-fit:cover; border-radius:7px; }
    .share-thumb { width:100%; height:100%; object-fit:cover; }
    .share-card { display:grid; gap:8px; min-width:0; padding:12px; overflow-wrap:anywhere; }
    .share-card p { white-space:pre-wrap; }
  `;
  document.head.append(style);

  const config = () => L.api('config');
  const publicApi = window.LOUNGE_API || 'https://groove-lounge-api.groovenspotbusan.workers.dev/';
  const enabled = result => result?.open?.share === true;
  const postPath = id => '#/feed/' + encodeURIComponent(id);
  const profilePath = nick => '#/u/' + encodeURIComponent(nick);          // 밖으로 나가는 링크·QR (B17)
  const refProfilePath = nick => '#/user/' + encodeURIComponent(nick);     // 메시지 안 프로필 카드(예전 주소 유지 — 같은 화면으로 감)
  const publicPath = id => '#/p/' + encodeURIComponent(id);
  const url = path => new URL('/lounge/' + path, location.origin).href;
  const authorOf = post => post.author?.nick || 'GROOVE';
  const thumbOf = post => P.photo(post.thumb || post.photos?.[0]).thumb;
  const isPrivate = post => post.private === true || post.author?.private === true || post.hidden === true;
  const idOf = value => typeof value === 'string' ? value : value?.id;
  const nickOf = value => typeof value === 'string' ? value : value?.nick;
  const activeSaves = new Set();
  const marker = '[data-share-save]';

  function paintSave(button, saved) {
    button.setAttribute('aria-pressed', String(saved));
    if (button.classList.contains('share-act')) {   // 공유 시트 아이콘 줄: 책갈피가 채워짐
      button.innerHTML = '<i>' + L.icon('bookmark', { fill: saved }) + '</i><span>' + text('save') + '</span>';
      button.setAttribute('aria-label', t(saved ? 'unsave' : 'save'));
    } else button.textContent = t(saved ? 'unsave' : 'save');
  }

  function saveButton(post, done, icon) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = icon ? 'share-act' : 'btn';
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

  function recipients(panel, ref) {
    const form = panel.querySelector('form');
    if (!form) return;
    const search = form.elements.q, message = form.elements.message;
    const results = form.querySelector('[data-share-targets]'), picks = form.querySelector('[data-share-picks]');
    const notice = form.querySelector('[role=status]'), send = form.querySelector('button[type=submit]');
    const sendRow = form.querySelector('[data-share-send]');
    const selected = new Map();
    let rows = [], requestVersion = 0, debounce, busy = false;

    function remove(nick) {
      selected.delete(nick);
      paint();
    }

    function paint() {
      // 닉네임은 한 줄(길면 말줄임) — 글자 중간 줄바꿈 버그(B4) 수정. 소속 태그는 title 로만.
      results.innerHTML = rows.length ? rows.map((target, i) =>
        '<button type="button" class="share-target" data-target="' + i + '" aria-pressed="' + selected.has(target.nick) + '" title="' +
        L.esc(target.nick + (L.tagLabel(target.tag) ? ' · ' + L.tagLabel(target.tag) : '')) + '">' +
        L.avatar({ nick: target.nick, photo: U.image(target.photo) }, 56) + '<span class="share-check" aria-hidden="true">' + L.icon('check', { size: 14, stroke: 3 }) +
        '</span><span class="share-name">' + L.esc(target.nick) + '</span></button>').join('') :
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
      picks.innerHTML = [...selected.keys()].map(nick => U.button(L.esc(nick) + ' ×',
        'data-pick="' + L.esc(nick) + '" aria-label="' + t4('remove', { nick }) + '"')).join('');
      picks.querySelectorAll('[data-pick]').forEach(button => { button.onclick = () => remove(button.dataset.pick); });
      sendRow.hidden = !selected.size;      // 받을 사람을 고르면 메시지 칸 + '보내기'가 나타난다
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
      const line = message.value.replace(/[\r\n\v\f\u0085\u2028\u2029]+/gu, ' ').trim();
      if (line) body.text = line;
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
      ? '<form><label class="share-search">' + L.icon('search', { size: 20 }) + '<input name="q" type="search" maxlength="64" autocomplete="off" placeholder="' +
        t4('search') + '" aria-label="' + text('search') + '"></label>' +
        '<div class="share-targets" data-share-targets role="group" aria-label="' + text('recent') + '"></div>' +
        '<div class="share-selection" data-share-picks></div>' +
        '<div class="share-send" data-share-send hidden><input name="message" maxlength="500" placeholder="' + text('message') + '" aria-label="' + text('message') +
        '"><button class="btn btn-hot" type="submit" disabled>' + text('send') + '</button></div><p role="status"></p></form>'
      : U.button(t4('login'), 'data-share-login', true)) +
      '<div class="share-actions" data-share-actions></div><p data-share-status role="status"></p><div class="share-output"></div>', { close: true });
    panel.classList.add('share-sheet');
    panel.querySelector('[data-sheet-x]').dataset.shareClose = '';   // 닫기 ✕ 는 오른쪽 위 한 곳 (B15)
    const login = panel.querySelector('[data-share-login]');
    if (login) login.onclick = L.needLogin;
    recipients(panel, id ? { post: id } : { profile: nick });

    const controls = panel.querySelector('.share-actions'), output = panel.querySelector('.share-output');
    const status = panel.querySelector('[data-share-status]');
    const ICON = { copy: 'link', story: 'image', qr: 'grid', external: 'send' };
    const LABEL = { copy: () => text('copy'), story: () => t4('story'), qr: () => t4('qr'), external: () => t4('external') };
    function action(key, handler) {
      const button = document.createElement('button');
      button.className = 'share-act';
      button.type = 'button';
      button.dataset.shareAction = key;
      button.innerHTML = '<i>' + L.icon(ICON[key]) + '</i><span>' + LABEL[key]() + '</span>';
      button.onclick = async () => {
        button.disabled = true;
        status.textContent = '';
        try { await handler(); }
        catch (error) { if (panel.isConnected && error.name !== 'AbortError') status.textContent = U.t('error'); }
        finally { button.disabled = false; }
      };
      // 순서: 링크 복사 · 스토리 이미지 · QR · 다른 앱 (저장은 그 뒤)
      const order = ['copy', 'story', 'qr', 'external'];
      const next = [...controls.querySelectorAll('[data-share-action]')].find(other => order.indexOf(other.dataset.shareAction) > order.indexOf(key)) ||
        controls.querySelector('[data-share-save]');
      controls.insertBefore(button, next || null);
    }
    async function copyLink(href) {
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
    }

    if (record) {
      const saved = document.createElement('a');
      saved.href = '#/saved';
      saved.className = 'share-saved-link';
      saved.textContent = L.t('share4.openSaved') + ' ›';
      saved.hidden = record.saved !== true;
      controls.append(saveButton(record, value => { saved.hidden = !value; onSave?.(value); }, true));
      controls.after(saved);
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
      action('copy', () => checked(() => copyLink(href)));
    } else if (profile?.private !== true) {
      const lookup = () => L.api('user', { nick });
      if ((await lookup()).user?.private !== false || !panel.isConnected) return;
      // 공개 프로필만: 링크 복사 · QR · 다른 앱. 누를 때마다 지금도 공개인지 다시 확인한다.
      async function checkedProfile(work) {
        const current = (await lookup()).user;
        if (!panel.isConnected) return;
        if (current?.private !== false) {
          controls.querySelectorAll('[data-share-action]').forEach(button => button.remove());
          output.replaceChildren();
          status.textContent = t('goneProfile');
          return;
        }
        await work(url(profilePath(current.nick || nick)), current.nick || nick);
      }
      action('qr', () => checkedProfile(async href => {
        const makeQr = await loadQr();
        if (panel.isConnected) showQr(output, makeQr, href);
      }));
      if (typeof navigator.share === 'function') action('external', () => checkedProfile((href, name) =>
        navigator.share({ title: name + ' · GROOVE LOUNGE', url: href })));
      action('copy', () => checkedProfile(href => copyLink(href)));
    }
  }

  function reference(ref) {
    if (!ref || !['post', 'profile'].includes(ref.kind)) return '';
    const isPost = ref.kind === 'post';
    if (ref.gone || !ref.id) return '<span class="share-ref">' + text(isPost ? 'gonePost' : 'goneProfile') + '</span>';
    const href = isPost ? postPath(ref.id) : refProfilePath(ref.author || ref.id);
    const thumb = U.image(ref.thumb);
    return '<a class="share-ref" href="' + href + '">' + (thumb
      ? '<img alt="" src="' + L.esc(thumb) + '" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '<span><strong>' + text(isPost ? 'post' : 'profile') + '</strong><br>' +
      L.whoTag({ nick: ref.author, tag: ref.tag }) + (ref.text ? '<br>' + L.esc(ref.text) : '') + '</span></a>';
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
        card.innerHTML = '<strong>' + L.whoTag({ ...post.author, nick: authorOf(post) }) + '</strong>' +
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
    view.innerHTML = '<article class="post-card share-card"><strong>' + L.whoTag({ ...post.author, nick: authorOf(post) }) + '</strong>' +
      media.map(photo => P.image(photo.src, '', false, photo)).join('') +
      '<p>' + L.esc(post.text) + '</p></article>';
  }

  window.LoungeShare = { open, actions, reference };
  if (!L.hasScreen('saved')) L.screen('saved', { nav: 'me', title: 'share.saved', render: renderSaved });
  L.screen('p', { nav: 'feed', title: 'share.publicPost', render: renderPublic });
})();
