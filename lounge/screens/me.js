(function (L) {
  const copy = {
    member: ['그루브 멤버', 'Groove member'],
    edit: ['프로필 고치기', 'Edit profile'],
    settings: ['설정', 'Settings'],
    points: ['내 포인트', 'My points'],
    stamps: ['방문 스탬프', 'Visit stamps'],
    stampHelp: ['입구 QR로 체크인하면 하루에 스탬프 1개를 받아요.', 'Scan the entrance QR to get one stamp per day.'],
    badges: ['배지', 'Badges'],
    noBadges: ['아직 배지가 없어요.', 'No badges yet.'],
    earn: ['포인트 쌓는 법', 'How to earn points'],
    ways: ['입구에서 체크인하거나 라운지에서 출석, 투표, DJ 월드컵, 설문, 라디오로 포인트를 모아요.', 'Earn points by checking in at the club or by attending, voting, playing the DJ World Cup, answering a survey or listening to the radio.'],
    ledger: ['포인트 내역', 'Points history'],
    noLedger: ['아직 포인트 내역이 없어요.', 'No points activity yet.'],
    photo: ['프로필 사진', 'Profile photo'],
    bio: ['한 줄 소개', 'Bio'],
    floor: ['좋아하는 층', 'Favorite floor'],
    noFloor: ['고르지 않음', 'No preference'],
    save: ['저장', 'Save'],
    saved: ['저장했어요.', 'Saved.'],
    language: ['언어', 'Language'],
    alerts: ['알림 설정', 'Notification settings'],
    blocks: ['차단 목록', 'Blocked accounts'],
    rewards: ['생일·초대 코드', 'Birthday and invite code'],
    signout: ['로그아웃', 'Log out'],
    withdraw: ['탈퇴', 'Delete account'],
    withdrawHelp: ['탈퇴하면 계정과 프로필이 삭제돼요. 비밀번호를 입력해 주세요.', 'Your account and profile will be deleted. Enter your password to continue.'],
    deleted: ['탈퇴했어요.', 'Your account was deleted.'],
    dashboard: ['내 포인트 {points}P · 방문 스탬프 {stamps}/10', 'My points {points}P · Visit stamps {stamps}/10'],
    deletionPending: ['탈퇴했어요. 남은 정보는 순차적으로 삭제하고 있어요.', 'Your account was deleted. We’re finishing the removal of your data.']
  };
  L.i18n(Object.fromEntries(['ko', 'en'].map((lang, i) =>
    [lang, Object.fromEntries(Object.entries(copy).map(([key, pair]) => ['me.' + key, pair[i]]))]
  )));
  const t = key => L.esc(L.t('me.' + key));
  const a = key => L.esc(L.t('auth.' + key));

  function profileMenu() {
    const link = (href, label) => '<a class="btn" href="' + href + '">' + label + '</a>';
    const panel = LoungeScreenUI.sheet('<h2>' + t('settings') + '</h2><div class="shell-stack">' +
      link('#/me/settings', t('settings')) + link('#/alerts', L.esc(L.t('core.alerts'))) +
      (L.open('rewards') ? link('#/rewards', t('rewards')) : '') +
      (L.open('share') ? link('#/saved', L.esc(L.t('share.saved'))) : '') +
      '<button type="button" class="btn" data-menu-signout>' + t('signout') + '</button></div>');
    panel.querySelector('[data-menu-signout]').onclick = exit;
  }

  async function renderMe(root) {
    const me = L.me;
    const photo = me.photo
      ? '<img class="shell-avatar" src="' + L.esc(L.img(me.photo)) + '" alt="">'
      : '<span class="shell-avatar" aria-hidden="true">' + L.esc(Array.from(me.nick || '')[0] || 'G') + '</span>';
    const legacy = '<header class="shell-profile">' + photo +
      '<div><h1>' + L.whoTag(me) + '</h1><p class="muted">' + t('member') +
      (['2F', '3F'].includes(me.floor) ? ' · ' + me.floor : '') + '</p></div></header>' +
      (me.bio ? '<p class="shell-bio">' + L.esc(me.bio) + '</p>' : '');
    const editLink = '<a class="btn" href="#/me/edit">' + t('edit') + '</a>';
    root.innerHTML = '<div class="shell-stack">' + legacy +
      '<div class="shell-actions" data-me-actions>' + editLink +
      '<a class="btn" href="#/me/settings">' + t('settings') + '</a>' +
      '<a class="btn" href="#/alerts">' + L.esc(L.t('core.alerts')) + '</a>' +
      (L.open('rewards') ? '<a class="btn" href="#/rewards">' + t('rewards') + '</a>' :
        '<p class="muted">' + t('rewards') + ' · ' + L.esc(L.t('core.soon')) + '</p>') + '</div>' +
      pointsPlaceholder() +
      (L.canInstall() ? '<button class="btn" data-install>' + L.esc(L.t('core.install')) + '</button>' : '') + '</div>';
    const install = root.querySelector('[data-install]');
    if (install) install.onclick = () => L.showInstall(false);
    return renderPoints(root, me);
  }

  function pointsPlaceholder() {
    return '<div class="shell-stack" data-points aria-busy="true"><p role="status">' + a('pending') + '</p></div>';
  }

  async function renderProfileMe(root) {
    const me = L.me;
    const U = LoungeScreenUI;
    root.innerHTML = '<div class="profile3-surface"><header class="profile3-topbar">' +
      '<strong>' + L.esc(me.nick) + '</strong><button type="button" class="btn" data-profile-menu aria-haspopup="dialog" aria-label="' +
      t('settings') + '">≡</button></header><div data-own-profile>' + U.status('loading', true) + '</div></div>';
    root.querySelector('[data-profile-menu]').onclick = profileMenu;
    const view = root.querySelector('[data-own-profile]');
    const [profile, points] = await Promise.all([L.api('user', { nick: me.nick }), L.api('points')]);
    if (!view.isConnected) return;
    if (!profile.user) {
      view.innerHTML = U.status('error');
      if (!L.me) L.needLogin();
      return;
    }
    const stamps = points.stamps ?? me.stamps;
    const values = { points: new Intl.NumberFormat(L.lang).format(Number(points.points ?? me.points) || 0),
      stamps: Math.min(10, Math.max(0, Number(stamps?.n ?? stamps) || 0)) };
    const dashboard = '<a class="profile3-dashboard" href="#/me/points">' + L.esc(L.t('me.dashboard', values)) + '</a>';
    return L.renderProfile3(view, profile.user, true, dashboard);
  }

  async function renderPoints(root, me) {
    const result = await L.api('points');
    if (!root.isConnected) return;
    const panel = root.querySelector('[data-points]');
    panel.removeAttribute('aria-busy');
    const stamps = result.stamps ?? me.stamps;
    const n = Math.min(10, Math.max(0, Number(stamps?.n ?? stamps) || 0));
    const balance = new Intl.NumberFormat(L.lang).format(Number(result.points ?? me.points) || 0);
    const formatDate = new Intl.DateTimeFormat(L.lang, { timeZone: 'Asia/Seoul' });
    const badges = Array.isArray(result.badges) ? result.badges : [];
    const ledger = Array.isArray(result.ledger) ? result.ledger : [];
    panel.innerHTML = '<section class="shell-card shell-points"><h2>' + t('points') + '</h2><p class="shell-score">' +
      L.esc(balance) + 'P</p></section><section class="shell-card"><header class="shell-row"><h2>' +
      t('stamps') + '</h2><strong>' + n + ' / 10</strong></header><div class="shell-stamps" aria-hidden="true">' +
      Array.from({ length: 10 }, (_, i) => '<span class="' + (i < n ? 'filled' : '') + '">' + (i < n ? '✓' : '') + '</span>').join('') +
      '</div><p class="muted">' + t('stampHelp') + '</p></section>' +
      '<section class="shell-card"><h2>' + t('earn') + '</h2><p>' + t('ways') + '</p></section>' +
      (result.error ? '<p class="shell-error" role="status">' + L.esc(L.errorText(result)) + '</p>' :
        '<section class="shell-card"><h2>' + t('badges') + '</h2>' +
        (badges.length ? '<ul class="shell-badges">' + badges.map(badge =>
          '<li><span aria-hidden="true">☆</span>' + L.esc(badge.label || badge.key || badge) + '</li>').join('') +
          '</ul>' : '<p class="muted">' + t('noBadges') + '</p>') +
        '</section><section class="shell-card"><h2>' + t('ledger') + '</h2>' +
        (ledger.length ? '<ul class="shell-ledger">' + ledger.map(entry => {
          const at = new Date(entry.at);
          const when = Number.isFinite(at.getTime()) ? formatDate.format(at) : '';
          const delta = Number(entry.delta) || 0;
          return '<li class="shell-row"><span>' + L.esc(entry.label || entry.kind) +
            '<small class="muted">' + L.esc(when) + '</small></span><strong>' +
            (delta > 0 ? '+' : '') + delta + 'P</strong></li>';
        }).join('') + '</ul>' : '<p class="muted">' + t('noLedger') + '</p>') + '</section>');
    if (result.error === 'auth') L.needLogin();
  }

  function formResult(form, handler) {
    form.onsubmit = async event => {
      event.preventDefault();
      const error = form.querySelector('[role=alert]');
      const submit = form.querySelector('[type=submit]');
      const data = new FormData(form);
      submit.disabled = true;
      error.hidden = true;
      try {
        await handler(data, form);
      } catch (e) {
        if (!form.isConnected) return;
        error.textContent = L.errorText({ error: e.message });
        error.hidden = false;
        if (e.message === 'auth') L.needLogin();
      } finally {
        submit.disabled = false;
      }
    };
  }
  const submit = key => '<p class="shell-error" role="alert" hidden></p><button type="submit" class="btn btn-hot">' + t(key) + '</button>';

  function edit(root) {
    const me = L.me;
    root.innerHTML = '<h1>' + t('edit') + '</h1><form class="shell-form">' +
      '<label class="shell-field">' + t('photo') + '<input name="file" type="file" accept="image/*"></label>' +
      '<label class="shell-field">' + a('nick') + '<input name="nick" required minlength="2" maxlength="12" value="' +
      L.esc(me.nick) + '"></label><label class="shell-field">' + t('bio') +
      '<textarea name="bio" rows="3" maxlength="60">' + L.esc(me.bio) + '</textarea></label>' +
      '<label class="shell-field">' + t('floor') + '<select name="floor">' +
      ['', '2F', '3F'].map(floor => '<option value="' + floor + '"' + (floor === me.floor ? ' selected' : '') + '>' +
        (floor || t('noFloor')) + '</option>').join('') + '</select></label>' + submit('save') + '</form>';
    formResult(root.querySelector('form'), async (data, form) => {
      const body = { nick: data.get('nick').trim(), bio: data.get('bio'), floor: data.get('floor') };
      const file = data.get('file');
      if (file.size) body.photo = await L.upload(file, 'profile');
      if (!form.isConnected) return;
      const result = await L.api('profile_set', body);
      if (result.error) throw new Error(result.error);
      if (L.me === me) L.me = result.me || { ...me, ...body };
      if (!form.isConnected) return;
      L.toast(L.t('me.saved'));
      L.go('me');
    });
  }

  async function exit() {
    L.closeSheet();
    try { if (L.logoutPush) await L.logoutPush(); } catch (e) {}   // 공용 폰: 이 기기 푸시·알림 증표 끊기 (보안 점검, ①)
    L.setToken('');
    L.me = null;
    L.go('tonight');
  }

  function settings(root) {
    const me = L.me;
    const checkbox = name => '<label class="shell-choice"><input name="' + name + '" type="checkbox"' +
      (me[name] ? ' checked' : '') + '>' + a(name) + '</label>';
    root.innerHTML = '<div class="shell-stack"><h1>' + t('settings') + '</h1><form class="shell-form">' +
      checkbox('ads') + checkbox('night') + '<label class="shell-field">' + t('language') +
      '<select name="lang"><option value="ko" lang="ko">한국어</option><option value="en" lang="en">English</option>' +
      '<option value="ja" lang="ja">日本語</option><option value="zh" lang="zh">中文</option></select></label>' +
      submit('save') + '</form><section class="shell-card"><h2>' + a('reset') + '</h2><p>' + a('resetHelp') + '</p></section>' +
      '<div class="shell-actions"><button class="btn" data-signout>' + t('signout') + '</button>' +
      '<button class="btn shell-danger" data-withdraw>' + t('withdraw') + '</button></div>' +
      '<a class="shell-link" href="#/alerts">' + t('alerts') + '</a><a class="shell-link" href="#/blocks">' + t('blocks') +
      '</a><a class="shell-link" href="#/terms">' + a('termsTitle') + '</a><a class="shell-link" href="#/privacy">' +
      a('privacyTitle') + '</a></div>';
    const form = root.querySelector('form');
    form.elements.lang.value = L.lang;
    formResult(form, async data => {
      const body = { ads: data.has('ads'), night: data.has('night'), lang: data.get('lang') };
      const result = await L.api('prefs_set', body);
      if (result.error) throw new Error(result.error);
      if (L.me !== me) return;
      L.me = result.me || { ...me, ...body };
      L.setLang(body.lang, true);
      await L.route();
      L.toast(L.t('me.saved'));
    });
    root.querySelector('[data-signout]').onclick = exit;
    root.querySelector('[data-withdraw]').onclick = () => {
      const panel = L.sheet('<h2>' + t('withdraw') + '</h2><p>' + t('withdrawHelp') + '</p>' +
        '<form class="shell-form"><label class="shell-field">' + a('pw') +
        '<input name="pw" type="password" autocomplete="current-password" required></label>' +
        '<div class="shell-actions">' + submit('withdraw') + '<button type="button" class="btn">' +
        L.esc(L.t('core.close')) + '</button></div></form>');
      panel.querySelector('[type=button]').onclick = L.closeSheet;
      formResult(panel.querySelector('form'), async data => {
        const result = await L.api('withdraw', { pw: data.get('pw') });
        if (!result.ok) throw new Error(result.error);
        if (L.me?.id !== me.id || !L.me) return;
        await exit();
        L.toast(L.t(result.pending ? 'me.deletionPending' : 'me.deleted'));
      });
    };
  }

  L.screen('me', {
    nav: 'me',
    auth: true,
    render(root, { id }) {
      if (id === 'edit') return L.open('profile2') ? L.profileEdit(root) : edit(root);
      if (id === 'settings') return settings(root);
      if (L.open('profile2')) {
        if (id === 'points') {
          root.innerHTML = '<div class="shell-stack"><header class="shell-actions"><h1>' + t('points') + '</h1>' +
            LoungeScreenUI.link('#/me', L.esc(L.t('nav.me'))) + '</header>' + pointsPlaceholder() + '</div>';
          return renderPoints(root, L.me);
        }
        return renderProfileMe(root);
      }
      return renderMe(root);
    }
  });
})(window.Lounge);
