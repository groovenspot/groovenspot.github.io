(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('vote', {
    title: ['투표', 'Vote'], back: ['놀거리', 'Play'], choose: ['{choice}에 투표', 'Vote for {choice}'],
    count: ['{n}표', '{n} votes'], mine: ['내 선택', 'My choice'],
    cup: ['DJ 월드컵', 'DJ World Cup'], start: ['16강 시작', 'Start round of 16'],
    round: ['{n}강 · {match}/{total}', 'Round of {n} · {match}/{total}'], final: ['결승', 'Final'],
    winner: ['내가 고른 우승', 'Your winner'], save: ['결과 저장', 'Save result'],
    played: ['오늘은 이미 월드컵을 했어요', 'You already played today'],
    survey: ['어젯밤은 어땠어요?', 'How was last night?'], music: ['음악', 'Music'],
    mood: ['분위기', 'Atmosphere'], crowd: ['붐빔', 'Crowd'], send: ['설문 보내기', 'Send feedback'],
    earned: ['{n}P 받았어요', 'You earned {n}P']
  });
  const pointsToast = gained => L.toast(Number(gained) > 0 ? L.t('vote.earned', { n: Number(gained) }) : L.t('screens.saved'));

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
    if (!view.isConnected) return;
    view.innerHTML = '';
    if (!data?.votes?.length) view.innerHTML = U.status(data?.error && data.error !== 'action' ? 'error' : 'empty');
    for (const event of data?.votes || []) {
      const card = document.createElement('article');
      card.style.cssText = U.card;
      view.append(card);
      function paint(vote) {
        const results = vote.results || [];
        const total = results.reduce((sum, count) => sum + (Number(count) || 0), 0);
        card.innerHTML = '<h2>' + L.esc(vote.title) + '</h2>' + (vote.choices || []).map((label, i) => {
          const count = Number(results[i]) || 0;
          const select = vote.myChoice == null
            ? U.button(t('choose', { choice: label }), 'data-choice="' + i + '" style="width:100%"')
            : '<strong>' + L.esc(label) + (vote.myChoice === i ? ' · ' + t('mine') : '') + '</strong>';
          return '<div style="margin:12px 0">' + select + '<div><progress style="width:75%;accent-color:var(--s)" max="' +
            Math.max(1, total) + '" value="' + count + '" aria-label="' + L.esc(label) + '"></progress> ' + t('count', { n: count }) + '</div></div>';
        }).join('');
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
            paint(result.vote || { ...vote, myChoice: choice, results: updated });
            pointsToast(result.gained);
          };
        }
      }
      paint(event);
    }
    survey(view, data, points);
  }

  function bracket(view, cup) {
    let round = cup.items.map((_, index) => index), next = [], path = [], i = 0;
    const name = index => {
      const item = cup.items[index];
      return L.esc([item.dj, item.title].filter(Boolean).join(' · '));
    };
    function paint() {
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
            ? t('earned', { n: Number(response.gained) }) : U.t('saved');
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

  async function cups(root) {
    const view = U.mount(root, '<h1>' + t('cup') + '</h1>' + U.link('#/play', t('back')));
    const data = await L.api('cups');
    if (!view.isConnected) return;
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
