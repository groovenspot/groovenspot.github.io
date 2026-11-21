(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('dm', {
    title: ['메시지', 'Messages'], requests: ['메시지 요청', 'Message requests'],
    settings: ['메시지 설정', 'Message settings'], refresh: ['새로 고침', 'Refresh'],
    mutualOnly: ['서로 팔로우한 사람의 메시지만 받기', 'Only receive messages from mutual follows'],
    blocks: ['차단한 사람', 'Blocked accounts'], unblock: ['차단 해제', 'Unblock'],
    block: ['차단하기', 'Block'], menu: ['신고·차단 메뉴', 'Report and block menu'],
    blockConfirm: ['서로의 팔로우가 끊기고 대화가 숨겨져요.', 'You will unfollow each other and the conversation will be hidden.'],
    mutual: ['서로 팔로우 중', 'You follow each other'],
    note: ['서로 팔로우하지 않으면 첫 메시지는 요청으로 가요.', 'The first message is a request unless you follow each other.'],
    profileHint: ['상대방 프로필에서 메시지를 시작할 수 있어요.', 'Start a message from someone’s profile.'],
    outgoing: ['상대가 요청을 수락하면 대화할 수 있어요.', 'You can chat when your request is accepted.'],
    accept: ['수락', 'Accept'], decline: ['거절', 'Decline'], back: ['메시지 목록', 'Back to messages'],
    placeholder: ['메시지 쓰기', 'Write a message'], send: ['보내기', 'Send'],
    photo: ['사진 고르기', 'Choose a photo'], photoAlt: ['메시지 사진', 'Message photo'],
    photoFailed: ['사진을 불러오지 못했어요.', 'Could not load photo.'],
    read: ['읽음', 'Read'], older: ['이전 메시지', 'Older messages'],
    missing: ['대화를 열 수 없어요.', 'This conversation is unavailable.'],
    mutual_only: ['서로 팔로우해야 보낼 수 있어요.', 'You need to follow each other to send this.'],
    busy: ['잠시 후 다시 시도해 주세요.', 'Please try again later.'],
    text: ['메시지는 500자까지 쓸 수 있어요.', 'Messages can be up to 500 characters.'],
    translate: ['번역', 'Translate'], unread: ['안 읽은 메시지 {n}개', '{n} unread']
  });

  const dmPath = nick => '#/dm/' + encodeURIComponent(nick);
  const token = () => {
    try { return localStorage.getItem('gl_token') || ''; } catch { return ''; }
  };
  const apiURL = path => new URL(path, new URL(L.img('dm').replace(/img\/dm$/, ''), location.href));
  const status = key => '<p class="muted" role="status">' + t(key) + '</p>';
  const header = 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap';
  const layout = 'display:grid;gap:12px';
  let dispose;

  function error(result) {
    const code = result?.error;
    if (code === 'closed' || code === 'not_found') return L.toast(L.t(code === 'closed' ? 'core.soon' : 'dm.missing'));
    if (['mutual_only', 'busy', 'text'].includes(code)) return L.toast(L.t('dm.' + code));
    U.error(result);
  }

  function live(view, refresh, clear) {
    const connectionStatus = view.querySelector('[data-live-status]');
    let ws, handshake, revision = 0;
    let refreshing = false, queued = false;
    async function update() {
      if (!view.isConnected) return;
      if (refreshing) { queued = true; return; }
      refreshing = true;
      const current = revision;
      try { await refresh(() => view.isConnected && current === revision); } finally {
        refreshing = false;
        if (queued) { queued = false; void update(); }
      }
    }
    async function connect() {
      const current = token();
      if (!view.isConnected || !current || handshake || ws?.readyState <= 1 || typeof WebSocket !== 'function') return;
      const attempt = L.api('ws_ticket', { channel: 'dm' });
      handshake = attempt;
      const result = await attempt;
      if (handshake !== attempt) return;
      handshake = null;
      if (!view.isConnected || token() !== current) return;
      const url = apiURL('ws');
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('ch', 'dm');
      if (result.ticket) url.searchParams.set('ticket', result.ticket);
      else if (result.error === 'ticket_off') url.searchParams.set('token', current);
      else {
        connectionStatus.textContent = L.t('screens.liveUnavailable');
        connectionStatus.hidden = false;
        return;
      }
      try {
        const connection = ws = new WebSocket(url);
        connection.onopen = () => { if (ws === connection) connectionStatus.hidden = true; };
        connection.onmessage = event => {
          let packet;
          try { packet = JSON.parse(event.data); } catch { return; }
          if (packet.type === 'dm' || packet.type === 'ready') void update();
        };
        connection.onclose = event => {
          if (ws !== connection || !view.isConnected || event.code !== 1008) return;
          // The socket can close before an outstanding HTTP snapshot reaches the browser.
          revision++;
          clear();
          void update();
        };
      } catch { /* HTTP refresh remains available. */ }
    }
    const onReturn = () => { connect(); void update(); };
    const interval = setInterval(() => {
      if (!document.hidden) onReturn();
    }, 15000);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('online', onReturn);
    connect();
    return { update, close() {
      handshake = null;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('online', onReturn);
      revision++;
      if (ws) { ws.onopen = ws.onmessage = ws.onclose = null; ws.close(); }
    } };
  }

  async function settings(view, enabled) {
    view.innerHTML = '<div class="shell-actions">' + U.link('#/dm', t('back')) + '</div><section style="' + U.card + '">' +
      '<h1>' + t('settings') + '</h1><div data-prefs></div><h2>' + t('blocks') + '</h2><div data-blocks>' +
      U.status('loading', true) + '</div></section>';
    const prefs = view.querySelector('[data-prefs]'), blocks = view.querySelector('[data-blocks]');
    if (enabled) {
      const value = await L.api('dm_prefs');
      if (!view.isConnected) return;
      prefs.innerHTML = value.error ? U.status('error') : '<label class="shell-choice">' +
        '<input type="checkbox"' + (value.mutualOnly ? ' checked' : '') + '>' + t('mutualOnly') + '</label>';
      const input = prefs.querySelector('input');
      if (input) input.onchange = async () => {
        input.disabled = true;
        const response = await L.api('dm_prefs', { mutualOnly: input.checked });
        if (!input.isConnected) return;
        input.disabled = false;
        if (response.error) { input.checked = !input.checked; return error(response); }
        input.checked = response.mutualOnly;
      };
    }
    async function showBlocks() {
      const response = await L.api('blocks');
      if (!blocks.isConnected) return;
      if (response.error) { blocks.innerHTML = U.status('error'); return; }
      blocks.innerHTML = response.blocks.map((person, i) =>
        '<div class="shell-row"><span>' + L.whoTag(person) + '</span>' + U.button(t('unblock'), 'data-unblock="' + i + '"') + '</div>'
      ).join('') || U.status('empty');
      for (const button of blocks.querySelectorAll('[data-unblock]')) button.onclick = async () => {
        button.disabled = true;
        const result = await L.api('unblock', { nick: response.blocks[button.dataset.unblock].nick });
        if (!button.isConnected) return;
        button.disabled = false;
        if (result.error) return error(result);
        await showBlocks();
      };
    }
    await showBlocks();
  }

  function list(view) {
    view.innerHTML = '<header style="' + header + '"><h1>' + t('title') + '</h1>' +
      '<div class="shell-actions">' + U.link('#/dm?settings=1', t('settings')) + U.button(t('refresh'), 'data-refresh') +
      '</div></header><p data-live-status class="muted" role="status" hidden></p><div data-list>' + U.status('loading', true) + '</div>';
    const target = view.querySelector('[data-list]');
    function entries(rows) {
      return rows.map(row => '<a class="shell-row" style="' + U.card + ';color:inherit;text-decoration:none" href="' +
        L.esc(dmPath(row.nick)) + '"><strong>' + L.whoTag(row) + '</strong><span class="muted">' +
        (row.unread ? t('unread', { n: Number(row.unread) }) : row.state === 'outgoing' ? t('outgoing') :
          U.time(row.at, { month: 'short', day: 'numeric' })) + '</span></a>').join('');
    }
    const stream = live(view, async isCurrent => {
      const result = await L.api('dm_threads');
      if (!isCurrent()) return;
      if (result.error) {
        target.innerHTML = result.error === 'closed' ? U.status('soon') : U.status('error');
        return;
      }
      target.innerHTML = '<section style="' + U.card + '"><h2>' + t('requests') + '</h2>' +
        (entries(result.requests) || U.status('empty')) + '</section><section style="margin-top:16px"><h2>' +
        t('title') + '</h2>' + (entries(result.threads) || status('profileHint')) + '</section>';
    }, () => { target.innerHTML = U.status('loading', true); });
    dispose = stream.close;
    view.querySelector('[data-refresh]').onclick = stream.update;
    return stream.update();
  }

  async function loadPhoto(img, id) {
    const url = apiURL('dm-photo/' + encodeURIComponent(id));
    url.searchParams.set('token', token());
    try {
      const response = await fetch(url, { cache: 'no-store', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('photo');
      const blob = await response.blob();
      if (!img.isConnected) return;
      const src = URL.createObjectURL(blob);
      img.onload = img.onerror = () => URL.revokeObjectURL(src);
      img.src = src;
    } catch {
      if (img.isConnected) img.replaceWith(document.createTextNode(L.t('dm.photoFailed')));
    }
  }

  async function uploadPhoto(file, nick) {
    const session = token();
    if (!session) throw new Error('auth');
    const image = new Image();
    const source = URL.createObjectURL(file);
    let blob;
    try {
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      let scale = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
      do {
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d', { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
        if (!blob) throw new Error('photo');
        scale *= 0.75;
      } while (blob.size > 1500000);
    } finally { URL.revokeObjectURL(source); }
    if (session !== token()) throw new Error('auth');
    const url = apiURL('dm-upload');
    url.search = new URLSearchParams({ token: session, nick });
    const response = await fetch(url, { method: 'POST', body: blob, referrerPolicy: 'no-referrer' });
    const result = await response.json();
    if (!response.ok || !result.key) throw new Error(result.error || 'photo');
    return result.key;
  }

  function thread(view, nick, canTranslate, canShare) {
    view.innerHTML = '<header style="' + header + '">' + U.link('#/dm', t('back')) +
      '<h1 data-peer></h1><div class="shell-actions">' + U.button(t('menu'), 'data-menu hidden') +
      U.button(t('refresh'), 'data-refresh') + '</div></header>' +
      '<p data-live-status class="muted" role="status" hidden></p><p data-mutual class="muted"></p><div style="' + layout + ';margin-top:14px"><div data-state></div>' +
      U.button(t('older'), 'data-older hidden') + '<div data-messages role="log" aria-label="' + t('title') +
      '" style="' + layout + ';max-height:min(58vh,560px);overflow:auto"></div>' +
      '<form data-send hidden style="' + layout + '"><label class="sr-only" for="dm-text">' + t('placeholder') + '</label>' +
      '<textarea id="dm-text" name="text" rows="2" maxlength="1000" placeholder="' + t('placeholder') + '"></textarea>' +
      '<div class="shell-actions"><label class="shell-field" data-photo>' + t('photo') +
      '<input name="photo" type="file" accept="image/*"></label>' +
      '<button class="btn btn-hot" type="submit">' + t('send') + '</button></div></form></div>';
    const get = key => view.querySelector('[data-' + key + ']');
    const form = get('send'), state = get('state'), messages = get('messages'), olderButton = get('older');
    const menu = get('menu'), mutual = get('mutual'), peer = get('peer');
    let data, older = [], before, lastRead = 0, drawing = '';
    peer.textContent = nick;
    state.innerHTML = U.status('loading', true);

    function drawMessages() {
      const all = older.concat(data.messages);
      const fingerprint = JSON.stringify(all);
      if (drawing === fingerprint) {
        for (const [i, article] of [...messages.children].entries()) {
          const receipt = article.querySelector('[data-receipt]');
          if (receipt) receipt.hidden = all[i].seq > data.peerRead;
        }
        return;
      }
      const atBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 32;
      drawing = fingerprint;
      messages.innerHTML = all.map(item => {
        const bubble = item.mine ? 'end; background:var(--g);color:var(--g-ink);border-radius:18px 18px 6px 18px' :
          'start;background:var(--fill);border-radius:18px 18px 18px 6px';
        return '<article data-id="' + L.esc(item.id) + '" style="justify-self:' + bubble +
          ';max-width:84%;padding:10px 14px;min-width:0"><p style="white-space:pre-wrap">' + L.esc(item.text) + '</p>' +
          (item.photo ? '<img alt="' + t('photoAlt') + '" style="display:block;max-width:100%;max-height:300px;border-radius:12px">' : '') +
          (canShare ? window.LoungeShare?.reference(item.ref) || '' : '') +
          '<small>' + U.time(item.at, { hour: 'numeric', minute: '2-digit' }) +
          (item.mine ? '<span data-receipt' + (item.seq > data.peerRead ? ' hidden' : '') + '> · ' + t('read') + '</span>' : '') + '</small>' +
          (canTranslate && item.text ? U.button(t('translate'), 'data-translate') + '<p data-translation></p>' : '') + '</article>';
      }).join('');
      for (const [i, article] of [...messages.children].entries()) {
        const item = all[i], img = article.querySelector(':scope > img'), translate = article.querySelector('[data-translate]');
        if (img) void loadPhoto(img, item.id);
        if (translate) translate.onclick = async () => {
          translate.disabled = true;
          const result = await L.api('translate', { text: item.text, to: L.lang });
          if (!article.isConnected) return;
          translate.disabled = false;
          if (result.error === 'busy') return L.toast(L.t('rooms.translateBusy'));
          if (result.error) return error(result);
          const translated = result.text ?? result.translation;
          if (typeof translated === 'string') article.querySelector('[data-translation]').textContent = translated;
        };
      }
      if (atBottom) messages.scrollTop = messages.scrollHeight;
    }

    function clearThread() {
      drawing = ''; older = []; before = null;
      messages.replaceChildren(); form.reset();
      form.hidden = menu.hidden = olderButton.hidden = true;
      mutual.textContent = '';
      peer.textContent = L.t('dm.title');
    }

    function show(result) {
      data = result;
      if (data.error) {
        const code = data.error;
        if (['closed', 'not_found', 'auth', 'banned', 'suspended'].includes(code)) clearThread();
        state.innerHTML = code === 'closed' ? U.status('soon') :
          code === 'not_found' ? status('missing') : U.status('error');
        return;
      }
      peer.innerHTML = '<a style="color:inherit" href="#/u/' + L.esc(encodeURIComponent(data.nick)) + '">' + L.whoTag(data) + '</a>';
      mutual.textContent = data.mutual ? L.t('dm.mutual') : '';
      menu.hidden = false;
      form.hidden = !data.canSend;
      get('photo').hidden = !data.mutual;
      if (!data.mutual) form.elements.photo.value = '';
      if (data.state === 'declined') older = [];
      if (older.length && !data.mutual) older = older.map(item => ({ ...item, photo: false }));
      before = older.length ? before : data.before;
      olderButton.hidden = !before;
      if (data.state === 'incoming') {
        if (!state.querySelector('[data-accept]')) {
          state.innerHTML = '<div class="shell-card"><h2>' + t('requests') + '</h2><div class="shell-actions">' +
            U.button(t('accept'), 'data-accept', true) + U.button(t('decline'), 'data-decline') + '</div></div>';
          state.querySelector('[data-accept]').onclick = event => decide(event.currentTarget, true);
          state.querySelector('[data-decline]').onclick = event => decide(event.currentTarget, false);
        }
      } else {
        const key = data.state === 'outgoing' ? 'outgoing' : data.state === 'declined' ? 'missing' :
          !data.canSend ? 'mutual_only' : data.state === 'new' ? 'note' : '';
        state.innerHTML = key ? status(key) : '';
      }
      drawMessages();
    }

    const stream = live(view, async isCurrent => {
      const current = await L.api('dm_get', { nick });
      if (!isCurrent()) return;
      show(current);
      const last = current.messages?.filter(item => !item.mine).at(-1);
      if (last && last.seq > lastRead) {
        const result = await L.api('dm_read', { nick, through: last.seq });
        if (result.ok && isCurrent()) lastRead = last.seq;
      }
    }, () => {
      data = { error: 'auth' };
      clearThread();
      state.innerHTML = U.status('loading', true);
    });
    dispose = stream.close;
    get('refresh').onclick = stream.update;
    olderButton.onclick = async () => {
      olderButton.disabled = true;
      const end = before;
      const result = await L.api('dm_get', { nick, before: end });
      if (!view.isConnected) return;
      olderButton.disabled = false;
      if (result.error) { show(result); return; }
      if (data.error || data.state === 'declined' || end !== before) return;
      const loaded = new Set(older.concat(data.messages).map(item => item.id));
      const previousHeight = messages.scrollHeight, previousTop = messages.scrollTop;
      older = result.messages.filter(item => !loaded.has(item.id)).concat(older);
      before = result.before;
      olderButton.hidden = !before;
      drawMessages();
      messages.scrollTop = previousTop + messages.scrollHeight - previousHeight;
    };

    async function decide(button, accept) {
      button.disabled = true;
      const result = await L.api(accept ? 'dm_request_ok' : 'dm_request_no', { nick });
      if (!view.isConnected) return;
      button.disabled = false;
      if (result.error) return error(result);
      if (accept) await stream.update(); else L.go('dm');
    }

    menu.onclick = () => {
      if (data.error) return;
      const reportable = older.concat(data.messages).filter(item => !item.mine).at(-1);
      const panel = U.sheet('<h2>' + t('menu') + '</h2><div class="shell-actions">' +
        (reportable ? U.button(U.t('report'), 'data-report') : '') + U.button(t('block'), 'data-block') + '</div>');
      if (reportable) panel.querySelector('[data-report]').onclick = () => U.reason({
        title: U.t('report'), reasons: ['ad', 'sexual', 'abuse', 'illegal', 'etc'],
        submit: why => L.api('dm_report', { id: reportable.id, why })
      });
      panel.querySelector('[data-block]').onclick = () => {
        const confirmation = U.sheet('<h2>' + t('block') + '</h2><p>' + t('blockConfirm') + '</p>' +
          U.button(t('block'), 'data-confirm', true));
        confirmation.querySelector('[data-confirm]').onclick = async event => {
          const button = event.currentTarget;
          button.disabled = true;
          const result = await L.api('block', { nick });
          if (!confirmation.isConnected) return;
          button.disabled = false;
          if (result.error) return error(result);
          L.closeSheet();
          L.go('dm');
        };
      };
    };

    form.onsubmit = async event => {
      event.preventDefault();
      const button = form.querySelector('button[type=submit]');
      const text = form.elements.text.value;
      const file = form.elements.photo.files[0];
      if (button.disabled || (!text.trim() && !file)) return;
      if ([...text.trim()].length > 500) return error({ error: 'text' });
      button.disabled = true;
      try {
        if (file && !data.mutual) return error({ error: 'mutual_only' });
        const photo = file ? await uploadPhoto(file, nick) : undefined;
        if (!view.isConnected) return;
        const result = await L.api('dm_send', { nick, text, photo });
        if (!view.isConnected) return;
        if (result.error) { error(result); await stream.update(); return; }
        form.reset();
        await stream.update();
      } catch (failure) {
        if (view.isConnected) error({ error: failure.message });
      } finally { button.disabled = false; }
    };
    return stream.update();
  }

  async function render(root, params) {
    const view = U.mount(root, '');
    const config = await L.api('config');
    if (!view.isConnected) return;
    if (config.error) { view.innerHTML = U.status('error'); return; }
    const enabled = config.open?.dm === true;
    if (!enabled && !(params.settings && L.me)) {
      view.innerHTML = '<h1>' + t('title') + '</h1>' + U.status('soon') +
        (L.me ? U.link('#/dm?settings=1', t('blocks')) : '');
      return;
    }
    if (!L.me) {
      view.innerHTML = '<h1>' + t('title') + '</h1>' + U.button(L.esc(L.t('core.login')), 'data-login', true);
      view.querySelector('[data-login]').onclick = L.needLogin;
      L.needLogin();
      return;
    }
    if (params.settings) return settings(view, enabled);
    return params.id ? thread(view, params.id, config.open.translate, config.open.share === true) : list(view);
  }

  L.screen('dm', { title: 'dm.title', selfGate: true, render, leave() { dispose?.(); dispose = undefined; } });
})();
