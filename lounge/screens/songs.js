(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('songs', { title: ['어제 나온 곡', 'Last night’s tracks'] });

  async function render(root, { day } = {}) {
    const view = U.mount(root, '<h1>' + t('title') + '</h1>');
    const result = await L.api('songs', day === undefined ? {} : { day });
    if (!view.isConnected) return;
    if (result.error || !Array.isArray(result.tracks)) {
      view.innerHTML = result.error === 'closed'
        ? '<p role="status">' + L.esc(L.t('core.soon')) + '</p>' : U.status('error');
      return;
    }

    const date = U.time(result.day + 'T12:00:00+09:00', { dateStyle: 'full' });
    view.innerHTML = (date ? '<p class="muted">' + date + '</p>' : '') +
      (result.tracks.length ? '<ul class="lounge-list shell-ledger">' + result.tracks.map(track =>
        '<li class="shell-card"><strong>' + L.esc(track.title) + '</strong>' +
        (track.artist ? '<p>' + L.esc(track.artist) + '</p>' : '') +
        '<p class="muted">' + L.esc([track.at, track.floor, track.dj].filter(Boolean).join(' · ')) + '</p></li>'
      ).join('') + '</ul>' : U.status('empty'));
  }

  L.screen('songs', { nav: 'play', title: 'songs.title', render });
})();
