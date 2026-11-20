(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('rank', { title: ['주간 순위', 'Weekly rankings'] });

  async function render(root) {
    const view = U.mount(root, '<h1>' + t('title') + '</h1>');
    const result = await L.api('rank');
    if (!view.isConnected) return;
    if (['closed', 'action'].includes(result.error)) {
      view.innerHTML = '<p role="status">' + L.esc(L.t('core.soon')) + '</p>';
      return;
    }
    if (result.error) {
      view.innerHTML = U.status('error');
      return;
    }

    const rows = result.rank;
    view.innerHTML = (result.week ? '<p class="muted">' + L.esc(result.week) + '</p>' : '') +
      (Array.isArray(rows) && rows.length ? '<ol class="lounge-list">' + rows.slice(0, 10).map(row =>
        '<li class="shell-card"><div class="shell-row"><strong>' + L.esc(row.nick) +
        '</strong><span>' + L.esc(Number(row.points) || 0) + 'P</span></div></li>').join('') + '</ol>' : U.status('empty'));
  }

  L.screen('rank', { nav: 'play', title: 'rank.title', render });
})();
