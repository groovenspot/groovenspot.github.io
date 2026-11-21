/* SPEC5 t5: independently mounted tonight cards; no classic-screen mutations. */
(() => {
  const L = window.Lounge, U = LoungeScreenUI;
  const P = L.tonightParts ||= {};
  const words = {
    going: ['갈래요', 'I’m going', '行きます', '我要去'],
    undo: ['갈래요 취소', 'Cancel going', '取り消す', '取消'],
    friends: ['친구가 가요', 'Friends are going', '友達が行きます', '朋友会去'],
    people: ['{nick}님 외 {n}명이 가요', '{nick} and {n} others are going', '{nick}さんほか{n}人が行きます', '{nick}和其他{n}人会去'],
    rooms: ['대화방', 'Chat', 'チャット', '聊天室'],
    roomN: ['지금 {n}명', '{n} here now', '現在{n}人', '现在{n}人'],
    vote: ['투표', 'Vote', '投票', '投票'],
    play: ['놀거리', 'Play', '遊ぶ', '玩乐'],
    points: ['출석 +P', 'Check in +P', '出席 +P', '签到 +P'],
    table: ['테이블', 'Tables', 'テーブル', '桌位'],
    tableSub: ['문의·조각', 'Ask · Share', '相談・相席', '咨询・拼桌'],
    lives: ['지금 매장 영상', 'Live from the club', '今のお店の映像', '店内最新影像'],
    feed: ['피드 보기', 'View feed', 'フィードを見る', '查看动态'],
    party: ['오늘 파티', 'Tonight’s party', '今日のパーティー', '今晚派对'],
    poster: ['포스터 크게 보기', 'View poster', 'ポスターを拡大', '查看海报'],
    notify: ['알림 설정', 'Notifications', '通知設定', '通知设置'],
    dj: ['내 DJ 시작 10분 전', '10 minutes before my DJ', 'フォロー中のDJ開始10分前', '关注的DJ开始前10分钟'],
    goingNotify: ['갈래요 한 날 저녁 알림', 'Evening reminder when I’m going', '行く日の夕方の通知', '要去当天的晚间提醒'],
    line: ['입구 줄 변화', 'Entry queue changes', '入場待ちの変化', '入场队伍变化'],
    inquiry: ['테이블 문의', 'Ask about a table', 'テーブルの相談', '桌位咨询'],
    staff: ['담당 직원이 확인해요', 'A staff member will help', '担当スタッフが確認します', '工作人员会确认'],
    share: ['조각 모집', 'Share a table', '相席募集', '拼桌招募'],
    shareSub: ['같이 앉을 사람 찾기', 'Find people to sit with', '一緒に座る人を探す', '寻找拼桌伙伴'],
    recap: ['어젯밤 다시 보기', 'Last night', '昨夜を振り返る', '昨夜回顾'],
    photos: ['사진첩', 'Photos', 'アルバム', '相册'],
    songs: ['어제 나온 곡', 'Last night’s tracks', '昨夜の曲', '昨夜歌曲'],
    survey: ['어젯밤은 어땠나요?', 'How was last night?', '昨夜はいかがでしたか？', '昨晚怎么样？'],
    safety: ['안심 버튼', 'Safety', '安心ボタン', '安心按钮'],
    close: ['닫기', 'Close', '閉じる', '关闭'],
    prev: ['이전', 'Previous', '前へ', '上一个'],
    next: ['다음', 'Next', '次へ', '下一个'],
    failed: ['처리하지 못했어요. 다시 시도해 주세요.', 'Could not save. Please retry.', '保存できませんでした。再試行してください。', '保存失败，请重试。']
  };
  const dict = {};
  ['ko', 'en', 'ja', 'zh'].forEach((lang, i) => {
    dict[lang] = Object.fromEntries(Object.entries(words).map(([key, values]) => ['tcard5.' + key, values[i]]));
  });
  L.i18n(dict);
  const t = (key, vars) => L.esc(L.t('tcard5.' + key, vars));
  const icon = name => L.icon ? L.icon(name) : '';
  function mount(el, cls, visible) {
    el.replaceChildren();
    el.className = 'tcard5 ' + cls;
    // 세 번째 값을 안 주면 보임. undefined 가 넘어오면(빈 recap 등) 숨김 — 기본값 문법은 undefined 를 '보임'으로 바꿔 버린다
    el.hidden = !L.open('tonight5') || (arguments.length > 2 && !visible);
    return !el.hidden;
  }
  const image = value => U.image(value);
  const img = (src, cls = '') => '<img class="' + cls + '" src="' + L.esc(src) + '" alt="" loading="lazy">';
  const fail = result => result?.error === 'auth' ? L.needLogin() : L.toast(L.t('tcard5.failed'));
  const requests = new Set();

  P.going = (el, data, ctx = {}) => {
    if (!mount(el, 'tcard5-going')) return;
    el.dataset.going = '';   // 예전 화면과 같은 표시(시험·다른 화면이 [data-going] 으로 찾는다)
    const g = data.going || {}, people = Array.isArray(g.people) ? g.people : [];
    const key = String(data.day || '') + ':' + String(L.me?.id || '');
    const busy = requests.has(key);
    el.innerHTML = '<button type="button" class="tcard5-go" aria-pressed="' + !!g.me + '"' + (busy ? ' disabled' : '') + '>' +
      icon(g.me ? 'check' : 'plus') + t(g.me ? 'undo' : 'going') + '</button>' +
      (people.length ? '<span class="tcard5-faces">' + people.slice(0, 3).map(p => L.avatar ? L.avatar({ nick: p.nick, photo: image(p.photo) }, 28) : '').join('') +
        '</span><span class="tcard5-friends">' + (g.showN === true && Number(g.n) >= 5 ?
          t('people', { nick: people[0].nick, n: Math.max(0, Number(g.n) - 1) }) : t('friends')) + '</span>' : '');
    el.querySelector('button').onclick = async () => {
      if (L.needLogin() || requests.has(key)) return;
      const member = L.me?.id, hash = location.hash, value = !g.me;
      const n = Math.max(0, (Number(g.n) || 0) + (value ? 1 : -1));
      const optimistic = { ...g, n, showN: n >= 5, me: value };
      requests.add(key);
      const publish = going => { ctx.setData?.({ going }); if (el.isConnected) P.going(el, { ...data, going }, ctx); };
      publish(optimistic);
      let result;
      try { result = await L.api(value ? 'going' : 'going_off'); } catch { result = { error: 'network' }; }
      requests.delete(key);
      if (location.hash !== hash || L.me?.id !== member) return;
      if (!result || result.error) { publish(g); return fail(result); }
      const finalN = Number.isFinite(Number(result.n)) ? Number(result.n) : n;
      publish({ ...optimistic, ...result, n: finalN, showN: finalN >= 5, me: value });
    };
  };

  P.quick = (el, data) => {
    const items = [
      ['rooms', 'rooms', 'chat', data.rooms?.n ? t('roomN', { n: Number(data.rooms.n) || 0 }) : ''],
      [null, 'vote', 'check', ''],
      [null, 'play', 'play', t('points')],
      ['sales', 'table', 'grid', t('tableSub')]
    ].filter(([flag]) => !flag || L.open(flag));
    if (!mount(el, 'tcard5-quick', items.length)) return;
    el.innerHTML = items.map(([, route, glyph, sub]) => '<a href="#/' + route + '">' + icon(glyph) + '<strong>' +
      t(route) + '</strong><small>' + sub + '</small></a>').join('');
  };

  // storyViewer accepts photos only. Mixed/video items use the same native video
  // controls, muted playsinline playback and explicit pause/dispose as tonightClassic.
  function mediaViewer(items) {
    if (!items.some(item => item.video) && L.storyViewer) {
      const viewer = L.storyViewer({ items: items.map(i => ({ photo: i.url, at: i.at, text: i.floor || '' })), title: 'GROOVE' });
      if (viewer) return () => viewer.close();
    }
    const panel = L.sheet('<h2>GROOVE</h2><div data-media></div><nav><button type="button" data-prev aria-label="' + t('prev') + '">' +
      icon('back') + '</button><span data-count></span><button type="button" data-next aria-label="' + t('next') + '">' + icon('chevron') + '</button></nav>',
      { close: true, bare: true, cls: 'tcard5-media' });
    let at = 0, disposed = false;
    const pause = () => panel.querySelector('video')?.pause();
    function paint() {
      pause();
      const item = items[at];
      panel.querySelector('[data-media]').innerHTML = item.video ?
        '<video src="' + L.esc(item.url) + '" controls autoplay muted playsinline loop preload="metadata"></video>' : img(item.url);
      panel.querySelector('[data-count]').textContent = (at + 1) + ' / ' + items.length;
      panel.querySelector('[data-prev]').disabled = at === 0;
      panel.querySelector('[data-next]').disabled = at === items.length - 1;
    }
    panel.querySelector('[data-prev]').onclick = () => { if (at > 0) { at--; paint(); } };
    panel.querySelector('[data-next]').onclick = () => { if (at < items.length - 1) { at++; paint(); } };
    const visibility = () => { if (document.hidden) pause(); };
    const observer = new MutationObserver(() => { if (!panel.isConnected || document.getElementById('sheet').hidden) dispose(); });
    function dispose() {
      if (disposed) return;
      disposed = true; pause(); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('hashchange', close);
    }
    function close() { if (panel.isConnected) L.closeSheet(); dispose(); }
    observer.observe(document.getElementById('sheet'), { childList: true, attributes: true });
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('hashchange', close);
    paint();
    return close;
  }

  P.lives = (el, data) => {
    const items = (Array.isArray(data.lives) ? data.lives : []).slice().sort((a, b) => b.at - a.at).flatMap(row => {
      const videos = (Array.isArray(row.vids) ? row.vids : [row.vid]).map(image).filter(Boolean);
      const photos = (Array.isArray(row.imgs) ? row.imgs : [row.img]).map(image).filter(Boolean);
      return videos.length ? videos.map(url => ({ ...row, url, video: true, thumb: photos[0] })) : photos.map(url => ({ ...row, url }));
    });
    if (!mount(el, 'tcard5-card tcard5-lives', items.length)) return;
    const first = items[0];
    el.innerHTML = '<h2>' + t('lives') + '</h2><button type="button" class="tcard5-live" aria-label="' + t('lives') + '">' +
      (first.thumb || !first.video ? img(first.thumb || first.url) : '<video src="' + L.esc(first.url) + '" muted playsinline preload="metadata"></video>') +
      '<span class="tcard5-play">' + icon('play') + '</span><span class="tcard5-live-caption">' + L.esc(first.floor) +
      (L.ago ? ' · ' + L.esc(L.ago(first.at, true)) : '') + '</span></button>';
    let close;
    el.querySelector('button').onclick = () => { close?.(); close = mediaViewer(items); };
    return () => { close?.(); el.querySelectorAll('video').forEach(v => v.pause()); };
  };

  P.strip = (el, data) => {
    const items = (Array.isArray(data.strip) ? data.strip : []).filter(row => row.id && image(row.thumb));
    if (!mount(el, 'tcard5-strip', items.length)) return;
    el.innerHTML = items.map(row => '<a href="#/feed/' + encodeURIComponent(row.id) + '" aria-label="' + t('feed') + '">' +
      img(image(row.thumb)) + '</a>').join('') + '<a class="tcard5-feed" href="#/feed">' + t('feed') + icon('chevron') + '</a>';
  };

  function prefsValid(p) { return p && !p.error && ['dj', 'going', 'line'].every(k => typeof p[k] === 'boolean'); }
  async function notifications(bell) {
    if (L.needLogin()) return;
    bell.disabled = true;
    const prefs = await L.api('tonight_notify_get');
    bell.disabled = false;
    if (!bell.isConnected) return;
    if (!prefsValid(prefs)) { bell.hidden = true; return; }
    const keys = ['dj', 'going', 'line'];
    const panel = L.sheet('<h2>' + t('notify') + '</h2><div class="tcard5-notify">' + keys.map(key =>
      '<label><span>' + t(key === 'going' ? 'goingNotify' : key) + '</span><input type="checkbox" role="switch" name="' + key + '"' +
      (prefs[key] ? ' checked' : '') + '></label>').join('') + '</div><p data-notify-status role="status"></p>', { close: true });
    panel.onchange = async event => {
      const input = event.target;
      if (!keys.includes(input.name)) return;
      const previous = prefs[input.name];
      panel.querySelectorAll('input').forEach(i => { i.disabled = true; });
      let result;
      try { result = await L.api('tonight_notify_set', { [input.name]: input.checked }); } catch { result = null; }
      if (!panel.isConnected) return;
      if (prefsValid(result)) Object.assign(prefs, result);
      else { prefs[input.name] = previous; panel.querySelector('[data-notify-status]').textContent = L.t('tcard5.failed'); }
      panel.querySelectorAll('input').forEach(i => { i.checked = prefs[i.name]; i.disabled = false; });
    };
  }

  P.party = (el, data, ctx) => {
    if (!mount(el, 'tcard5-card tcard5-party', data.party)) return;
    const party = data.party, poster = image(typeof party.poster === 'object' ? party.poster?.url : party.poster);
    el.innerHTML = '<div class="tcard5-party-head">' + (poster ? '<button type="button" data-poster aria-label="' + t('poster') + '">' + img(poster) + '</button>' : '') +
      '<div><small>' + t('party') + '</small><h2>' + L.esc(party.title) + '</h2></div><button type="button" data-notify hidden aria-label="' +
      t('notify') + '">' + icon('bell') + '</button></div><div data-going></div>';
    const posterButton = el.querySelector('[data-poster]');
    if (posterButton) posterButton.onclick = () => L.sheet('<h2>' + L.esc(party.title) + '</h2>' + img(poster, 'tcard5-poster-full'), { close: true });
    P.going(el.querySelector('[data-going]'), data, ctx);
    const bell = el.querySelector('[data-notify]');
    if (L.me) L.api('tonight_notify_get').then(prefs => { if (bell.isConnected && prefsValid(prefs)) bell.hidden = false; }).catch(() => {});
    bell.onclick = () => notifications(bell);
  };

  P.table = el => {
    if (!mount(el, 'tcard5-table', L.open('sales'))) return;
    el.innerHTML = [['inquiry', 'staff'], ['share', 'shareSub']].map(([title, sub]) =>
      '<a href="#/table">' + icon('grid') + '<strong>' + t(title) + '</strong><small>' + t(sub) + '</small></a>').join('');
  };

  P.recap = (el, data) => {
    const recap = data.recap || {}, photos = (recap.album?.photos || []).map(image).filter(Boolean).slice(0, 3);
    const songs = recap.songs && L.open('songs');
    if (!mount(el, 'tcard5-card tcard5-recap', photos.length || songs || recap.survey)) return;
    el.innerHTML = '<header><h2>' + t('recap') + '</h2><div>' + (recap.album ? '<a href="#/photos">' + t('photos') + '</a>' : '') +
      (songs ? '<a href="#/songs">' + t('songs') + '</a>' : '') + '</div></header>' +
      (photos.length ? '<div class="tcard5-photos">' + photos.map(src => '<a href="#/photos" aria-label="' + t('photos') + '">' + img(src) + '</a>').join('') + '</div>' : '') +
      (recap.survey ? '<a class="tcard5-survey" href="#/vote">' + t('survey') + icon('chevron') + '</a>' : '');
  };

  P.safety = (el, data) => {
    if (!mount(el, 'tcard5-safety-host', data.phase === 'open' && L.open('safety'))) return;
    el.innerHTML = '<a class="tcard5-safety" href="#/safety"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z"/><path d="m8 12 3 3 5-6"/></svg>' + t('safety') + '</a>';
    return () => el.replaceChildren();
  };
})();
