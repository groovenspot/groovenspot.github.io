(() => {
  const L = Lounge, U = LoungeScreenUI, P = LoungePostUI;
  const t = U.words('challenge', {
    title: ['포토 챌린지', 'Photo challenge'], back: ['피드로', 'Back to feed'],
    active: ['진행 중', 'Open now'], upcoming: ['곧 시작해요', 'Starts soon'], ended: ['종료', 'Ended'],
    enter: ['사진으로 참여하기', 'Enter with a photo'], ranking: ['좋아요 순위', 'Like rankings'],
    winner: ['1등', 'Winner'], likes: ['좋아요 {n}개', '{n} likes'],
    unavailable: ['사진 글 올리기는 준비 중이에요.', 'Photo posting is coming soon.'],
    empty: ['아직 포토 챌린지가 없어요.', 'There are no photo challenges yet.'],
    entries: ['아직 참가한 사진이 없어요.', 'No photos have been entered yet.']
  });
  const date = at => U.time(at, { dateStyle: 'medium', timeStyle: 'short' });

  async function render(root) {
    const view = P.mount(root, t('title'), U.link('#/feed', t('back')));
    view.innerHTML = P.skeleton();
    const data = await L.api('challenge');
    if (!view.isConnected) return;
    if (!Array.isArray(data.challenges)) {
      view.innerHTML = P.state(U.t(data.error === 'closed' ? 'soon' : 'error'));
      return;
    }
    const challenges = data.challenges.map(item => {
      const status = ['active', 'upcoming', 'ended'].includes(item.status) ? item.status : 'ended';
      const list = (item.ranking || []).map(({ rank, likes, post }) => {
        const src = U.image(post.photos?.[0]);
        const winner = rank === 1 && status === 'ended';
        const floor = post.floor === '2F' || post.floor === '3F' ? post.floor : '';
        return '<li value="' + (Number(rank) || 1) + '"><a href="#/feed/' + L.esc(encodeURIComponent(post.id)) + '"' +
          (winner ? ' class="post-winner"' : '') + ' data-post-layout' + (floor ? ' data-floor="' + floor + '"' : '') + '>' +
          '<span class="post-rank" aria-hidden="true">' + (Number(rank) || 1) + '</span>' +
          (src ? P.image(src) : '<span class="post-media" aria-hidden="true"></span>') +
          '<span class="post-rank-body"><strong>' + (winner ? t('winner') + ' · ' : '') + L.esc(post.author?.nick) + '</strong>' +
          '<span class="post-meta"><span>' + t('likes', { n: Number(likes) || 0 }) + '</span>' +
          (floor ? '<span class="post-floor">' + floor + '</span>' : '') + '</span></span></a></li>';
      }).join('');
      return '<article class="post-card post-pad post-challenge"><header><h2>' + L.esc(item.title) + '</h2><p class="post-meta">' +
        '<span' + (status === 'active' ? ' class="post-floor"' : '') + '>' + t(status) + '</span><span>' +
        date(item.starts) + ' – ' + date(item.ends) + '</span></p></header>' +
        (status === 'active' ? (data.memberPosts
          ? '<div>' + U.link('#/compose?challenge=' + encodeURIComponent(item.id), t('enter')) + '</div>'
          : '<p class="muted">' + t('unavailable') + '</p>') : '') +
        (status === 'upcoming' ? '' : '<h3>' + t('ranking') + '</h3>' +
          (list ? '<ol class="post-ranking" role="list">' + list + '</ol>' : P.state(t('entries')))) + '</article>';
    }).join('');
    view.innerHTML = challenges ? '<div class="post-stack">' + challenges + '</div>' : P.state(t('empty'));
  }

  L.screen('challenge', { nav: 'feed', auth: false, selfGate: true, title: 'challenge.title', render });
})();
