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
  // 4차에서 새로 쓰는 문구 (새 이름 — SPEC4 1장)
  const w = U.words('edit4', {
    title: ['프로필 편집', 'Edit profile'],
    change: ['사진 수정', 'Edit photo'],
    name: ['닉네임', 'Username'],
    bio: ['소개', 'Bio'],
    floor: ['좋아하는 층', 'Favorite floor'],
    link: ['인스타그램', 'Instagram'],
    badge: ['대표 배지', 'Badge'],
    close: ['닫기', 'Close']
  });
  L.i18n({
    ja: { 'edit4.title': 'プロフィールを編集', 'edit4.change': '写真を変更', 'edit4.name': 'ニックネーム', 'edit4.bio': '自己紹介',
      'edit4.floor': '好きなフロア', 'edit4.link': 'Instagram', 'edit4.badge': 'バッジ', 'edit4.close': '閉じる' },
    zh: { 'edit4.title': '编辑主页', 'edit4.change': '更换照片', 'edit4.name': '昵称', 'edit4.bio': '简介',
      'edit4.floor': '喜欢的楼层', 'edit4.link': 'Instagram', 'edit4.badge': '徽章', 'edit4.close': '关闭' }
  });
  const esc = L.esc;
  const meText = key => esc(L.t('me.' + key));

  function photoRows(user) {
    const rows = Array.isArray(user.photos) ? user.photos.filter(row => typeof row?.key === 'string') : [];
    const unique = [...new Map(rows.map(row => [row.key, row])).values()].slice(0, 5);
    const source = unique.length ? unique : user.photo ? [{ key: user.photo, main: true }] : [];
    const main = source.find(row => row.main) || source.find(row => row.key === user.photo) || source[0];
    return (user.locked && main ? [main] : source).map(row => {
      const url = typeof row.url === 'string' && row.url.startsWith('/img/')
        ? new URL(row.url, L.img(row.key)).href : row.url || row.key;
      return { key: row.key, src: U.image(url), main: row === main };
    }).filter(row => row.src);
  }

  function photoImage(photo, alt = '', css = '') {
    const content = new URL(photo.src, location.href);
    const api = new URL(L.img('image'), location.href);
    const protectedImage = content.origin === api.origin && content.pathname.startsWith('/profile-img/');
    return '<img' + (css ? ' class="' + css + '"' : '') + ' alt="' + alt + '" ' +
      (protectedImage ? 'data-profile-src' : 'src') + '="' + esc(content.href) + '">';
  }

  const sessionToken = () => {
    try { return localStorage.getItem('gl_token') || ''; } catch { return ''; }
  };

  function loadPhotos(root) {
    for (const image of root.querySelectorAll('[data-profile-src]')) {
      const url = new URL(image.dataset.profileSrc);
      image.removeAttribute('data-profile-src');
      const token = sessionToken();
      if (!token) { image.src = url.href; continue; }
      url.searchParams.set('token', token);
      void (async () => {
        try {
          const response = await fetch(url, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
          if (!response.ok) return;
          const blob = await response.blob();
          if (!image.isConnected || sessionToken() !== token) return;
          const src = URL.createObjectURL(blob);
          const release = () => URL.revokeObjectURL(src);
          image.addEventListener('load', release, { once: true });
          image.addEventListener('error', release, { once: true });
          image.src = src;
        } catch { /* The image can be reloaded by reopening the photo. */ }
      })();
    }
  }

  function photoError(error) {
    return error === 'photo_limit' ? L.t('profileEdit.photoLimit') : L.errorText({ error });
  }

  function photoViewer(rows, start = 0, change = null) {
    if (!rows.length) return;
    let list = rows, index = start, confirm = false, busy = false, startX;
    // 전체 화면으로 크게 보기 · 좌우로 밀거나 화살표로 넘김 (P6)
    const panel = L.sheet('<h2 class="sr-only">' + t('photos') + '</h2><button type="button" class="pf-viewer-close" data-c-close aria-label="' +
      w('close') + '">' + L.icon('close') + '</button><div data-viewer class="pf-viewer-body"></div>', { bare: true });
    panel.classList.add('pf-viewer');
    panel.querySelector('[data-c-close]').onclick = () => L.closeSheet();
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
      const arrow = (attr, icon, label, off) => '<button type="button" class="pf-viewer-arrow" ' + attr + ' aria-label="' + label + '"' +
        (off ? ' disabled' : '') + '>' + L.icon(icon) + '</button>';
      content.innerHTML = '<p class="pf-viewer-count" aria-live="polite">' + (index + 1) + ' / ' + list.length + '</p>' +
        '<div class="pf-viewer-stage">' + photoImage(photo, t('photoNumber', { n: index + 1 })) +
        arrow('data-prev', 'back', t('prevPhoto'), index === 0) + arrow('data-next', 'chevron', t('nextPhoto'), index === list.length - 1) + '</div>' +
        (change ? confirm ? '<div class="pf-viewer-actions"><p>' + t('confirmRemove') + '</p><div class="shell-actions">' +
          U.button(t('removePhoto'), 'data-confirm-delete', true) + U.button(t('cancel'), 'data-cancel-delete') +
          '</div></div>' : '<div class="pf-viewer-actions"><div class="shell-actions">' +
          (photo.main ? '<strong>' + t('mainPhoto') + '</strong>' : U.button(t('makeMain'), 'data-make-main', true)) +
          U.button(t('removePhoto'), 'data-delete-photo') + '</div></div>' : '') +
        '<p class="shell-error" role="alert"></p>';
      content.querySelector('[data-prev]').onclick = () => step(-1);
      content.querySelector('[data-next]').onclick = () => step(1);
      loadPhotos(content);
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
      editor.innerHTML = '<h2 class="sr-only">' + t('photos') + '</h2><div class="pf-photo-primary profile3-photo-primary">' +
        (main ? '<button type="button" data-main-photo aria-label="' + t('mainPhoto') +
          '">' + photoImage(main) + '</button>' :
          '<span class="shell-avatar" aria-hidden="true">' + esc(Array.from(user.nick)[0] || 'G') + '</span>') +
        '</div>' + (main ? '<button type="button" class="pf-text-link" data-change-photo>' + w('change') + '</button>' : '') +
        '<div class="pf-photo-strip">' +
        rows.map((photo, i) => '<button type="button" data-photo-index="' + i + '" aria-label="' +
          t('photoNumber', { n: i + 1 }) + '"' + (photo.main ? ' aria-current="true"' : '') +
          '>' + photoImage(photo) + '</button>').join('') +
        (rows.length < 5 ? '<label class="pf-photo-add" title="' + t('addPhoto') + '">' + L.icon('plus', { size: 20 }) +
          '<input type="file" accept="image/*" aria-label="' + t('addPhoto') + '" class="sr-only"></label>' : '') +
        '</div><p role="alert" class="shell-error"></p>';
      loadPhotos(editor);
      const primary = editor.querySelector('[data-main-photo]');
      if (primary) primary.onclick = () => { if (!busy) photoViewer(rows, rows.indexOf(main), change); };
      const changer = editor.querySelector('[data-change-photo]');
      if (changer) changer.onclick = () => { if (!busy) photoViewer(rows, rows.indexOf(main), change); };
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
    root.innerHTML = L.bar({ back: 'me', title: L.t('edit4.title') }) + '<div class="pf pf-edit" data-edit>' + U.status('loading', true) + '</div>';
    const view = root.querySelector('[data-edit]');
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
    const line = (label, field, help = '') => '<div class="pf-field"><label class="pf-field-row"><span class="pf-field-label">' + label + '</span>' + field + '</label>' + help + '</div>';
    view.innerHTML = '<section class="pf-photo-editor" data-photo-editor></section><form class="pf-form">' +
      line(w('name'), '<input name="nick" required minlength="2" maxlength="12" autocomplete="off" value="' + esc(user.nick) + '">') +
      line(w('bio'), '<textarea name="bio" rows="3" aria-describedby="profile-bio-limit">' + esc(user.bio) + '</textarea>',
        '<small class="pf-field-help"><span id="profile-bio-limit" class="sr-only">' + t('bioLimit') + '</span><span data-bio-count aria-hidden="true"></span></small>') +
      line(w('floor'), '<select name="floor">' +
        ['', '2F', '3F'].map(value => option(value, value || meText('noFloor'), user.floor || '')).join('') + '</select>') +
      line(w('link'), '<input name="link" maxlength="30" pattern="[A-Za-z0-9._]{1,30}"' +
        ' autocapitalize="none" spellcheck="false" aria-label="' + t('instagram') + '" aria-describedby="profile-link-help" value="' + esc(user.link) + '">',
        '<small id="profile-link-help" class="pf-field-help">' + t('instagramHelp') + '</small>') +
      line(w('badge'), '<select name="badge">' +
        option('', t('noBadge'), selected || '') + earned.map(badge => option(badge.key, esc(L.profileBadgeLabel(badge.key, badge.label)), selected)).join('') +
        '</select>') +
      '<div class="pf-field"><label class="pf-field-row pf-switch-row"><span class="pf-field-label">' + t('private') +
      '</span><input name="private" type="checkbox" role="switch" class="pf-switch" aria-describedby="profile-private-help"' +
      (user.private ? ' checked' : '') + '></label><small id="profile-private-help" class="pf-field-help">' + t('privateHelp') +
      '</small></div><p class="shell-error" role="alert" hidden></p><button type="submit" class="btn btn-hot pf-save">' + meText('save') + '</button></form>';
    // 소개 글자 수 (P41): 0/150 — 넘치면 빨갛게
    const bioField = view.querySelector('[name=bio]'), bioCount = view.querySelector('[data-bio-count]');
    const countBio = () => {
      bioField.style.height = 'auto';                                  // 쓴 만큼 칸이 늘어나게 (안에서 따로 스크롤하지 않게)
      bioField.style.height = Math.max(44, bioField.scrollHeight) + 'px';
      const n = [...bioField.value].length;
      bioCount.textContent = n + '/150';
      bioCount.classList.toggle('is-over', n > 150 || bioField.value.split(/\r\n?|\n/).length > 3);
    };
    bioField.oninput = countBio;
    countBio();

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

  L.profilePhotos = { rows: photoRows, open: photoViewer, image: photoImage, load: loadPhotos };
  L.profileEdit = render;
})();
