(function (L) {
  const floors = [['2F', 'HIPHOP'], ['3F', 'EDM']];
  const pollMs = 5000;
  const timeZone = 'Asia/Seoul';
  const text = {
    dj: ['현재 DJ', 'Current DJ', '出演中のDJ', '当前 DJ'],
    next: ['다음 DJ', 'Up next', '次のDJ', '下一位 DJ'],
    open: ['영업 중', 'Open now', '営業中', '营业中'],
    notOpen: ['영업시간 외', 'Venue closed', '営業時間外', '非营业时间'],
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
  const countLabel = value => new Intl.NumberFormat(L.lang).format(value);
  const shareLabel = value => new Intl.NumberFormat(L.lang, { style: 'percent', maximumFractionDigits: 1 }).format(value);
  const loginLink = () => '#/login?next=' + encodeURIComponent('#/l26_live');

  let controller, entryScript, retryVote;
  function loadStyles() {
    if (document.querySelector('link[href="/lounge/css/l26-live.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/lounge/css/l26-live.css';
    link.onerror = () => link.remove();
    document.head.append(link);
  }

  function loadEntry() {
    if (L.mountEntryQr) return Promise.resolve();
    entryScript ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/lounge/l26-entry-qr.js';
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(new Error('entry')); };
      document.head.append(script);
    }).catch(error => { entryScript = null; throw error; });
    return entryScript;
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

  function floorSchedule(floor, data) {
    const info = data.floors?.[floor] || {};
    const slots = (data.timetable || []).filter(slot => slot.floor === floor);
    const nextIndex = slots.findIndex(slot => slot.at === info.nextAt && slot.dj === info.next);
    const previous = slots[nextIndex - 1];
    const matching = slots.filter(slot => slot.dj === info.now);
    const currentTime = previous && previous.dj === info.now ? previous.at : matching.length === 1 ? matching[0].at : '';
    const live = data.open === true && !data.stale;
    const next = info.next ? { dj: info.next, at: info.nextAt } : data.open === false ? slots[0] : null;
    const time = at => at ? '<time>' + L.esc(at) + '</time>' : '';
    return '<dl class="l26-live-slots">' + (live ? '<div data-live-current><dt>' + t('dj') + '</dt><dd><strong class="l26-live-dj">' +
      L.esc(info.now || t('noDj')) + '</strong>' + time(info.now && currentTime) + '</dd></div>' : '') +
      '<div><dt>' + t('next') + '</dt><dd><strong>' + L.esc(next?.dj || t('noDj')) + '</strong>' +
      time(next?.at) + '</dd></div></dl><details><summary>' + t('schedule') + L.icon('down', { size: 16 }) + '</summary>' +
      (slots.length ? '<ul>' + slots.map(slot => '<li>' + L.esc([slot.at, slot.dj].filter(Boolean).join(' · ')) + '</li>').join('') +
        '</ul>' : '<p class="muted">' + t('noSchedule') + '</p>') + '</details>';
  }

  function render(root) {
    loadStyles();
    root.className = 'l26-screen l26-live';
    root.innerHTML = '<section aria-labelledby="l26-live-dj"><header class="l26-live-head"><h1 id="l26-live-dj">' +
      L.esc(L.t('nav.l26_live')) + '</h1><div class="l26-live-venue"><p data-live-venue>' + t('loading') +
      '</p><p data-live-hours hidden></p></div></header>' +
      '<div class="l26-live-grid">' + floors.map(([floor, genre]) =>
        '<article class="l26-live-card" data-l26-floor="' + floor + '"><div class="l26-live-cover"><h2><strong>' + floor +
        '</strong><span>' + genre + '</span></h2></div><div data-live-dj="' + floor + '">' + t('loading') + '</div></article>').join('') +
      '</div><p class="muted" data-live-show-stale hidden>' + t('showStale') + '</p></section>' +
      '<section data-live-entry hidden></section>' +
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
    let showPending = false, showKey, entry, refreshQueued = false;
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
      const state = data.stale ? 'unknown' : data.open === true ? 'open' : data.open === false ? 'notOpen' : 'unknown';
      venue.dataset.liveVenue = state;
      venue.textContent = t(state === 'unknown' ? 'showUnknown' : state);
      hours.hidden = typeof data.hours !== 'string' || !data.hours;
      hours.textContent = hours.hidden ? '' : t('venueHours') + ' ' + data.hours + ' KST';
      const markup = floors.map(([floor]) => data.error ? '<p class="muted">' + t('showError') + '</p>' : floorSchedule(floor, data));
      const key = markup.join('');
      if (showKey === key) {
        root.querySelectorAll('[data-live-current][hidden]').forEach(item => { item.hidden = false; });
        return;
      }
      if (!data.error) showKey = key;
      for (const [index, [floor]] of floors.entries()) {
        const slot = root.querySelector('[data-live-dj="' + floor + '"]');
        const wasOpen = slot.querySelector('details')?.open;
        slot.innerHTML = markup[index];
        if (wasOpen && !data.error) slot.querySelector('details').open = true;
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
        await loadEntry();
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
    mountEntry();
    const showTimer = setInterval(loadShow, 60_000);
    controller = {
      refresh() { loadShow(); refresh(); if (entry) entry.refresh(); else mountEntry(); },
      leave() {
        stopped = true;
        clearTimeout(timer);
        clearInterval(showTimer);
        entry?.destroy();
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
    vote.hidden = false;
    for (const { floor, button } of controls) button.onclick = () => cast(floor);
    refresh();
  }

  L.screen('l26_live', {
    title: 'nav.l26_live',
    render,
    refresh() { controller?.refresh(); },
    leave() { controller?.leave(); controller = null; }
  });
})(window.Lounge);
