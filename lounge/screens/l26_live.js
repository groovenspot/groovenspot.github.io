(function (L) {
  L.screen('l26_live', {
    title: 'nav.l26_live',
    render(root) {
      L.renderL26Shell(root, 'nav.l26_live', [['tonight', 'nav.tonight']]);
    }
  });
})(window.Lounge);
