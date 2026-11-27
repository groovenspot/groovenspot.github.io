(function (L) {
  const floors = [['2F', 'HIPHOP'], ['3F', 'EDM']];
  const pollMs = 5000;
  const timeZone = 'Asia/Seoul';
  const text = {
    dj: ['현재 DJ', 'Current DJs', '出演中のDJ', '当前 DJ'],
    next: ['다음 DJ', 'Up next', '次のDJ', '下一位 DJ'],
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
    return '<p class="l26-live-dj">' + L.esc(info.now || t('noDj')) + '</p>' +
      (info.next ? '<p class="muted">' + t('next') + ' · ' + L.esc([info.nextAt, info.next].filter(Boolean).join(' · ')) + '</p>' : '') +
      '<details><summary>' + t('schedule') + '</summary>' +
      (slots.length ? '<ul>' + slots.map(slot => '<li>' + L.esc([slot.at, slot.dj].filter(Boolean).join(' · ')) + '</li>').join('') +
        '</ul>' : '<p class="muted">' + t('noSchedule') + '</p>') + '</details>';
  }

  function render(root) {
    loadStyles();
    root.className = 'l26-screen l26-live';
    root.innerHTML = '<h1>' + L.esc(L.t('nav.l26_live')) + '</h1>' +
      '<section aria-labelledby="l26-live-dj"><h2 id="l26-live-dj">' + t('dj') + '</h2>' +
      '<div class="l26-live-grid">' + floors.map(([floor, genre]) =>
        '<article class="l26-live-card" data-l26-floor="' + floor + '"><h3>' + floor + ' <span>' + genre +
        '</span></h3><div data-live-dj="' + floor + '">' + t('loading') + '</div></article>').join('') +
      '</div><p class="muted" data-live-show-stale hidden>' + t('showStale') + '</p><nav class="l26-live-links"><a href="#/tonight">' + t('tonight') + '</a><a href="#/lineup">' +
      t('schedule') + '</a><a href="#/djs">' + t('djs') + '</a>' +
      (L.open('sales') ? '<a href="#/table">' + t('table') + '</a>' : '') + '</nav></section>' +
      '<section data-live-entry hidden></section><section data-live-dj-feedback hidden></section>' +
      '<section data-live-vote hidden aria-labelledby="l26-live-vote"><h2 id="l26-live-vote">' + t('vote') + '</h2>' +
      '<p class="muted">' + t('hours') + '</p><div class="l26-live-grid">' +
      floors.map(([floor, genre]) => '<article class="l26-live-choice" data-l26-floor="' + floor +
        '"><button type="button" class="l26-live-card" data-live-ballot="' + floor + '" disabled>' + floor + ' ' + genre +
        '</button><p data-live-count="' + floor + '" aria-label="' + floor + ' ' + t('vote') + '" hidden></p></article>').join('') +
      '</div><p role="status" class="muted" data-live-status>' + t('loading') +
      '</p><a data-live-sign-in href="' + loginLink() + '" hidden>' + L.esc(L.t('core.login')) + '</a>' +
      '<p class="muted" data-live-connection hidden></p></section>';

    const djFeedback = L.mountDjFeedback(root.querySelector('[data-live-dj-feedback]'), 'live');
    const vote = root.querySelector('[data-live-vote]');
    const status = root.querySelector('[data-live-status]');
    const connection = root.querySelector('[data-live-connection]');
    const signIn = root.querySelector('[data-live-sign-in]');
    const controls = floors.map(([floor]) => ({
      floor,
      button: vote.querySelector('[data-live-ballot="' + floor + '"]'),
      count: vote.querySelector('[data-live-count="' + floor + '"]')
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
      for (const { floor, button, count } of controls) {
        button.disabled = voteStatus !== 'ready' || sending || failures > 0 || Boolean(retry && retry.floor !== floor);
        count.hidden = !round;
        count.textContent = round ? countLabel(round.counts[floor]) : '';
      }
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
      if (data.error && showKey) return;
      const markup = floors.map(([floor]) => data.error ? '<p class="muted">' + t('showError') + '</p>' : floorSchedule(floor, data));
      const key = markup.join('');
      if (showKey === key) return;
      if (!data.error) showKey = key;
      for (const [index, [floor]] of floors.entries()) {
        const slot = root.querySelector('[data-live-dj="' + floor + '"]');
        const wasOpen = slot.querySelector('details')?.open;
        slot.innerHTML = markup[index];
        if (wasOpen) slot.querySelector('details').open = true;
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
