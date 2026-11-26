(function (L) {
  const copy = {
    member: ['그루브 멤버', 'Groove member'],
    edit: ['프로필 고치기', 'Edit profile'],
    settings: ['설정', 'Settings'],
    points: ['내 포인트', 'My points'],
    stamps: ['방문 스탬프', 'Visit stamps'],
    entry: ['입장 QR', 'Entry QR'],
    verifiedStampHelp: ['입구 직원이 내 QR을 확인하면 영업일마다 스탬프 1개를 받아요.', 'Get one stamp per business day when entrance staff verify your QR.'],
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
    theme: ['화면 모드', 'Display'],
    themeDark: ['블랙 (기본)', 'Black (default)'],
    themeLight: ['화이트', 'White'],
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

  let entryScript;
  function bindEntry(root) {
    const button = root.querySelector('[data-entry-open]');
    if (!button) return;
    button.onclick = async () => {
      button.disabled = true;
      try {
        if (!L.showEntryQr) {
          entryScript ||= new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/lounge/screens/l26_entry.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.append(script);
          }).catch(error => { entryScript = null; throw error; });
          await entryScript;
        }
        if (button.isConnected) L.showEntryQr();
      } catch {
        if (button.isConnected) button.textContent = L.t('auth.retry');
      } finally {
        button.disabled = false;
      }
    };
  }

  // 내 프로필 ≡ 메뉴 (4차 P19): 줄 목록 — 설정·알림·저장됨·팔로우 요청·차단 목록·생일/초대·QR·로그아웃
  function profileMenu(user) {
    const row = (icon, label, href) => '<a class="ui-menu-item" href="' + href + '">' + L.icon(icon, { size: 22 }) + '<span>' + label + '</span></a>';
    const act = (icon, label, attrs) => '<button type="button" class="ui-menu-item" ' + attrs + '>' + L.icon(icon, { size: 22 }) + '<span>' + label + '</span></button>';
    const text = key => L.esc(L.t(key));
    const panel = L.sheet('<h2 class="ui-menu-title">' + text('user4.menu') + '</h2><div class="ui-menu">' +
      row('settings', t('settings'), '#/me/settings') + row('bell', text('core.alerts'), '#/alerts') +
      (L.open('share') ? row('bookmark', text('share.saved'), '#/saved') : '') +
      (L.open('follow2') ? row('userPlus', text('follows.requests'), '#/requests') : '') +
      (L.open('profile2') ? row('tagged', text('user4.tagRequests'), '#/tags') : '') +     // 나를 태그한 글 승인 (화면은 글쓰기 작업창 D)
      row('block', t('blocks'), '#/blocks') +
      (L.open('rewards') ? row('heart', t('rewards'), '#/rewards') : '') +
      (L.open('l26_entry') ? act('grid', t('entry'), 'data-entry-open') : '') +
      (user && user.private !== true && L.profileQr ? act('grid', text('user4.qr'), 'data-menu-qr') : '') +
      (L.canInstall() ? act('home', text('core.install'), 'data-menu-install') : '') +
      act('back', t('signout'), 'data-menu-signout') + '</div>');
    panel.classList.add('ui-sheet-menu');
    bindEntry(panel);
    panel.querySelector('[data-menu-signout]').onclick = exit;
    const qr = panel.querySelector('[data-menu-qr]');
    if (qr) qr.onclick = () => { L.closeSheet(); L.profileQr(user); };
    const install = panel.querySelector('[data-menu-install]');
    if (install) install.onclick = () => { L.closeSheet(); L.showInstall(false); };
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
    root.innerHTML = L.bar({ back: false, title: L.t('nav.me'), right: L.inboxIcons() }) + '<div class="shell-stack pf-sub">' + legacy +
      '<div class="shell-actions" data-me-actions>' + editLink +
      '<a class="btn" href="#/me/settings">' + t('settings') + '</a>' +
      '<a class="btn" href="#/alerts">' + L.esc(L.t('core.alerts')) + '</a>' +
      (L.open('rewards') ? '<a class="btn" href="#/rewards">' + t('rewards') + '</a>' :
        '<p class="muted">' + t('rewards') + ' · ' + L.esc(L.t('core.soon')) + '</p>') + '</div>' +
      pointsPlaceholder() +
      (L.canInstall() ? '<button class="btn" data-install>' + L.esc(L.t('core.install')) + '</button>' : '') + '</div>';
    L.paintInbox();
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
    root.innerHTML = '<div data-profile-root><header class="ui-bar pf-bar-own"><div class="ui-bar-title"><h1 data-own-nick>' + L.esc(me.nick) +
      '</h1></div><div class="ui-bar-side is-right">' +
      (L.open('posts') ? '<a class="ui-bar-btn" href="#/compose" aria-label="' + L.esc(L.t('user4.newPost')) + '">' + L.icon('plusBox') + '</a>' : '') +
      L.inboxIcons() + '<button type="button" class="ui-bar-btn" data-profile-menu aria-haspopup="dialog" aria-label="' +
      L.esc(L.t('user4.menu')) + '">' + L.icon('menu') + '</button></div></header><div data-own-profile>' + U.status('loading', true) + '</div></div>';
    L.paintInbox();
    let shown = null;
    root.querySelector('[data-profile-menu]').onclick = () => profileMenu(shown);
    const view = root.querySelector('[data-own-profile]');
    const kept = L.profileKept ? L.profileKept('u:me') : null;      // 뒤로 돌아왔으면 격자·스크롤 그대로 (P31)
    if (kept) { shown = kept.user; return L.renderProfile3(view, kept.user, true, kept.extra, kept, 'u:me'); }
    const [profile, points] = await Promise.all([L.api('user', { nick: me.nick }), L.api('points')]);
    if (!view.isConnected) return;
    if (!profile.user) {
      view.innerHTML = U.status('error');
      if (!L.me) L.needLogin();
      return;
    }
    shown = profile.user;
    const stamps = points.stamps ?? me.stamps;
    const values = { points: new Intl.NumberFormat(L.lang).format(Number(points.points ?? me.points) || 0),
      stamps: Math.min(10, Math.max(0, Number(stamps?.n ?? stamps) || 0)) };
    // 포인트·스탬프 띠: 버튼 줄 위 한 줄로 작게 (의도된 차이 — PLAN 5장)
    const dashboard = '<a class="pf-dash profile3-dashboard" href="#/me/points"><span>' + L.esc(L.t('me.dashboard', values)) + '</span>' +
      L.icon('chevron', { size: 14 }) + '</a>';
    return L.renderProfile3(view, profile.user, true, dashboard, null, 'u:me');
  }
  L.profileMe = renderProfileMe;

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
      '</div><p class="muted">' + t(L.open('l26_entry') ? 'verifiedStampHelp' : 'stampHelp') + '</p>' +
      (L.open('l26_entry') ? '<button class="btn btn-hot" type="button" data-entry-open>' + t('entry') + '</button>' : '') + '</section>' +
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
    bindEntry(panel);
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
    root.innerHTML = L.bar({ back: 'me', title: L.t('me.edit') }) + '<form class="shell-form pf-sub">' +
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
      (me.promo?.[name] ? ' checked' : '') + '>' + a(name) + '</label>';
    const mode = L.theme();
    const themeRow = v => '<label class="shell-choice"><input type="radio" name="gl-theme" value="' + v + '"' + (mode === v ? ' checked' : '') +
      '>' + t(v === 'dark' ? 'themeDark' : 'themeLight') + '</label>';
    root.innerHTML = L.bar({ back: 'me', title: L.t('me.settings') }) + '<div class="shell-stack pf-sub">' +
      '<fieldset class="shell-consent" data-theme-pick><legend class="shell-field">' + t('theme') + '</legend>' +
      themeRow('dark') + themeRow('light') + '</fieldset><form class="shell-form">' +
      '<fieldset class="shell-consent" id="promo"><legend>' + a('promoHeading') + '</legend>' +
      checkbox('ads') + checkbox('night') + '<p class="muted">' + a('promoHelp') + '</p></fieldset>' +
      '<label class="shell-field">' + t('language') +
      '<select name="lang"><option value="ko" lang="ko">한국어</option><option value="en" lang="en">English</option>' +
      '<option value="ja" lang="ja">日本語</option><option value="zh" lang="zh">中文</option></select></label>' +
      submit('save') + '</form><section class="shell-card"><h2>' + a('reset') + '</h2><p>' + a('resetHelp') + '</p></section>' +
      '<button type="button" class="btn" data-lounge-preview-toggle' + (L.previewEligible() ? '' : ' hidden') + '>' +
      (L.previewEligible() ? L.esc(L.t(L.isPreview() ? 'core.previewLegacy' : 'core.previewNew')) : '') + '</button>' +
      '<div class="shell-actions"><button class="btn" data-signout>' + t('signout') + '</button>' +
      '<button class="btn shell-danger" data-withdraw>' + t('withdraw') + '</button></div>' +
      '<a class="shell-link" href="#/alerts/settings">' + t('alerts') + '</a><a class="shell-link" href="#/blocks">' + t('blocks') +
      '</a><a class="shell-link" href="#/terms">' + a('termsTitle') + '</a><a class="shell-link" href="#/privacy">' +
      a('privacyTitle') + '</a></div>';
    root.querySelectorAll('[name="gl-theme"]').forEach(input => { input.onchange = () => { if (input.checked) L.setTheme(input.value); }; });
    const form = root.querySelector('form');
    form.elements.lang.value = L.lang;
    formResult(form, async data => {
      const body = { lang: data.get('lang'), consent_version: L.promoConsentVersion };
      for (const kind of ['ads', 'night']) {
        if (data.has(kind) !== Boolean(me.promo?.[kind]) || (!data.has(kind) && me[kind] && !me.promo?.[kind])) {
          body[kind] = data.has(kind);
        }
      }
      const result = await L.api('prefs_set', body);
      if (result.error) throw new Error(result.error);
      if (L.me !== me) return;
      L.me = result.me || { ...me, ...body };
      L.setLang(body.lang, true);
      await L.route();
      L.toast(L.t('me.saved'));
    });
    root.querySelector('[data-signout]').onclick = exit;
    const previewToggle = root.querySelector('[data-lounge-preview-toggle]');
    if (previewToggle) previewToggle.onclick = async () => {
      previewToggle.disabled = true;
      try { await L.togglePreview(); }
      finally { previewToggle.disabled = false; }
    };
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
    bar: 'own',
    keepScroll: true,
    leave() { L.profileLeave?.(); },
    render(root, { id }) {
      if (id === 'edit') return L.open('profile2') ? L.profileEdit(root) : edit(root);
      if (id === 'settings') return settings(root);
      if (L.open('profile2')) {
        if (id === 'points') {
          root.innerHTML = L.bar({ back: 'me', title: L.t('me.points') }) + '<div class="shell-stack pf-sub">' + pointsPlaceholder() + '</div>';
          return renderPoints(root, L.me);
        }
        return renderProfileMe(root);
      }
      return renderMe(root);
    }
  });
})(window.Lounge);
