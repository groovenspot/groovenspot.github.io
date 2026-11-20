(function (L) {
  const copy = {
    join: ['그루브 멤버 가입', 'Join Groove Lounge'],
    invite: ['{name}님이 초대했어요', '{name} invited you'],
    scan: ['매장 직원에게 새 QR을 받아 찍어 주세요.', 'Ask a staff member for a new QR at the club.'],
    nick: ['닉네임', 'Nickname'],
    nickHint: ['다른 손님에게 보이는 이름 · 2~12자', 'Visible to other guests · 2–12 characters'],
    phone: ['휴대폰 번호', 'Phone number'],
    phoneHint: ['로그인에 써요. 다른 손님에게는 보이지 않아요.', 'Used to log in. Other guests cannot see it.'],
    pw: ['비밀번호', 'Password'],
    pwHint: ['8자 이상', 'At least 8 characters'],
    agree: ['동의', 'Consent'],
    all: ['전체 동의', 'Agree to all'],
    age19: ['필수 · 만 19세 이상이에요', 'Required · I am 19 or older'],
    terms: ['필수 · 이용약관과 커뮤니티 규칙', 'Required · Terms and community rules'],
    privacy: ['필수 · 개인정보 수집·이용', 'Required · Use of personal information'],
    ads: ['선택 · 파티와 혜택 안내 (광고)', 'Optional · Party and offer updates (ads)'],
    night: ['선택 · 야간 알림', 'Optional · Nighttime notifications'],
    view: ['보기', 'Read'],
    start: ['가입하고 시작하기', 'Join and get started'],
    login: ['로그인', 'Log in'],
    reset: ['비밀번호 바꾸기', 'Reset password'],
    savePw: ['새 비밀번호로 로그인', 'Log in with new password'],
    resetHelp: ['비밀번호를 잊었나요? 매장에서 직원에게 QR을 요청하세요.', 'Forgot your password? Ask a staff member for a QR at the club.'],
    checkin: ['매장 체크인', 'Club check-in'],
    checked: ['체크인했어요', 'Checked in'],
    pending: ['확인 중이에요…', 'Checking…'],
    stamp: ['방문 스탬프 +1', 'Visit stamp +1'],
    points: ['+{gained}P · 내 포인트 {points}P', '+{gained}P · Your balance: {points}P'],
    badges: ['새 배지', 'New badges'],
    retry: ['다시 시도', 'Try again'],
    termsTitle: ['이용약관과 커뮤니티 규칙', 'Terms and community rules'],
    termsBody: [
      '그루브 라운지는 만 19세 이상 손님이 매장에서 가입할 수 있어요. 다른 사람의 사진은 허락을 받고 올려 주세요. 광고, 괴롭힘, 성적인 내용, 불법 게시물은 금지예요. 규칙을 어긴 글은 가려지거나 삭제될 수 있고 계정 이용이 제한될 수 있어요.',
      'Guests aged 19 or older can join Groove Lounge at the club. Get permission before sharing someone’s photo. Ads, harassment, sexual content and illegal posts are prohibited. Posts that break the rules may be hidden or removed and accounts may be restricted.'
    ],
    privacyTitle: ['개인정보 수집·이용', 'Use of personal information'],
    privacyBody: [
      '닉네임, 휴대폰 번호, 비밀번호는 가입과 계정 관리에 써요. 번호와 비밀번호는 원문으로 저장하지 않아요. 프로필을 고치면 사진, 소개, 층을 저장해요. 탈퇴하면 계정, 글, 사진이 삭제되며 신고·제재 기록에는 회원 ID만 최대 6개월 남아요.',
      'We use your nickname, phone number and password to operate your account. Your full number and password are stored as hashes. If you edit your profile, we store your photo, bio and floor preference. When you delete your account, your account, posts and photos are deleted. Moderation records retain only your member ID for up to six months.'
    ],
    'error.qr': ['가입·비밀번호 변경 QR이 잘못되었거나 시간이 지났어요. 매장에서 새 QR을 받아 주세요.', 'This QR is invalid or expired. Ask staff for a new QR.'],
    'error.nick': ['닉네임은 한글, 영문, 숫자, 점, 밑줄로 2~12자를 써 주세요. 사용할 수 없는 단어는 피해주세요.', 'Use 2–12 Korean letters, English letters, digits, periods or underscores. Some words are blocked.'],
    'error.nick_taken': ['이미 쓰는 닉네임이에요.', 'That nickname is taken.'],
    'error.phone': ['휴대폰 번호를 확인해 주세요.', 'Check your phone number.'],
    'error.phone_taken': ['이미 가입한 번호예요. 로그인해 주세요.', 'This number is registered. Please log in.'],
    'error.pw': ['비밀번호를 확인해 주세요. 새 비밀번호는 8자 이상이어야 해요.', 'Check your password. New passwords need at least 8 characters.'],
    'error.agree': ['필수 항목에 모두 동의해 주세요.', 'Check all required boxes.'],
    'error.bad': ['휴대폰 번호나 비밀번호를 확인해 주세요.', 'Check your phone number or password.'],
    'error.badLeft': ['번호나 비밀번호를 확인해 주세요. 남은 시도: {left}번', 'Check your number or password. Attempts left: {left}.'],
    'error.locked': ['로그인 시도가 너무 많아요. 10분 뒤 다시 시도해 주세요.', 'Too many attempts. Try again in 10 minutes.'],
    'error.code': ['체크인 QR이 잘못되었거나 시간이 지났어요. 입구에서 새 QR을 찍어 주세요.', 'This check-in QR is invalid or expired. Scan a new code at the entrance.'],
    'error.dup': ['오늘은 이미 체크인했어요.', 'You’ve already checked in today.'],
    'error.auth': ['다시 로그인해 주세요.', 'Please log in again.'],
    'error.busy': ['잠시 뒤 다시 시도해 주세요.', 'Wait a moment and try again.'],
    'error.network': ['연결을 확인하고 다시 시도해 주세요.', 'Check your connection and try again.'],
    'error.suspended': ['계정 이용이 잠시 정지됐어요.', 'Your account is temporarily suspended.'],
    'error.banned': ['계정 이용이 제한됐어요.', 'Your account is restricted.'],
    'error.photo': ['사진을 올릴 수 없어요. 다른 사진으로 다시 시도해 주세요.', 'Could not upload the photo. Try another image.'],
    'error.floor': ['층을 다시 골라 주세요.', 'Choose a valid floor.'],
    'error.bio': ['소개를 60자까지 써 주세요.', 'Keep your bio to 60 characters.'],
    'error.generic': ['지금은 처리할 수 없어요. 잠시 뒤 다시 시도해 주세요.', 'Could not complete this right now. Try again later.']
  };
  L.i18n(Object.fromEntries(['ko', 'en'].map((lang, i) =>
    [lang, Object.fromEntries(Object.entries(copy).map(([key, pair]) => ['auth.' + key, pair[i]]))]
  )));
  const t = (key, vars) => L.esc(L.t('auth.' + key, vars));
  const errorText = (result) => {
    if (result.error === 'bad' && Number.isInteger(result.left)) {
      return L.t('auth.error.badLeft', { left: result.left });
    }
    const key = 'auth.error.' + result.error;
    return Object.hasOwn(copy, 'error.' + result.error) ? L.t(key) : L.t('auth.error.generic');
  };
  L.errorText = errorText;

  function input(name, type, autocomplete, hint = '') {
    const min = name === 'pw' && autocomplete === 'new-password' ? ' minlength="8"' : '';
    return '<label class="shell-field">' + t(name) + hint +
      '<input name="' + name + '" type="' + type + '" autocomplete="' + autocomplete + '" required' + min + '></label>';
  }

  function inviter(q) {
    try {
      const [kind, payload] = q.split('.');
      if (kind !== 'j1' || !payload) return '';
      const bytes = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const { n } = JSON.parse(new TextDecoder().decode(bytes));
      return typeof n === 'string' ? n : '';
    } catch (e) { return ''; }
  }

  function policy(key) {
    return '<h2>' + t(key + 'Title') + '</h2><p>' + t(key + 'Body') + '</p>';
  }

  function consent() {
    const fields = ['age19', 'terms', 'privacy', 'ads', 'night'];
    return '<fieldset class="shell-consent"><legend class="sr-only">' + t('agree') + '</legend>' +
      '<label class="shell-choice"><input type="checkbox" name="all">' + t('all') + '</label>' +
      fields.map(name => '<div class="shell-consent-row"><label class="shell-choice"><input type="checkbox" name="' +
        name + '">' + t(name) + '</label>' +
        (name === 'terms' || name === 'privacy'
          ? '<button type="button" class="shell-link" data-policy="' + name + '" aria-label="' + t(name + 'Title') + '">' + t('view') + '</button>'
          : '') + '</div>').join('') + '</fieldset>';
  }

  function formScreen(action, params, root) {
    const joining = action === 'join';
    const loggingIn = action === 'login';
    const title = joining ? 'join' : loggingIn ? 'login' : 'reset';
    const qr = params.q || '';
    const name = joining ? inviter(qr) : '';
    const hint = key => '<small class="muted">' + t(key) + '</small>';
    root.innerHTML = '<section class="shell-auth"><header class="shell-brand">GROOVE</header><h1>' + t(title) + '</h1>' +
      (name ? '<p class="muted">' + t('invite', { name }) + '</p>' : '') +
      (!loggingIn && !qr ? '<p role="alert">' + t('scan') + '</p></section>' :
        '<form class="shell-form">' +
        (joining ? input('nick', 'text', 'nickname', hint('nickHint')) : '') +
        input('phone', 'tel', loggingIn ? 'username' : 'tel', joining ? hint('phoneHint') : '') +
        input('pw', 'password', loggingIn ? 'current-password' : 'new-password', loggingIn ? '' : hint('pwHint')) +
        (joining ? consent() : '') +
        '<p class="shell-error" role="alert" hidden></p><button type="submit" class="btn btn-hot">' +
        t(joining ? 'start' : loggingIn ? 'login' : 'savePw') + '</button></form>' +
        (loggingIn ? '<p class="muted">' + t('resetHelp') + '</p>' : '<a class="shell-link" href="#/login">' + t('login') + '</a>') +
        '</section>');
    const form = root.querySelector('form');
    if (!form) return;
    if (joining) {
      const { all } = form.elements;
      const boxes = [...form.querySelectorAll('.shell-consent-row input')];
      all.onchange = () => boxes.forEach(box => { box.checked = all.checked; });
      for (const box of boxes) {
        box.onchange = () => {
          all.checked = boxes.every(item => item.checked);
          all.indeterminate = !all.checked && boxes.some(item => item.checked);
        };
      }
      for (const button of form.querySelectorAll('[data-policy]')) {
        button.onclick = () => {
          const panel = L.sheet(policy(button.dataset.policy) + '<button type="button" class="btn">' + tClose() + '</button>');
          panel.querySelector('button').onclick = L.closeSheet;
        };
      }
    }
    form.onsubmit = async event => {
      event.preventDefault();
      const data = new FormData(form);
      const button = form.querySelector('[type=submit]');
      const error = form.querySelector('[role=alert]');
      const body = { phone: data.get('phone').trim(), pw: data.get('pw') };
      if (!loggingIn) body.q = qr;
      if (joining) {
        body.nick = data.get('nick').trim();
        body.lang = L.lang;
        for (const field of ['age19', 'terms', 'privacy', 'ads', 'night']) body[field] = data.has(field);
        if (!(body.age19 && body.terms && body.privacy)) {
          error.textContent = errorText({ error: 'agree' });
          error.hidden = false;
          return;
        }
      }
      error.hidden = true;
      button.disabled = true;
      const result = await L.api(action, body);
      button.disabled = false;
      if (!root.isConnected) return;
      if (!result.token || !result.me) {
        error.textContent = errorText(result);
        error.hidden = false;
        return;
      }
      L.setToken(result.token);
      L.me = result.me;
      if (result.me.lang) L.setLang(result.me.lang);
      const next = loggingIn && /^#\/(?!login(?:[/?]|$))/.test(params.next || '') ? params.next : 'me';
      L.go(next);
      if (joining) window.addEventListener('hashchange', () => L.showInstall(true), { once: true });
    };
  }

  const tClose = () => L.esc(L.t('core.close'));
  L.screen('join', { title: 'auth.join', render: (root, params) => formScreen('join', params, root) });
  L.screen('login', { title: 'auth.login', render: (root, params) => formScreen('login', params, root) });
  L.screen('reset', { title: 'auth.reset', render: (root, params) => formScreen('reset_pw', params, root) });
  for (const key of ['terms', 'privacy']) {
    L.screen(key, { title: 'auth.' + key + 'Title', render: root => { root.innerHTML = policy(key); } });
  }

  L.screen('checkin', {
    title: 'auth.checkin',
    async render(root, { c }) {
      root.innerHTML = '<h1>' + t('checkin') + '</h1><p role="status">' + t('pending') + '</p>';
      if (!c) {
        root.querySelector('[role=status]').textContent = errorText({ error: 'code' });
        return;
      }
      if (!L.me) {
        root.innerHTML = '<h1>' + t('checkin') + '</h1><button class="btn btn-hot">' + t('login') + '</button>';
        root.querySelector('button').onclick = L.needLogin;
        L.needLogin();
        return;
      }
      const result = await L.api('checkin', { c });
      if (!root.isConnected) return;
      if (result.error) {
        root.querySelector('[role=status]').textContent = errorText(result);
        if (result.error === 'auth') L.needLogin();
        if (['network', 'busy', 'auth'].includes(result.error)) {
          const retry = document.createElement('button');
          retry.className = 'btn';
          retry.textContent = L.t('auth.retry');
          retry.onclick = L.route;
          root.append(retry);
        }
        return;
      }
      const badges = Array.isArray(result.badges) ? result.badges : [];
      root.innerHTML = '<section class="shell-card"><h1>' + t('checked') + '</h1><p class="shell-score">' + t('stamp') +
        '</p><p>' + t('points', { gained: result.gained ?? 0, points: result.points ?? 0 }) + '</p>' +
        (badges.length ? '<h2>' + t('badges') + '</h2><ul>' +
          badges.map(badge => '<li>' + L.esc(badge.label || badge.key || badge) + '</li>').join('') + '</ul>' : '') +
        '<a href="#/me" class="btn btn-hot">' + L.esc(L.t('nav.me')) + '</a></section>';
      await L.refreshMe();
    }
  });
})(window.Lounge);
