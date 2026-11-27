(function (L) {
  const words = {
    mission: ['오늘의 미션', 'Today’s mission', '今日のミッション', '今日任务'],
    points: ['내 포인트', 'My points', 'マイポイント', '我的积分'],
    attendance: ['오늘 출석', 'Today’s check-in', '今日の出席', '今日签到'],
    guess: ['DJ 맞히기', 'Guess the DJ', 'DJ当てクイズ', '猜猜 DJ'],
    legacy: ['기존 출석판·올클', 'Classic attendance and all-clear', 'これまでの出席・全クリア', '原版签到和全通关'],
    done: ['완료', 'Done', '完了', '已完成'],
    attendancePending: ['미완료', 'Pending', '未完了', '未完成'],
    attendanceDone: ['출석 완료', 'Checked in', '出席済み', '已签到'],
    ready: ['진행 가능', 'Ready', '参加できます', '可以开始'],
    login: ['로그인', 'Log in', 'ログイン', '登录'],
    guest: ['미션 진행과 포인트 확인은 회원 로그인 후 이용할 수 있어요.', 'Log in to track your mission and see your points.', 'ログインすると進捗とポイントを確認できます。', '登录后可查看任务进度和积分。'],
    retry: ['다시 시도', 'Try again', '再試行', '重试'],
    loading: ['미션을 불러오는 중', 'Loading your mission', 'ミッションを読み込み中', '正在加载任务'],
    error: ['다시 불러와 주세요.', 'Please try again.', 'もう一度お試しください。', '请重试。'],
    refresh: ['인증 상태 확인', 'Check entry status', '入場状況を確認', '查看入场状态'],
    attend: ['출석하기', 'Check in', '出席する', '签到'],
    like: ['앨범 좋아요', 'Like this album', 'アルバムにいいね', '点赞相册'],
    go: ['갈래요 남기기', 'Mark as going', '行く予定を登録', '标记想去'],
    live: ['LIVE 보기', 'Open LIVE', 'ライブを見る', '查看现场'],
    entry: ['입장 인증하기', 'Verify your entry', '入場を認証', '验证入场'],
    entryHelp: ['입구에서 경호팀에게 입장 인증을 요청해 주세요.', 'Ask security at the door to verify your entry.', '入口で警備スタッフに入場認証を依頼してください。', '请在入口请安保人员验证入场。'],
    floor_vote: ['지금 가장 신나는 층은?', 'Which floor is your favorite right now?', '今いちばん盛り上がっているフロアは？', '现在哪一层最热闹？'],
    last_night: ['어젯밤 사진 돌아보기', 'Revisit last night’s photos', '昨夜の写真を振り返る', '回顾昨晚的照片'],
    album: ['앨범 보기', 'Open album', 'アルバムを見る', '查看相册'],
    cup: ['DJ 월드컵 한 판', 'Play a round of DJ World Cup', 'DJワールドカップをプレイ', '玩一轮 DJ 世界杯'],
    dj_content: ['마음에 드는 DJ 영상에 반응 남기기', 'React to a DJ clip you like', 'お気に入りのDJ動画にリアクション', '给喜欢的 DJ 短片留下反馈'],
    going: ['오늘 밤 갈래요?', 'Going tonight?', '今夜行く予定は？', '今晚想来吗？'],
    dj_follow: ['DJ 팔로우하기', 'Follow a DJ', 'DJをフォロー', '关注 DJ'],
    plan_dj: ['다음 방문을 위해 DJ 팔로우하기', 'Follow a DJ for your next visit', '次の来店に向けてDJをフォロー', '为下次到访关注一位 DJ'],
    dj: ['DJ 프로필 보기', 'View DJ profile', 'DJプロフィールを見る', '查看 DJ 资料'],
    survey: ['지난밤 평가하기', 'Rate last night', '昨夜を評価する', '评价昨晚'],
    radio: ['라디오 듣기', 'Listen to the radio', 'ラジオを聴く', '收听电台']
  };

  L.i18n(Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((lang, index) => [
    lang, Object.fromEntries(Object.entries(words).map(([key, variants]) => ['l26play.' + key, variants[index]]))
  ])));

  const label = key => L.esc(L.t('l26play.' + key));
  const translated = key => L.esc(L.t(key));
  // Published GROOVE SESSIONS clips from /data/videos.json.
  const tiles = {
    cup: ['vote.cup', 'whM3ZZUnSVE'],
    guess: ['l26play.guess'],
    radio: ['radio.title', 'eY3RZgw7fvE'],
    vote: ['vote.title'],
    attend: ['l26play.attend'],
    shorts: ['shorts.title'],
    challenge: ['challenge.title'],
    rank: ['rank.title'],
    rewards: ['rewards.title'],
    shop: ['shop.title'],
    partners: ['pt.title'],
    djs: ['dj.list']
  };
  const artwork = {
    cup: '<path d="M59 13h42v23a21 21 0 0 1-42 0zm0 7H43v6a20 20 0 0 0 18 20m40-26h16v6a20 20 0 0 1-18 20M80 57v11m-19 0h38M22 22v12m-6-6h12m110 18v14m-7-7h14"/>',
    radio: '<rect x="36" y="25" width="88" height="44" rx="8"/><path d="m47 25 67-16M47 39h32m-32 8h32m-32 8h32"/><circle cx="103" cy="47" r="11"/><path d="M17 34v16m126-16v16"/>',
    guess: '<path d="M48 47V32a32 32 0 0 1 64 0v15M48 42h9v22H45a5 5 0 0 1-5-5V47a5 5 0 0 1 5-5zm64 0h-9v22h12a5 5 0 0 0 5-5V47a5 5 0 0 0-5-5z"/><path d="M70 32a10 10 0 1 1 15 9c-4 3-5 5-5 9m0 8v1M23 23v16m-8-8h16m103 19 9-9m-9 19h13"/>',
    vote: '<path d="M47 36h66l13 17v17H34V53l13-17zm-13 17h92M58 53h44"/><path d="M63 6h34v40H63z" fill="var(--l26-play-ink)"/><path d="m72 25 6 6 11-13M17 39h8m111-14 7-7m-4 25h10"/>',
    attend: '<rect x="44" y="15" width="72" height="52" rx="7"/><path d="M44 29h72M61 9v13m38-13v13M62 42h9m-9 11h9m11-11h9m-9 11h9"/><circle cx="108" cy="56" r="17" fill="var(--l26-play-ink)"/><path d="m100 56 5 5 10-11M23 49v12m-6-6h12m107-39h11m-5.5-5.5v11"/>',
    shorts: '<rect x="55" y="6" width="50" height="66" rx="8"/><path d="m75 29 16 10-16 10zM73 62h14M34 25v31m-11-23v15m103-16v22m10-31v37"/>',
    challenge: '<path d="M43 28h14l7-12h32l7 12h14a7 7 0 0 1 7 7v28a7 7 0 0 1-7 7H43a7 7 0 0 1-7-7V35a7 7 0 0 1 7-7z"/><circle cx="80" cy="48" r="15"/><path d="M80 41v14m-7-7h14m24-11h4M24 12v12m-6-6h12m109 24v16m-8-8h16"/>',
    rank: '<path d="M27 69V46h33v23m0 0V31h40v38m0 0V51h33v18M20 69h120m-60-64 4 8 9 1-6 6 1 9-8-4-8 4 1-9-6-6 9-1zM42 27v10m-5-5h10m70 2h12"/>',
    rewards: '<path d="M38 32h84v14H38zm8 14v24h68V46M80 32v38M80 32c-16 0-31-2-29-13 2-13 23-4 29 13zm0 0c16 0 31-2 29-13-2-13-23-4-29 13zM19 42v14m-7-7h14m115 1 8 8m0-8-8 8"/>',
    shop: '<path d="M47 26h66l7 43H40zM66 29V17a14 14 0 0 1 28 0v12m-6 13 8 8-15 15-9-9 15-14z"/><path d="M86 47h1M24 31v16m-8-8h16m105 12h9m-4.5-4.5v9"/>',
    partners: '<path d="M38 30h84l-6-16H44zm0 0v8a10 10 0 0 0 21 0 10 10 0 0 0 21 0 10 10 0 0 0 21 0 10 10 0 0 0 21 0v-8M44 46v24h72V46M70 70V54h20v16M22 22v12m-6-6h12m110 18v14m-7-7h14"/>',
    djs: '<rect x="26" y="20" width="108" height="48" rx="6"/><circle cx="55" cy="44" r="15"/><circle cx="105" cy="44" r="15"/><path d="M55 44h1m49 0h1M80 28v32m-5-22h10m-10 13h10M20 11h16m88 0h16"/>'
  };
  const missionLinks = {
    cup: ['cup', 'vote.cup'], dj_content: ['shorts', 'shorts.title'],
    survey: ['vote', 'l26play.survey'], radio: ['radio', 'radio.title']
  };
  const missionHeading = (state = '') => '<header class="l26-play-mission-meta"><h2 id="l26-mission-title">' +
    label('mission') + '</h2>' + state + '</header>';

  function stylesheet() {
    if (document.getElementById('l26-play-css')) return;
    const link = document.createElement('link');
    link.id = 'l26-play-css';
    link.rel = 'stylesheet';
    link.href = '/lounge/css/l26-play.css';
    document.head.append(link);
  }

  function legacy() {
    // Core already preserves the original hash with the shell switch off.
    // With the shell on, replace this disabled route with its existing screen.
    history.replaceState(history.state, '', '#/play');
    return L.route();
  }

  function link(path, key, primary = false) {
    return '<a class="btn' + (primary ? ' btn-hot' : '') + '" href="#/' + path + '">' + translated(key) + '</a>';
  }

  function button(action, text, classes = '') {
    return '<button type="button" class="btn ' + classes + '" data-l26-action="' + action + '">' + label(text) + '</button>';
  }

  function activity(key, enabled, attended) {
    const [title, video] = tiles[key];
    const attendance = key === 'attend';
    const done = attendance && attended;
    const attrs = ' class="l26-play-tile" data-play-activity="' + key + '"';
    const content = '<span class="l26-play-tile-art" aria-hidden="true">' +
      '<svg class="l26-play-illustration" viewBox="0 0 160 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
      artwork[key] + '</svg>' + (video ? '<img class="l26-play-thumb" alt="" loading="lazy" src="https://i.ytimg.com/vi/' + video + '/hqdefault.jpg">' : '') +
      (video || !enabled ? '<span class="l26-play-tile-icon">' + L.icon(enabled ? 'play' : 'lock', { size: 20 }) + '</span>' : '') + '</span><span class="l26-play-tile-name"><span>' +
      (done ? label('attendanceDone') : translated(title)) +
      (enabled ? '' : '<small>' + translated('core.soon') + '</small>') + '</span>' +
      (enabled && !done ? L.icon('chevron', { size: 16 }) : '') + '</span>';
    if (!enabled) return '<div' + attrs + ' aria-disabled="true">' + content + '</div>';
    if (attendance) return '<button type="button" data-l26-action="attend"' + attrs + (done ? ' disabled' : '') + '>' + content + '</button>';
    return '<a href="#/' + key + '"' + attrs + '>' + content + '</a>';
  }

  function missionControls(mission, member) {
    const { key, id, done } = mission;
    if (key === 'entry') return done ? '' : '<p>' + label('entryHelp') + '</p>' + button('refresh', 'refresh');

    if (key === 'floor_vote') {
      return (mission.vote_status !== 'ready' ? '' : ['2F', '3F'].map(floor =>
        '<button type="button" class="btn" data-l26-action="floor_vote" data-l26-floor="' + floor + '">' + floor + '</button>').join('')) +
        link('l26_live', 'l26play.live');
    }

    if (key === 'last_night') {
      return link('photos/' + encodeURIComponent(id), 'l26play.album', true) +
        (done || !member ? '' : button('like', 'like'));
    }
    if (key === 'dj_follow' || key === 'plan_dj') {
      return link('dj/' + encodeURIComponent(id), 'l26play.dj', true);
    }
    if (key === 'going') {
      return done ? link('tonight', 'nav.tonight') : button('going', 'go', 'btn-hot');
    }

    const primary = missionLinks[key];
    return primary ? link(...primary, !done) : '';
  }

  let dispose;
  function render(root) {
    if (!L.open('l26_play')) return legacy();
    stylesheet();

    root.className = 'l26-screen l26-play';
    root.innerHTML = '<header class="l26-play-head"><h1>' + translated('nav.l26_play') +
      '</h1></header><div class="l26-play-member" hidden>' +
      '<a class="l26-play-points" data-l26-points href="#/me" hidden></a><div class="l26-play-attendance" hidden></div></div>' +
      '<section class="l26-play-mission" aria-labelledby="l26-mission-title"><div class="l26-play-mission-art" aria-hidden="true">' +
      '<svg viewBox="0 0 360 142" fill="none"><g stroke="currentColor" opacity=".45">' +
      '<circle cx="180" cy="71" r="64"/><circle cx="180" cy="71" r="86" stroke-dasharray="2 5"/>' +
      '<path d="M0 71h103m154 0h103M180 0v16m0 110v16M50 48v46m10-35v24m240-35v46m10-35v24"/></g>' +
      '<g transform="rotate(-12 180 71)"><path d="M118 42h124v16a13 13 0 0 0 0 26v16H118V84a13 13 0 0 0 0-26Z" ' +
      'fill="currentColor" stroke="currentColor" stroke-width="3"/><path d="M214 45v52" stroke="var(--l26-play-ink)" stroke-dasharray="3 4"/>' +
      '<path d="M166 55l3.5 10.5L180 69l-10.5 3.5L166 83l-3.5-10.5L152 69l10.5-3.5L166 55Z" fill="var(--l26-play-ink)"/>' +
      '<path d="M189 57v12m-6-6h12m-11 16v8m-4-4h8" stroke="var(--l26-play-ink)" stroke-width="2"/></g></svg></div>' +
      '<div class="l26-play-mission-copy" data-l26-mission aria-busy="true">' + missionHeading() +
      L.l26Skeleton(label('loading'), true) + '</div></section><p class="l26-play-error" data-l26-error role="status" hidden></p>' +
      '<div class="l26-play-featured" hidden></div>';

    root.addEventListener('error', event => {
      if (event.target.matches('.l26-play-thumb')) event.target.remove();
    }, true);
    const card = root.querySelector('[data-l26-mission]');
    const points = root.querySelector('[data-l26-points]');
    const status = root.querySelector('.l26-play-member');
    const attendance = root.querySelector('.l26-play-attendance');
    const activities = root.querySelector('.l26-play-featured');
    const error = root.querySelector('[data-l26-error]');
    const hash = location.hash;
    let last, pending, voteRequest, busy = false;

    function paint(data) {
      const member = Number.isFinite(data.points);
      const shelf = new Set(data.shelf);
      const showAttendance = shelf.has('attend');
      status.hidden = !member && !showAttendance;
      points.hidden = !member;
      points.innerHTML = '<span>' + label('points') + '</span><strong>' +
        (member ? L.esc(data.points.toLocaleString(L.lang)) + ' P' : '') + '</strong>' + L.icon('chevron', { size: 16 });
      attendance.hidden = !showAttendance;
      attendance.innerHTML = '<span>' + label('attendance') + '</span><strong>' +
        label(member ? data.attended ? 'done' : 'attendancePending' : 'login') + '</strong>';
      const mission = data.mission;
      card.dataset.missionKey = mission.key;
      const missionState = member ? '<p class="l26-play-state" data-done="' + mission.done + '">' +
        label(mission.done ? 'done' : 'ready') + '</p>' : '';
      card.innerHTML = missionHeading(missionState) + '<h3>' + label(mission.key) + '</h3>' +
        (member ? '' : '<p class="muted">' + label('guest') + '</p>') +
        '<div class="l26-play-actions">' + missionControls(mission, member) + (member ? '' : button('login', 'login')) + '</div>';
      shelf.add('djs');
      if (L.open('partners')) shelf.add('partners');
      activities.innerHTML = Object.keys(tiles).map(key => activity(key, shelf.has(key), data.attended)).join('');
      activities.hidden = false;
    }

    async function refresh() {
      if (!root.isConnected || pending) return pending;
      pending = L.api('l26_play');
      try {
        const data = await pending;
        if (!root.isConnected || hash !== location.hash) return;
        if (['closed', 'action'].includes(data.error)) return legacy();
        card.setAttribute('aria-busy', 'false');
        if (!data.ok) {
          error.hidden = !last;
          if (last) error.textContent = L.t('l26play.error');
          else card.innerHTML = missionHeading() + L.l26Empty(label('error'), 'layers', true, '', button('refresh', 'retry'));
          return;
        }
        error.hidden = true;
        const display = L.open('shop') && !data.shelf.includes('shop') ? { ...data, shelf: [...data.shelf, 'shop'] } : data;
        if (JSON.stringify(last) === JSON.stringify(display)) return;
        last = display;
        paint(display);
      } finally {
        pending = null;
      }
    }

    root.onclick = async event => {
      const control = event.target.closest('[data-l26-action]');
      if (!control || busy) return;
      const action = control.dataset.l26Action;
      if (action === 'refresh') return refresh();
      if (action === 'login') return L.needLogin();
      if (L.needLogin()) return;

      busy = true;
      control.disabled = true;
      error.hidden = true;
      try {
        // Ignore an obsolete recommendation if a refresh was already in flight.
        await pending;
        if (!control.isConnected) return;
        let result;
        if (action === 'like') result = await L.api('like', { id: last.mission.id });
        if (action === 'going') result = await L.api('going');
        if (action === 'attend') result = await L.api('attend');
        if (action === 'floor_vote') {
          if (last.mission.vote_status !== 'ready') return;
          const floor = control.dataset.l26Floor;
          if (voteRequest?.floor !== floor || voteRequest.day !== last.biz_day) {
            voteRequest = { floor, day: last.biz_day, request_id: crypto.randomUUID() };
          }
          result = await L.api('l26_floor_vote', { floor, request_id: voteRequest.request_id });
          if (result.error !== 'network' && result.error !== 'server') voteRequest = undefined;
          if (['already_voted', 'voting_closed', 'entry_required', 'closed'].includes(result.error)) {
            await refresh();
            return;
          }
        }
        if (!root.isConnected) return;
        if (result?.error && result.error !== 'dup') {
          error.hidden = false;
          error.textContent = L.t(result.error === 'preview' ? 'core.previewReadOnly' : 'l26play.error');
          return;
        }
        await refresh();
      } finally {
        if (control.isConnected) control.disabled = false;
        busy = false;
      }
    };

    const visible = () => { if (!document.hidden && !busy) void refresh(); };
    const timer = setInterval(visible, 60_000);
    document.addEventListener('visibilitychange', visible);
    dispose = () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
      root.onclick = null;
    };
    return refresh();
  }

  L.screen('l26_play', {
    title: 'nav.l26_play',
    keepScroll: true,
    render,
    leave() { dispose?.(); dispose = undefined; }
  });
})(window.Lounge);
