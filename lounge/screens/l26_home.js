(function (L) {
  const words = {
    afternoon: ['정오부터 저녁까지', 'Afternoon', '午後', '午后'],
    planning: ['오늘 밤 계획', 'Plan tonight', '今夜の予定', '今晚计划'],
    live: ['오늘 밤 라이브', 'Tonight live', '今夜のライブ', '今晚现场'],
    morning: ['지난밤 돌아보기', 'After last night', '昨夜を振り返る', '昨夜回顾'],
    first: ['첫 라운지 활동을 시작해 보세요.', 'Take your first step in the Lounge.', 'ラウンジで最初のアクションを。', '开启你的首次休息室活动。'],
    replay: ['리플레이 보기', 'Explore replays', 'リプレイを見る', '查看回放'],
    lineup: ['오늘 DJ 타임테이블', 'Today’s DJ timetable', '今日のDJタイムテーブル', '今日 DJ 时间表'],
    music: ['추천 음악 듣기', 'Listen to Groove Radio', 'Grooveラジオを聴く', '收听 Groove 电台'],
    going: ['오늘 갈래요', 'I’m going tonight', '今夜行きます', '今晚要去'],
    plan: ['방문 계획 보기', 'Plan a visit', '来店の計画を見る', '计划到店'],
    planned: ['방문 계획 확인', 'Review your visit plan', '来店の予定を確認', '查看你的到店计划'],
    djs: ['현재 DJ', 'Current DJs', '現在のDJ', '当前 DJ'],
    entry_qr: ['입장 QR 열기', 'Open entry QR', '入場QRを開く', '打开入场二维码'],
    checkin: ['매장 체크인 안내', 'Club check-in guide', '店頭チェックイン案内', '到店签到指南'],
    entry_verified: ['입장 인증 기록 있음', 'Entry verification recorded', '入場認証の記録あり', '已有入场验证记录'],
    floor_vote: ['층 응원 투표', 'Floor vote', 'フロア応援投票', '楼层应援投票'],
    sendingVote: ['투표를 보내는 중', 'Submitting your vote', '投票を送信中', '正在提交投票'],
    voted: ['투표 완료 · 현재 집계', 'Vote counted · Current totals', '投票済み · 現在の集計', '已投票 · 当前票数'],
    retryVote: ['같은 층을 다시 눌러 주세요.', 'Tap the same floor to retry.', '同じフロアをもう一度押してください。', '请再次点击同一楼层。'],
    checkingVote: ['투표 상태를 확인하는 중', 'Checking your vote', '投票状況を確認中', '正在确认投票状态'],
    results: ['지난밤 다시 보기', 'Revisit last night', '昨夜の振り返りを見る', '回看昨夜'],
    liveResults: ['LIVE에서 지난밤 결과 보기', 'See last night’s results in LIVE', 'ライブで昨夜の結果を見る', '在现场页查看昨夜结果'],
    visits: ['내 방문 기록', 'My visit record', '来店履歴', '我的到店记录'],
    lastVisit: ['최근 기록 · {day}', 'Last recorded · {day}', '最終記録 · {day}', '最近记录 · {day}'],
    verifiedVisit: ['직원 인증 입장 · {day}', 'Staff-verified entry · {day}', 'スタッフ認証入場 · {day}', '员工验证入场 · {day}'],
    legacyVisit: ['기존 셀프 체크인 · {day}', 'Previous self check-in · {day}', '過去のセルフチェックイン · {day}', '以往自行签到 · {day}'],
    noon_replay: ['정오부터 홈에서 리플레이를 추천해 드려요.', 'Replay picks appear here from noon KST.', '韓国時間の正午からリプレイをおすすめします。', '韩国时间中午起在此推荐回放。'],
    join: ['직원 QR로 가입하기', 'Join with a staff QR', 'スタッフQRで登録', '使用员工二维码注册'],
    loading: ['불러오는 중', 'Loading', '読み込み中', '加载中'],
    missingDjs: ['현재 공개된 DJ 정보가 없어요.', 'No current DJ information is published.', '現在公開中のDJ情報はありません。', '暂未公布当前 DJ 信息。'],
    qrHelp: ['입장 확인을 위해 직원에게 이 QR을 보여 주세요.', 'Show this QR to staff for entry verification.', '入場認証のため、このQRをスタッフに提示してください。', '请向员工出示此二维码进行入场验证。'],
    checkinHelp: ['매장 직원에게 체크인 QR을 요청한 뒤 카메라로 스캔해 주세요.', 'Ask a staff member for the check-in QR and scan it with your camera.', 'スタッフにチェックインQRを頼み、カメラで読み取ってください。', '请向员工索取签到二维码，再用相机扫描。'],
    expired: ['QR이 만료됐어요. 닫은 뒤 다시 열어 주세요.', 'This QR expired. Close and reopen it for a new one.', 'QRの有効期限が切れました。閉じてから開き直してください。', '二维码已过期，请关闭后重新打开。'],
    failed: ['다시 시도해 주세요.', 'Please try again.', 'もう一度お試しください。', '请重试。']
  };

  L.i18n(Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((lang, index) => [lang,
    Object.fromEntries(Object.entries(words).map(([key, values]) => ['l26Home.' + key, values[index]]))
  ])));
  const t = (key, vars) => L.esc(L.t('l26Home.' + key, vars));
  const url = /^(?:lineup|parties|table|tonight|radio|photos(?:\/[\w.%-]+)?|me|l26_live|l26_lounge|songs\?day=\d{4}-\d{2}-\d{2})$/;
  const commands = new Set(['going', 'entry_qr', 'checkin']);
  const floors = ['2F', '3F'];
  let active, qrLibrary;

  function loadStyles() {
    if (document.querySelector('link[data-l26-home-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/lounge/css/l26-home.css';
    link.dataset.l26HomeCss = '';
    document.head.append(link);
  }

  function legacy() {
    history.replaceState(history.state, '', '#/tonight');
    return L.route();
  }

  function dateLabel(day) {
    return new Intl.DateTimeFormat(L.lang, {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Seoul'
    }).format(new Date(day + 'T12:00:00+09:00'));
  }

  function label(action) {
    return t(action.kind === 'results' && action.live ? 'liveResults' : action.kind);
  }

  function details(action) {
    if (Array.isArray(action.slots) && action.slots.length) {
      return '<ul class="l26-home-slots">' + action.slots.map(slot =>
        '<li><b data-l26-floor="' + L.esc(slot.floor) + '">' + L.esc(slot.floor) + '</b><span>' +
        L.esc([slot.at, slot.dj].filter(Boolean).join(' · ')) + '</span></li>').join('') + '</ul>';
    }
    if (action.kind === 'djs') return '<p class="muted">' + t('missingDjs') + '</p>';
    if (action.day && /^\d{4}-\d{2}-\d{2}$/.test(action.day)) {
      const source = { verified: 'verifiedVisit', legacy: 'legacyVisit' };
      return '<p class="muted">' + t(Object.hasOwn(source, action.source) ? source[action.source] : 'lastVisit',
        { day: dateLabel(action.day) }) + '</p>';
    }
    return '';
  }

  function control(action, css) {
    if (url.test(action.route)) {
      return '<a class="' + css + '" href="#/' + L.esc(action.route) + '">' + label(action) + '</a>';
    }
    if (commands.has(action.kind)) {
      return '<button type="button" class="' + css + '" data-home-command="' + action.kind + '">' + label(action) + '</button>';
    }
    return '<span>' + label(action) + '</span>';
  }

  function voteControls(action) {
    const voted = action.vote_status === 'voted';
    const number = new Intl.NumberFormat(L.lang);
    return '<h2>' + t('floor_vote') + '</h2><div class="l26-home-floors">' + floors.map(floor => voted
      ? '<div class="l26-home-floor" data-home-count="' + floor + '"><b data-l26-floor="' + floor + '">' +
        floor + '</b> <span>' + number.format(action.counts[floor]) + '</span></div>'
      : '<button type="button" class="btn l26-home-floor" data-home-command="vote" data-l26-floor="' +
        floor + '">' + floor + '</button>').join('') + '</div><p role="status" data-home-vote-status>' +
      (voted ? t('voted') : '') + '</p>';
  }

  function updateVoteControls(state) {
    const status = state.root.querySelector('[data-home-vote-status]');
    if (!status || state.view.primary_action.vote_status !== 'ready') return;
    const retry = state.retryVote;
    for (const button of state.root.querySelectorAll('[data-home-command=vote]')) {
      button.disabled = state.voting || state.checkingVote || Boolean(retry && retry.floor !== button.dataset.l26Floor);
    }
    const message = state.voting ? 'sendingVote' : state.checkingVote ? 'checkingVote' : retry ? 'retryVote' : '';
    status.textContent = message ? L.t('l26Home.' + message) : '';
  }

  function paint(state, data) {
    const primary = data.primary_action;
    const hasBallot = primary.kind === 'floor_vote' && (primary.vote_status === 'ready' ||
      (primary.vote_status === 'voted' && floors.every(floor => Number.isSafeInteger(primary.counts?.[floor]))));
    state.root.innerHTML = '<header class="l26-home-heading"><h1>' + L.esc(L.t('nav.l26_home')) +
      '</h1><p>' + t(data.phase) + '</p></header><section class="l26-home-hero" aria-label="' + label(primary) + '">' +
      (primary.first ? '<p>' + t('first') + '</p>' : '') + details(primary) +
      (hasBallot ? voteControls(primary) : control(primary, 'btn btn-hot l26-home-primary')) + '</section>' +
      '<ul class="l26-home-cards">' + data.cards.slice(0, 3).map(action =>
        '<li class="l26-home-card" data-home-card="' + L.esc(action.kind) + '">' +
        control(action, 'l26-home-card-link') + details(action) + '</li>').join('') + '</ul>' +
      '<div class="l26-home-links">' + (!L.me ? '<a href="#/join">' + t('join') + '</a>' : '') +
      '<a href="#/' + (L.open('l26_play') ? 'l26_play' : 'play') + '">' + L.esc(L.t('nav.l26_play')) + '</a></div>';
    state.root.dataset.homePhase = data.phase;
    state.root.dataset.verifiedEntry = String(data.verified_entry);
    updateVoteControls(state);
  }

  function applyView(state, view) {
    const snapshot = JSON.stringify(view);
    if (snapshot === state.snapshot) return;
    if (view.primary_action.vote_status !== 'ready' ||
        view.primary_action.biz_day !== state.view?.primary_action.biz_day) {
      state.retryVote = null;
      state.checkingVote = false;
    }
    state.view = view;
    state.snapshot = snapshot;
    paint(state, view);
  }

  function qrGenerator() {
    if (typeof window.qrcode === 'function') return Promise.resolve(window.qrcode);
    qrLibrary ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/qrcode-generator-1.4.4.js';
      script.onload = () => typeof window.qrcode === 'function' ? resolve(window.qrcode) : reject();
      script.onerror = reject;
      document.head.append(script);
    }).catch(error => { qrLibrary = undefined; throw error; });
    return qrLibrary;
  }

  function drawQr(canvas, createQr, value) {
    const qr = createQr(0, 'M');
    qr.addData(value, 'Byte');
    qr.make();
    const count = qr.getModuleCount(), cell = 6;
    canvas.width = canvas.height = (count + 8) * cell;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) ctx.fillRect((col + 4) * cell, (row + 4) * cell, cell, cell);
      }
    }
  }

  async function showEntry(state) {
    const panel = L.sheet('<h2>' + t('entry_qr') + '</h2><p role="status">' + t('loading') + '</p>', { close: true });
    clearTimeout(state.qrTimer);
    const status = panel.querySelector('[role=status]');
    const started = performance.now();
    const serverAtStart = state.clock ? state.clock.serverNow + started - state.clock.receivedAt : Date.now();
    const response = await L.api('l26_entry_issue');
    if (active !== state || !panel.isConnected) return;
    if (!response.ok || typeof response.qr !== 'string' || !response.qr || response.qr.length > 2048) {
      status.textContent = L.t('l26Home.failed');
      return;
    }
    try {
      const make = await qrGenerator();
      if (active !== state || !panel.isConnected) return;
      const canvas = document.createElement('canvas');
      canvas.className = 'l26-home-qr';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', L.t('l26Home.entry_qr'));
      const expire = () => { canvas.remove(); status.textContent = L.t('l26Home.expired'); };
      if (!Number.isFinite(response.expires_at)) throw new Error('expires_at');
      const serverNow = Number.isFinite(response.server_now) ? response.server_now : serverAtStart;
      const remaining = response.expires_at - serverNow - (performance.now() - started);
      if (remaining <= 0) return expire();
      drawQr(canvas, make, response.qr);
      status.textContent = L.t('l26Home.qrHelp');
      panel.append(canvas);
      state.qrTimer = setTimeout(expire, remaining);
    } catch {
      status.textContent = L.t('l26Home.failed');
    }
  }

  async function castVote(state, floor) {
    const action = state.view?.primary_action;
    if (state.voting || state.checkingVote || action?.vote_status !== 'ready' || !floors.includes(floor)) return;
    if (state.retryVote && state.retryVote.floor !== floor) return;
    const attempt = state.retryVote ?? { floor, id: crypto.randomUUID() };
    state.voteRevision++;
    state.voting = true;
    updateVoteControls(state);
    const result = await L.api('l26_floor_vote', { floor, request_id: attempt.id });
    if (active !== state) return;
    state.voting = false;
    if (result.ok && result.biz_day === action.biz_day && result.vote_status === 'voted' &&
        floors.every(floor => Number.isSafeInteger(result.counts?.[floor]) && result.counts[floor] >= 0)) {
      applyView(state, { ...state.view, primary_action: { ...action, vote_status: 'voted', counts: result.counts } });
    } else if (['network', 'server'].includes(result.error)) {
      state.retryVote = attempt;
    } else {
      state.retryVote = null;
      state.checkingVote = true;
      if (!['already_voted', 'voting_closed', 'closed'].includes(result.error)) L.toast(L.t('l26Home.failed'));
    }
    updateVoteControls(state);
    await state.pending;
    await refresh(state);
  }

  async function act(state, button) {
    const action = button.dataset.homeCommand;
    if (L.needLogin() || state.acting) return;
    if (action === 'vote') return castVote(state, button.dataset.l26Floor);
    state.acting = true;
    button.disabled = true;
    try {
      if (action !== 'going') {
        if (action === 'entry_qr') await showEntry(state);
        else L.sheet('<h2>' + t('checkin') + '</h2><p>' + t('checkinHelp') + '</p>', { close: true });
        return;
      }
      const result = await L.api('going');
      if (active !== state) return;
      if (result.error) L.toast(L.t('l26Home.failed'));
      else {
        await state.pending;
        await refresh(state);
      }
    } finally {
      state.acting = false;
      button.disabled = false;
    }
  }

  async function refresh(state) {
    if (active !== state || state.pending || state.voting) return;
    clearTimeout(state.timer);
    const revision = state.voteRevision;
    state.pending = L.api('l26_home');
    const response = await state.pending;
    state.pending = null;
    if (active !== state || revision !== state.voteRevision) return;
    if (!response.ok || !response.primary_action || !Array.isArray(response.cards)) {
      if (!state.snapshot || ['action', 'closed', 'unimplemented'].includes(response.error)) return legacy();
    } else {
      const { server_now, ...view } = response;
      if (Number.isFinite(server_now)) state.clock = { serverNow: server_now, receivedAt: performance.now() };
      const wasCheckingVote = state.checkingVote;
      state.checkingVote = false;
      applyView(state, view);
      if (wasCheckingVote) updateVoteControls(state);
      // Align refreshes to server minute boundaries, including the KST phase changes.
      const nextMinute = Number.isFinite(server_now) ? 60_000 - server_now % 60_000 : 60_000;
      state.timer = setTimeout(state.refresh, nextMinute);
      return;
    }
    state.timer = setTimeout(state.refresh, 60_000);
  }

  L.screen('l26_home', {
    title: 'nav.l26_home',
    render(root) {
      if (!L.open('l26_home')) return legacy();
      loadStyles();
      root.className = 'l26-screen l26-home';
      root.innerHTML = '<h1>' + L.esc(L.t('nav.l26_home')) + '</h1><p role="status">' + t('loading') + '</p>';
      const state = active = { root, voteRevision: 0 };
      state.refresh = () => { if (!document.hidden) return refresh(state); };
      root.addEventListener('click', event => {
        const button = event.target.closest('button[data-home-command]');
        if (button) void act(state, button);
      });
      document.addEventListener('visibilitychange', state.refresh);
      return refresh(state);
    },
    leave() {
      if (!active) return;
      clearTimeout(active.timer);
      clearTimeout(active.qrTimer);
      document.removeEventListener('visibilitychange', active.refresh);
      active = null;
    }
  });
})(window.Lounge);
