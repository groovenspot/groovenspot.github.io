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
    nickLimit: ['닉네임은 30일에 두 번까지 바꿀 수 있어요.', 'You can change your nickname twice every 30 days.']
  });
  const esc = L.esc;
  const meText = key => esc(L.t('me.' + key));

  async function render(root) {
    const member = L.me;
    const view = U.mount(root, '<div class="shell-actions"><h1>' + meText('edit') + '</h1>' +
      U.link('#/me', esc(L.t('nav.me'))) + '</div>');
    const [profile, points] = await Promise.all([
      L.api('user', { nick: member.nick }), L.api('points')
    ]);
    if (!view.isConnected || L.me !== member) return;
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
    view.innerHTML = '<form class="shell-form">' +
      '<label class="shell-field">' + meText('photo') + '<input name="file" type="file" accept="image/*"></label>' +
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
        const file = fields.get('file');
        if (file.size) body.photo = await L.upload(file, 'profile');
        if (!view.isConnected || L.me !== member) return;
        const result = await L.api('profile_set', body);
        if (result.error) { if (view.isConnected && !L.needLogin()) fail(result.error); return; }
        if (L.me === member) L.me = { ...member, ...body, ...result.me };
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

  L.profileEdit = render;
})();
