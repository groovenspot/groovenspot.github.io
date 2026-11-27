(function (L) {
  const floors = [['2F', 'HIPHOP'], ['3F', 'EDM']];
  const pollMs = 5000;
  const timeZone = 'Asia/Seoul';
  const text = {
    dj: ['현재 DJ', 'Current DJ', '出演中のDJ', '当前 DJ'],
    next: ['다음 DJ', 'Up next', '次のDJ', '下一位 DJ'],
    open: ['영업 중', 'Open now', '営業中', '营业中'],
    pre: ['오픈 전 · {time} 오픈', 'Before opening · Opens at {time}', '開店前 · {time} 開店', '营业前 · {time} 开门'],
    after: ['영업 종료', 'Closed for the night', '営業終了', '营业结束'],
    showUnknown: ['영업 상태 확인 불가', 'Venue status unavailable', '営業状況を確認できません', '营业状态暂不可用'],
    venueHours: ['영업시간', 'Venue hours', '営業時間', '营业时间'],
    visit: ['공연·방문 정보', 'Show & visit info', '公演・来店情報', '演出与到访信息'],
    schedule: ['타임테이블', 'Timetable', 'タイムテーブル', '演出时间表'],
    tonight: ['공연 정보', 'Show info', '公演情報', '演出信息'],
    djs: ['DJ 목록', 'DJ directory', 'DJ一覧', 'DJ 列表'],
    table: ['테이블', 'Tables', 'テーブル', '订桌'],
    loading: ['불러오는 중', 'Loading', '読み込み中', '正在加载'],
    noDj: ['DJ 정보 없음', 'DJ unavailable', 'DJ情報なし', '暂无 DJ 信息'],
    noSchedule: ['등록된 일정 없음', 'No schedule listed', '予定なし', '暂无演出安排'],
    showStale: ['마지막으로 받은 공연 정보예요.', 'Showing the last received show info.', '最後に取得した公演情報です。', '正在显示上次获取的演出信息。'],
    showError: ['공연 정보를 불러오지 못했어요.', 'Show info is unavailable.', '公演情報を取得できませんでした。', '无法获取演出信息。'],
    hype: ['HYPE', 'HYPE', 'HYPE', 'HYPE'],
    hypeAria: ['{floor} DJ에게 하입 보내기', 'Send hype to the {floor} DJ', '{floor}のDJにHYPEを送る', '为{floor} DJ打call'],
    hypeCount: ['오늘 밤 🔥 {n}', 'Tonight 🔥 {n}', '今夜 🔥 {n}', '今晚 🔥 {n}'],
    hypeSignIn: ['로그인하면 DJ에게 하입을 보낼 수 있어요.', 'Sign in to send hype to the DJ.', 'ログインするとDJにHYPEを送れます。', '登录后可为DJ打call。'],
    hypeEntry: ['입장 QR 인증을 하면 하입을 보낼 수 있어요.', 'Verify your entry QR to send hype.', '入場QR認証をするとHYPEを送れます。', '完成入场二维码验证后即可打call。'],
    hypeStaff: ['직원 계정의 하입은 집계되지 않아요.', 'Hype from staff accounts isn’t counted.', 'スタッフアカウントのHYPEは集計されません。', '员工账号的打call不计入统计。'],
    hypeCap: ['잠깐! 1분에 {n}번까지 보낼 수 있어요.', 'Slow down! Up to {n} per minute.', 'ちょっと待って！1分に{n}回までです。', '慢一点！每分钟最多{n}次。'],
    hypeNotNow: ['지금 플레이 중일 때 HYPE를 보낼 수 있어요.', 'You can send HYPE while this DJ is playing.', 'このDJがプレイ中のときにHYPEを送れます。', '该DJ演出时才能打call。'],
    hypeNight: ['오늘 밤 하입을 다 보냈어요. 고마워요!', 'You’ve used all of tonight’s hype. Thanks!', '今夜のHYPEは使い切りました。ありがとう！', '今晚的打call已用完，谢谢！'],
    vote: ['층 응원 투표', 'Floor vote', 'フロア応援投票', '楼层应援投票'],
    emptyVote: ['투표 대기', 'Awaiting votes', '投票待ち', '等待投票'],
    hours: ['21:00–다음 날 07:00 (KST)', '21:00–07:00 next day (KST)', '21:00–翌07:00 (KST)', '21:00–次日07:00 (KST)'],
    final: ['{day} 최종 결과', '{day} final result', '{day} 最終結果', '{day} 最终结果'],
    finalizing: ['최종 결과를 불러오는 중', 'Loading the final result', '最終結果を読み込み中', '正在加载最终结果'],
    ready: ['하루에 한 층을 응원할 수 있어요.', 'Vote for one floor per night.', '1営業日につき1フロアに投票できます。', '每个营业日可为一个楼层投票。'],
    voted: ['투표를 반영했어요.', 'Your vote is counted.', '投票が反映されました。', '你的投票已计入。'],
    sending: ['투표를 보내는 중', 'Submitting vote', '投票を送信中', '正在提交投票'],
    sign_in: ['로그인 후 투표할 수 있어요.', 'Sign in to vote.', 'ログインして投票してください。', '登录后即可投票。'],
    entry_required: ['입구에서 QR 인증 후 투표할 수 있어요.', 'Verify your QR at the entrance to vote.', '入口でQR認証すると投票できます。', '在入口完成二维码验证后即可投票。'],
    ineligible: ['현재 투표할 수 없어요.', 'Voting is unavailable for this account.', '現在このアカウントでは投票できません。', '此账号目前无法投票。'],
    closed: ['투표가 마감됐어요.', 'Voting is closed.', '投票は締め切られました。', '投票已截止。'],
    stale: ['연결 끊김 · 마지막 갱신 {time} (KST)', 'Connection lost · Last updated {time} (KST)', '接続切断 · 最終更新 {time} (KST)', '连接中断 · 最后更新 {time} (KST)'],
    offline: ['연결 끊김 · 다시 연결 중', 'Connection lost · Reconnecting', '接続切断 · 再接続中', '连接中断 · 正在重连'],
    retry: ['연결이 복구되면 같은 층을 다시 눌러 주세요.', 'Tap the same floor again after reconnecting.', '再接続後、同じフロアをもう一度タップしてください。', '重新连接后请再次点击同一楼层。'],
    voteError: ['투표를 보내지 못했어요. 다시 눌러 주세요.', 'Vote could not be sent. Tap again to retry.', '投票を送信できませんでした。もう一度タップしてください。', '投票提交失败，请再次点击。']
  };
  const t = (key, values = {}) => {
    const lang = ['ko', 'en', 'ja', 'zh'].indexOf(L.lang);
    return text[key][lang < 0 ? 1 : lang].replace(/\{(\w+)\}/g, (_, name) => values[name]);
  };
  const clockLabel = at => new Intl.DateTimeFormat(L.lang, {
    timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).format(at);
  const kstTime = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const minuteOfDay = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const hasTimestamp = at => Number.isSafeInteger(at) && at > 0 && at <= 8.64e15;
  const countLabel = value => new Intl.NumberFormat(L.lang).format(value);
  const shareLabel = value => new Intl.NumberFormat(L.lang, { style: 'percent', maximumFractionDigits: 1 }).format(value);
  const loginLink = () => '#/login?next=' + encodeURIComponent('#/l26_live');

  let controller, retryVote;
  function loadStyles() {
    if (document.querySelector('link[href="/lounge/css/l26-live.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/lounge/css/l26-live.css';
    link.onerror = () => link.remove();
    document.head.append(link);
  }

  // The shared API owns session handling. Bound how long LIVE waits for a reply.
  async function request(action, body) {
    let timeout;
    try {
      return await Promise.race([
        L.api(action, body),
        new Promise(resolve => { timeout = setTimeout(resolve, 8000, { error: 'network' }); })
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  function venueState(data, now) {
    if (data.error || data.stale || typeof data.open !== 'boolean') return { state: 'unknown' };
    const [scheduledOpen, scheduledClose] = typeof data.hours === 'string' ?
      data.hours.match(/(?:[01]\d|2[0-3]):[0-5]\d/g) || [] : [];
    const opensAt = hasTimestamp(data.opensAt) ? data.opensAt : null;
    const closesAt = hasTimestamp(data.closesAt) ? data.closesAt : null;
    const openingTime = opensAt ? kstTime.format(opensAt) : scheduledOpen || '21:00';
    const start = minuteOfDay(openingTime);
    const end = minuteOfDay(closesAt ? kstTime.format(closesAt) : scheduledClose || '07:00');
    const minute = minuteOfDay(kstTime.format(now));
    const overnight = end <= start;
    const inHours = overnight ? minute >= start || minute < end : minute >= start && minute < end;
    const afterHours = !inHours && minute >= end && (!overnight || minute < 12 * 60);

    if (data.phase === 'after' || afterHours) return { state: 'after' };
    if (inHours && data.phase !== 'pre' && data.open && (!opensAt || now >= opensAt) && (!closesAt || now < closesAt)) {
      return { state: 'open' };
    }
    if (inHours && data.phase !== 'pre' && ((overnight && minute < end) || (closesAt && now >= closesAt))) {
      return { state: 'after' };
    }
    return { state: 'pre', openingTime };
  }

  function sessionThumbnail(slot, sessions) {
    const key = name => String(name || '').trim().toUpperCase();
    const session = sessions.find(video => key(video.dj) === key(slot.dj) && /^[\w-]{11}$/.test(video.youtube));
    return session ? 'https://i.ytimg.com/vi/' + session.youtube + '/mqdefault.jpg' : L.photoSrc(slot.photo);
  }

  function floorSchedule(floor, data, state, sessions) {
    const info = data.floors?.[floor] || {};
    const slots = (data.timetable || []).filter(slot => slot.floor === floor && slot.dj);
    if (!slots.length && state !== 'open' && info.next) slots.push({ at: info.nextAt, dj: info.next });
    const nextIndex = slots.findIndex(slot => slot.at === info.nextAt && slot.dj === info.next);
    const previous = slots[nextIndex - 1];
    const matching = slots.filter(slot => slot.dj === info.now);
    const currentTime = previous && previous.dj === info.now ? previous.at : matching.length === 1 ? matching[0].at : '';
    const time = at => at ? '<time>' + L.esc(at) + '</time>' : '';
    const lineup = slots.length ? '<ul class="l26-live-lineup">' + slots.map(slot => {
      // 타임테이블은 DJ 로고만 (대표 요청 2026-11-28 — 유튜브 썸네일 뺌)
      return '<li>' + time(slot.at) + '<strong>' + L.djMark(slot.dj, null, 'is-sm') + '</strong></li>';
    }).join('') + '</ul>' : L.l26Empty(t('noSchedule'), 'layers', true);
    if (state !== 'open') {
      return '<h3 class="l26-live-lineup-title">' + t('schedule') + '</h3>' + lineup;
    }
    return '<dl class="l26-live-slots"><div data-live-current><dt>' + t('dj') + '</dt><dd><strong class="l26-live-dj">' +
      (info.now ? L.djMark(info.now) : t('noDj')) + '</strong>' + time(info.now && currentTime) + '</dd></div>' +
      '<div><dt>' + t('next') + '</dt><dd><strong>' + (info.next ? L.djMark(info.next, null, 'is-sm') : t('noDj')) + '</strong>' +
      time(info.next && info.nextAt) + '</dd></div></dl><details><summary>' + t('schedule') + L.icon('down', { size: 16 }) +
      '</summary>' + lineup + '</details>';
  }

  function render(root) {
    loadStyles();
    root.className = 'l26-screen l26-live';
    root.innerHTML = '<section aria-labelledby="l26-live-dj"><header class="l26-live-head"><h1 id="l26-live-dj">' +
      L.esc(L.t('nav.l26_live')) + '</h1><div class="l26-live-venue"><p data-live-venue>' + t('loading') +
      '</p><p data-live-hours hidden></p></div></header>' +
      '<div class="l26-live-grid">' + floors.map(([floor, genre]) =>
        '<article class="l26-live-card" data-l26-floor="' + floor + '"><div class="l26-live-cover"><h2><strong>' + floor +
        '</strong><span>' + genre + '</span></h2></div><div data-live-dj="' + floor + '">' + L.l26Skeleton(t('loading'), true) + '</div>' +
        '<div class="l26-hype" data-live-hype="' + floor + '" hidden></div></article>').join('') +
      '</div><p class="muted" data-live-show-stale hidden>' + t('showStale') + '</p></section>' +
      '<section data-live-entry hidden></section><section data-live-dj-feedback hidden></section>' +
      '<section data-live-vote hidden aria-labelledby="l26-live-vote"><h2 id="l26-live-vote">' + t('vote') + '</h2>' +
      '<p class="muted">' + t('hours') + '</p><div class="l26-live-match"><span class="l26-live-vs" aria-hidden="true">VS</span>' +
      floors.map(([floor, genre]) => '<article class="l26-live-choice" data-l26-floor="' + floor +
        '"><button type="button" data-live-ballot="' + floor + '" disabled><strong>' + floor + '</strong><span>' + genre +
        '</span><span class="l26-live-score"><span data-live-share hidden></span>' +
        '<span data-live-count="' + floor + '" hidden></span></span></button></article>').join('') + '</div>' +
      '<div class="l26-live-split" data-live-split hidden aria-hidden="true"><span></span><span></span></div>' +
      '<p class="muted" data-live-empty hidden>' + t('emptyVote') + '</p><p role="status" class="muted" data-live-status>' + t('loading') +
      '</p><a data-live-sign-in href="' + loginLink() + '" hidden>' + L.esc(L.t('core.login')) + '</a>' +
      '<p class="muted" data-live-connection hidden></p></section>' +
      '<nav aria-labelledby="l26-live-visit"><h2 id="l26-live-visit">' + t('visit') + '</h2><div class="l26-live-links">' +
      [['tonight', 'tonight'], ['lineup', 'schedule'], ['djs', 'djs'], ...(L.open('sales') ? [['table', 'table']] : [])].map(([path, key]) =>
        '<a class="btn" href="#/' + path + '">' + t(key) + L.icon('chevron', { size: 16 }) + '</a>').join('') + '</div></nav>';

    const djFeedback = L.mountDjFeedback(root.querySelector('[data-live-dj-feedback]'), 'live');
    const vote = root.querySelector('[data-live-vote]');
    const status = root.querySelector('[data-live-status]');
    const connection = root.querySelector('[data-live-connection]');
    const signIn = root.querySelector('[data-live-sign-in]');
    const split = vote.querySelector('[data-live-split]');
    const empty = vote.querySelector('[data-live-empty]');
    const venue = root.querySelector('[data-live-venue]');
    const hours = root.querySelector('[data-live-hours]');
    const controls = floors.map(([floor]) => ({
      floor,
      button: vote.querySelector('[data-live-ballot="' + floor + '"]'),
      count: vote.querySelector('[data-live-count="' + floor + '"]'),
      share: vote.querySelector('[data-l26-floor="' + floor + '"] [data-live-share]')
    }));
    let timer, round, failures = 0, revision = 0, stopped = false, sending = false, hint, readPending = false;
    let showPending = false, showKey, showTimer, entry, refreshQueued = false;
    let sessions = [], sessionRequest, scheduleData;
    root.addEventListener('error', event => {
      if (event.target.matches('.l26-live-lineup img')) event.target.remove();
    }, true);
    const active = () => !stopped && root.isConnected;
    const expiryDelay = () => round?.closes_at - round?.updated_at - (performance.now() - round?.receivedAt);
    const currentRetry = () => retryVote?.day === round?.biz_day && retryVote?.member === L.me?.id ? retryVote : null;

    function paint() {
      const expired = round?.status === 'open' && expiryDelay() <= 0;
      const voteStatus = expired ? 'closed' : round?.vote_status;
      const retry = currentRetry();
      const total = round ? round.counts['2F'] + round.counts['3F'] : 0;
      split.hidden = total === 0;
      empty.hidden = !round || total > 0;
      for (const { floor, button, count, share } of controls) {
        button.disabled = voteStatus !== 'ready' || sending || failures > 0 || Boolean(retry && retry.floor !== floor);
        count.hidden = !round;
        count.textContent = round ? countLabel(round.counts[floor]) : '';
        share.hidden = total === 0;
        share.textContent = total ? shareLabel(round.counts[floor] / total) : '';
      }
      if (total) split.style.setProperty('--l26-vote-split', (round.counts['2F'] / total) * 100 + '%');
      const message = sending ? t('sending') : hint ? t(hint) :
        round?.status === 'final' ? t('final', { day: round.biz_day }) :
        expired ? t('finalizing') : voteStatus && text[voteStatus] ? t(voteStatus) : t('loading');
      if (status.textContent !== message) status.textContent = message;
      signIn.hidden = voteStatus !== 'sign_in';
      connection.hidden = failures === 0;
      connection.textContent = failures ? round ? t('stale', { time: clockLabel(round.updated_at) }) : t('offline') : '';
    }

    function absorb(result) {
      if (result?.ok !== true || !Number.isSafeInteger(result.updated_at) || !Number.isSafeInteger(result.closes_at) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(result.biz_day) ||
          !floors.every(([floor]) => Number.isSafeInteger(result.counts?.[floor]) && result.counts[floor] >= 0)) return false;
      if (round && round.biz_day > result.biz_day) return false;
      if (round?.biz_day !== result.biz_day || result.status === 'final') hint = undefined;
      round = { ...result, receivedAt: performance.now() };
      failures = 0;
      if (round.vote_status === 'voted') {
        retryVote = null;
        hint = undefined;
      }
      return true;
    }

    function schedule(delay) {
      clearTimeout(timer);
      if (!active() || vote.hidden || document.hidden) return;
      const untilClose = round?.status === 'open' ? expiryDelay() : 0;
      // Disarm the ballot at 07:00 even if the next refresh is still backing off.
      if (untilClose > 0 && untilClose < delay) {
        timer = setTimeout(() => { paint(); schedule(delay - untilClose); }, Math.ceil(untilClose));
      } else {
        timer = setTimeout(refresh, delay);
      }
    }

    async function refresh() {
      if (!active() || vote.hidden || document.hidden || sending) return;
      if (readPending) { refreshQueued = true; return; }
      refreshQueued = false;
      clearTimeout(timer);
      readPending = true;
      const observedRevision = revision;
      const started = performance.now();
      const result = await request('l26_floor');
      readPending = false;
      if (!active()) return;
      if (observedRevision !== revision) { schedule(pollMs); return; }
      if (result.error === 'closed') {
        vote.hidden = true;
        return;
      }
      if (!absorb(result)) failures++;
      paint();
      if (refreshQueued) { refresh(); return; }
      schedule(failures ? Math.min(60_000, pollMs * 2 ** (failures - 1)) : Math.max(0, pollMs - (performance.now() - started)));
    }

    async function cast(floor) {
      if (sending || failures || round?.vote_status !== 'ready' || expiryDelay() <= 0) return;
      const retry = currentRetry();
      if (retry && retry.floor !== floor) return;
      retryVote = retry || { day: round.biz_day, member: L.me?.id, floor, id: crypto.randomUUID() };
      const attempted = retryVote;
      revision++;
      sending = true;
      hint = undefined;
      clearTimeout(timer);
      paint();
      const result = await request('l26_floor_vote', { floor, request_id: attempted.id });
      if (!active()) {
        if (result.ok && retryVote === attempted) retryVote = null;
        return;
      }
      sending = false;
      if (result.error === 'preview') { L.toast(L.t('core.previewReadOnly')); return; }
      if (result.error === 'closed') { vote.hidden = true; return; }
      if (absorb(result)) {
        paint();
        schedule(pollMs);
        return;
      }

      if (['voting_closed', 'already_voted', 'entry_required', 'auth', 'suspended', 'banned'].includes(result.error)) {
        const messages = {
          voting_closed: 'closed', already_voted: 'voted', entry_required: 'entry_required',
          auth: 'sign_in', suspended: 'ineligible', banned: 'ineligible'
        };
        round.vote_status = messages[result.error];
        retryVote = null;
        paint();
        refresh();
        return;
      }
      if (result.error === 'network' || result.error === 'server') {
        failures = Math.max(failures, 1);
        hint = 'retry';
      } else {
        retryVote = null;
        hint = 'voteError';
      }
      paint();
      schedule(pollMs);
    }

    async function loadShow() {
      if (document.hidden || showPending) return;
      showPending = true;
      void djFeedback.refresh();
      const data = await request('tonight');
      showPending = false;
      if (!active()) return;
      root.querySelector('[data-live-show-stale]').hidden = !(data.stale || (data.error && showKey));
      if (data.error && showKey) {
        venue.dataset.liveVenue = 'unknown';
        venue.textContent = t('showUnknown');
        root.querySelectorAll('.l26-live-slots [data-live-current]').forEach(item => { item.hidden = true; });
        return;
      }
      const { state, openingTime } = venueState(data, hasTimestamp(data.server_now) ? data.server_now : Date.now());
      venue.dataset.liveVenue = state;
      venue.textContent = t(state === 'unknown' ? 'showUnknown' : state, { time: openingTime });
      hours.hidden = typeof data.hours !== 'string' || !data.hours;
      hours.textContent = hours.hidden ? '' : t('venueHours') + ' ' + data.hours + ' KST';
      scheduleData = { data, state };
      paintSchedule();
      if (!data.error && data.timetable?.length && !sessionRequest) {
        sessionRequest = fetch('/data/videos.json').then(response => response.ok ? response.json() : [])
          .then(videos => {
            if (!active() || !Array.isArray(videos)) return;
            sessions = videos;
            paintSchedule();
          }).catch(() => { sessionRequest = null; });
      }
    }

    function paintSchedule() {
      const { data, state } = scheduleData;
      const markup = floors.map(([floor]) => data.error ? L.l26Empty(t('showError'), 'layers', true) :
        floorSchedule(floor, data, state, sessions));
      const key = markup.join('');
      if (showKey === key) {
        if (venue.dataset.liveVenue === 'open') {
          root.querySelectorAll('[data-live-current][hidden]').forEach(item => { item.hidden = false; });
        }
        return;
      }
      if (!data.error) showKey = key;
      for (const [index, [floor]] of floors.entries()) {
        const slot = root.querySelector('[data-live-dj="' + floor + '"]');
        const wasOpen = slot.querySelector('details')?.open;
        slot.innerHTML = markup[index];
        const details = slot.querySelector('details');
        if (details && wasOpen) details.open = true;
      }
      if (venue.dataset.liveVenue !== 'open') {
        root.querySelectorAll('[data-live-current]').forEach(item => { item.hidden = true; });
      }
    }

    function visible() {
      if (document.hidden) clearTimeout(timer);
      else { loadShow(); refresh(); if (!entry) mountEntry(); }
    }
    function offline() {
      if (vote.hidden) return;
      failures = Math.max(1, failures);
      paint();
    }
    async function mountEntry() {
      if (!L.open('l26_entry')) return;
      try {
        await L.loadEntryQr();
      } catch {
        return;
      }
      if (active() && L.open('l26_entry') && !entry) {
        entry = L.mountEntryQr(root.querySelector('[data-live-entry]'), {
          loginHref: loginLink(),
          onVerified: refresh
        });
      }
    }
    function scheduleShow() {
      showTimer = setTimeout(() => { loadShow(); scheduleShow(); }, 60_000 - Date.now() % 60_000);
    }
    mountEntry();
    scheduleShow();
    controller = {
      refresh() { loadShow(); refresh(); if (entry) entry.refresh(); else mountEntry(); },
      leave() {
        stopped = true;
        clearTimeout(timer);
        clearTimeout(showTimer);
        entry?.destroy();
        djFeedback.destroy();
        document.removeEventListener('visibilitychange', visible);
        window.removeEventListener('online', visible);
        window.removeEventListener('offline', offline);
      }
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    window.addEventListener('offline', offline);
    loadShow();
    if (!L.open('l26_floor')) return;
    mountHype(root, active);
    vote.hidden = false;
    for (const { floor, button } of controls) button.onclick = () => cast(floor);
    refresh();
  }

  // 🔥 DJ 하입 (2026-11-28): 영업 중 층마다 🔥 버튼. 누른 만큼 바로 올리고 1.2초마다 모아서 보냄(서버가 1분 30번·하룻밤 600번까지만 셈)
  function mountHype(root, active) {
    const boxes = Object.fromEntries(floors.map(([floor]) => [floor, root.querySelector('[data-live-hype="' + floor + '"]')]).filter(([, box]) => box));
    const pending = { '2F': 0, '3F': 0 };
    let data = null, poll, flushTimer, sending = false, note = { '2F': '', '3F': '' };
    const fmt = n => Number(n || 0).toLocaleString();
    const live = () => active() && document.contains(root);
    function paint() {
      const status = data?.hype_status;
      for (const [floor, box] of Object.entries(boxes)) {
        if (!data || !data.ok || status === 'closed') { box.hidden = true; continue; }
        const total = (data.counts?.[floor] || 0) + pending[floor];
        const can = status === 'ready';
        const msg = note[floor] || (status === 'sign_in' ? t('hypeSignIn') : status === 'entry_required' ? t('hypeEntry') :
          status === 'staff' ? t('hypeStaff') : '');
        const key = [status, total, msg].join('|');
        if (box.dataset.key === key) continue;
        box.dataset.key = key;
        const button = box.querySelector('button');
        if (button && box.dataset.can === String(can)) {
          box.querySelector('[data-hype-n]').textContent = t('hypeCount', { n: fmt(total) });
          box.querySelector('[data-hype-msg]').textContent = msg;
          box.querySelector('[data-hype-msg]').hidden = !msg;
        } else {
          box.dataset.can = String(can);
          box.innerHTML = '<button type="button" class="l26-hype-btn" data-hype="' + floor + '"' + (can ? '' : ' disabled') +
            ' aria-label="' + L.esc(t('hypeAria', { floor })) + '"><span aria-hidden="true">🔥</span><b>' + t('hype') + '</b></button>' +
            '<p class="l26-hype-n" data-hype-n aria-live="polite">' + L.esc(t('hypeCount', { n: fmt(total) })) + '</p>' +
            '<p class="muted l26-hype-msg" data-hype-msg' + (msg ? '' : ' hidden') + '>' + L.esc(msg) + '</p>' +
            (status === 'sign_in' ? '<a class="l26-hype-link" href="#/login">' + L.esc(L.t('core.login')) + '</a>' : '');
          const b = box.querySelector('button');
          if (can) b.onclick = event => tap(floor, b, event);
        }
        box.hidden = false;
      }
    }
    function burst(button) {
      const fire = document.createElement('span');
      fire.className = 'l26-hype-fire';
      fire.textContent = '🔥';
      fire.style.setProperty('--dx', (Math.random() * 60 - 30).toFixed(0) + 'px');
      button.append(fire);
      setTimeout(() => fire.remove(), 900);
      button.classList.remove('is-pop'); void button.offsetWidth; button.classList.add('is-pop');
    }
    function tap(floor, button) {
      if (data?.hype_status !== 'ready') return;
      pending[floor]++;
      note[floor] = '';
      try { navigator.vibrate?.(8); } catch (e) {}
      burst(button);
      paint();
      clearTimeout(flushTimer);
      flushTimer = setTimeout(flush, 1200);
    }
    async function flush() {
      if (sending || !live()) return;
      const floor = Object.keys(boxes).find(f => pending[f] > 0);
      if (!floor) return;
      const n = Math.min(pending[floor], data?.limit?.minute || 30);
      sending = true;
      const result = await request('l26_hype_tap', { floor, n });
      sending = false;
      pending[floor] -= n;
      if (result?.ok) {
        data = result;
        if (result.capped) {
          pending[floor] = 0;
          note[floor] = (result.mine?.[floor] || 0) + (result.mine?.[floor === '2F' ? '3F' : '2F'] || 0) >= (result.limit?.night || 600)
            ? t('hypeNight') : t('hypeCap', { n: result.limit?.minute || 30 });
        }
      } else if (result?.error && result.error !== 'network') {
        pending[floor] = 0;
        load();
      }
      paint();
      if (pending['2F'] || pending['3F']) flushTimer = setTimeout(flush, 1200);
    }
    async function load() {
      if (!live()) { clearInterval(poll); return; }
      if (document.hidden || sending) return;
      const result = await request('l26_hype');
      if (result?.ok) { data = result; paint(); }
      else if (result?.error === 'closed') { data = null; paint(); }
    }
    load();
    poll = setInterval(load, 7000);
    root.addEventListener('l26:leave', () => clearInterval(poll), { once: true });
  }

  // DJ 프로필에서도 같은 HYPE 버튼 (2026-11-28): root 안의 [data-live-hype="층"] 칸에 붙임
  L.mountHype = root => { if (!L.open('l26_floor')) return false; loadStyles(); mountHype(root, () => root.isConnected); return true; };
  L.hypeNotNow = () => t('hypeNotNow');

  L.screen('l26_live', {
    title: 'nav.l26_live',
    render,
    refresh() { controller?.refresh(); },
    leave() { controller?.leave(); controller = null; }
  });
})(window.Lounge);
