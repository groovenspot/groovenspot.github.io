(() => {
  const L = Lounge, U = LoungeScreenUI, P = LoungePostUI;
  const t = U.words('photos', {
    title: ['어젯밤 사진', 'Last night’s photos'], back: ['앨범 목록', 'All albums'],
    take: ['내려 주세요', 'Take this down'], photo: ['사진 {n} 크게 보기', 'Enlarge photo {n}'],
    empty: ['아직 올라온 앨범이 없어요.', 'No albums have been posted yet.'],
    noPhotos: ['이 앨범에 볼 수 있는 사진이 없어요.', 'There are no visible photos in this album.'],
    missing: ['이 앨범을 볼 수 없어요.', 'This album is unavailable.']
  });

  function render(root, { id } = {}) {
    const view = P.mount(root, t('title'), id ? U.link('#/photos', t('back')) : U.link('#/feed', L.esc(L.t('nav.feed'))));
    view.innerHTML = id ? '<div class="post-album-grid" data-post-layout>' +
      P.skeleton('square') + P.skeleton('square') + '</div>' : P.skeleton('cover');

    const albumIds = new Set();
    async function load(before) {
      const data = await L.api(id ? 'album_get' : 'albums', id ? { id } : before ? { before } : {});
      if (!view.isConnected) return;
      if (data?.error) {
        if (before) {
          const button = view.querySelector('[data-more-albums]');
          if (button) button.disabled = false;
          U.error(data);
          return;
        }
        view.innerHTML = P.state(data.error === 'action' ? t('empty') :
          data.error === 'missing' ? t('missing') : U.t('error'));
        return;
      }
      if (!id) {
        const albums = (data?.albums || []).filter(album => {
          if (albumIds.has(album.id)) return false;
          albumIds.add(album.id);
          return true;
        }).map(album => {
          const cover = P.photo(album.cover || album.photos?.[0]);
          const title = L.esc(album.title ?? album.text) || t('title');
          return '<article class="post-card">' + (cover.thumb ? '<div class="post-album-cover">' +
            P.image(cover.thumb, '', true, cover) + '</div>' : '') +
            '<div class="post-pad"><h2>' + title + '</h2><p class="muted">' + L.esc(album.day) + '</p>' +
            U.link('#/photos/' + encodeURIComponent(album.id), title) + '</div></article>';
        }).join('');
        if (!before) view.innerHTML = albumIds.size ? '<div class="post-album-list"></div><div data-page></div>' : P.state(t('empty'));
        if (albumIds.size) {
          view.querySelector('.post-album-list').insertAdjacentHTML('beforeend', albums);
          const page = view.querySelector('[data-page]');
          page.innerHTML = data.before && data.before !== before ? U.button(L.esc(L.t('feed.more')), 'data-more-albums') : '';
          const button = page.querySelector('button');
          if (button) button.onclick = () => {
            button.disabled = true;
            load(data.before);
          };
        }
        return;
      }
      const photos = (data?.photos || data?.album?.photos || []).map(item => ({
        ...P.photo(item), key: item?.src ?? item?.key ?? item?.photo ?? item?.id ?? item
      })).filter(photo => photo.src);
      view.innerHTML = '<h2 class="post-section">' + L.esc(data?.album?.title ?? data?.album?.text ?? data?.title) + '</h2>' +
        (photos.length ? '<div class="post-album-grid" data-post-layout>' +
          photos.map((photo, i) => '<button type="button" class="post-photo-button" data-photo="' + i + '">' +
            P.image(photo.thumb, t('photo', { n: i + 1 }), false, photo) + '</button>').join('') + '</div>' : P.state(t('noPhotos')));
      if (data.album && window.LoungeShare) L.api('config').then(settings => {
        if (!view.isConnected || settings.open?.share !== true) return;
        const actions = document.createElement('div');
        actions.className = 'post-bar post-actions';
        view.append(actions);
        window.LoungeShare.actions(actions, { ...data.album, id: data.album.id || id }, settings);
      });
      view.querySelectorAll('[data-photo]').forEach(button => {
        button.onclick = () => {
          const i = Number(button.dataset.photo);
          const photo = photos[i];
          const el = U.sheet('<figure style="margin:12px 0">' + P.zoomImage(photo.src, t('photo', { n: i + 1 }), photo) +
            '</figure>' + U.button(t('take'), 'data-takedown'));
          el.querySelector('[data-takedown]').onclick = () => U.reason({
            title: t('take'), reasons: ['me', 'sexual', 'abuse', 'illegal', 'etc'],
            submit: why => L.api('takedown', { photo: photo.key, why }),
            done: () => {
              const grid = button.parentElement;
              button.remove();
              if (grid && !grid.querySelector('[data-photo]')) grid.outerHTML = P.state(t('noPhotos'));
            }
          });
        };
      });
    }
    load();
  }
  L.screen('photos', { nav: 'feed', auth: false, title: 'photos.title', render });
})();
