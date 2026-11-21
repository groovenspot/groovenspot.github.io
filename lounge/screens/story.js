/* 스토리 (4차 · lounge/SPEC4.md 7장) — 주인: 스토리 작업창(D). 지금은 빈 틀: 다른 화면이 불러도 아무 일도 안 한다. */
(function () {
  var L = window.Lounge;
  // 피드 맨 위 스토리 줄을 el 안에 그린다. 스토리 기능이 꺼져 있거나 보여줄 게 없으면 el.hidden = true.
  L.storyTray = function (el) { if (el) el.hidden = true; return Promise.resolve(); };
  // 그 사람의 스토리를 전체 화면으로 연다 (없으면 false).
  L.storyOpen = function (nick) { return Promise.resolve(false); };
  // 스토리 모양 뷰어를 다른 곳(하이라이트)에서도 쓴다: items = [{ photo, text, at, author:{nick,photo} }]
  L.storyViewer = function (opt) { return null; };
  // 스토리 올리기 화면 열기
  L.storyNew = function () { return Promise.resolve(false); };
})();
