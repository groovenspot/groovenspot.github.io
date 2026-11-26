(function (L) {
  L.screen('l26_lounge', {
    title: 'nav.l26_lounge',
    render(root) {
      L.renderL26Shell(root, 'nav.l26_lounge', [
        ['feed', 'nav.feed'], ['rooms', L.open('openchat') ? 'nav.openchat' : 'nav.rooms']
      ]);
    }
  });
})(window.Lounge);
