(() => {
  const L = Lounge, U = LoungeScreenUI;
  const languages = ['ko', 'en', 'ja', 'zh'];
  // Keep this catalog with the game so the screen can be loaded independently.
  const copy = {
    title: ['DJ 맞히기', 'Guess the DJ', 'DJ当てクイズ', '猜猜 DJ'],
    back: ['놀거리', 'Play', '遊ぶ', '娱乐'],
    soon: ['준비 중이에요', 'Coming soon', '準備中です', '即将开放'],
    unavailable: ['문제를 불러오지 못했어요.', 'Could not load the quiz.', 'クイズを読み込めませんでした。', '无法加载题目。'],
    retry: ['다시 시도', 'Try again', '再試行', '重试'],
    login: ['로그인', 'Log in', 'ログインする', '登录'],
    loginHint: ['로그인하면 오늘의 문제를 풀 수 있어요.', 'Log in to play today’s quiz.', 'ログインすると今日のクイズに参加できます。', '登录后即可参加今日竞猜。'],
    loading: ['불러오는 중', 'Loading', '読み込み中', '正在加载'],
    question: ['이 세트를 튼 DJ는 누구일까요?', 'Who played this set?', 'このセットをプレイしたDJは誰？', '这场演出是哪位 DJ 的？'],
    single: ['영업일마다 한 번 도전해요.', 'One guess per club day.', '営業日ごとに1回挑戦できます。', '每个营业日可竞猜一次。'],
    prize: ['정답이면 {n}P를 받아요.', 'Earn {n}P for a correct guess.', '正解すると{n}P獲得できます。', '答对可获得 {n}P。'],
    clues: ['힌트', 'Clues', 'ヒント', '提示'],
    reveal: ['다음 힌트 보기', 'Reveal next clue', '次のヒントを見る', '查看下一条提示'],
    genre: ['장르', 'Genre', 'ジャンル', '曲风'],
    floor: ['층', 'Floor', 'フロア', '楼层'],
    hiphop: ['힙합', 'Hip-hop', 'ヒップホップ', '嘻哈'],
    edm: ['일렉트로닉 댄스', 'Electronic dance', 'エレクトロニック・ダンス', '电子舞曲'],
    duration: ['세트 길이', 'Set length', 'セットの長さ', '演出时长'],
    session: ['회차', 'Session number', 'セッション番号', '期数'],
    date: ['날짜', 'Date', '日付', '日期'],
    unknown: ['정보 없음', 'Unavailable', '情報なし', '暂无信息'],
    submit: ['답 제출', 'Submit guess', '答えを送る', '提交答案'],
    hit: ['정답이에요!', 'Correct!', '正解です！', '答对了！'],
    miss: ['아쉬워요!', 'Not quite!', '残念！', '答错了！'],
    answer: ['정답은 {name}예요.', 'The answer was {name}.', '正解は{name}です。', '正确答案是 {name}。'],
    earned: ['{n}P를 받았어요.', 'You earned {n}P.', '{n}P獲得しました。', '你获得了 {n}P。'],
    video: ['세트 영상', 'Set video', 'セット動画', '演出视频'],
    profile: ['DJ 프로필', 'DJ profile', 'DJプロフィール', 'DJ 资料'],
    djs: ['DJ 목록', 'DJ directory', 'DJ一覧', 'DJ 列表'],
    history: ['내 기록', 'My history', '参加履歴', '我的记录'],
    noHistory: ['아직 기록이 없어요.', 'No guesses yet.', 'まだ履歴がありません。', '还没有竞猜记录。'],
    rank: ['이번 주 순위', 'Weekly standings', '今週のランキング', '本周排名'],
    noRank: ['아직 맞힌 사람이 없어요.', 'No correct guesses yet.', 'まだ正解者がいません。', '还没有人答对。'],
    place: ['내 순위 {n}위', 'My place: {n}', '自分の順位：{n}位', '我的名次：第 {n} 名'],
    correctCount: ['정답 {n}개', '{n} correct', '{n}問正解', '答对 {n} 题'],
    won: ['정답', 'Correct', '正解', '答对'],
    lost: ['오답', 'Incorrect', '不正解', '答错'],
    // 놀거리 1차 (play1): 연속 정답 · 친구에게 보내기
    streak: ['연속 정답 {n}일 · 최고 {m}일', 'Streak {n} days · Best {m}', '連続正解 {n}日 · 最高 {m}日', '连续答对 {n} 天 · 最高 {m} 天'],
    share: ['친구에게 보내기', 'Send to a friend', '友だちに送る', '发给朋友'],
    shareText: ['누구일까? 그루브 라운지 DJ 맞히기', 'Who is it? Groove Lounge · Guess the DJ',
      '誰でしょう？グルーヴ・ラウンジ DJ当てクイズ', '猜猜是谁？GROOVE 酒廊 · 猜猜 DJ'],
    copied: ['링크를 복사했어요', 'Link copied', 'リンクをコピーしました', '链接已复制'],
    shareFailed: ['공유하지 못했어요', 'Could not share', '共有できませんでした', '无法分享']
  };

  function label(key, vars) {
    const index = Math.max(0, languages.indexOf(L.lang));
    const text = copy[key][index];
    return text.replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name] ?? ''));
  }

  const t = (key, vars) => L.esc(label(key, vars));
  const paragraph = (key, attrs = '') => '<p class="muted" ' + attrs + '>' + t(key) + '</p>';
  const card = U.card;
  const title = () => '<h1>' + t('title') + '</h1>';

  L.guessTile = () => '<article class="shell-card">' + (L.open('guess')
    ? U.link('#/guess', t('title')) : '<h2>' + t('title') + '</h2>' + paragraph('soon')) + '</article>';

  function date(day) {
    const time = typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(day + 'T00:00:00Z') : null;
    if (!time || !Number.isFinite(time.getTime())) return t('unknown');
    return L.esc(new Intl.DateTimeFormat(L.lang, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(time));
  }

  function clueValue(clue) {
    if (clue.value == null) return t('unknown');
    if (clue.kind === 'date') return date(clue.value);
    if (clue.kind === 'genre') return t(clue.value);
    return L.esc(clue.value);
  }

  // 공유 문구: 지금까지 연 힌트만 (정답·영상은 절대 넣지 않음)
  function clueText(clue) {
    if (clue.value == null) return label('unknown');
    if (clue.kind === 'genre') return copy[clue.value] ? label(clue.value) : String(clue.value);
    if (clue.kind === 'date') {
      const time = /^\d{4}-\d{2}-\d{2}$/.test(clue.value) ? new Date(clue.value + 'T00:00:00Z') : null;
      return time && Number.isFinite(time.getTime())
        ? new Intl.DateTimeFormat(L.lang, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(time) : label('unknown');
    }
    return String(clue.value);
  }

  async function share(round) {
    const text = (round.clues || []).map(clue => label(clue.kind) + ': ' + clueText(clue))
      .concat(label('shareText')).join('\n');
    const url = location.origin + '/lounge/#/guess';
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: label('title'), text, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text + '\n' + url);
      L.toast(label('copied'));
    } catch {
      L.toast(label('shareFailed'));
    }
  }

  function stats(data) {
    const score = row => '<li class="shell-row" style="gap:8px;flex-wrap:wrap;padding:.25rem 0">' +
      '<span style="overflow-wrap:anywhere">' + L.esc(row.place) + '. ' + L.whoTag(row) + '</span>' +
      '<span class="muted">' + t('correctCount', { n: row.correct }) + ' · ' + L.esc(row.points) + 'P</span></li>';
    const entry = row => '<li class="shell-row" style="gap:8px;flex-wrap:wrap;padding:.25rem 0">' +
      '<time datetime="' + L.esc(row.day) + '">' + date(row.day) + '</time><span>' +
      t(row.hit ? 'won' : 'lost') + ' · ' + L.esc(row.gained) + 'P</span></li>';
    return '<section style="' + card + '"><h2>' + t('rank') + '</h2>' +
      (data.myPlace ? '<p class="muted">' + t('place', { n: data.myPlace }) + '</p>' : '') +
      (data.rank.length ? '<ol style="list-style:none;padding:0">' + data.rank.map(score).join('') + '</ol>' : paragraph('noRank')) +
      '</section><section style="' + card + '"><h2>' + t('history') + '</h2>' +
      (data.history.length ? '<ul style="list-style:none;padding:0">' + data.history.map(entry).join('') + '</ul>' :
        paragraph('noHistory')) + '</section>';
  }

  function resultOf(result) {
    const hit = result.selected === result.correct;
    const media = /^[A-Za-z0-9_-]{11}$/.test(result.youtube || '')
      ? '<iframe title="' + t('video') + '" src="https://www.youtube.com/embed/' + result.youtube +
        '?playsinline=1" style="' + U.media + ';aspect-ratio:16/9;margin:12px 0" loading="lazy" allowfullscreen' +
        ' referrerpolicy="strict-origin-when-cross-origin"></iframe>' : '';
    return '<section data-result tabindex="-1" style="' + card + ';border-color:var(--' + (hit ? 'ok' : 's') +
      ')"><h2>' + t(hit ? 'hit' : 'miss') + '</h2><p>' + t('answer', { name: result.name }) + '</p>' +
      (result.gained ? '<p>' + t('earned', { n: result.gained }) + '</p>' : '') + media +
      (result.djKey ? U.link('#/dj/' + encodeURIComponent(result.djKey), t('profile')) : U.link('#/djs', t('djs'))) + '</section>';
  }

  async function render(root) {
    const view = U.mount(root, '<header class="shell-actions" style="justify-content:space-between">' +
      title() + U.link('#/play', t('back')) + '</header>');
    let data, selection = null, busy = false;

    function paint() {
      if (data.error === 'closed') {
        view.innerHTML = paragraph('soon', 'role="status" data-guess-soon');
        return;
      }
      if (data.error === 'auth') {
        view.innerHTML = paragraph('loginHint') + U.button(t('login'), 'data-login', true);
        view.querySelector('[data-login]').onclick = L.needLogin;
        return;
      }
      if (data.error) {
        view.innerHTML = paragraph('unavailable', 'role="alert"') + U.button(t('retry'), 'data-retry');
        view.querySelector('[data-retry]').onclick = load;
        return;
      }
      const { round } = data;
      if (!round) {
        view.innerHTML = paragraph('soon', 'role="status" data-guess-soon') + stats(data);
        return;
      }
      const solved = Boolean(round.result);
      const choices = round.options.map((name, i) => {
        const mark = solved && i === round.result.correct ? ';border-color:var(--ok)' :
          !solved && i === selection ? ';border-color:var(--s)' : '';
        return U.button(L.esc(name), 'data-pick="' + i + '" aria-pressed="' +
          (i === (solved ? round.result.selected : selection)) + '"' + (solved ? ' disabled' : '') +
          ' style="min-width:0;padding:.5rem;overflow-wrap:anywhere' + mark + '"');
      }).join('');
      const fresh = L.open('play1') || data.play1 === true;
      const streak = fresh ? '<p data-guess-streak style="margin:4px 0;font-weight:800;color:var(--g)">' +
        t('streak', { n: Number(data.streak) || 0, m: Number(data.best) || 0 }) + '</p>' : '';
      view.innerHTML = '<section style="' + card + ';border-color:var(--s);background:#15111d">' +
        '<p class="muted"><time datetime="' + L.esc(data.day) + '">' + date(data.day) + '</time></p>' + streak +
        '<h2>' + t('question') + '</h2>' + paragraph('single') +
        (!solved && data.reward > 0 ? '<p class="muted">' + t('prize', { n: data.reward }) + '</p>' : '') +
        '<div data-clues style="margin:10px 0"><h3>' + t('clues') + '</h3><dl>' +
        round.clues.map(clue => '<div class="shell-row"><dt>' + t(clue.kind) + '</dt><dd>' +
          clueValue(clue) + '</dd></div>').join('') + '</dl>' +
        (!solved && round.clues.length < round.clueCount ? U.button(t('reveal'), 'data-hint') : '') + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">' + choices + '</div>' +
        (!solved ? '<div style="margin-top:12px">' + U.button(t('submit'), 'data-submit' +
          (selection === null ? ' disabled' : ''), true) + '<p data-feedback role="status"></p></div>' : '') +
        (fresh ? U.button(t('share'), 'data-share style="width:100%;margin-top:8px"') : '') +
        '</section>' + (solved ? resultOf(round.result) : '') + stats(data);
      const shareButton = view.querySelector('[data-share]');
      if (shareButton) shareButton.onclick = () => { if (!busy) void share(round); };
      if (solved) return;
      for (const button of view.querySelectorAll('[data-pick]')) button.onclick = () => {
        if (busy) return;
        selection = Number(button.dataset.pick);
        for (const choice of view.querySelectorAll('[data-pick]')) {
          const selected = choice === button;
          choice.setAttribute('aria-pressed', String(selected));
          choice.style.borderColor = selected ? 'var(--s)' : '';
        }
        view.querySelector('[data-submit]').disabled = false;
      };
      const hint = view.querySelector('[data-hint]');
      if (hint) hint.onclick = () => send('guess_hint', { id: round.id, index: round.clues.length });
      view.querySelector('[data-submit]').onclick = () => {
        if (selection !== null) void send('guess_answer', { id: round.id, choice: selection });
      };
    }

    async function load() {
      view.innerHTML = paragraph('loading', 'role="status"');
      const response = await L.api('guess_get');
      if (!view.isConnected) return;
      data = response;
      paint();
    }

    async function send(action, fields) {
      if (busy) return;
      busy = true;
      for (const button of view.querySelectorAll('button')) button.disabled = true;
      const response = await L.api(action, fields);
      busy = false;
      if (!view.isConnected) return;
      if (['dup', 'round', 'closed', 'auth'].includes(response.error)) {
        selection = null;
        await load();
        return;
      }
      if (response.error) {
        paint();
        view.querySelector('[data-feedback]').textContent = label('unavailable');
        return;
      }
      data = action === 'guess_hint' ? { ...data, round: response.round } : response;
      paint();
      view.querySelector('[data-result], [data-hint], [data-pick]')?.focus({ preventScroll: true });
    }
    await load();
  }

  L.screen('guess', { nav: 'play', title: 'nav.play', render });
})();
