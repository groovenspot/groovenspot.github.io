(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('photos', {
    title: ['어젯밤 사진', 'Last night’s photos'], back: ['앨범 목록', 'All albums'],
    take: ['내려 주세요', 'Take this down'], photo: ['사진 {n} 크게 보기', 'Enlarge photo {n}']
  });

  function render(root, { id } = {}) {
    const view = U.mount(root, '<h1>' + t('title') + '</h1>' +
      (id ? U.link('#/photos', t('back')) : U.link('#/feed', L.esc(L.t('nav.feed')))));

    async function load() {
      const data = await L.api(id ? 'album_get' : 'albums', id ? { id } : {});
      if (!view.isConnected) return;
      if (data?.error) {
        view.innerHTML = U.status(data.error === 'action' ? 'empty' : 'error');
        return;
      }
      if (!id) {
        view.innerHTML = (data?.albums || []).map(album => {
          const src = U.image(album.cover?.url || album.cover || album.photos?.[0]?.url || album.photos?.[0]);
          return '<article style="' + U.card + '">' + (src ? '<img loading="lazy" alt="" style="' + U.media +
            '" src="' + L.esc(src) + '">' : '') + '<h2>' + L.esc(album.title ?? album.text) + '</h2><p class="muted">' +
            L.esc(album.day) + '</p>' + U.link('#/photos/' + encodeURIComponent(album.id), L.esc(album.title ?? album.text) || t('title')) + '</article>';
        }).join('') || U.status('empty');
        return;
      }
      const photos = (data?.photos || data?.album?.photos || []).map(item => ({
        key: item?.key ?? item?.photo ?? item?.id ?? item,
        url: U.image(item?.url || item?.key || item)
      })).filter(photo => photo.url);
      view.innerHTML = '<h2>' + L.esc(data?.album?.title ?? data?.album?.text ?? data?.title) + '</h2><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">' +
        (photos.map((photo, i) => U.button('<img loading="lazy" style="' + U.media +
          ';aspect-ratio:1;object-fit:cover" alt="' + t('photo', { n: i + 1 }) + '" src="' + L.esc(photo.url) + '">',
          'data-photo="' + i + '" style="padding:4px;width:100%"')).join('') || U.status('empty')) + '</div>';
      view.querySelectorAll('[data-photo]').forEach(button => {
        button.onclick = () => {
          const i = Number(button.dataset.photo);
          const photo = photos[i];
          const el = U.sheet('<figure style="margin:12px 0"><img style="' + U.media +
            ';max-height:65vh;object-fit:contain" alt="' + t('photo', { n: i + 1 }) + '" src="' + L.esc(photo.url) +
            '"></figure>' + U.button(t('take'), 'data-takedown'));
          el.querySelector('[data-takedown]').onclick = () => U.reason({
            title: t('take'), reasons: ['me', 'sexual', 'abuse', 'illegal', 'etc'],
            submit: why => L.api('takedown', { photo: photo.key, why }),
            done: () => {
              const grid = button.parentElement;
              button.remove();
              if (grid && !grid.querySelector('[data-photo]')) grid.innerHTML = U.status('empty');
            }
          });
        };
      });
    }
    load();
  }
  L.screen('photos', { nav: 'feed', auth: false, title: 'photos.title', render });
})();
