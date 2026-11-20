(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('play', {
    points: ['내 포인트', 'My points'], attend: ['오늘 출석하기', 'Claim daily attendance'],
    done: ['오늘 출석했어요', 'Attendance claimed today'], earned: ['{n}P 받았어요', 'You earned {n}P'],
    radio: ['그루브 라디오', 'Groove Radio'], radioText: ['운동·작업·드라이브·새벽', 'Workout, work, drive and late night'],
    vote: ['투표', 'Vote'], voteText: ['그루브의 다음 테마를 골라요', 'Choose Groove’s next theme'],
    cup: ['DJ 월드컵', 'DJ World Cup'], cupText: ['DJ 영상 16개 중 내 최애를 골라요', 'Pick your favorite of 16 DJ clips'],
    djs: ['DJ 목록', 'DJs'], rewards: ['보상', 'Rewards'], rank: ['주간 순위', 'Weekly rankings'],
    shop: ['굿즈', 'Merch'], challenge: ['포토 챌린지', 'Photo challenge'], songs: ['어제 나온 곡', 'Last night’s tracks']
  });

  function render(root) {
    const view = U.mount(root, '<h1>' + L.esc(L.t('nav.play')) + '</h1>');
    view.innerHTML = '<section style="' + U.card + ';border-top:3px solid var(--g)"><h2 data-points>' + t('points') +
      '</h2>' + U.button(t('attend'), 'data-attend', true) + '</section>' +
      [['radio', 'g'], ['vote', 's'], ['cup', 'g']].map(([name, color]) =>
        '<article style="' + U.card + ';border-left:4px solid var(--' + color + ')">' +
        U.link('#/' + name, t(name)) + '<p class="muted">' + t(name + 'Text') + '</p></article>'
      ).join('') + '<div class="lounge-list">' +
      [['djs'], ['rewards', 'rewards'], ['rank', 'rewards'], ['shop', 'shop'],
        ['challenge', 'challenge'], ['songs', 'songs']].map(([name, gate]) =>
        '<article class="shell-card">' + (!gate || L.open(gate) ? U.link('#/' + name, t(name)) :
          '<h2>' + t(name) + '</h2><p class="muted">' + L.esc(L.t('core.soon')) + '</p>') + '</article>'
      ).join('') + (L.guessTile?.() ?? '') + '</div>';

    const heading = view.querySelector('[data-points]');
    const button = view.querySelector('[data-attend]');
    function showPoints(points) {
      heading.textContent = L.t('play.points') + ' · ' + (Number(points) || 0) + 'P';
    }
    if (L.me) {
      L.api('points').then(data => {
        if (view.isConnected && !button.disabled) showPoints(data?.points ?? L.me?.points);
      });
    }
    button.onclick = async () => {
      if (L.needLogin() || button.disabled) return;
      button.disabled = true;
      const data = await L.api('attend');
      if (!view.isConnected) return;
      if (!data || (data.error && data.error !== 'dup')) {
        button.disabled = false;
        return U.error(data);
      }
      button.textContent = L.t('play.done');
      if (!data.error) {
        showPoints(data.points);
        L.toast(L.t('play.earned', { n: Number(data.gained) || 0 }));
      }
    };
  }
  L.screen('play', { nav: 'play', auth: false, title: 'nav.play', render });
})();
