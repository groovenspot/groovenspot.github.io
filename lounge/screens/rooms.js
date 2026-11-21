// 오픈 대화방 목록, 대화, 피크타임 곡 투표, 안심 호출.
(function (L) {
  const copy = {
    ko: {
      title: '오픈 대화방', intro: '로그인한 회원은 누구나 열린 방에 참여할 수 있어요.',
      name2F: '오늘 밤 2F 힙합', name3F: '오늘 밤 3F EDM', nameEnglish: '영어 오픈 대화방',
      hours: '영업 중에 열려요. 대화는 다음 날 낮 12시에 지워져요.',
      open: '열림', closed: '영업 마감', people: '접속 {n}명', back: '오픈 대화방 목록으로',
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
      network: '연결이 끊겼어요. 다시 확인하고 있어요.', loading: '불러오는 중…',
      entered: '오픈 대화방에 입장했어요.', roomMenu: '오픈 대화방 메뉴', messageMenu: '메시지 메뉴',
      guidelines: '이용 규칙', leave: '나가기', newMessages: '새 메시지 ↓', reply: '답장',
      replyTo: '{nick} 님에게 답장', cancelReply: '답장 취소', copyText: '복사',
      copied: '메시지를 복사했어요.', copyFailed: '메시지를 복사할 수 없어요.',
      // 오픈채팅 탭 (스위치 openchat 이 켜진 회원에게만 쓰는 문구)
      ocTitle: '오픈채팅', ocIntro: '그루브에 온 사람만 들어오는 대화방이에요.', ocBack: '오픈채팅 목록으로',
      ocRoomMenu: '오픈채팅 메뉴', ocEntered: '오픈채팅에 입장했어요.',
      ocNamePlaza: '그루브 광장', ocNameMusic: '음악 톡', ocNameGlobal: 'Global Lounge', ocNameTonight: '오늘 밤',
      ocAboutPlaza: '자유 대화', ocAboutMusic: '곡 정보·신청곡', ocAboutGlobal: 'English', ocAboutTonight: '오늘 밤 이야기',
      ocHot: '지금 뜨는 방', ocOnline: '{n}명', ocUntil: '{at}까지', ocOpens: '{at} 오픈', ocTomorrow: '내일 {time}',
      ocClosed: '닫혀 있어요', ocOpensNote: '열리면 알림으로 알려 드려요.', ocTranslateTag: '번역 가능',
      ocAgoNow: '방금', ocAgoMin: '{n}분 전', ocAgoHour: '{n}시간 전', ocAgoDay: '{n}일 전', ocUnread: '안 읽은 글 {n}개',
      consentTitle: '처음 들어올 때 한 번만', consent1: '연락처·광고·다른 업소 홍보는 가려져요.',
      consent2: '신고된 글은 운영자가 확인하고, 이 방의 대화는 90일 보관한 뒤 지워요.', consentPolicy: '개인정보처리방침 보기 (새 탭)',
      consent3: '규칙을 어기면 채팅이 24시간 → 7일 → 영구 정지돼요.', consentAgree: '동의하고 입장',
      consentNeed: '이용 규칙에 동의하면 들어갈 수 있어요.', consentView: '이용 규칙 보기',
      notifyOn: '알림 켬', notifyOff: '알림 끔',
      notifyOnDone: '알림을 켰어요. @로 부르면 알려 드려요.', notifyOffDone: '이 방 알림을 껐어요.',
      ocPin: '공지', ocMessage: '메시지 · @닉네임 부르기', ocMention: '@부르기', ocMentionHint: '입력칸에 @닉네임을 넣어요',
      ocMenuTitle: '{nick} 님의 글', ocMenuMine: '내 글', ocReportHint: '3명이 신고하면 자동 가림', ocBlockHint: '서로 글이 안 보여요',
      ocDmNote: '1:1 메시지는 서로 팔로우한 사이만 보낼 수 있어요.', ocCalled: '나를 부른 글',
      threat: '폭력 위협', filming: '불법 촬영물', drugs: '마약',
      banUntil: '채팅이 {at}까지 정지됐어요.', banForever: '채팅이 정지됐어요. 문의는 매장으로 해 주세요.',
      banUnknown: '채팅이 정지됐어요.', banRead: '글은 계속 볼 수 있어요.'
    },
    en: {
      title: 'Open Chat', intro: 'Any signed-in member can join an open room.',
      name2F: 'Tonight · 2F Hip-hop', name3F: 'Tonight · 3F EDM', nameEnglish: 'English Open Chat',
      hours: 'Open Chat is available during club hours. Chats disappear at noon the next day.',
      open: 'Open', closed: 'Club closed', people: '{n} online', back: 'Back to Open Chat',
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
      busy: 'Wait a moment and try again.', translateBusy: 'You’ve reached today’s translation limit.',
      dup: 'Already done.', kicked: 'You can’t enter this room today.',
      roomClosed: 'This room is closed right now.', missing: 'We couldn’t find the room or message.',
      historyExpired: 'Your message was sent and has since left the room history.',
      text: 'Write a message of up to 500 characters.', retry: 'Reload',
      network: 'Connection lost. Reconnecting…', loading: 'Loading…',
      entered: 'You joined Open Chat.', roomMenu: 'Open Chat menu', messageMenu: 'Message menu',
      guidelines: 'Room rules', leave: 'Leave', newMessages: 'New messages ↓', reply: 'Reply',
      replyTo: 'Reply to {nick}', cancelReply: 'Cancel reply', copyText: 'Copy',
      copied: 'Message copied.', copyFailed: 'Could not copy the message.',
      ocTitle: 'Open Chat', ocIntro: 'Chat rooms just for people who have been to GROOVE.', ocBack: 'Back to Open Chat',
      ocRoomMenu: 'Open Chat menu', ocEntered: 'You joined Open Chat.',
      ocNamePlaza: 'Groove Plaza', ocNameMusic: 'Music Talk', ocNameGlobal: 'Global Lounge', ocNameTonight: 'Tonight',
      ocAboutPlaza: 'Anything goes', ocAboutMusic: 'Tracks & requests', ocAboutGlobal: 'English', ocAboutTonight: 'Tonight at GROOVE',
      ocHot: 'Hot right now', ocOnline: '{n} online', ocUntil: 'Until {at}', ocOpens: 'Opens {at}', ocTomorrow: '{time} tomorrow',
      ocClosed: 'Closed', ocOpensNote: 'We’ll notify you when it opens.', ocTranslateTag: 'Translation',
      ocAgoNow: 'Just now', ocAgoMin: '{n} min ago', ocAgoHour: '{n} hr ago', ocAgoDay: '{n} d ago', ocUnread: '{n} unread',
      consentTitle: 'Just once, before you join', consent1: 'Contact details, ads, and promotion of other venues are hidden.',
      consent2: 'Staff review reported messages, and chats in these rooms are kept for 90 days, then deleted.', consentPolicy: 'View the privacy notice (new tab)',
      consent3: 'Breaking the rules suspends your chat for 24 hours, then 7 days, then permanently.', consentAgree: 'Agree and join',
      consentNeed: 'Agree to the room rules to join.', consentView: 'View room rules',
      notifyOn: 'Alerts on', notifyOff: 'Alerts off',
      notifyOnDone: 'Alerts on. We’ll tell you when you’re @mentioned.', notifyOffDone: 'Alerts for this room are off.',
      ocPin: 'Notice', ocMessage: 'Message · @nickname to mention', ocMention: '@Mention', ocMentionHint: 'Adds @nickname to your message',
      ocMenuTitle: 'Message from {nick}', ocMenuMine: 'Your message', ocReportHint: 'Hidden after 3 reports', ocBlockHint: 'Hides each other’s messages',
      ocDmNote: 'Direct messages are only for people who follow each other.', ocCalled: 'Mentions you',
      threat: 'Threat of violence', filming: 'Illegal filming', drugs: 'Drugs',
      banUntil: 'Your chat is suspended until {at}.', banForever: 'Your chat is suspended. Please contact the club.',
      banUnknown: 'Your chat is suspended.', banRead: 'You can still read messages.'
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
  const builtinNames = { '2F': 'name2F', '3F': 'name3F', english: 'nameEnglish',
    plaza: 'ocNamePlaza', music: 'ocNameMusic', global: 'ocNameGlobal', tonight: 'ocNameTonight' };
  const nameOf = room => {
    // Both server defaults predate the Open Chat name. Keep custom room titles intact.
    if (room.id === 'english' && room.en === 'English Lounge' &&
        ['English Lounge', '영어 대화방'].includes(room.title)) return t('nameEnglish');
    if (L.lang === 'ko') return room.title;
    const key = Object.hasOwn(builtinNames, room.id) && builtinNames[room.id];
    if (key && ['ja', 'zh'].includes(L.lang) && room.en === copy.en[key]) return t(key);
    return room.en || room.title;
  };
  const btn = (key, extra = '') => '<button type="button" class="btn" ' + extra + '>' + e(key) + '</button>';
  const back = () => '<a class="shell-link" href="#/rooms">' + e('back') + '</a>';
  let active;

  // ── 오픈채팅 탭 (스위치 openchat). 꺼져 있으면 아래 도우미는 하나도 쓰이지 않는다. ──
  const ocAbout = { plaza: 'ocAboutPlaza', music: 'ocAboutMusic', global: 'ocAboutGlobal', tonight: 'ocAboutTonight' };
  const nickChars = '가-힣A-Za-z0-9._';
  const mentionPattern = new RegExp('(^|[^' + nickChars + '@])@([' + nickChars + ']{2,12})(?![가-힣A-Za-z0-9_])', 'g');
  const chevron = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const bell = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 6-2 7-3 8h18c-1-1-3-2-3-8M10 20a2 2 0 0 0 4 0"/><path class="oc-bell-off" d="M4 3l16 18"/></svg>';
  let ocBan = null, ocBanFor = null, ocReadPending = null, listStop = null;

  const clockTime = ms => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
  const seoulDay = ms => Math.floor((ms + 9 * 3_600_000) / 86_400_000);
  const monthDay = ms => new Intl.DateTimeFormat(L.lang, { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' }).format(ms);
  // '18:00' · '내일 12:00' · '11월 29일 18:00' (한국 시간)
  function when(ms, now = Date.now()) {
    const days = seoulDay(ms) - seoulDay(now);
    return days === 0 ? clockTime(ms) : days === 1 ? t('ocTomorrow', { time: clockTime(ms) }) : monthDay(ms) + ' ' + clockTime(ms);
  }
  function ago(ms, now = Date.now()) {
    const minutes = Math.floor(Math.max(0, now - ms) / 60_000);
    if (minutes < 1) return t('ocAgoNow');
    if (minutes < 60) return t('ocAgoMin', { n: minutes });
    return minutes < 1440 ? t('ocAgoHour', { n: Math.floor(minutes / 60) }) : t('ocAgoDay', { n: Math.floor(minutes / 1440) });
  }
  const liveBan = ban => ban && (ban.until == null || ban.until === 0 || ban.until > Date.now()) ? ban : null;
  const banText = ban => ban.until > 0 ? t('banUntil', { at: monthDay(ban.until) + ' ' + clockTime(ban.until) }) + ' ' + t('banRead')
    : t(ban.until === 0 ? 'banForever' : 'banUnknown');
  const stamp = value => Number.isFinite(value) && value > 0 ? value : 0;

  function consentRules() {
    // 대화 90일 보관은 개인정보처리방침의 보관기간 항목에 적혀 있다.
    const lang = ['ko', 'en', 'ja', 'zh'].includes(L.lang) ? L.lang : 'en';
    return '<ul class="oc-rules">' + ['consent1', 'consent2', 'consent3'].map(key => '<li>' + e(key) + '</li>').join('') + '</ul>' +
      '<a class="shell-link oc-policy" href="/lounge/policy.html#' + lang + '-retention" target="_blank" rel="noopener noreferrer">' + e('consentPolicy') + '</a>';
  }

  // 입장 동의 창. 동의하면 done() — 닫으면 아무 일도 없다.
  function askConsent(version, done) {
    const panel = L.sheet('<h2>' + e('consentTitle') + '</h2>' + consentRules() +
      '<p class="shell-error" role="status"></p><div class="oc-sheet-actions"><button type="button" class="btn btn-hot" data-agree>' +
      e('consentAgree') + '</button><button type="button" class="btn" data-cancel>' + esc(L.t('core.close')) + '</button></div>');
    const agree = panel.querySelector('[data-agree]');
    panel.querySelector('[data-cancel]').onclick = L.closeSheet;
    agree.onclick = async () => {
      agree.disabled = true;
      const result = await L.api('oc_agree', { version: Number.isSafeInteger(version) ? version : 1 });
      if (!panel.isConnected) return;
      agree.disabled = false;
      if (result.error) { panel.querySelector('[role=status]').textContent = problem(result.error); return; }
      L.closeSheet();
      done();
    };
  }

  function ocCard(room, hot, result, flags, now) {
    const enter = room.open === true && !room.kicked;
    const timed = room.kind === 'timed';
    const count = Number.isSafeInteger(room.unread) && room.unread > 0 ? room.unread : 0;
    const tag = (kind, text) => '<span class="oc-tag oc-tag-' + kind + '">' + esc(text) + '</span>';
    const until = enter && timed && stamp(room.closesAt) ? t('ocUntil', { at: when(room.closesAt, now) }) : '';
    const about = Object.hasOwn(ocAbout, room.id) ? t(ocAbout[room.id]) : '';
    const unread = enter && count ? '<span class="oc-unread"><span aria-hidden="true">' + (count >= 99 ? '99+' : count) +
      '</span><span class="sr-only">' + e('ocUnread', { n: count }) + '</span></span>' : '';
    const people = '<span class="oc-people"><i class="oc-dot" aria-hidden="true"></i>' +
      esc([t('ocOnline', { n: stamp(room.online) }), hot ? '' : until || about].filter(Boolean).join(' · ')) + '</span>';
    const last = enter && stamp(room.lastAt) ? '<span class="oc-ago">' + esc(ago(room.lastAt, now)) + '</span>' : '';
    const name = '<strong class="oc-name">' + esc(nameOf(room)) + '</strong>';
    if (!enter) {
      const opens = !room.kicked && timed && stamp(room.opensAt) > now ? t('ocOpens', { at: when(room.opensAt, now) }) : '';
      return '<div class="oc-card oc-off" data-oc-room="' + esc(room.id) + '" aria-disabled="true"><span class="oc-row">' + name +
        tag('off', room.kicked ? t('ocClosed') : opens || t('ocClosed')) + '</span><span class="oc-row oc-sub"><span>' +
        esc(room.kicked ? t('kicked') : opens && result.consent === true && room.notify !== false ? t('ocOpensNote') : about) + '</span></span></div>';
    }
    const top = hot ? '<span class="oc-row">' + tag('hot', t('ocHot')) + (until ? tag('time', until) : '') + '</span>' : '';
    const preview = hot && Array.isArray(room.preview) && room.preview.length ? '<span class="oc-preview">' +
      room.preview.slice(-2).map(line => '<span><b>' + L.whoTag(line) + '</b> ' + esc(line?.text) + '</span>').join('') + '</span>' : '';
    const translate = !hot && room.id === 'global' && flags.translate === true ? tag('live', t('ocTranslateTag')) : '';
    return '<a class="oc-card' + (hot ? ' oc-hot' : '') + '" href="#/room/' + encodeURIComponent(room.id) + '" data-oc-room="' + esc(room.id) + '">' +
      top + '<span class="oc-row">' + name + (hot ? unread + people : translate + unread) + '</span>' +
      (hot ? preview : '<span class="oc-row oc-sub">' + people + last + '</span>') + '</a>';
  }

  function ocListScreen(root, flags, first) {
    const section = root.querySelector('section');
    section.classList.add('oc-page');
    section.innerHTML = '<h1>' + e('ocTitle') + '</h1><p class="muted">' + e('ocIntro') + '</p>' +
      '<p class="oc-ban" data-oc-ban role="status" hidden></p><ul class="oc-list"></ul>';
    const list = section.querySelector('ul');
    const banNote = section.querySelector('[data-oc-ban]');
    let state = first, stopped = false, busy = false, markup, loadedAt = Date.now();

    function paint() {
      const now = Date.now();
      const rooms = Array.isArray(state.rooms) ? state.rooms : [];
      const hot = rooms.find(room => room.hot === true && room.open === true && !room.kicked);
      const next = (hot ? [hot, ...rooms.filter(room => room !== hot)] : rooms)
        .map(room => '<li>' + ocCard(room, room === hot, state, flags, now) + '</li>').join('');
      if (next !== markup) {
        const focused = list.contains(document.activeElement) && document.activeElement.dataset.ocRoom;
        list.innerHTML = markup = next;
        if (focused) list.querySelector('a[data-oc-room="' + CSS.escape(focused) + '"]')?.focus({ preventScroll: true });
      }
      ocBan = state.chatBan || null;
      ocBanFor = L.me?.nick;
      const ban = liveBan(ocBan);
      banNote.hidden = !ban;
      banNote.textContent = ban ? banText(ban) : '';
    }

    async function reload() {
      if (stopped || busy || document.visibilityState === 'hidden') return;
      busy = true;
      const next = await L.api('rooms');
      busy = false;
      if (stopped || !root.isConnected || next.error) return;
      // 스위치가 꺼졌으면 기존 화면으로 다시 그린다.
      if (next.oc !== true) { L.route(); return; }
      loadedAt = Date.now();
      state = next;
      paint();
    }
    const revisit = () => { if (Date.now() - loadedAt >= 5000) reload(); };

    list.onclick = event => {
      const link = event.target.closest('a[data-oc-room]');
      if (!link || state.consent !== false) return;
      event.preventDefault();
      askConsent(state.consentVersion, () => {
        state = { ...state, consent: true };
        L.go('room/' + encodeURIComponent(link.dataset.ocRoom));
      });
    };
    document.addEventListener('visibilitychange', revisit);
    window.addEventListener('online', revisit);
    // 방 안 화면이 실시간 연결 중에 30초마다 다시 받는 것과 같은 간격.
    const timer = setInterval(reload, 30_000 + Math.random() * 5000);
    listStop = () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', revisit);
      window.removeEventListener('online', revisit);
    };
    paint();
  }

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
    .rooms-conversation{--rooms-tabs:calc(74px + env(safe-area-inset-bottom));position:fixed;z-index:8;
      inset:var(--rooms-top,0px) max(0px,calc((100% - 640px)/2)) calc(var(--lounge-bottom-inset,0px) + var(--rooms-tabs));
      display:flex;flex-direction:column;gap:0;min-width:0;background:var(--bg);overflow:hidden}
    html[data-lounge-keyboard] .rooms-conversation{--rooms-tabs:0px}
    .rooms-header{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:7px 12px}
    .rooms-heading{flex:1;min-width:0}.rooms-heading h1{font-size:1.13rem;overflow-wrap:anywhere}
    .rooms-header .btn{min-width:44px;padding:0 10px}
    .rooms-pin{padding:7px 14px;background:#241b16;border-bottom:1px solid var(--line-2);max-height:5.1em;overflow:auto}
    .rooms-pin strong{color:#ffb784;margin-inline-end:.5em}
    .rooms-log{flex:1;min-height:0;display:flex;flex-direction:column;overflow-y:auto;
      overscroll-behavior:contain;overflow-anchor:none;padding:8px 12px}
    .rooms-chat{display:flex;flex-direction:column;gap:4px;margin-block-start:auto}
    .rooms-chat li[data-message]{display:grid;grid-template-columns:36px minmax(0,1fr);column-gap:8px;align-items:start}
    .rooms-chat li[data-mine="true"]{grid-template-columns:minmax(0,1fr)}
    .rooms-chat [data-group-start="true"]{margin-top:8px}
    .rooms-avatar{grid-column:1;grid-row:1 / span 2;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;
      background:#30302d;color:var(--txt);font-weight:700;overflow:hidden}
    .rooms-avatar img{width:100%;height:100%;object-fit:cover}
    .rooms-author,.rooms-line,.rooms-chat [data-translation]{grid-column:2;min-width:0}
    .rooms-chat [data-mine="true"] .rooms-own-author{grid-column:1;justify-self:end}
    .rooms-author{font-size:.83rem;font-weight:700;margin-bottom:2px;overflow-wrap:anywhere}
    .rooms-line{display:flex;align-items:flex-end;gap:6px}
    .rooms-chat [data-mine="true"] .rooms-line{grid-column:1;flex-direction:row-reverse}
    .rooms-bubble{color:inherit;background:#272425;border:1px solid var(--line);border-radius:6px 16px 16px 16px;
      padding:7px 11px;min-width:0;min-height:44px;max-width:min(82%,28rem);white-space:pre-wrap;overflow-wrap:anywhere;text-align:start;cursor:pointer;font:inherit}
    .rooms-chat [data-mine="true"] .rooms-bubble{background:var(--g);color:var(--g-ink);border-radius:16px 6px 16px 16px}
    .rooms-time{font-size:.68rem;white-space:nowrap}
    .rooms-meta-line{text-align:center;font-size:.78rem;margin:4px 0;color:var(--muted)}
    .rooms-chat [data-mine="true"] [data-translation]{grid-column:1;justify-self:end}
    .rooms-quote{display:block;border-inline-start:2px solid currentColor;padding:0 0 0 6px;margin-bottom:4px;font-size:.79rem;
      overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
    .rooms-footer{position:relative;padding:7px 12px;border-top:1px solid var(--line);background:var(--bg)}
    .rooms-footer [data-latest]{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap}
    .rooms-compose,.rooms-reply{display:flex;align-items:center;gap:8px}
    .rooms-compose textarea{min-width:0;resize:none;max-height:6em}
    .rooms-send{width:48px;flex:0 0 48px;padding:0;white-space:nowrap}
    .rooms-reply .rooms-quote{flex:1}.rooms-reply button{flex:none;padding:0 10px}
    .rooms-actions{display:flex;flex-wrap:wrap;gap:8px;margin-block:10px}
    .rooms-log [data-older]{align-self:center}.rooms-log [data-vote]:not(:empty){margin-bottom:8px}
    .rooms-vote-list button{width:100%;gap:8px;justify-content:space-between;text-align:left}
    .rooms-vote-list button[aria-pressed="true"]{border-color:var(--g)}
    .rooms-page button:disabled{cursor:default}
  </style>`;

  function problem(error, type) {
    if (error === 'auth') L.needLogin();
    if (error === 'busy') return t(type === 'safety' ? 'safetyBusy' : type === 'translate' ? 'translateBusy' : 'busy');
    const key = { kicked: 'kicked', room_closed: 'roomClosed', closed: 'roomClosed', dup: 'dup', not_found: 'missing',
      text: 'text', vote_closed: 'voteClosed', staff: 'staff', checkin: 'checkin', floor: 'floorError',
      seat: 'seatPlainError', history_expired: 'historyExpired', network: 'network',
      consent: 'consentNeed', chat_banned: 'banUnknown' }[error];
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
    const flags = await config(root, t(L.open('openchat') ? 'ocTitle' : 'title'), 'rooms');
    if (!flags || !root.isConnected) return;
    const oc = flags.openchat === true;
    if (oc) document.title = t('ocTitle');
    if (!L.me) return joinPrompt(root);
    if (oc && ocReadPending) {
      // 방에서 막 나왔으면 '읽음' 처리가 끝난 뒤에 목록을 받는다 (안 읽은 수가 남아 보이지 않게).
      await Promise.race([ocReadPending, new Promise(resolve => setTimeout(resolve, 1500))]);
      ocReadPending = null;
      if (!root.isConnected) return;
    }
    const result = await L.api('rooms');
    if (!root.isConnected) return;
    if (result.error) {
      root.querySelector('[role=status]').textContent = problem(result.error);
      return;
    }
    if (oc && result.oc === true) return ocListScreen(root, flags, result);
    const section = root.querySelector('section');
    section.insertAdjacentHTML('beforeend', '<p class="muted">' + e('intro') + '</p><ul class="rooms-list">' +
      result.rooms.map(room => '<li><a class="shell-card" href="#/room/' + encodeURIComponent(room.id) + '">' +
        '<span class="rooms-icon" data-floor="' + esc(room.floor) + '" aria-hidden="true">' +
        esc(room.floor || (room.id === 'english' ? 'EN' : '♪')) + '</span><span class="rooms-label"><strong>' +
        esc(nameOf(room)) + '</strong>' + (room.latest ? '<small class="muted rooms-preview">' +
        L.whoTag(room.latest) + ' · ' + esc(room.latest.text) + '</small>' : '') + '</span><small class="rooms-meta muted">' +
        (room.kicked ? e('kicked') : e(room.open ? 'open' : 'closed') + (room.online ? '<span>' + e('people', { n: room.online }) + '</span>' : '')) +
        '</small></a></li>').join('') + '</ul><p class="shell-card muted">' + e('hours') + '</p>');
    section.querySelector('[role=status]').remove();
  }, leave() { listStop?.(); listStop = null; } });

  function report(message, oc) {
    const reasons = oc ? ['abuse', 'ad', 'sexual', 'threat', 'filming', 'drugs', 'illegal', 'etc'] : ['abuse', 'ad', 'sexual', 'illegal', 'etc'];
    const panel = L.sheet('<form class="shell-form"><h2>' + e('reportTitle') + '</h2><label class="sr-only" for="room-reason">' +
      e('report') + '</label><select id="room-reason">' + reasons
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
      if (result.error) {
        const key = ['target', 'not_found'].includes(result.error) ? 'screens.reportUnavailable'
          : result.error === 'busy' ? 'screens.reportLimit' : '';
        panel.querySelector('[role=status]').textContent = key ? L.t(key) : problem(result.error);
        return;
      }
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
    // oc: 오픈채팅이 켜진 회원. 꺼져 있으면 아래 화면은 예전과 한 글자도 다르지 않다.
    const oc = flags.openchat === true;
    const words = oc ? { title: 'ocTitle', back: 'ocBack', roomMenu: 'ocRoomMenu', entered: 'ocEntered', pin: 'ocPin', message: 'ocMessage' }
      : { title: 'title', back: 'back', roomMenu: 'roomMenu', entered: 'entered', pin: 'pin', message: 'message' };
    const section = root.querySelector('section');
    section.classList.add('rooms-conversation');
    if (oc) section.classList.add('oc-room');
    section.innerHTML = '<header class="rooms-header"><a class="btn" href="#/rooms" aria-label="' + e(words.back) +
      '">' + (oc ? chevron : '‹') + '</a><div class="rooms-heading"><h1>' + e(words.title) + '</h1><p data-room-state class="muted" aria-live="polite"></p></div>' +
      (oc ? '<button class="btn oc-bell" type="button" data-oc-notify aria-pressed="true" hidden>' +
        bell + '<span></span></button>' : '') +
      '<button class="btn" type="button" data-room-menu aria-label="' + e(words.roomMenu) + '">⋯</button></header>' +
      '<p data-live-status class="rooms-meta-line" role="status" hidden></p><aside class="rooms-pin" data-pin hidden></aside>' +
      '<div class="rooms-log"><div data-vote></div>' + btn('older', 'data-older hidden') +
      '<p class="rooms-meta-line" data-empty hidden>' + e('empty') + '</p>' +
      '<ol class="rooms-chat" aria-label="' + e(words.title) + '"></ol></div>' +
      '<div class="rooms-footer">' + btn('newMessages', 'data-latest hidden') + btn('retry', 'data-retry hidden') +
      (flags.translate ? '<p class="rooms-meta-line" data-translation-notice aria-live="polite" hidden></p>' : '') +
      '<div class="rooms-reply" data-reply-draft hidden><div class="rooms-quote" data-reply-preview></div>' +
      '<button class="btn" type="button" data-reply-cancel aria-label="' + e('cancelReply') + '">×</button></div>' +
      (oc ? '<p class="oc-ban" data-oc-ban role="status" hidden></p>' : '') +
      '<form class="rooms-compose" hidden><label for="room-message" class="sr-only">' + e('message') +
      '</label><textarea rows="1" id="room-message" placeholder="' + e(words.message) +
      '" maxlength="1000" enterkeyhint="send" required></textarea><button class="btn btn-hot rooms-send" aria-label="' + e('send') +
      '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 19V5m-7 7 7-7 7 7"/></svg></button></form>' +
      '<p role="status" class="shell-error"></p></div>';
    const query = selector => root.querySelector(selector);
    const chat = query('.rooms-chat');
    const log = query('.rooms-log');
    const form = query('.rooms-compose');
    const input = query('textarea');
    const submit = form.querySelector('button');
    submit.onpointerdown = event => { if (document.activeElement === input) event.preventDefault(); };
    input.onkeydown = event => {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      form.requestSubmit();
    };
    const connectionStatus = query('[data-live-status]');
    const status = query('p.shell-error[role=status]');
    const older = query('[data-older]');
    const latest = query('[data-latest]');
    const retry = query('[data-retry]');
    const translations = new Map();
    const translating = new Set();
    const replyTargets = new Map();
    const time = new Intl.DateTimeFormat(L.lang, oc ? { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
      : { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit' });
    const date = new Intl.DateTimeFormat(L.lang, { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });
    let socket, pending, timer, reconnectTimer, refreshTimer, data, pageCursor, wantedCursor, request = 0, stopped = false, syncing = false, refreshAgain = false;
    let sending = false;
    let handshake, nextConnect = 0;
    let reconnectDelay = 1000;
    let live = false, lastSnapshot = 0, snapshotMessages;
    let replying, longPress, pressed, suppressClick = false, layoutObserver, unread = false, enteredAt;
    // 오픈채팅: 채팅 정지, 입장 동의, 방 알림, 읽음 처리
    const banNote = query('[data-oc-ban]');
    const notify = query('[data-oc-notify]');
    let ban = oc && ocBanFor === L.me?.nick ? ocBan : null, needConsent, consentShown = false, notifyBusy = false, seenSeq = 0, markedSeq = 0, readTimer;

    function paintBan() {
      if (!oc) return;
      const current = liveBan(ban);
      banNote.hidden = !current || !data?.room.open;
      banNote.textContent = current ? banText(current) : '';
      if (data) form.hidden = !data.room.open || Boolean(current);
    }
    async function setBan(next) {
      ban = ocBan = next;
      ocBanFor = L.me?.nick;
      paintBan();
      if (next.until != null) return;
      // 실시간 연결의 오류에는 풀리는 시각이 없다. 목록 응답에서 한 번 받아 온다.
      const result = await L.api('rooms');
      if (stopped || ban !== next) return;
      if (result.chatBan) ban = ocBan = result.chatBan;
      paintBan();
    }
    function paintNotify(on) {
      notify.hidden = false;
      notify.setAttribute('aria-pressed', String(on));
      notify.querySelector('span').textContent = t(on ? 'notifyOn' : 'notifyOff');
    }
    if (oc) notify.onclick = async () => {
      if (notifyBusy) return;
      const on = notify.getAttribute('aria-pressed') !== 'true';
      notifyBusy = true;
      paintNotify(on);
      const result = await L.api('oc_notify', { id, on });
      notifyBusy = false;
      if (stopped) return;
      if (result.error) { paintNotify(!on); L.toast(problem(result.error)); return; }
      const saved = typeof result.notify === 'boolean' ? result.notify : on;
      if (data) data = { ...data, room: { ...data.room, notify: saved } };
      paintNotify(saved);
      L.toast(t(saved ? 'notifyOnDone' : 'notifyOffDone'));
    };
    function stateText(room) {
      const timed = room.kind === 'timed';
      if (room.open) return [t('ocOnline', { n: stamp(room.online) }), timed && stamp(room.closesAt) ? t('ocUntil', { at: when(room.closesAt) }) : '']
        .filter(Boolean).join(' · ');
      return [t('ocClosed'), timed && stamp(room.opensAt) > Date.now() ? t('ocOpens', { at: when(room.opensAt) }) : ''].filter(Boolean).join(' · ');
    }
    // 글 안의 @닉네임을 눈에 띄게. 나를 부른 글이면 called.
    function mentions(text) {
      const self = String(L.me?.nick || '').toLowerCase();
      let html = '', last = 0, called = false;
      for (const match of String(text).matchAll(mentionPattern)) {
        const start = match.index + match[1].length;
        const name = match[2].toLowerCase();
        const mine = Boolean(self) && (name === self || name.replace(/\.+$/, '') === self);
        html += esc(text.slice(last, start)) + '<span class="oc-at"' + (mine ? ' data-me="true"' : '') + '>@' + esc(match[2]) + '</span>';
        last = start + 1 + match[2].length;
        called ||= mine;
      }
      return { html: html + esc(String(text).slice(last)), called };
    }
    // 읽음 처리: 첫 장을 받으면 서버가 읽음으로 표시한다. 그 뒤 실시간으로 받아 본 글은 묶어서 한 번, 나갈 때 한 번 더 알린다.
    function flushRead() {
      clearTimeout(readTimer);
      readTimer = null;
      if (!oc || seenSeq <= markedSeq) return null;
      markedSeq = seenSeq;
      return L.api('oc_read', { id });
    }
    function noteSeen() {
      if (!oc || !data || pageCursor != null || document.visibilityState === 'hidden' || !nearEnd()) return;
      seenSeq = Math.max(seenSeq, data.messages.at(-1)?.seq ?? 0);
      if (seenSeq > markedSeq && !readTimer) readTimer = setTimeout(flushRead, 30_000);
    }
    function consentGate(version) {
      needConsent = Number.isSafeInteger(version) ? version : 1;
      retry.textContent = t('consentView');
      if (consentShown) return;
      consentShown = true;
      showConsent();
    }
    function showConsent() {
      askConsent(needConsent, () => {
        needConsent = null;
        retry.textContent = t('retry');
        status.textContent = '';
        refresh();
      });
    }

    const nearEnd = () => log.scrollHeight - log.scrollTop - log.clientHeight < 32;
    function jumpToEnd() {
      log.scrollTop = log.scrollHeight;
      unread = false;
      latest.hidden = pageCursor == null;
      noteSeen();
    }

    function adjustTop() {
      const pinned = nearEnd();
      const header = document.querySelector('#app > header');
      section.style.setProperty('--rooms-top', Math.max(0, window.visualViewport?.offsetTop || 0,
        header?.getBoundingClientRect().bottom || 0) + 'px');
      if (pinned && pageCursor == null) jumpToEnd();
    }

    function selectReply(message) {
      replying = message;
      query('[data-reply-draft]').hidden = !message;
      query('[data-reply-preview]').textContent = message ? t('replyTo', { nick: message.nick }) + ' · ' + message.text : '';
    }
    query('[data-reply-cancel]').onclick = () => { selectReply(); input.focus(); };
    query('[data-room-menu]').onclick = () => {
      const panel = L.sheet('<h2>' + e(words.roomMenu) + '</h2><div class="rooms-actions">' +
        (flags.safety ? '<a class="btn" href="#/safety">' + e('safety') + '</a>' : '') +
        btn('guidelines', 'data-rules') + '<a class="btn" href="#/rooms">' + e('leave') + '</a></div>');
      panel.querySelector('[data-rules]').onclick = () => {
        const rules = L.sheet('<h2>' + e('guidelines') + '</h2>' + (oc ? consentRules() + '<p class="muted oc-note">' + e('ocDmNote') + '</p>'
          : '<p>' + e('rules') + '</p><p>' + e('hours') + '</p>') +
          '<div class="rooms-actions"><button class="btn" type="button">' + esc(L.t('core.close')) + '</button></div>');
        rules.querySelector('button').onclick = L.closeSheet;
      };
    };

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
      live = false;
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
      url.searchParams.set('live', '1');
      if (result.ticket) url.searchParams.set('ticket', result.ticket);
      else if (result.error === 'ticket_off') url.searchParams.set('token', token);
      else {
        connectionStatus.textContent = L.t('screens.liveUnavailable');
        connectionStatus.hidden = false;
        return retryConnection();
      }
      let connection;
      try { connection = new WebSocket(url); } catch { return retryConnection(); }
      socket = connection;
      connection.onopen = () => {
        if (socket !== connection) return;
        connectionStatus.hidden = true;
        scheduleRefresh();
      };
      connection.onmessage = event => {
        if (socket !== connection) return;
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'ready') {
          reconnectDelay = 1000;
          live = data.live === true;
        }
        if (data.type === 'refresh' && !receiveMessage(data.message)) {
          if (snapshotMessages) snapshotMessages.length = 0;
          scheduleRefresh();
        }
        if (data.type === 'sent' && data.nonce === pending?.nonce) finishPending(data);
      };
      connection.onclose = event => {
        if (socket !== connection) return;
        socket = null;
        live = false;
        if (event.code === 1008 && ['blocked', 'banned', 'suspended', 'kicked', 'auth', 'closed', 'room_closed'].includes(event.reason)) {
          request++;
          snapshotMessages = null;
          chat.replaceChildren();
          data = null;
          form.hidden = true;
        }
        finishPending(null);
        retryConnection();
        scheduleRefresh();
      };
    }

    function messagesMarkup(messages) {
      const byId = new Map(messages.map(message => [message.id, message]));
      const sameSender = (first, second) => second && first.mine === second.mine && first.nick === second.nick;
      const entry = '<li class="rooms-meta-line">' + e(words.entered) + '</li>';
      let result = '';
      let previousDay;
      let entryShown = pageCursor != null;
      messages.forEach((message, i) => {
        const day = date.format(message.at), prior = messages[i - 1], following = messages[i + 1];
        if (day !== previousDay) result += '<li class="rooms-meta-line">' + esc(day) + '</li>';
        const showEntry = !entryShown && enteredAt != null && message.at > enteredAt;
        if (showEntry) { result += entry; entryShown = true; }
        const groupStart = day !== previousDay || showEntry || !sameSender(message, prior);
        previousDay = day;
        const showTime = !sameSender(message, following) || Math.floor(message.at / 60_000) !== Math.floor(following.at / 60_000);
        const photo = typeof message.photo === 'string' && /^p\/[\w:-]+\/[\w-]+\.(jpe?g|webp)$/.test(message.photo)
          ? '<img src="' + esc(L.img(message.photo)) + '" alt="" loading="lazy">' : '';
        const author = groupStart && !message.mine ? '<span class="rooms-avatar" aria-hidden="true">' +
          (photo || esc([...message.nick][0] || 'G')) + '</span><span class="rooms-author">' + L.whoTag(message) + '</span>' : groupStart && message.tag
            ? '<span class="rooms-author rooms-own-author">' + L.whoTag(message) + '</span>' : '';
        const quote = byId.get(replyTargets.get(message.id));
        const body = oc ? mentions(message.text) : null;
        result += '<li data-message="' + esc(message.id) + '" data-mine="' + !!message.mine +
          '" data-group-start="' + groupStart + '"' + (body?.called ? ' data-oc-called="true"' : '') + '>' + author +
          '<div class="rooms-line"><button type="button" class="rooms-bubble" data-message-menu>' +
          (quote ? '<span class="rooms-quote">' + L.whoTag(quote) + ' · ' + esc(quote.text) + '</span>' : '') +
          '<span>' + (body ? body.html : esc(message.text)) + '</span>' + (body?.called ? '<span class="sr-only"> · ' + e('ocCalled') + '</span>' : '') +
          '<span class="sr-only"> · ' + e('messageMenu') + '</span></button>' +
          (showTime ? '<small class="muted rooms-time">' + esc(time.format(message.at)) + '</small>' : '') + '</div>' +
          '<small class="muted" data-translation>' + esc(translations.get(message.id) || '') + '</small></li>';
      });
      return result + (!entryShown && enteredAt != null ? entry : '');
    }

    function paint(next, cursor) {
      const changedPage = pageCursor !== cursor;
      const wasNearEnd = nearEnd();
      const firstPaint = !data;
      if (enteredAt == null && next.room.open) enteredAt = next.messages.at(-1)?.at ?? 0;
      pageCursor = cursor;
      query('h1').textContent = nameOf(next.room);
      const roomState = query('[data-room-state]');
      roomState.textContent = oc ? stateText(next.room)
        : t(next.room.open ? 'open' : 'closed') + ' · ' + t('people', { n: next.room.online });
      if (oc) {
        roomState.dataset.open = next.room.open === true;
        if (!notifyBusy) paintNotify(next.room.notify !== false);
        document.title = nameOf(next.room);
      }
      const pin = query('[data-pin]');
      pin.hidden = !next.pin;
      pin.innerHTML = next.pin ? '<strong>' + e(words.pin) + '</strong><span class="shell-bio">' + esc(next.pin.text) + '</span>' : '';
      const vote = query('[data-vote]');
      if (JSON.stringify(data?.vote) !== JSON.stringify(next.vote) || data?.room.open !== next.room.open) {
        vote.innerHTML = voteMarkup(next.vote, next.room.open);
      }
      if (changedPage || JSON.stringify(data?.messages) !== JSON.stringify(next.messages)) {
        const focusedMessage = chat.contains(document.activeElement) && document.activeElement.closest('[data-message]')?.dataset.message;
        const anchor = !changedPage && !wasNearEnd && [...chat.querySelectorAll('[data-message]')].find(row =>
          row.getBoundingClientRect().bottom > log.getBoundingClientRect().top);
        const distance = anchor ? anchor.getBoundingClientRect().top : 0;
        if (data && cursor == null && !wasNearEnd && next.messages.at(-1)?.id !== data.messages.at(-1)?.id) unread = true;
        chat.innerHTML = messagesMarkup(next.messages);
        if (focusedMessage) chat.querySelector('[data-message="' + CSS.escape(focusedMessage) + '"] [data-message-menu]')?.focus({ preventScroll: true });
        if (cursor == null && (changedPage || firstPaint || wasNearEnd)) jumpToEnd();
        else if (changedPage) log.scrollTop = 0;
        else if (anchor) {
          const refreshed = chat.querySelector('[data-message="' + CSS.escape(anchor.dataset.message) + '"]');
          if (refreshed) log.scrollTop += refreshed.getBoundingClientRect().top - distance;
        }
      }
      query('[data-empty]').hidden = Boolean(next.messages.length);
      older.hidden = next.before == null;
      latest.hidden = cursor == null && !unread;
      retry.hidden = true;
      form.hidden = !next.room.open;
      if (!next.room.open || replying && !next.messages.some(message => message.id === replying.id)) selectReply();
      if (cursor == null && (firstPaint || wasNearEnd)) jumpToEnd();
      if (!next.room.open) disconnect();
      data = next;
      paintBan();
      noteSeen();
      connect();
    }

    function mergeMessages(snapshot, incoming) {
      const last = snapshot.messages.at(-1)?.seq ?? 0;
      const added = [...new Map(incoming.filter(message => message.seq > last)
        .map(message => [message.seq, message])).values()].sort((a, b) => a.seq - b.seq);
      if (!added.length) return snapshot;
      const messages = [...snapshot.messages, ...added];
      if (messages.length <= 40) return { ...snapshot, messages };
      const page = messages.slice(-40);
      return { ...snapshot, messages: page, before: page[0].seq };
    }

    function receiveMessage(message) {
      if (!Number.isSafeInteger(message?.seq) || !message.id) return false;
      if (wantedCursor != null) return true;
      if (snapshotMessages) {
        snapshotMessages.push(message);
        if (snapshotMessages.length > 40) snapshotMessages.shift();
      }
      if (!data?.room.open || pageCursor != null) return Boolean(snapshotMessages);
      const next = mergeMessages(data, [message]);
      if (next !== data) paint(next, undefined);
      return true;
    }

    async function load(before) {
      const version = ++request;
      const incoming = [];
      snapshotMessages = incoming;
      const next = await L.api('room_get', { id, before, live: true });
      if (stopped || version !== request) return;
      snapshotMessages = null;
      if (!next.error) {
        lastSnapshot = Date.now();
        if (!retry.hidden) status.textContent = '';
        if (oc) {
          if (needConsent) { needConsent = null; retry.textContent = t('retry'); }
          if (next.chatBan !== undefined) ban = ocBan = next.chatBan;
          // 첫 장을 받으면 서버가 그 방을 읽은 것으로 표시한다.
          if (before == null) markedSeq = Math.max(markedSeq, next.messages.at(-1)?.seq ?? 0);
        }
        paint(before == null && next.room.open ? mergeMessages(next, incoming) : next, before);
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
      if (oc && next.error === 'consent') consentGate(next.version);
    }

    async function refresh() {
      if (stopped) return;
      if (syncing) { refreshAgain = true; return; }
      syncing = true;
      await load(wantedCursor);
      syncing = false;
      if (refreshAgain) { refreshAgain = false; scheduleRefresh(); }
    }

    // Stagger snapshots when many clients receive the same invalidation.
    function scheduleRefresh() {
      if (stopped || refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        refresh();
      }, Math.random() * 800);
    }

    function showPage(cursor) {
      wantedCursor = cursor;
      return load(cursor);
    }

    older.onclick = () => showPage(data.before);
    latest.onclick = () => pageCursor == null ? jumpToEnd() : showPage(undefined);
    log.onscroll = () => { if (pageCursor == null && unread && nearEnd()) jumpToEnd(); };
    retry.onclick = () => {
      if (needConsent) return showConsent();
      status.textContent = '';
      refresh();
    };
    async function translateMessage(message) {
      if (translations.has(message.id) || translating.has(message.id)) return;
      const notice = query('[data-translation-notice]');
      if (notice?.hidden) {
        notice.hidden = false;
        notice.textContent = t('translateNotice');
      }
      translating.add(message.id);
      const result = await L.api('translate', { text: message.text, to: ['ko', 'en', 'ja', 'zh'].includes(L.lang) ? L.lang : 'en' });
      translating.delete(message.id);
      if (stopped) return;
      if (result.error) { L.toast(problem(result.error, 'translate')); return; }
      const pinned = nearEnd();
      translations.set(message.id, result.text);
      if (translations.size > 80) translations.delete(translations.keys().next().value);
      chat.querySelector('[data-message="' + CSS.escape(message.id) + '"] [data-translation]')?.replaceChildren(result.text);
      if (pinned && pageCursor == null) jumpToEnd();
    }

    function messageMenu(target) {
      const row = target.closest('[data-message]');
      const message = data?.messages.find(item => item.id === row?.dataset.message);
      if (!message) return;
      const row2 = (key, attribute, hint, danger) => '<button type="button" class="btn oc-menu-row' + (danger ? ' oc-bad' : '') + '" ' + attribute +
        '><span>' + e(key) + '</span>' + (hint ? '<small class="muted">' + e(hint) + '</small>' : '') + '</button>';
      const canMention = !message.mine && data.room.open && !form.hidden && new RegExp('^[' + nickChars + ']{2,12}$').test(message.nick);
      const panel = L.sheet(oc ? '<h2>' + (message.mine ? e('ocMenuMine') : e('ocMenuTitle', { nick: message.nick })) + '</h2><div class="oc-menu">' +
        (flags.translate ? row2(translating.has(message.id) ? 'translating' : 'translate', 'data-translate' + (translating.has(message.id) ? ' disabled' : '')) : '') +
        (canMention ? row2('ocMention', 'data-mention', 'ocMentionHint') : '') + row2('copyText', 'data-copy') +
        (message.mine ? '' : row2('report', 'data-report', 'ocReportHint', true) + row2('block', 'data-block', 'ocBlockHint', true)) +
        '<button class="btn" type="button" data-dismiss>' + esc(L.t('core.close')) + '</button></div>' +
        (message.mine ? '' : '<p class="muted oc-note">' + e('ocDmNote') + '</p>')
        : '<h2>' + e('messageMenu') + '</h2><div class="rooms-actions">' +
        (data.room.open ? btn('reply', 'data-reply') : '') + btn('copyText', 'data-copy') +
        (flags.translate ? btn(translating.has(message.id) ? 'translating' : 'translate',
          'data-translate' + (translating.has(message.id) ? ' disabled' : '')) : '') +
        (message.mine ? '' : btn('report', 'data-report') + btn('block', 'data-block')) +
        '<button class="btn" type="button" data-dismiss>' + esc(L.t('core.close')) + '</button></div>');
      panel.onclick = async event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.hasAttribute('data-report')) return report(message, oc);
        if (button.hasAttribute('data-block')) return block(message, refresh);
        L.closeSheet();
        if (button.hasAttribute('data-mention')) {
          const draft = input.value;
          input.value = draft + (draft && !/\s$/.test(draft) ? ' ' : '') + '@' + message.nick + ' ';
          input.focus();
        }
        if (button.hasAttribute('data-reply')) { selectReply(message); input.focus(); }
        if (button.hasAttribute('data-translate')) await translateMessage(message);
        if (button.hasAttribute('data-copy')) {
          try { await navigator.clipboard.writeText(message.text); L.toast(t('copied')); }
          catch { L.toast(t('copyFailed')); }
        }
      };
    }

    function cancelPress() { clearTimeout(longPress); pressed = null; }
    chat.onpointerdown = event => {
      const target = event.target.closest('[data-message-menu]');
      if (!target || event.button !== 0) return;
      cancelPress();
      suppressClick = false;
      pressed = [event.clientX, event.clientY];
      longPress = setTimeout(() => {
        if (!target.isConnected) return;
        suppressClick = true;
        messageMenu(target);
      }, 500);
    };
    chat.onpointermove = event => {
      if (pressed && Math.hypot(event.clientX - pressed[0], event.clientY - pressed[1]) > 8) cancelPress();
    };
    chat.onpointerup = chat.onpointercancel = chat.onpointerleave = cancelPress;
    chat.oncontextmenu = event => {
      const target = event.target.closest('[data-message-menu]');
      if (!target) return;
      event.preventDefault();
      cancelPress();
      if (!suppressClick) messageMenu(target);
    };
    chat.onclick = event => {
      const target = event.target.closest('[data-message-menu]');
      if (!target) return;
      if (!suppressClick || event.detail === 0) messageMenu(target);
      suppressClick = false;
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
      const reply = replying;
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
      if (oc && result.error === 'chat_banned') {
        // 쓰던 글은 입력칸에 그대로 둔다. 안내는 입력칸 자리에 보인다.
        setBan({ until: Number.isFinite(result.until) ? result.until : null });
        return;
      }
      if (result.error && result.error !== 'history_expired') {
        status.textContent = problem(result.error);
        await refresh();
        return;
      }
      if (input.value.trim() === text) input.value = '';
      // Keep only the target ID in this tab. The server currently accepts plain text only.
      if (reply && result.message?.id) {
        replyTargets.set(result.message.id, reply.id);
        if (replyTargets.size > 80) replyTargets.delete(replyTargets.keys().next().value);
      }
      if (replying === reply) selectReply();
      if (result.error) status.textContent = problem(result.error);
      if (!live || wantedCursor != null || !receiveMessage(result.message)) await showPage(undefined);
      if (result.message?.id && replyTargets.has(result.message.id) && data?.messages.some(message => message.id === result.message.id)) {
        chat.innerHTML = messagesMarkup(data.messages);
      }
      if (!stopped) jumpToEnd();
    };
    function refreshIfVisible() {
      if (needConsent) return;
      if (document.visibilityState !== 'hidden' && (!live || Date.now() - lastSnapshot >= 30_000)) scheduleRefresh();
    }
    // 오픈채팅: 화면을 가리면 지금까지 본 글을 읽음으로, 다시 보면 새로 본 글을 표시.
    function readOnVisibility() {
      if (document.visibilityState === 'hidden') flushRead();
      else noteSeen();
    }

    window.addEventListener('online', scheduleRefresh);
    window.addEventListener('resize', adjustTop);
    window.visualViewport?.addEventListener('resize', adjustTop);
    window.visualViewport?.addEventListener('scroll', adjustTop);
    if (typeof ResizeObserver === 'function') {
      const header = document.querySelector('#app > header');
      layoutObserver = new ResizeObserver(adjustTop);
      if (header) layoutObserver.observe(header);
      layoutObserver.observe(log);
    }
    adjustTop();
    document.addEventListener('visibilitychange', refreshIfVisible);
    if (oc) {
      document.addEventListener('visibilitychange', readOnVisibility);
      log.addEventListener('scroll', noteSeen, { passive: true });
    }
    timer = setInterval(refreshIfVisible, 4500 + Math.random() * 1000);
    active = () => {
      if (oc) {
        // 나갈 때 한 번: 목록이 이 요청이 끝난 뒤에 안 읽은 수를 받는다.
        ocReadPending = flushRead();
        document.removeEventListener('visibilitychange', readOnVisibility);
      }
      stopped = true;
      clearInterval(timer);
      clearTimeout(refreshTimer);
      cancelPress();
      layoutObserver?.disconnect();
      window.removeEventListener('online', scheduleRefresh);
      window.removeEventListener('resize', adjustTop);
      window.visualViewport?.removeEventListener('resize', adjustTop);
      window.visualViewport?.removeEventListener('scroll', adjustTop);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      disconnect();
    };
    return refresh();
  }

  L.screen('room', { nav: 'rooms', title: 'rooms.title', async render(root, { id }) {
    const flags = await config(root, t(L.open('openchat') ? 'ocTitle' : 'title'), 'rooms');
    if (!flags || !root.isConnected) return;
    if (flags.openchat === true) document.title = t('ocTitle');
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
