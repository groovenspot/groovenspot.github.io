(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('vote', {
    title: ['투표', 'Vote'], back: ['놀거리', 'Play'], choose: ['{choice}에 투표', 'Vote for {choice}'],
    count: ['{n}표', '{n} votes'], mine: ['내 선택', 'My choice'],
    create: ['투표 만들기', 'Create vote'], edit: ['투표 수정', 'Edit vote'], pollTitle: ['제목', 'Title'],
    pollKind: ['종류', 'Type'], theme: ['테마', 'Theme'], dj: ['DJ', 'DJ'], etc: ['기타', 'Other'],
    choices: ['선택지 2~8개 (한 줄에 하나)', '2–8 choices, one per line'],
    ends: ['끝나는 시각 (한국 시간)', 'Ends (KST)'], oneHour: ['1시간', '1 hour'], threeHours: ['3시간', '3 hours'],
    businessEnd: ['영업 끝 · 05:00', 'Closing · 05:00'], oneDay: ['24시간', '24 hours'],
    closePoll: ['투표 끝내기', 'End vote'], deletePoll: ['투표 삭제', 'Delete vote'], manage: ['예정·종료된 투표', 'Scheduled and ended votes'],
    confirmClose: ['지금 투표를 끝낼까요?', 'End this vote now?'],
    confirmDelete: ['투표와 결과를 삭제할까요?', 'Delete this vote and its results?'],
    locked: ['이미 표가 있어 선택지와 종류를 바꿀 수 없어요.', 'Votes have been cast. Choices and type are locked.'],
    invalidChoices: ['서로 다른 선택지를 2~8개 입력해 주세요.', 'Enter 2–8 distinct choices.'],
    invalidEnd: ['현재 시각보다 늦은 종료 시각을 입력해 주세요.', 'Choose an end time in the future.'],
    forbidden: ['팀장 또는 대표 권한이 필요해요.', 'Only team leads and the owner can manage votes.'],
    voteLimit: ['오늘은 투표를 10개까지 만들 수 있어요.', 'You can create up to 10 votes per day.'],
    cup: ['DJ 월드컵', 'DJ World Cup'], start: ['16강 시작', 'Start round of 16'],
    round: ['{n}강 · {match}/{total}', 'Round of {n} · {match}/{total}'], final: ['결승', 'Final'],
    winner: ['내가 고른 우승', 'Your winner'], save: ['결과 저장', 'Save result'],
    played: ['오늘은 이미 월드컵을 했어요', 'You already played today'],
    survey: ['어젯밤은 어땠어요?', 'How was last night?'], music: ['음악', 'Music'],
    mood: ['분위기', 'Atmosphere'], crowd: ['붐빔', 'Crowd'], send: ['설문 보내기', 'Send feedback'],
    earned: ['{n}P 받았어요', 'You earned {n}P'],
    // 놀거리 1차 (play1): 월드컵 무제한·주제전
    cupGo: ['시작', 'Start'], cupAgain: ['다시 하기', 'Play again'], cupOther: ['다른 월드컵', 'Other cups'],
    cupSame: ['나와 같은 우승을 고른 손님 {pct}%', '{pct}% of guests picked the same winner'],
    cupVoters: ['{n}명 참여', '{n} players'], cupMine: ['내 우승 · {name}', 'My winner · {name}'],
    cupTheme: ['이번 주 주제전', 'Theme of the week'], theme2f: ['2F 힙합전', '2F Hip-hop Cup'],
    theme3f: ['3F EDM전', '3F EDM Cup'], themenew: ['이번 주 신곡전', 'New This Week Cup'],
    cupPractice: ['입장 인증 전에는 포인트 없이 연습할 수 있어요', 'Practice without points until entry is verified'],
    cupPracticeDone: ['연습을 마쳤어요', 'Practice complete'],
    cupFirst: ['오늘 첫 판을 끝내면 포인트를 받아요', 'Finish your first cup today to earn points'],
    cupFree: ['오늘 포인트는 받았어요 · 계속 즐겨요', 'Today’s points are in · keep playing'],
    cupSaving: ['결과 저장 중', 'Saving your result'], cupRetry: ['다시 저장', 'Save again'],
    cupPoints: ['+{n}P', '+{n}P']
  });
  L.i18n({
    ja: {
      'vote.cupGo': 'スタート', 'vote.cupAgain': 'もう一度', 'vote.cupOther': 'ほかの対決',
      'vote.cupSame': '同じ優勝を選んだお客さん {pct}%', 'vote.cupVoters': '{n}人が参加',
      'vote.cupMine': '自分の優勝 · {name}', 'vote.cupTheme': '今週のテーマ戦', 'vote.theme2f': '2F ヒップホップ戦',
      'vote.theme3f': '3F EDM戦', 'vote.themenew': '今週の新曲戦',
      'vote.cupPractice': '入場認証前はポイントなしで練習できます', 'vote.cupPracticeDone': '練習が終わりました',
      'vote.cupFirst': '今日最初の対決を終えるとポイントがもらえます', 'vote.cupFree': '今日のポイントは獲得済み · 何度でも遊べます',
      'vote.cupSaving': '結果を保存中', 'vote.cupRetry': 'もう一度保存', 'vote.cupPoints': '+{n}P'
    },
    zh: {
      'vote.cupGo': '开始', 'vote.cupAgain': '再玩一次', 'vote.cupOther': '其他对决',
      'vote.cupSame': '{pct}% 的客人选了同一个冠军', 'vote.cupVoters': '{n} 人参与',
      'vote.cupMine': '我的冠军 · {name}', 'vote.cupTheme': '本周主题赛', 'vote.theme2f': '2F 嘻哈赛',
      'vote.theme3f': '3F EDM 赛', 'vote.themenew': '本周新曲赛',
      'vote.cupPractice': '入场验证前可进行无积分练习', 'vote.cupPracticeDone': '练习已完成',
      'vote.cupFirst': '完成今天第一场对决即可获得积分', 'vote.cupFree': '今天的积分已领取 · 可以继续玩',
      'vote.cupSaving': '正在保存结果', 'vote.cupRetry': '重新保存', 'vote.cupPoints': '+{n}P'
    }
  });
  const pointsToast = gained => L.toast(Number(gained) > 0 ? L.t('vote.earned', { n: Number(gained) }) : L.t('screens.saved'));
  const HOUR = 3_600_000;
  const asKstInput = ms => new Date(ms + 9 * HOUR).toISOString().slice(0, 16);
  const voteError = error => ({
    locked: 'locked', choices: 'invalidChoices', dates: 'invalidEnd', forbidden: 'forbidden', vote_limit: 'voteLimit'
  })[error];

  function voteForm(vote, defaultCloses, done) {
    const label = vote ? 'edit' : 'create';
    const locked = Boolean(vote?.manage?.locked);
    const panel = U.sheet('<h2>' + t(label) + '</h2><form class="shell-form" data-vote-form>' +
      '<label class="shell-field">' + t('pollTitle') + '<input name="title" required maxlength="120" value="' +
      L.esc(vote?.title) + '"></label><label class="shell-field">' + t('pollKind') + '<select name="kind"' +
      (locked ? ' disabled' : '') + '>' + ['theme', 'dj', 'etc'].map(kind => '<option value="' + kind + '"' +
        (vote?.kind === kind ? ' selected' : '') + '>' + t(kind) + '</option>').join('') + '</select></label>' +
      '<label class="shell-field">' + t('choices') + '<textarea name="choices" required rows="4"' +
      (locked ? ' readonly' : '') + '>' + L.esc(vote?.choices?.join('\n')) + '</textarea></label>' +
      (locked ? '<p class="muted">' + t('locked') + '</p>' : '') +
      '<label class="shell-field">' + t('ends') + '<input name="closes" type="datetime-local" required value="' +
      asKstInput(vote?.closes || defaultCloses) + '"></label><div class="shell-actions">' +
      [[1, 'oneHour'], [3, 'threeHours'], [0, 'businessEnd'], [24, 'oneDay']]
        .map(([hours, text]) => U.button(t(text), 'data-vote-hours="' + hours + '"')).join('') +
      '</div><p class="shell-error" role="status"></p><button class="btn btn-hot">' + t(label) + '</button></form>');
    const form = panel.querySelector('form');
    const msg = form.querySelector('[role=status]');
    for (const button of form.querySelectorAll('[data-vote-hours]')) button.onclick = () => {
      const hours = Number(button.dataset.voteHours);
      form.elements.closes.value = asKstInput(hours ? Date.now() + hours * HOUR : defaultCloses);
    };
    form.onsubmit = async event => {
      event.preventDefault();
      const submit = form.querySelector('button:not([type])');
      if (submit.disabled) return;
      const { title, kind, choices: input, closes: end } = form.elements;
      const choices = input.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const max = Math.max(8, vote?.choices.length || 0);
      const closes = Date.parse(end.value + '+09:00');
      if (choices.length < 2 || choices.length > max || new Set(choices).size !== choices.length || choices.some(x => x.length > 120)) {
        msg.innerHTML = t('invalidChoices');
        return;
      }
      if (!(closes > Date.now())) { msg.innerHTML = t('invalidEnd'); return; }
      submit.disabled = true;
      msg.textContent = '';
      const result = await L.api(vote ? 'vote_update' : 'vote_create', {
        title: title.value.trim(), kind: kind.value, choices, closes, ...(vote && { id: vote.id })
      });
      if (!form.isConnected) return;
      submit.disabled = false;
      if (result?.error) {
        const key = voteError(result.error);
        msg.innerHTML = key ? t(key) : U.t('failed');
        return;
      }
      L.closeSheet();
      await done();
    };
  }

  function confirmVote(vote, action, done) {
    const close = action === 'close';
    const label = close ? 'closePoll' : 'deletePoll';
    const panel = U.sheet('<h2>' + t(label) + '</h2><p>' + t(close ? 'confirmClose' : 'confirmDelete') +
      '</p><p class="shell-error" role="status"></p>' + U.button(t(label), 'data-confirm-vote', true));
    const button = panel.querySelector('[data-confirm-vote]');
    button.onclick = async () => {
      if (button.disabled) return;
      button.disabled = true;
      const result = await L.api('vote_' + action, { id: vote.id });
      if (!button.isConnected) return;
      button.disabled = false;
      if (result?.error) {
        const key = voteError(result.error);
        panel.querySelector('[role=status]').innerHTML = key ? t(key) : U.t('failed');
        return;
      }
      L.closeSheet();
      await done();
    };
  }

  function survey(view, data, points) {
    if (!L.me) return;
    const yesterday = new Date(Date.now() - 27 * 3_600_000).toISOString().slice(0, 10);
    const ledgerEligible = points?.ledger?.some(entry =>
      entry.kind === 'checkin' && entry.at > 0 && entry.at < 8.64e15 &&
      new Date(Number(entry.at) - 3 * 3_600_000).toISOString().slice(0, 10) === yesterday);
    if (!(data?.surveyEligible ?? points?.surveyEligible ?? ledgerEligible)) return;
    const section = document.createElement('section');
    section.style.cssText = U.card;
    section.innerHTML = '<h2>' + t('survey') + '</h2><form>' + ['music', 'mood', 'crowd'].map(key =>
      '<label style="display:block;margin:8px 0">' + t(key) + '<select required name="' + key + '"><option value="">—</option>' +
      [1, 2, 3, 4, 5].map(score => '<option>' + score + '</option>').join('') + '</select></label>'
    ).join('') + '<button class="btn btn-hot">' + t('send') + '</button></form>';
    view.append(section);
    section.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      if (L.needLogin()) return;
      const form = event.currentTarget;
      const button = form.querySelector('button');
      if (button.disabled) return;
      button.disabled = true;
      const scores = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, Number(value)]));
      const result = await L.api('survey', scores);
      if (!section.isConnected) return;
      button.disabled = false;
      if (['dup', 'checkin'].includes(result?.error)) section.remove();
      if (!result || result.error) return U.error(result);
      section.remove();
      pointsToast(result.gained);
    };
  }

  async function votes(root) {
    const view = U.mount(root, '<h1>' + t('title') + '</h1>' + U.link('#/play', t('back')));
    const [data, points] = await Promise.all([L.api('votes'), L.me ? L.api('points') : null]);
    async function refresh() { draw(await L.api('votes')); }
    function draw(data) {
      if (!view.isConnected) return;
      view.innerHTML = data?.canCreate ? U.button(t('create'), 'data-vote-create style="margin-top:12px"', true) : '';
      const create = view.querySelector('[data-vote-create]');
      if (create) create.onclick = () => voteForm(null, data.defaultCloses, refresh);
      if (!data?.votes?.length) view.insertAdjacentHTML('beforeend', U.status(data?.error && data.error !== 'action' ? 'error' : 'empty'));
      for (const event of data?.votes || []) appendCard(view, event, true, data.defaultCloses);
      if (data?.managedVotes?.length) {
        const history = document.createElement('details');
        history.innerHTML = '<summary>' + t('manage') + '</summary>';
        view.append(history);
        for (const event of data.managedVotes) appendCard(history, event, false, data.defaultCloses);
      }
      survey(view, data, points);
    }

    function appendCard(parent, event, active, defaultCloses) {
      const card = document.createElement('article');
      card.style.cssText = U.card;
      parent.append(card);
      function paint(vote) {
        const results = vote.results || [];
        const total = results.reduce((sum, count) => sum + (Number(count) || 0), 0);
        card.innerHTML = '<h2>' + L.esc(vote.title) + '</h2>' +
          (vote.closes ? '<p class="muted">' + U.time(vote.closes, { dateStyle: 'medium', timeStyle: 'short' }) + ' KST</p>' : '') +
          (vote.choices || []).map((label, i) => {
          const count = Number(results[i]) || 0;
          const select = active && vote.myChoice == null
            ? U.button(t('choose', { choice: label }), 'data-choice="' + i + '" style="width:100%"')
            : '<strong>' + L.esc(label) + (vote.myChoice === i ? ' · ' + t('mine') : '') + '</strong>';
          return '<div style="margin:12px 0">' + select + '<div><progress style="width:75%;accent-color:var(--s)" max="' +
            Math.max(1, total) + '" value="' + count + '" aria-label="' + L.esc(label) + '"></progress> ' + t('count', { n: count }) + '</div></div>';
        }).join('') + '<div class="shell-actions">' + [['edit', 'edit'], ['close', 'closePoll'], ['delete', 'deletePoll']]
          .filter(([action]) => vote.manage?.[action]).map(([action, label]) => U.button(t(label), 'data-vote-action="' + action + '"'))
          .join('') + '</div>';
        for (const button of card.querySelectorAll('[data-vote-action]')) button.onclick = () => {
          const action = button.dataset.voteAction;
          if (action === 'edit') voteForm(vote, defaultCloses, refresh);
          else confirmVote(vote, action, refresh);
        };
        const buttons = Array.from(card.querySelectorAll('[data-choice]'));
        for (const button of buttons) {
          button.onclick = async () => {
            if (L.needLogin() || button.disabled) return;
            buttons.forEach(item => { item.disabled = true; });
            const choice = Number(button.dataset.choice);
            const result = await L.api('vote', { id: vote.id, choice });
            if (!card.isConnected) return;
            if (!result || result.error) {
              buttons.forEach(item => { item.disabled = false; });
              return U.error(result);
            }
            const updated = results.slice();
            updated[choice] = (Number(updated[choice]) || 0) + 1;
            paint({ ...vote, myChoice: choice, results: updated, ...result.vote,
              ...(vote.manage && { manage: { ...vote.manage, locked: true } }) });
            pointsToast(result.gained);
          };
        }
      }
      paint(event);
    }
    draw(data);
  }

  const clipName = (cup, index) => {
    const item = cup.items[index];
    return item ? L.esc([item.dj, item.title].filter(Boolean).join(' · ')) : '';
  };

  // done(winner, path): play1 — 결승이 끝나면 바로 저장 화면으로 (없으면 예전처럼 '결과 저장' 버튼)
  function bracket(view, cup, done) {
    let round = cup.items.map((_, index) => index), next = [], path = [], i = 0;
    const name = index => clipName(cup, index);
    function paint() {
      if (round.length === 1 && done) return done(round[0], path.slice());
      if (round.length === 1) {
        view.innerHTML = '<article style="' + U.card + '"><h2>' + t('winner') + '</h2><p>' + name(round[0]) +
          '</p>' + U.button(t('save'), 'data-save', true) + '<p data-result role="status"></p></article>';
        const save = view.querySelector('[data-save]');
        save.onclick = async () => {
          if (L.needLogin() || save.disabled) return;
          save.disabled = true;
          const response = await L.api('cup_play', { id: cup.id, winner: round[0], path });
          if (!view.isConnected) return;
          if (!response || response.error) {
            if (response?.error !== 'dup') save.disabled = false;
            else view.querySelector('[data-result]').innerHTML = t('played');
            return U.error(response);
          }
          view.querySelector('[data-result]').innerHTML = Number(response.gained) > 0
            ? t('earned', { n: Number(response.gained) }) : response.practice ? t('cupPracticeDone') : U.t('saved');
        };
        return;
      }
      view.innerHTML = '<h2>' + (round.length === 2 ? t('final') :
        t('round', { n: round.length, match: i / 2 + 1, total: round.length / 2 })) +
        '</h2><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">' +
        round.slice(i, i + 2).map(index => {
          const yt = cup.items[index].yt;
          return '<article style="' + U.card + ';padding:8px">' +
            (/^[\w-]{11}$/.test(yt || '') ? '<iframe title="' + name(index) + '" style="' + U.media +
              ';aspect-ratio:9/16" loading="lazy" allowfullscreen src="https://www.youtube.com/embed/' + yt + '?playsinline=1"></iframe>' : '') +
            U.button(name(index), 'data-pick="' + index + '" style="width:100%;padding:8px;margin-top:8px"', true) + '</article>';
        }).join('') + '</div>';
      view.querySelectorAll('[data-pick]').forEach(button => {
        button.onclick = () => {
          const pick = Number(button.dataset.pick);
          next.push(pick);
          path.push(pick);
          i += 2;
          if (i === round.length) {
            round = next;
            next = [];
            i = 0;
          }
          paint();
          view.querySelector('[data-pick], [data-save]')?.focus({ preventScroll: true });
        };
      });
    }
    paint();
  }

  // ── 놀거리 1차 (play1): 무제한 · 주제전 · 같은 우승 % ──
  const THEME_COLOR = { '2f': 'var(--g)', '3f': 'var(--s)', new: 'var(--ok)' };
  const cupTitle = cup => cup.theme ? t('theme' + cup.theme) : L.esc(cup.title);
  const themeBadge = cup => cup.theme ? '<span data-cup-theme style="display:inline-block;padding:2px 10px;' +
    'border-radius:999px;font-size:.75rem;font-weight:800;border:1px solid ' + THEME_COLOR[cup.theme] + ';color:' +
    THEME_COLOR[cup.theme] + '">' + t('cupTheme') + '</span>' : '';

  function cupList(view, data, start) {
    const entries = (data?.cups || []).filter(cup => Array.isArray(cup.items) && cup.items.length === 16)
      .sort((a, b) => Number(Boolean(b.theme)) - Number(Boolean(a.theme)));
    const hint = L.me && entries.length ? '<p class="muted" data-cup-hint>' + t(L.me.access?.locked ? 'cupPractice' : data.played ? 'cupFree' : 'cupFirst') + '</p>' : '';
    view.innerHTML = hint + (entries.map((cup, i) => {
      const color = THEME_COLOR[cup.theme];
      const mine = Number.isInteger(cup.myWinner) && cup.items[cup.myWinner];
      const meta = [t('cupVoters', { n: Number(cup.voters) || 0 })]
        .concat(mine ? [t('cupMine', { name: [mine.dj, mine.title].filter(Boolean).join(' · ') })] : []);
      return '<article data-cup-card style="' + U.card + (color ? ';border-left:4px solid ' + color : '') + '">' +
        themeBadge(cup) + '<h2 style="margin:6px 0">' + cupTitle(cup) + '</h2>' +
        '<p class="muted" style="margin:0 0 12px">' + meta.join(' · ') + '</p>' +
        U.button(t('cupGo'), 'data-cup="' + i + '" style="width:100%"', true) + '</article>';
    }).join('') || U.status(data?.error && data.error !== 'action' ? 'error' : 'empty'));
    view.querySelectorAll('[data-cup]').forEach(button => {
      button.onclick = () => { if (!L.needLogin()) start(entries[Number(button.dataset.cup)]); };
    });
  }

  function cupResult(view, cup, winner, path, again, other) {
    const color = THEME_COLOR[cup.theme] || 'var(--g)';
    view.innerHTML = '<article data-cup-result style="' + U.card + ';border-color:' + color + '">' + themeBadge(cup) +
      '<p class="muted" style="margin:6px 0 0">' + cupTitle(cup) + ' · ' + t('winner') + '</p>' +
      '<h2 tabindex="-1" data-cup-winner style="margin:6px 0 12px">' + clipName(cup, winner) + '</h2>' +
      '<div data-cup-outcome><p class="muted" role="status">' + t('cupSaving') + '</p></div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px">' +
      U.button(t('cupAgain'), 'data-cup-again style="min-width:0;padding:0 8px"', true) +
      U.button(t('cupOther'), 'data-cup-other style="min-width:0;padding:0 8px"') + '</div></article>';
    const outcome = view.querySelector('[data-cup-outcome]');
    view.querySelector('[data-cup-again]').onclick = again;
    view.querySelector('[data-cup-other]').onclick = other;
    view.querySelector('[data-cup-winner]').focus({ preventScroll: true });
    async function save() {
      outcome.innerHTML = '<p class="muted" role="status">' + t('cupSaving') + '</p>';
      const response = await L.api('cup_play', { id: cup.id, winner, path });
      if (!outcome.isConnected) return;
      if (!response || response.error) {
        if (response?.error === 'auth') L.needLogin();
        const retry = !['closed', 'missing', 'auth', 'dup'].includes(response?.error);
        outcome.innerHTML = '<p role="alert">' + U.t(response?.error === 'dup' ? 'dup' : 'failed') + '</p>' +
          (retry ? U.button(t('cupRetry'), 'data-cup-retry style="width:100%"') : '');
        const button = outcome.querySelector('[data-cup-retry]');
        if (button) button.onclick = save;
        return;
      }
      const same = response.same;
      const pct = Math.max(0, Math.min(100, Math.round(Number(same?.pct) || 0)));
      const gained = Number(response.gained) || 0;
      outcome.innerHTML = (same ? '<p role="status" data-cup-same style="margin:0 0 8px;font-weight:800">' +
        t('cupSame', { pct }) + '</p><div aria-hidden="true" style="height:8px;border-radius:999px;background:var(--line-2);' +
        'overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color + '"></div></div>'
        : '<p role="status">' + (response.practice ? t('cupPracticeDone') : U.t('saved')) + '</p>') +
        (gained > 0 ? '<p data-cup-points style="margin:10px 0 0;font-weight:800;color:var(--g)">' +
          t('cupPoints', { n: gained }) + '</p>' : '');
    }
    save();
  }

  async function cups(root, params) {
    const view = U.mount(root, '<h1>' + t('cup') + '</h1>' + U.link('#/play', t('back')));
    const data = await L.api('cups');
    if (!view.isConnected) return;
    if (L.open('play1') || data?.play1 === true) {
      let list = data;
      const start = cup => bracket(view, cup, (winner, path) => cupResult(view, cup, winner, path,
        () => start(cup), showList));
      async function showList() {
        view.innerHTML = U.status('loading', true);
        list = await L.api('cups');
        if (view.isConnected) cupList(view, list, start);
      }
      const direct = params?.id && (list?.cups || []).find(cup => cup.id === params.id && cup.items?.length === 16);
      if (direct && L.me) start(direct);
      else cupList(view, list, start);
      return;
    }
    const entries = (data?.cups || []).filter(cup => Array.isArray(cup.items) && cup.items.length === 16);
    view.innerHTML = entries.map((cup, i) => '<article style="' + U.card + '"><h2>' + L.esc(cup.title) + '</h2>' +
      (data.played ? '<p>' + t('played') + '</p>' : U.button(t('start'), 'data-cup="' + i + '"', true)) +
      '</article>').join('') || U.status(data?.error && data.error !== 'action' ? 'error' : 'empty');
    view.querySelectorAll('[data-cup]').forEach(button => {
      button.onclick = () => { if (!L.needLogin()) bracket(view, entries[Number(button.dataset.cup)]); };
    });
  }

  L.screen('vote', { nav: 'play', auth: false, title: 'vote.title', render: votes });
  L.screen('cup', { nav: 'play', auth: false, title: 'vote.cup', render: cups });
})();
