/* 탐색·검색·해시태그 (4차 · lounge/SPEC4.md 8장) — 주인: 틀 작업창(A). 지금은 빈 틀. */
(function () {
  var L = window.Lounge;
  var soon = function (root) { root.innerHTML = '<p class="muted">' + L.esc(L.t('core.soon')) + '</p>'; };
  L.i18n({
    ko: { 'explore4.title': '탐색', 'explore4.tag': '태그' }, en: { 'explore4.title': 'Explore', 'explore4.tag': 'Tag' },
    ja: { 'explore4.title': '発見', 'explore4.tag': 'タグ' }, zh: { 'explore4.title': '发现', 'explore4.tag': '标签' }
  });
  L.screen('explore', { nav: 'feed', auth: false, title: 'explore4.title', render: soon });
  L.screen('tag', { nav: 'feed', auth: false, title: 'explore4.tag', render: soon });
})();
