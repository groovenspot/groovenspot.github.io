/* 탐색·검색·해시태그 (4차 · lounge/SPEC4.md 8장) — 주인: 틀 작업창(A). 지금은 빈 틀. */
(function () {
  var L = window.Lounge;
  var soon = function (root) { root.innerHTML = '<p class="muted">' + L.esc(L.t('core.soon')) + '</p>'; };
  L.screen('explore', { nav: 'feed', auth: false, render: soon });
  L.screen('tag', { nav: 'feed', auth: false, render: soon });
})();
