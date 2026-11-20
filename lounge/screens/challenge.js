(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('challenge', {
    title: ['포토 챌린지', 'Photo challenge'], back: ['피드로', 'Back to feed'],
    active: ['진행 중', 'Open now'], upcoming: ['곧 시작해요', 'Starts soon'], ended: ['종료', 'Ended'],
    enter: ['사진으로 참여하기', 'Enter with a photo'], ranking: ['좋아요 순위', 'Like rankings'],
    winner: ['1등', 'Winner'], likes: ['좋아요 {n}개', '{n} likes'],
    unavailable: ['사진 글 올리기는 준비 중이에요.', 'Photo posting is coming soon.']
  });
  const date = at => U.time(at, { dateStyle: 'medium', timeStyle: 'short' });

  async function render(root) {
    const view = U.mount(root, '<h1>' + t('title') + '</h1>' + U.link('#/feed', t('back')));
    const config = await L.api('config');
    if (!view.isConnected) return;
    if (!config.open?.challenge) {
      view.innerHTML = U.status(config.error ? 'error' : 'soon');
      return;
    }
    const data = await L.api('challenge');
    if (!view.isConnected) return;
    if (!Array.isArray(data.challenges)) {
      view.innerHTML = U.status(data.error === 'closed' ? 'soon' : 'error');
      return;
    }
    view.innerHTML = data.challenges.map(item => {
      const status = ['active', 'upcoming', 'ended'].includes(item.status) ? item.status : 'ended';
      const list = (item.ranking || []).map(({ rank, likes, post }) => {
        const src = U.image(post.photos?.[0]);
        return '<li value="' + (Number(rank) || 1) + '" style="margin-block:8px"><a href="#/feed/' + L.esc(encodeURIComponent(post.id)) +
          '" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
          (src ? '<img width="72" height="72" loading="lazy" alt="" style="object-fit:cover;border-radius:8px" src="' + L.esc(src) + '">' : '') +
          '<span><strong>' + (rank === 1 && status === 'ended' ? t('winner') + ' · ' : '') +
          L.esc(post.author?.nick) + '</strong><br><small>' + t('likes', { n: Number(likes) || 0 }) + '</small></span></a></li>';
      }).join('');
      return '<article style="' + U.card + '"><header><h2>' + L.esc(item.title) + '</h2><p class="muted">' +
        t(status) + ' · ' + date(item.starts) + ' – ' + date(item.ends) + '</p></header>' +
        (status === 'active' ? (config.open.posts || data.memberPosts
          ? U.link('#/compose?challenge=' + encodeURIComponent(item.id), t('enter'))
          : '<p class="muted">' + t('unavailable') + '</p>') : '') +
        (status === 'upcoming' ? '' : '<h3>' + t('ranking') + '</h3>' +
          (list ? '<ol style="padding-left:24px">' + list + '</ol>' : U.status('empty'))) + '</article>';
    }).join('') || U.status('empty');
  }

  L.screen('challenge', { nav: 'feed', auth: false, title: 'challenge.title', render });
})();
