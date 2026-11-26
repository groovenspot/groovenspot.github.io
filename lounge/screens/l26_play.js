(function (L) {
  L.screen('l26_play', {
    title: 'nav.l26_play',
    nav: 'l26_home',
    render(root) {
      L.renderL26Shell(root, 'nav.l26_play', [['play', 'nav.play']]);
    }
  });
})(window.Lounge);
