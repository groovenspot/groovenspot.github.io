(() => {
  const L = Lounge, U = LoungeScreenUI;
  const t = U.words('profileEdit', {
    instagram: ['인스타그램 아이디', 'Instagram username'],
    instagramHelp: ['@ 없이 영문, 숫자, 점, 밑줄을 써 주세요.', 'Use letters, digits, periods or underscores, without the @.'],
    private: ['비공개 계정', 'Private account'],
    privateHelp: ['승인한 팔로워만 게시물과 팔로우 목록을 볼 수 있어요.', 'Only approved followers can see your posts and follow lists.'],
    badge: ['대표 배지', 'Featured badge'],
    noBadge: ['표시 안 함', 'None'],
    bioLimit: ['소개를 세 줄, 150자 이내로 써 주세요.', 'Use up to three lines and 150 characters for your bio.'],
    nickLimit: ['닉네임은 30일에 두 번까지 바꿀 수 있어요.', 'You can change your nickname twice every 30 days.'],
    photos: ['프로필 사진', 'Profile photos'],
    addPhoto: ['사진 추가', 'Add photo'],
    mainPhoto: ['대표 사진', 'Main photo'],
    makeMain: ['대표 사진으로', 'Make main photo'],
    removePhoto: ['삭제', 'Delete photo'],
    confirmRemove: ['이 프로필 사진을 삭제할까요?', 'Delete this profile photo?'],
    cancel: ['취소', 'Cancel'],
    nextPhoto: ['다음 사진', 'Next photo'],
    prevPhoto: ['이전 사진', 'Previous photo'],
    photoNumber: ['프로필 사진 {n}', 'Profile photo {n}'],
    photoLimit: ['프로필 사진은 다섯 장까지 추가할 수 있어요.', 'You can add up to five profile photos.']
  });
  const esc = L.esc;
  const meText = key => esc(L.t('me.' + key));

  function photoRows(user) {
    const rows = Array.isArray(user.photos) ? user.photos.filter(row => typeof row?.key === 'string') : [];
    const unique = [...new Map(rows.map(row => [row.key, row])).values()].slice(0, 5);
    const source = unique.length ? unique : user.photo ? [{ key: user.photo, main: true }] : [];
    const main = source.find(row => row.main) || source.find(row => row.key === user.photo) || source[0];
    return (user.locked && main ? [main] : source).map(row => ({
      key: row.key,
      src: U.image(row.url?.startsWith('/img/') ? row.key : row.url || row.key),
      main: row === main
    })).filter(row => row.src);
  }

  function photoError(error) {
    return error === 'photo_limit' ? L.t('profileEdit.photoLimit') : L.errorText({ error });
  }

  function photoViewer(rows, start = 0, change = null) {
    if (!rows.length) return;
    let list = rows, index = start, confirm = false, busy = false, startX;
    const panel = U.sheet('<h2>' + t('photos') + '</h2><div data-viewer class="profile3-photo-viewer"></div>');
    const content = panel.querySelector('[data-viewer]');

    function step(amount) {
      if (busy || confirm) return;
      index = Math.max(0, Math.min(index + amount, list.length - 1));
      paint();
      const focus = content.querySelector(amount > 0 ? '[data-next]:enabled' : '[data-prev]:enabled');
      (focus || panel).focus();
    }

    async function submit(action) {
      if (busy) return;
      const key = list[index].key;
      busy = true;
      for (const button of content.querySelectorAll('button')) button.disabled = true;
      const result = await change(action, key);
      if (!panel.isConnected) return;
      busy = false;
      confirm = false;
      if (!result.error) {
        list = result.photos;
        if (!list.length) { L.closeSheet(); return; }
        const match = list.findIndex(photo => photo.key === key);
        index = match < 0 ? Math.min(index, list.length - 1) : match;
      }
      paint();
      panel.focus();
      if (result.error) content.querySelector('[role=alert]').textContent = photoError(result.error);
    }

    function paint() {
      const photo = list[index];
      content.innerHTML = '<img src="' + esc(photo.src) + '" alt="' + t('photoNumber', { n: index + 1 }) +
        '"><div class="shell-actions profile3-photo-navigation">' +
        U.button(t('prevPhoto'), 'data-prev' + (index === 0 ? ' disabled' : '')) +
        '<span aria-live="polite">' + (index + 1) + ' / ' + list.length + '</span>' +
        U.button(t('nextPhoto'), 'data-next' + (index === list.length - 1 ? ' disabled' : '')) + '</div>' +
        (change ? confirm ? '<div class="shell-stack"><p>' + t('confirmRemove') + '</p><div class="shell-actions">' +
          U.button(t('removePhoto'), 'data-confirm-delete', true) + U.button(t('cancel'), 'data-cancel-delete') +
          '</div></div>' : '<div class="shell-actions">' +
          (photo.main ? '<strong>' + t('mainPhoto') + '</strong>' : U.button(t('makeMain'), 'data-make-main', true)) +
          U.button(t('removePhoto'), 'data-delete-photo') + '</div>' : '') +
        '<p class="shell-error" role="alert"></p>';
      content.querySelector('[data-prev]').onclick = () => step(-1);
      content.querySelector('[data-next]').onclick = () => step(1);
      const image = content.querySelector('img');
      image.onpointerdown = event => { if (event.pointerType === 'touch') startX = event.clientX; };
      image.onpointercancel = () => { startX = undefined; };
      image.onpointerup = event => {
        if (startX !== undefined && Math.abs(startX - event.clientX) > 36) step(startX > event.clientX ? 1 : -1);
        startX = undefined;
      };
      const bind = (attribute, callback) => {
        const button = content.querySelector('[data-' + attribute + ']');
        if (button) button.onclick = callback;
      };
      bind('make-main', () => submit('profile_photo_main'));
      bind('delete-photo', () => {
        confirm = true;
        paint();
        content.querySelector('[data-cancel-delete]').focus();
      });
      bind('confirm-delete', () => submit('profile_photo_del'));
      bind('cancel-delete', () => {
        confirm = false;
        paint();
        content.querySelector('[data-delete-photo]').focus();
      });
    }

    panel.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    });
    paint();
  }

  function photoEditor(editor, member, user) {
    let rows = photoRows(user), busy = false;
    function paint() {
      const main = rows.find(row => row.main) || rows[0];
      editor.innerHTML = '<h2>' + t('photos') + '</h2><div class="profile3-photo-primary">' +
        (main ? '<button type="button" data-main-photo aria-label="' + t('mainPhoto') +
          '"><img alt="" src="' + esc(main.src) + '"></button>' :
          '<span class="shell-avatar" aria-hidden="true">' + esc(Array.from(user.nick)[0] || 'G') + '</span>') +
        '</div><div class="profile3-photo-strip">' +
        rows.map((photo, i) => '<button type="button" data-photo-index="' + i + '" aria-label="' +
          t('photoNumber', { n: i + 1 }) + '"' + (photo.main ? ' aria-current="true"' : '') +
          '><img alt="" src="' + esc(photo.src) + '"></button>').join('') +
        (rows.length < 5 ? '<label class="btn profile3-photo-add"><span aria-hidden="true">＋</span> ' + t('addPhoto') +
          '<input type="file" accept="image/*" aria-label="' + t('addPhoto') + '" class="sr-only"></label>' : '') +
        '</div><p role="alert" class="shell-error"></p>';
      const primary = editor.querySelector('[data-main-photo]');
      if (primary) primary.onclick = () => { if (!busy) photoViewer(rows, rows.indexOf(main), change); };
      for (const button of editor.querySelectorAll('[data-photo-index]')) {
        button.onclick = () => { if (!busy) photoViewer(rows, Number(button.dataset.photoIndex), change); };
      }
      const picker = editor.querySelector('input[type=file]');
      if (picker) picker.onchange = async () => {
        const file = picker.files?.[0];
        if (!file || busy) return;
        picker.value = '';
        editor.setAttribute('aria-busy', 'true');
        picker.disabled = true;
        busy = true;
        try {
          const key = await L.upload(file, 'profile');
          if (!editor.isConnected || L.me?.id !== member.id) return;
          const result = await savePhoto('profile_photo_add', key);
          if (result.error && editor.isConnected) editor.querySelector('[role=alert]').textContent = photoError(result.error);
        } catch (error) {
          if (editor.isConnected) editor.querySelector('[role=alert]').textContent = photoError(error.message);
        } finally {
          busy = false;
          picker.disabled = false;
          editor.removeAttribute('aria-busy');
        }
      };
    }

    async function savePhoto(action, key) {
      const result = await L.api(action, { key });
      if (result.error) return result;
      const updated = Array.isArray(result.me?.photos) ? result.me :
        Array.isArray(result.photos) ? result : (await L.api('user', { nick: L.me?.nick || member.nick })).user;
      if (!updated || !editor.isConnected || L.me?.id !== member.id) return { error: 'network' };
      rows = photoRows(updated);
      L.me = { ...L.me, photos: updated.photos, photo: rows.find(row => row.main)?.key || '' };
      paint();
      return { photos: rows };
    }

    async function change(action, key) {
      if (busy) return { error: 'busy' };
      busy = true;
      try { return await savePhoto(action, key); }
      finally { busy = false; }
    }
    paint();
  }

  async function render(root) {
    const member = L.me;
    const view = U.mount(root, '<div class="shell-actions"><h1>' + meText('edit') + '</h1>' +
      U.link('#/me', esc(L.t('nav.me'))) + '</div>');
    const [profile, points] = await Promise.all([
      L.api('user', { nick: member.nick }), L.api('points')
    ]);
    if (!view.isConnected || (L.me && L.me !== member)) return;
    if (!profile.user) {
      if (!L.needLogin()) view.innerHTML = U.status('error');
      return;
    }
    const { user } = profile;
    const earned = (points.badges || []).filter(badge => badge.key && badge.got !== false && badge.got !== null && badge.got !== 0);
    const selected = typeof user.badge === 'string' ? user.badge : user.badge?.key;
    if (selected && !earned.some(badge => badge.key === selected)) earned.push({
      key: selected, label: typeof user.badge === 'object' ? user.badge.label : selected
    });
    const option = (value, label, selected) => '<option value="' + esc(value) + '"' +
      (value === selected ? ' selected' : '') + '>' + label + '</option>';
    view.innerHTML = '<section class="shell-card profile3-photo-editor" data-photo-editor></section><form class="shell-form">' +
      '<label class="shell-field">' + esc(L.t('auth.nick')) + '<input name="nick" required minlength="2" maxlength="12" value="' +
      esc(user.nick) + '"></label><label class="shell-field">' + meText('bio') +
      '<textarea name="bio" rows="3" aria-describedby="profile-bio-limit">' + esc(user.bio) + '</textarea></label>' +
      '<small id="profile-bio-limit" class="muted">' + t('bioLimit') + '</small>' +
      '<label class="shell-field">' + meText('floor') + '<select name="floor">' +
      ['', '2F', '3F'].map(value => option(value, value || meText('noFloor'), user.floor || '')).join('') + '</select></label>' +
      '<label class="shell-field">' + t('instagram') + '<input name="link" maxlength="30" pattern="[A-Za-z0-9._]{1,30}"' +
      ' autocapitalize="none" spellcheck="false" aria-describedby="profile-link-help" value="' + esc(user.link) + '"></label>' +
      '<small id="profile-link-help" class="muted">' + t('instagramHelp') + '</small>' +
      '<label class="shell-field">' + t('badge') + '<select name="badge">' +
      option('', t('noBadge'), selected || '') + earned.map(badge => option(badge.key, esc(badge.label || badge.key), selected)).join('') +
      '</select></label><label class="shell-choice"><input name="private" type="checkbox" aria-describedby="profile-private-help"' +
      (user.private ? ' checked' : '') + '>' + t('private') + '</label><p id="profile-private-help" class="muted">' + t('privateHelp') +
      '</p><p class="shell-error" role="alert" hidden></p><button type="submit" class="btn btn-hot">' + meText('save') + '</button></form>';

    photoEditor(view.querySelector('[data-photo-editor]'), member, user);
    const form = view.querySelector('form');
    form.onsubmit = async event => {
      event.preventDefault();
      const button = form.querySelector('[type=submit]');
      if (button.disabled) return;
      const fields = new FormData(form);
      const body = { nick: fields.get('nick').trim(), bio: fields.get('bio'), floor: fields.get('floor'),
        link: fields.get('link').trim(), private: fields.has('private'), badge: fields.get('badge') };
      const alert = form.querySelector('[role=alert]');
      function fail(code) {
        alert.textContent = code === 'bio' || code === 'nick_limit'
          ? L.t('profileEdit.' + (code === 'bio' ? 'bioLimit' : 'nickLimit')) : L.errorText({ error: code });
        alert.hidden = false;
      }
      if ([...body.bio].length > 150 || body.bio.split(/\r\n?|\n/).length > 3) {
        fail('bio');
        form.elements.bio.focus();
        return;
      }
      try {
        button.disabled = true;
        alert.hidden = true;
        if (!view.isConnected || L.me?.id !== member.id) return;
        const result = await L.api('profile_set', body);
        if (result.error) { if (view.isConnected && !L.needLogin()) fail(result.error); return; }
        if (L.me?.id === member.id) L.me = { ...L.me, ...body, ...result.me };
        if (!view.isConnected) return;
        L.go('me');
        L.toast(L.t('me.saved'));
      } catch (error) {
        if (view.isConnected) fail(error.message);
      } finally {
        button.disabled = false;
      }
    };
  }

  L.profilePhotos = { rows: photoRows, open: photoViewer };
  L.profileEdit = render;
})();
