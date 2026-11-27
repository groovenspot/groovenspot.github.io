(function (L) {
  const words = {
    mission: ['오늘의 미션', 'Today’s mission', '今日のミッション', '今日任务'],
    points: ['내 포인트', 'My points', 'マイポイント', '我的积分'],
    attendance: ['오늘 출석', 'Today’s check-in', '今日の出席', '今日签到'],
    guess: ['DJ 맞히기', 'Guess the DJ', 'DJ当てクイズ', '猜猜 DJ'],
    legacy: ['기존 출석판·올클', 'Classic attendance and all-clear', 'これまでの出席・全クリア', '原版签到和全通关'],
    more: ['더 많은 놀거리', 'More activities', 'その他の遊び', '更多玩法'],
    done: ['완료', 'Done', '完了', '已完成'],
    ready: ['진행 가능', 'Ready', '参加できます', '可以开始'],
    login: ['로그인', 'Log in', 'ログイン', '登录'],
    guest: ['미션 진행과 포인트 확인은 회원 로그인 후 이용할 수 있어요.', 'Log in to track your mission and see your points.', 'ログインすると進捗とポイントを確認できます。', '登录后可查看任务进度和积分。'],
    retry: ['다시 시도', 'Try again', '再試行', '重试'],
    loading: ['미션을 불러오는 중', 'Loading your mission', 'ミッションを読み込み中', '正在加载任务'],
    error: ['다시 불러와 주세요.', 'Please try again.', 'もう一度お試しください。', '请重试。'],
    refresh: ['인증 상태 확인', 'Check entry status', '入場状況を確認', '查看入场状态'],
    attend: ['출석하기', 'Check in for attendance', '出席する', '签到'],
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
  const shelfLinks = {
    guess: 'l26play.guess', cup: 'vote.cup', vote: 'vote.title', radio: 'radio.title',
    shorts: 'shorts.title', challenge: 'challenge.title', rank: 'rank.title', rewards: 'rewards.title', play: 'l26play.legacy'
  };
  // Published GROOVE SESSIONS clips from /data/videos.json.
  const featured = {
    cup: { icon: 'play', video: 'whM3ZZUnSVE' },
    guess: { icon: 'search' },
    radio: { icon: 'play', video: 'eY3RZgw7fvE' },
    vote: { icon: 'check' }
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

  function button(action, text, classes = '', attrs = '') {
    return '<button type="button" class="btn ' + classes + '" data-l26-action="' + action + '"' + attrs + '>' + label(text) + '</button>';
  }

  function activity(key) {
    const { icon, video } = featured[key];
    return '<a class="l26-play-tile" href="#/' + key + '" data-play-activity="' + key + '">' +
      '<span class="l26-play-tile-art" aria-hidden="true">' +
      (video ? '<span class="l26-play-thumb" style="background-image:url(https://i.ytimg.com/vi/' + video + '/hqdefault.jpg)"></span>' : '') +
      L.icon(icon, { size: 23 }) + '</span><span class="l26-play-tile-name">' + translated(shelfLinks[key]) +
      L.icon('chevron', { size: 16 }) + '</span></a>';
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
    root.innerHTML = '<header class="l26-play-head"><div class="l26-play-heading">' +
      '<button class="ui-bar-btn" type="button" data-ui-back="l26_lounge" aria-label="' + translated('ui.back') + '">' +
      L.icon('back') + '</button><h1>' + translated('nav.l26_play') +
      '</h1></div></header><div class="l26-play-member" hidden>' +
      '<a class="l26-play-points" data-l26-points href="#/me" hidden></a><div class="l26-play-attendance" hidden></div></div>' +
      '<section class="l26-play-mission" aria-labelledby="l26-mission-title"><div class="l26-play-mission-art" aria-hidden="true">' +
      '<svg viewBox="0 0 360 142" fill="none"><g stroke="currentColor" opacity=".45">' +
      '<circle cx="180" cy="71" r="64"/><circle cx="180" cy="71" r="86" stroke-dasharray="2 5"/>' +
      '<path d="M0 71h103m154 0h103M180 0v16m0 110v16M50 48v46m10-35v24m240-35v46m10-35v24"/></g>' +
      '<g transform="rotate(-12 180 71)"><path d="M118 42h124v16a13 13 0 0 0 0 26v16H118V84a13 13 0 0 0 0-26Z" ' +
      'fill="currentColor" stroke="currentColor" stroke-width="3"/><path d="M214 45v52" stroke="#08080A" stroke-dasharray="3 4"/>' +
      '<path d="M166 55l3.5 10.5L180 69l-10.5 3.5L166 83l-3.5-10.5L152 69l10.5-3.5L166 55Z" fill="#08080A"/>' +
      '<path d="M189 57v12m-6-6h12m-11 16v8m-4-4h8" stroke="#08080A" stroke-width="2"/></g></svg></div>' +
      '<div class="l26-play-mission-copy" data-l26-mission aria-busy="true">' + missionHeading() +
      '<p role="status">' + label('loading') + '</p></div></section><p class="l26-play-error" data-l26-error role="status" hidden></p>' +
      '<div class="l26-play-featured" hidden></div>' +
      '<details class="l26-play-shelf" hidden><summary>' + label('more') +
      L.icon('down', { size: 16 }) + '</summary><div class="l26-play-options"></div></details>';

    const card = root.querySelector('[data-l26-mission]');
    const shelf = root.querySelector('details');
    const points = root.querySelector('[data-l26-points]');
    const status = root.querySelector('.l26-play-member');
    const attendance = root.querySelector('.l26-play-attendance');
    const activities = root.querySelector('.l26-play-featured');
    const options = root.querySelector('.l26-play-options');
    const error = root.querySelector('[data-l26-error]');
    const hash = location.hash;
    shelf.open = L.unstash('l26_play') === true;
    let last, pending, voteRequest, busy = false;

    function paint(data) {
      const member = Number.isFinite(data.points);
      const showAttendance = data.shelf.includes('attend');
      status.hidden = !member && !showAttendance;
      points.hidden = !member;
      points.innerHTML = '<span>' + label('points') + '</span><strong>' +
        (member ? L.esc(data.points.toLocaleString(L.lang)) + ' P' : '') + '</strong>' + L.icon('chevron', { size: 16 });
      attendance.hidden = !showAttendance;
      attendance.innerHTML = '<span>' + label('attendance') + '</span>' +
        button('attend', data.attended ? 'done' : 'attend', '', data.attended ? ' disabled' : '');
      const mission = data.mission;
      card.dataset.missionKey = mission.key;
      const missionState = member ? '<p class="l26-play-state" data-done="' + mission.done + '">' +
        label(mission.done ? 'done' : 'ready') + '</p>' : '';
      card.innerHTML = missionHeading(missionState) + '<h3>' + label(mission.key) + '</h3>' +
        (member ? '' : '<p class="muted">' + label('guest') + '</p>') +
        '<div class="l26-play-actions">' + missionControls(mission, member) + (member ? '' : button('login', 'login')) + '</div>';
      activities.innerHTML = Object.keys(featured).filter(key => data.shelf.includes(key)).map(activity).join('');
      activities.hidden = !activities.childElementCount;
      options.innerHTML = data.shelf.filter(key => Object.hasOwn(shelfLinks, key) && !Object.hasOwn(featured, key))
        .map(key => link(key, shelfLinks[key])).join('');
      shelf.hidden = !options.childElementCount;
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
          error.hidden = false;
          error.textContent = L.t('l26play.error');
          if (!last) card.innerHTML = missionHeading() + button('refresh', 'retry');
          return;
        }
        error.hidden = true;
        if (JSON.stringify(last) === JSON.stringify(data)) return;
        last = data;
        paint(data);
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
      L.stash('l26_play', shelf.open);
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
