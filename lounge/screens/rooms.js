// 대화방 목록, 대화, 피크타임 곡 투표, 안심 호출.
(function (L) {
  const copy = {
    ko: {
      title: '대화방', intro: '오늘 밤 그루브에서 함께 이야기해요.',
      name2F: '오늘 밤 2F 힙합', name3F: '오늘 밤 3F EDM', nameEnglish: '영어 대화방',
      hours: '영업 중에 열려요. 대화는 다음 날 낮 12시에 지워져요.',
      open: '열림', closed: '영업 마감', people: '접속 {n}명', back: '대화방 목록으로',
      rules: '광고·홍보와 연락처 요구는 안 돼요. 글로만 이야기해요.',
      pin: '스태프 공지', empty: '아직 대화가 없어요.', message: '메시지', send: '보내기',
      older: '이전 대화', latest: '최근 대화', report: '신고', reportTitle: '이 글을 신고할까요?',
      abuse: '욕설·괴롭힘', ad: '광고', sexual: '성적인 내용', illegal: '불법 내용', etc: '기타',
      reported: '신고를 받았어요.', block: '차단', blockTitle: '{nick} 님을 차단할까요?',
      blocked: '서로의 글이 보이지 않아요.', translateNotice: '연락처와 링크를 가린 뒤 외부 클라우드에서 번역해요.', translate: '번역', translating: '번역 중…',
      vote: '피크타임 곡 투표', voteAt: '한국 시간 {at} 마감', votes: '{n}표',
      voted: '내가 고른 곡', leading: '공동 선두', winner: '1위', voteClosed: '투표가 끝났어요.',
      safety: '안심 호출', safetyInfo: '오늘 매장에서 체크인했다면 경호팀을 부를 수 있어요.',
      floor: '층', chooseFloor: '층을 골라 주세요', seat: '자리 또는 가까운 곳 (선택)',
      call: '경호팀 부르기', called: '경호팀에 요청을 보냈어요.',
      staff: '호출을 확인할 수 없어요. 가까운 직원에게 바로 알려 주세요.',
      checkin: '오늘 매장에서 체크인한 손님만 부를 수 있어요.',
      floorError: '2층이나 3층을 골라 주세요.', seatError: '자리 설명은 40자까지 써 주세요.',
      seatPlainError: '자리 설명은 꺾쇠나 줄바꿈 없이 40자까지 써 주세요. 첫 글자는 =, +, -, @로 시작할 수 없어요.',
      safetyBusy: '한 시간에 두 번까지 부를 수 있어요. 가까운 직원에게 바로 알려 주세요.',
      busy: '잠깐 쉬었다가 다시 해 주세요.', translateBusy: '오늘 쓸 수 있는 번역을 다 썼어요.',
      dup: '이미 했어요.', kicked: '오늘은 이 방에 들어갈 수 없어요.',
      roomClosed: '지금은 방이 닫혀 있어요.', missing: '방이나 글을 찾을 수 없어요.',
      historyExpired: '이미 보낸 글이 이전 기록에서 지워졌어요.',
      text: '내용을 500자 안으로 써 주세요.', retry: '다시 불러오기',
      network: '연결이 끊겼어요. 다시 확인하고 있어요.', loading: '불러오는 중…'
    },
    en: {
      title: 'Rooms', intro: 'Chat with others at Groove tonight.',
      name2F: 'Tonight · 2F Hip-hop', name3F: 'Tonight · 3F EDM', nameEnglish: 'English Lounge',
      hours: 'Rooms open during club hours. Chats disappear at noon the next day.',
      open: 'Open', closed: 'Club closed', people: '{n} online', back: 'Back to rooms',
      rules: 'Text only. Please keep ads and requests for contact details out of the chat.',
      pin: 'Staff announcement', empty: 'No messages yet.', message: 'Message', send: 'Send',
      older: 'Older messages', latest: 'Latest messages', report: 'Report', reportTitle: 'Report this message?',
      abuse: 'Harassment or abuse', ad: 'Advertising', sexual: 'Sexual content', illegal: 'Illegal content', etc: 'Other',
      reported: 'Report received.', block: 'Block', blockTitle: 'Block {nick}?',
      blocked: 'Your messages are hidden from each other.', translateNotice: 'An external cloud service translates the text after contact details and links are masked.', translate: 'Translate', translating: 'Translating…',
      vote: 'Peak-time song vote', voteAt: 'Closes at {at} Korean time', votes: '{n} votes',
      voted: 'Your pick', leading: 'Tied for first', winner: 'First place', voteClosed: 'Voting has ended.',
      safety: 'Call security', safetyInfo: 'You can call security if you checked in at the club today.',
      floor: 'Floor', chooseFloor: 'Choose a floor', seat: 'Seat or nearby spot (optional)',
      call: 'Call security', called: 'Your request was sent to security.',
      staff: 'We couldn’t confirm your request. Please tell a nearby staff member now.',
      checkin: 'Check in at the club today to call security.',
      floorError: 'Choose 2F or 3F.', seatError: 'Use up to 40 characters for the seat.',
      seatPlainError: 'Use up to 40 characters without angle brackets or line breaks. Start with a character other than =, +, -, or @.',
      safetyBusy: 'You can call twice per hour. Please tell a nearby staff member now.',
      busy: 'Wait a moment and try again.', translateBusy: 'You’ve used today’s translations.',
      dup: 'Already done.', kicked: 'You can’t enter this room today.',
      roomClosed: 'This room is closed right now.', missing: 'We couldn’t find the room or message.',
      historyExpired: 'Your message was sent and has since left the room history.',
      text: 'Write a message of up to 500 characters.', retry: 'Reload',
      network: 'Connection lost. Reconnecting…', loading: 'Loading…'
    },
    ja: {
      historyExpired: '送信済みのメッセージは履歴から削除されました。',
      translateNotice: '連絡先とリンクを伏せてから、外部のクラウドサービスで翻訳します。',
      seatPlainError: '山括弧や改行を使わず40文字以内で入力してください。先頭に =、+、-、@ は使えません。'
    },
    zh: {
      historyExpired: '消息已发送，现已从聊天记录中清除。',
      translateNotice: '联系信息和链接会先被遮盖，再由外部云服务翻译。',
      seatPlainError: '请输入不超过 40 个字符，避免使用尖括号或换行符，且开头不能是 =、+、- 或 @。'
    }
  };
  L.i18n(Object.fromEntries(Object.entries(copy).map(([lang, words]) =>
    [lang, Object.fromEntries(Object.entries(words).map(([key, value]) => ['rooms.' + key, value]))])));

  const esc = L.esc;
  const t = (key, vars) => L.t('rooms.' + key, vars);
  const e = (key, vars) => esc(t(key, vars));
  const builtinNames = { '2F': 'name2F', '3F': 'name3F', english: 'nameEnglish' };
  const nameOf = room => {
    if (L.lang === 'ko') return room.title;
    const key = Object.hasOwn(builtinNames, room.id) && builtinNames[room.id];
    if (key && ['ja', 'zh'].includes(L.lang) && room.en === copy.en[key]) return t(key);
    return room.en || room.title;
  };
  const time = ms => new Intl.DateTimeFormat(L.lang, { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }).format(ms);
  const btn = (key, extra = '') => '<button type="button" class="btn" ' + extra + '>' + e(key) + '</button>';
  const back = () => '<a class="shell-link" href="#/rooms">' + e('back') + '</a>';
  let active;

  const styles = `<style>
    .rooms-list,.rooms-page,.rooms-chat,.rooms-vote-list{display:grid;gap:10px}
    .rooms-list,.rooms-chat,.rooms-vote-list{list-style:none;margin:0;padding:0}
    .rooms-list a{display:flex;align-items:center;gap:14px;color:var(--txt);text-decoration:none}
    .rooms-list a>*{margin:0}
    .rooms-icon{border-radius:15px;min-width:48px;height:48px;display:grid;place-items:center;padding:0 5px;background:#23302b;color:#8fe0bd;font-weight:900}
    .rooms-icon[data-floor="2F"]{background:var(--g);color:var(--g-ink)}
    .rooms-icon[data-floor="3F"]{background:var(--s-deep);color:white}
    .rooms-label{display:grid;gap:2px;min-width:0;flex:1}
    .rooms-preview{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
    .rooms-meta{display:grid;text-align:right;flex:none}
    .rooms-pin{background:#15111d;border-color:var(--s)}
    .rooms-chat{padding:4px 2px;overflow-y:auto;min-height:100px;max-height:min(42dvh,480px)}
    .rooms-chat li{display:grid;justify-items:start;justify-self:start;max-width:90%;gap:2px}
    .rooms-chat li[data-mine="true"]{justify-self:end;justify-items:end}
    .rooms-bubble{background:#221d1c;border-radius:6px 16px 16px 16px;padding:8px 13px;white-space:pre-wrap}
    .rooms-chat li[data-mine="true"] .rooms-bubble{background:#ffb27a;color:var(--g-ink);border-radius:16px 6px 16px 16px}
    .rooms-compose{display:flex;align-items:start;gap:8px}
    .rooms-compose textarea{min-width:0;resize:vertical}
    .rooms-options{display:flex;flex-wrap:wrap;gap:0 12px}
    .rooms-options button{font-size:.8rem}
    .rooms-vote-list button{width:100%;gap:8px;justify-content:space-between;text-align:left}
    .rooms-vote-list button[aria-pressed="true"]{border-color:var(--g)}
    .rooms-page button:disabled{cursor:default}
  </style>`;

  function problem(error, type) {
    if (error === 'auth') L.needLogin();
    if (error === 'busy') return t(type === 'safety' ? 'safetyBusy' : type === 'translate' ? 'translateBusy' : 'busy');
    const key = { kicked: 'kicked', room_closed: 'roomClosed', closed: 'roomClosed', dup: 'dup', not_found: 'missing',
      text: 'text', vote_closed: 'voteClosed', staff: 'staff', checkin: 'checkin', floor: 'floorError',
      seat: 'seatPlainError', history_expired: 'historyExpired', network: 'network' }[error];
    return key ? t(key) : L.t('core.unavailable');
  }

  async function config(root, heading, feature) {
    root.innerHTML = styles + '<section class="rooms-page"><h1>' + esc(heading) + '</h1><p role="status">' + e('loading') + '</p></section>';
    const result = await L.api('config');
    if (!root.isConnected) return null;
    const status = root.querySelector('[role=status]');
    if (result.error) status.textContent = problem(result.error);
    else if (!result.open?.[feature]) status.textContent = L.t('core.soon');
    else return result.open;
    return null;
  }

  function joinPrompt(root) {
    root.querySelector('[role=status]').textContent = L.t('core.need');
    const login = document.createElement('button');
    login.type = 'button';
    login.className = 'btn btn-hot';
    login.textContent = L.t('core.login');
    login.onclick = L.needLogin;
    root.querySelector('section').append(login);
    L.needLogin();
  }

  L.screen('rooms', { nav: 'rooms', title: 'rooms.title', async render(root) {
    if (!await config(root, t('title'), 'rooms') || !root.isConnected) return;
    if (!L.me) return joinPrompt(root);
    const result = await L.api('rooms');
    if (!root.isConnected) return;
    if (result.error) {
      root.querySelector('[role=status]').textContent = problem(result.error);
      return;
    }
    const section = root.querySelector('section');
    section.insertAdjacentHTML('beforeend', '<p class="muted">' + e('intro') + '</p><ul class="rooms-list">' +
      result.rooms.map(room => '<li><a class="shell-card" href="#/room/' + encodeURIComponent(room.id) + '">' +
        '<span class="rooms-icon" data-floor="' + esc(room.floor) + '" aria-hidden="true">' +
        esc(room.floor || (room.id === 'english' ? 'EN' : '♪')) + '</span><span class="rooms-label"><strong>' +
        esc(nameOf(room)) + '</strong>' + (room.latest ? '<small class="muted rooms-preview">' +
        esc(room.latest.nick + ' · ' + room.latest.text) + '</small>' : '') + '</span><small class="rooms-meta muted">' +
        (room.kicked ? e('kicked') : e(room.open ? 'open' : 'closed') + (room.online ? '<span>' + e('people', { n: room.online }) + '</span>' : '')) +
        '</small></a></li>').join('') + '</ul><p class="shell-card muted">' + e('hours') + '</p>');
    section.querySelector('[role=status]').remove();
  } });

  function report(message) {
    const panel = L.sheet('<form class="shell-form"><h2>' + e('reportTitle') + '</h2><label class="sr-only" for="room-reason">' +
      e('report') + '</label><select id="room-reason">' + ['abuse', 'ad', 'sexual', 'illegal', 'etc']
        .map(reason => '<option value="' + reason + '">' + e(reason) + '</option>').join('') +
      '</select><p class="shell-error" role="status"></p><div class="shell-actions"><button class="btn btn-hot">' + e('report') +
      '</button><button type="button" class="btn">' + esc(L.t('core.close')) + '</button></div></form>');
    panel.querySelector('button[type=button]').onclick = L.closeSheet;
    panel.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      const submit = panel.querySelector('button');
      submit.disabled = true;
      const result = await L.api('report', { kind: 'room_msg', id: message.id, why: panel.querySelector('select').value });
      if (!panel.isConnected) return;
      submit.disabled = false;
      if (result.error) { panel.querySelector('[role=status]').textContent = problem(result.error); return; }
      L.closeSheet();
      L.toast(t('reported'));
    };
  }

  function block(message, refresh) {
    const panel = L.sheet('<h2>' + e('blockTitle', { nick: message.nick }) + '</h2><div class="shell-actions">' +
      btn('block', 'data-confirm') +
      '<button type="button" class="btn" data-cancel>' + esc(L.t('core.close')) + '</button></div><p class="shell-error" role="status"></p>');
    const confirm = panel.querySelector('[data-confirm]');
    panel.querySelector('[data-cancel]').onclick = L.closeSheet;
    confirm.onclick = async () => {
      confirm.disabled = true;
      const result = await L.api('block', { nick: message.nick });
      if (!panel.isConnected) return;
      confirm.disabled = false;
      if (result.error) { panel.querySelector('[role=status]').textContent = problem(result.error); return; }
      L.closeSheet();
      L.toast(t('blocked'));
      refresh();
    };
  }

  function voteMarkup(vote, isOpen) {
    if (!vote) return '';
    return '<div class="shell-card"><h2>' + e('vote') + '</h2><p class="muted">' +
      (vote.closed ? e('voteClosed') : e('voteAt', { at: vote.at })) + '</p><ol class="rooms-vote-list">' +
      vote.songs.map((song, i) => '<li><button type="button" class="btn" data-choice="' + i +
        '" aria-pressed="' + (vote.choice === i) + '"' + (!isOpen || vote.closed || vote.choice != null ? ' disabled' : '') +
        '><span>' + esc(song) + (vote.choice === i ? '<small> · ' + e('voted') + '</small>' : '') +
        (vote.closed && vote.winners.includes(i) ? '<small> · ' + e(vote.winners.length === 1 ? 'winner' : 'leading') + '</small>' : '') +
        '</span><small>' + e('votes', { n: vote.counts[i] }) + '</small></button></li>').join('') + '</ol></div>';
  }

  function chatScreen(root, id, flags) {
    root.querySelector('section').innerHTML = back() + '<h1>' + e('title') + '</h1><p data-room-state class="muted" aria-live="polite"></p>' +
      '<p class="muted">' + e('rules') + '</p><aside class="shell-card rooms-pin" data-pin hidden></aside>' +
      '<div data-vote></div><div class="shell-actions">' + btn('older', 'data-older hidden') + btn('latest', 'data-latest hidden') +
      btn('retry', 'data-retry hidden') + '</div><ol class="rooms-chat" aria-label="' + e('title') + '"></ol>' +
      '<p class="muted" data-empty hidden>' + e('empty') + '</p>' +
      (flags.translate ? '<p class="muted" data-translation-notice aria-live="polite" hidden></p>' : '') +
      '<form class="rooms-compose" hidden><label for="room-message" class="sr-only">' + e('message') +
      '</label><textarea rows="1" id="room-message" placeholder="' + e('message') +
      '" maxlength="1000" required></textarea><button class="btn btn-hot">' + e('send') + '</button></form><p role="status" class="shell-error"></p>' +
      (flags.safety ? '<a class="shell-link" href="#/safety">' + e('safety') + '</a>' : '');
    const query = selector => root.querySelector(selector);
    const chat = query('ol');
    const form = query('form');
    const input = query('textarea');
    const submit = form.querySelector('button');
    const status = query('[role=status]');
    const older = query('[data-older]');
    const latest = query('[data-latest]');
    const retry = query('[data-retry]');
    const translations = new Map();
    const translating = new Set();
    let socket, pending, timer, reconnectTimer, refreshTimer, data, pageCursor, wantedCursor, request = 0, stopped = false, syncing = false, refreshAgain = false;
    let sending = false;
    let handshake, nextConnect = 0;
    let reconnectDelay = 1000;

    function finishPending(value) {
      if (!pending) return;
      clearTimeout(pending.timeout);
      const resolve = pending.resolve;
      pending = null;
      resolve(value);
    }

    function disconnect() {
      clearTimeout(reconnectTimer);
      handshake = null;
      const connection = socket;
      socket = null;
      if (connection) connection.close(1000);
      finishPending(null);
    }

    function retryConnection() {
      const delay = reconnectDelay;
      nextConnect = Date.now() + delay;
      reconnectDelay = Math.min(delay * 2, 30_000);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(refreshIfVisible, delay);
    }

    async function connect() {
      if (stopped || socket || handshake || !data?.room.open || Date.now() < nextConnect) return;
      let token;
      try { token = localStorage.getItem('gl_token'); } catch {}
      if (!token || typeof WebSocket !== 'function') return;
      const channel = 'room:' + id;
      const attempt = L.api('ws_ticket', { channel });
      handshake = attempt;
      const result = await attempt;
      if (handshake !== attempt) return;
      handshake = null;
      if (stopped || !data?.room.open) return;
      try { if (localStorage.getItem('gl_token') !== token) return; } catch { return; }
      const url = new URL('ws', new URL((window.LOUNGE_API || 'https://groove-lounge-api.groovenspotbusan.workers.dev/').replace(/\/$/, '') + '/', location.href));
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('ch', channel);
      if (result.ticket) url.searchParams.set('ticket', result.ticket);
      else if (result.error === 'ticket_off') url.searchParams.set('token', token);
      else return retryConnection();
      let connection;
      try { connection = new WebSocket(url); } catch { return retryConnection(); }
      socket = connection;
      connection.onopen = () => {
        if (socket !== connection) return;
        refresh();
      };
      connection.onmessage = event => {
        if (socket !== connection) return;
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'ready') reconnectDelay = 1000;
        if (data.type === 'refresh') scheduleRefresh();
        if (data.type === 'sent' && data.nonce === pending?.nonce) finishPending(data);
      };
      connection.onclose = event => {
        if (socket !== connection) return;
        socket = null;
        if (event.code === 1008 && ['blocked', 'banned', 'suspended', 'kicked', 'auth', 'closed'].includes(event.reason)) {
          request++;
          chat.replaceChildren();
          data = null;
          form.hidden = true;
        }
        finishPending(null);
        retryConnection();
        refresh();
      };
    }

    function messagesMarkup(messages) {
      return messages.map(message => '<li data-message="' + esc(message.id) + '" data-mine="' + !!message.mine +
        '"><small class="muted"><strong>' + esc(message.nick) + '</strong> · ' + esc(time(message.at)) + '</small>' +
        '<p class="rooms-bubble">' + esc(message.text) + '</p><div class="rooms-options">' +
        (message.mine ? '' : '<button class="shell-link" type="button" data-report>' + e('report') +
          '</button><button class="shell-link" type="button" data-block>' + e('block') + '</button>') +
        (flags.translate ? '<button class="shell-link" type="button" data-translate' +
          (translating.has(message.id) ? ' disabled>' + e('translating') : '>' + e('translate')) + '</button>' : '') +
        '</div><small class="muted" data-translation>' + esc(translations.get(message.id) || '') + '</small></li>').join('');
    }

    function paint(next, cursor) {
      const changedPage = pageCursor !== cursor;
      const wasNearEnd = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 32;
      pageCursor = cursor;
      query('h1').textContent = nameOf(next.room);
      query('[data-room-state]').textContent =
        t(next.room.open ? 'open' : 'closed') + ' · ' + t('people', { n: next.room.online });
      const pin = query('[data-pin]');
      pin.hidden = !next.pin;
      pin.innerHTML = next.pin ? '<h2>' + e('pin') + '</h2><p class="shell-bio">' + esc(next.pin.text) + '</p>' : '';
      const vote = query('[data-vote]');
      if (JSON.stringify(data?.vote) !== JSON.stringify(next.vote) || data?.room.open !== next.room.open) {
        vote.innerHTML = voteMarkup(next.vote, next.room.open);
      }
      if (changedPage || JSON.stringify(data?.messages) !== JSON.stringify(next.messages)) {
        const focus = chat.contains(document.activeElement) ? document.activeElement : null;
        const focusedMessage = focus?.closest('[data-message]')?.dataset.message;
        const focusedAction = focus?.hasAttribute('data-report') ? 'report' : focus?.hasAttribute('data-block') ? 'block' : 'translate';
        chat.innerHTML = messagesMarkup(next.messages);
        if (focusedMessage) chat.querySelector('[data-message="' + CSS.escape(focusedMessage) + '"] [data-' + focusedAction + ']')?.focus({ preventScroll: true });
        if (changedPage || wasNearEnd) chat.scrollTop = cursor == null ? chat.scrollHeight : 0;
      }
      query('[data-empty]').hidden = Boolean(next.messages.length);
      older.hidden = next.before == null;
      latest.hidden = cursor == null;
      retry.hidden = true;
      form.hidden = !next.room.open;
      if (!next.room.open) disconnect();
      data = next;
      connect();
    }

    async function load(before) {
      const version = ++request;
      const next = await L.api('room_get', { id, before });
      if (stopped || version !== request) return;
      if (!next.error) {
        if (!retry.hidden) status.textContent = '';
        paint(next, before);
        return;
      }
      if (!['network', 'server'].includes(next.error)) {
        chat.replaceChildren();
        query('[data-vote]').replaceChildren();
        query('[data-pin]').hidden = true;
        query('[data-room-state]').textContent = '';
        query('[data-empty]').hidden = true;
        form.hidden = older.hidden = latest.hidden = true;
        data = null;
        disconnect();
      }
      status.textContent = problem(next.error);
      retry.hidden = false;
    }

    async function refresh() {
      if (stopped) return;
      if (syncing) { refreshAgain = true; return; }
      syncing = true;
      await load(wantedCursor);
      syncing = false;
      if (refreshAgain) { refreshAgain = false; scheduleRefresh(); }
    }

    // Coalesce a burst of socket notices into at most one snapshot per interval.
    function scheduleRefresh() {
      if (stopped || refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        refresh();
      }, 400);
    }

    function showPage(cursor) {
      wantedCursor = cursor;
      return load(cursor);
    }

    older.onclick = () => showPage(data.before);
    latest.onclick = () => showPage(undefined);
    retry.onclick = () => { status.textContent = ''; refresh(); };
    chat.onclick = async event => {
      const row = event.target.closest('[data-message]');
      const message = data?.messages.find(msg => msg.id === row?.dataset.message);
      const button = event.target.closest('button');
      if (!message || !button) return;
      if (button.hasAttribute('data-report')) report(message);
      if (button.hasAttribute('data-block')) block(message, refresh);
      if (button.hasAttribute('data-translate') && !translating.has(message.id)) {
        const alreadyTranslated = translations.get(message.id);
        if (alreadyTranslated) return;
        const notice = query('[data-translation-notice]');
        if (notice?.hidden) {
          notice.hidden = false;
          notice.textContent = t('translateNotice');
        }
        translating.add(message.id);
        button.disabled = true;
        button.textContent = t('translating');
        const result = await L.api('translate', { text: message.text, to: ['ko', 'en', 'ja', 'zh'].includes(L.lang) ? L.lang : 'en' });
        translating.delete(message.id);
        if (stopped) return;
        const current = chat.querySelector('[data-message="' + CSS.escape(message.id) + '"]');
        const control = current?.querySelector('[data-translate]');
        if (control) {
          control.disabled = false;
          control.textContent = t('translate');
        }
        if (result.error) { L.toast(problem(result.error, 'translate')); return; }
        translations.set(message.id, result.text);
        if (translations.size > 80) translations.delete(translations.keys().next().value);
        current?.querySelector('[data-translation]').replaceChildren(result.text);
      }
    };
    query('[data-vote]').onclick = async event => {
      const button = event.target.closest('[data-choice]');
      if (!button || !data?.vote) return;
      const buttons = [...query('[data-vote]').querySelectorAll('button')];
      buttons.forEach(b => { b.disabled = true; });
      const result = await L.api('room_vote', { id, vote: data.vote.id, choice: Number(button.dataset.choice) });
      if (stopped) return;
      if (result.error) {
        buttons.forEach(b => { b.disabled = false; });
        status.textContent = problem(result.error);
      }
      await refresh();
    };
    form.onsubmit = async event => {
      event.preventDefault();
      const text = input.value.trim();
      if (sending || !text) return;
      if ([...text].length > 500) { status.textContent = t('text'); return; }
      sending = submit.disabled = true;
      status.textContent = '';
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const nonce = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
      let result;
      if (socket && socket.readyState === WebSocket.OPEN) {
        result = await new Promise(resolve => {
          pending = { nonce, resolve, timeout: setTimeout(() => finishPending(null), 1800) };
          try { socket.send(JSON.stringify({ a: 'room_send', text, nonce })); } catch { finishPending(null); }
        });
      }
      if (stopped) return;
      result ??= await L.api('room_send', { id, text, nonce });
      if (stopped) return;
      sending = submit.disabled = false;
      if (result.error && result.error !== 'history_expired') {
        status.textContent = problem(result.error);
        await refresh();
        return;
      }
      if (input.value.trim() === text) input.value = '';
      if (result.error) status.textContent = problem(result.error);
      await showPage(undefined);
    };
    function refreshIfVisible() {
      if (document.visibilityState !== 'hidden') refresh();
    }

    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refreshIfVisible);
    timer = setInterval(refreshIfVisible, 4500 + Math.random() * 1000);
    active = () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(refreshTimer);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      disconnect();
    };
    return refresh();
  }

  L.screen('room', { nav: 'rooms', title: 'rooms.title', async render(root, { id }) {
    const flags = await config(root, t('title'), 'rooms');
    if (!flags || !root.isConnected) return;
    if (!L.me) return joinPrompt(root);
    return chatScreen(root, id, flags);
  }, leave() { active?.(); active = null; } });

  L.screen('safety', { nav: 'tonight', title: 'rooms.safety', async render(root) {
    if (!await config(root, t('safety'), 'safety') || !root.isConnected) return;
    if (!L.me) return joinPrompt(root);
    root.querySelector('section').innerHTML = '<h1>' + e('safety') + '</h1><p class="muted">' + e('safetyInfo') +
      '</p><form class="shell-form"><div class="shell-field"><label for="safety-floor">' + e('floor') +
      '</label><select id="safety-floor" name="floor" required><option value="">' + e('chooseFloor') +
      '</option><option value="2F">2F</option><option value="3F">3F</option></select></div><label class="shell-field">' +
      e('seat') + '<input name="seat" maxlength="40" autocomplete="off"></label><button class="btn btn-hot">' + e('call') +
      '</button><p role="status"></p></form>';
    const form = root.querySelector('form');
    const status = form.querySelector('[role=status]');
    const button = form.querySelector('button');
    form.onsubmit = async event => {
      event.preventDefault();
      if (button.disabled) return;
      const { floor, seat } = Object.fromEntries(new FormData(form));
      if (seat.length > 40 || /[<>\x00-\x1f\x7f-\x9f]/.test(seat) || /^[=+@-]/.test(seat.trim())) {
        status.textContent = t(seat.length > 40 ? 'seatError' : 'seatPlainError');
        form.elements.seat.focus();
        return;
      }
      button.disabled = true;
      const response = await L.api('safety_call', { floor, seat });
      if (!root.isConnected) return;
      if (response.error) button.disabled = false;
      status.textContent = response.error ? problem(response.error === 'network' ? 'staff' : response.error, 'safety') : t('called');
    };
  } });
})(window.Lounge);
