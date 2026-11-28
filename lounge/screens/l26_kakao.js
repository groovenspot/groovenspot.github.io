(function () {
  const L = window.Lounge;
  const storage = 'gl_kakao_browser';
  const resultRoute = '#/kakao-result';
  const copy = {
    login: ['카카오 로그인', 'Login with Kakao', 'Kakaoでログイン', '使用 Kakao 登录'],
    recover: ['카카오 가입 계정 복구 로그인', 'Recovery login for Kakao sign-ups', 'Kakao登録アカウントの復旧ログイン', 'Kakao 注册账号的恢复登录'],
    signup: ['카카오로 가입', 'Join with Kakao', 'Kakaoで登録', '使用 Kakao 注册'],
    door: ['입구에서 실물 신분증과 입장 QR을 확인한 뒤 라운지 기능을 이용할 수 있어요.', 'A door guard will check your physical ID and Entry QR before you can use Lounge features.', '入口で身分証の原本と入場QRを確認すると、ラウンジ機能が使えます。', '入口安保查验实体证件和入场二维码后，即可使用 Lounge 功能。'],
    recoveryHelp: ['카카오 연결이 끊겨도 이 닉네임과 비밀번호로 로그인할 수 있어요.', 'Use this nickname and password to sign in if your Kakao connection becomes unavailable.', 'Kakao連携が使えない場合も、このニックネームとパスワードでログインできます。', 'Kakao 连接不可用时，可使用此昵称和密码登录。'],
    nick: ['닉네임', 'Nickname', 'ニックネーム', '昵称'],
    recoveryPw: ['복구 비밀번호 (8자 이상)', 'Recovery password (at least 8 characters)', '復旧用パスワード（8文字以上）', '恢复密码（至少 8 个字符）'],
    currentPw: ['현재 비밀번호', 'Current password', '現在のパスワード', '当前密码'],
    link: ['카카오 연결', 'Connect Kakao', 'Kakaoを連携', '连接 Kakao'],
    linked: ['카카오 연결됨', 'Kakao is connected', 'Kakao連携済み', '已连接 Kakao'],
    unlink: ['카카오 연결 해제', 'Disconnect Kakao', 'Kakao連携を解除', '断开 Kakao 连接'],
    unlinkHelp: ['연결을 해제하면 모든 기기에서 로그아웃돼요. 비밀번호로 다시 로그인할 수 있어요.', 'Disconnecting signs you out on all devices. You can sign in again with your password.', '連携を解除すると全端末でログアウトします。パスワードで再ログインできます。', '断开后所有设备都会退出登录。你可以使用密码重新登录。'],
    unlinked: ['카카오 연결을 해제했어요.', 'Kakao was disconnected.', 'Kakao連携を解除しました。', '已断开 Kakao 连接。'],
    continue: ['계속', 'Continue', '続ける', '继续'],
    terms: ['이용약관에 동의합니다.', 'I agree to the Terms of Service.', '利用規約に同意します。', '我同意使用条款。'],
    privacy: ['개인정보처리방침에 동의합니다.', 'I agree to the Privacy Policy.', 'プライバシーポリシーに同意します。', '我同意隐私政策。'],
    ageTitle: ['가입 연령에 해당하지 않아요', 'Age requirement', '登録年齢の条件', '注册年龄要求'],
    birthTitle: ['출생연도를 확인할 수 없어요', 'Birth year unavailable', '出生年を確認できません', '无法确认出生年份'],
    deniedTitle: ['카카오 동의가 취소됐어요', 'Kakao consent was cancelled', 'Kakaoでの同意が取り消されました', 'Kakao 授权已取消'],
    errorTitle: ['카카오 요청을 완료하지 못했어요', 'Kakao request could not be completed', 'Kakaoの手続きを完了できませんでした', '无法完成 Kakao 请求'],
    kakao_age: ['19세 이상(올해 19세가 되는 분 포함)만 가입할 수 있어요. 입장할 때 신분증을 확인해요.', 'Only guests aged 19 or older (including those turning 19 this year) can join. ID is checked at the door.', '19歳以上（今年19歳になる方を含む）のみ登録できます。入場時に身分証を確認します。', '仅限19岁及以上（含今年满19岁者）注册。入场时将核验身份证件。'],
    kakao_birthyear: ['카카오에서 출생연도가 제공되면 가입할 수 있어요. 직원 QR 가입도 이용할 수 있어요.', 'You can sign up when Kakao supplies your birth year. Staff QR sign-up is also available.', 'Kakaoから出生年が提供されると登録できます。スタッフのQR登録も利用できます。', 'Kakao 提供出生年份后即可注册。你也可以通过员工二维码注册。'],
    kakao_denied: ['카카오에 다시 로그인하고 요청된 항목을 확인해 주세요.', 'Sign in with Kakao again and review the requested permissions.', '再度Kakaoでログインし、同意項目をご確認ください。', '请重新通过 Kakao 登录并查看所请求的权限。'],
    kakao_linked: ['이미 카카오 연결이 있어요. MY 설정에서 연결을 확인해 주세요.', 'There is already a Kakao connection. Check your account settings.', 'Kakaoは連携済みです。アカウント設定をご確認ください。', '已有 Kakao 连接。请查看账号设置。'],
    kakao_unavailable: ['지금은 새 카카오 가입이나 연결을 할 수 없어요.', 'New Kakao sign-ups and connections are currently closed.', '現在、新規Kakao登録や連携はできません。', '当前暂停新的 Kakao 注册和账号连接。'],
    bad: ['닉네임 또는 비밀번호를 확인해 주세요.', 'Check your nickname or password.', 'ニックネームまたはパスワードを確認してください。', '请检查昵称或密码。'],
    kakao_error: ['로그인 화면이나 MY 설정에서 다시 시도해 주세요.', 'Try again from the login screen or your account settings.', 'ログイン画面またはアカウント設定からやり直してください。', '请从登录页面或账号设置重试。']
  };
  const index = () => ({ ko: 0, en: 1, ja: 2, zh: 3 })[L.lang] ?? 0;
  const text = key => L.esc(copy[key][index()]);
  const error = result => copy[result.error] ? text(result.error) :
    result.error?.startsWith('kakao_') ? text('kakao_error') : L.esc(L.errorText(result));
  const back = (path, label) => '<a class="shell-link" href="#/' + path + '">' + label + '</a>';
  const password = (fresh = false) => '<label class="shell-field">' + text(fresh ? 'recoveryPw' : 'currentPw') +
    '<input type="password" name="pw" autocomplete="' + (fresh ? 'new-password' : 'current-password') + '"' +
    (fresh ? ' minlength="8"' : '') + ' maxlength="256" required></label>';
  const nickInput = () => '<label class="shell-field">' + text('nick') +
    '<input name="nick" type="text" autocomplete="username" minlength="2" maxlength="12" required></label>';
  const alert = '<p class="shell-error" role="alert" hidden></p>';
  const submit = key => '<button class="btn btn-hot" type="submit">' + text(key) + '</button>';
  const policyLink = key => '<a href="/lounge/policy.html#' + ['ko', 'en', 'ja', 'zh'][index()] + '-' + key +
    '" target="_blank" rel="noopener noreferrer">' + text(key) + '</a>';

  function encoded(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function start(mode, { pw, next }, container) {
    const browser = encoded(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = encoded(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(browser)));
    const result = await L.api('l26_kakao_prepare', { mode, browser: challenge, pw, next, lang: L.lang });
    if (!container.isConnected || !result.ok) return result;
    sessionStorage.setItem(storage, browser);
    const form = document.createElement('form');
    form.hidden = true;
    form.method = 'POST';
    form.action = new URL('/kakao/start', L.apiBase()).href;
    const state = document.createElement('input');
    state.type = 'hidden';
    state.name = 'state';
    state.value = result.state;
    form.append(state);
    document.body.append(form);
    form.submit();
    return result;
  }

  function showError(node, result) {
    node.innerHTML = error(result);
    node.hidden = false;
  }

  function formHandler(form, handler) {
    const button = form.querySelector('[type="submit"]');
    const message = form.querySelector('[role="alert"]');
    form.onsubmit = async event => {
      event.preventDefault();
      button.disabled = true;
      message.hidden = true;
      try {
        const result = await handler(new FormData(form));
        if (result?.error && form.isConnected) showError(message, result);
      } catch {
        if (form.isConnected) showError(message, { error: 'kakao_error' });
      } finally {
        button.disabled = false;
      }
    };
  }

  function signedIn(result) {
    L.setToken(result.token);
    L.me = result.me;
    if (result.me.lang) L.setLang(result.me.lang);
    L.go(result.me.access?.locked ? 'l26_access' : result.next || 'me');
  }

  L.kakaoLogin = async function (container, params) {
    const status = await L.api('l26_kakao_status');
    if (!container.isConnected || L.me) return;
    const recovery = back('kakao-recover', text('recover'));
    if (!status.login) {
      container.innerHTML = recovery;
      return;
    }
    container.innerHTML = '<button type="button" class="l26-kakao-button" data-kakao-login>' +
      '<img src="/lounge/assets/kakao-login-ko.png" alt="' + text('login') + '">' +
      '</button>' + alert + recovery;
    const button = container.querySelector('button');
    button.onclick = async () => {
      button.disabled = true;
      const message = container.querySelector('[role="alert"]');
      message.hidden = true;
      try {
        const result = await start('login', { next: (params.next || '').replace(/^#\//, '') }, container);
        if (!result.ok && container.isConnected) showError(message, result);
      } catch {
        if (container.isConnected) showError(message, { error: 'kakao_error' });
      } finally {
        button.disabled = false;
      }
    };
  };

  L.kakaoRecoveryHelp = () => text('recoveryHelp');

  L.kakaoSettings = async function (container) {
    const status = await L.api('l26_kakao_status');
    if (!container.isConnected || !status.ok || L.isPreview() || (!status.linked && !status.enroll)) return;
    const action = status.linked ? 'unlink' : 'link';
    container.className = 'shell-card';
    container.innerHTML = '<h2>' + text(status.linked ? 'linked' : 'link') + '</h2>' +
      (status.linked ? '<p class="muted">' + text('unlinkHelp') + '</p>' : '') +
      '<form class="shell-form" data-kakao-' + action + '>' + password() + alert + submit(action) + '</form>';
    formHandler(container.querySelector('form'), async data => {
      if (action === 'link') return start('link', { pw: data.get('pw') }, container);
      const result = await L.api('l26_kakao_unlink', { pw: data.get('pw') });
      if (result.ok && result.disconnected) {
        L.setToken('');
        L.me = null;
        L.go('login');
        L.toast(copy.unlinked[index()]);
      }
      return result;
    });
  };

  function errorScreen(root, result) {
    const titles = { kakao_age: 'ageTitle', kakao_birthyear: 'birthTitle', kakao_denied: 'deniedTitle' };
    root.innerHTML = '<section class="shell-auth l26-kakao-result"><h1>' + text(titles[result.error] || 'errorTitle') +
      '</h1><p role="alert">' + error(result) + '</p>' +
      back(L.me ? 'me/settings' : 'login', L.me ? L.esc(L.t('me.settings')) : text('login')) +
      (L.me ? '' : back('kakao-recover', text('recover'))) + '</section>';
  }

  async function handleResult(root) {
    const receipt = receiptOnce;
    receiptOnce = '';
    let browser;
    try {
      browser = sessionStorage.getItem(storage);
      sessionStorage.removeItem(storage);
    } catch {}
    if (!receipt || !browser) return errorScreen(root, { error: 'kakao_expired' });
    root.innerHTML = '<section class="shell-auth"><p role="status">' + L.esc(L.t('core.loading')) + '</p></section>';
    const result = await L.api('l26_kakao_finish', { receipt, browser });
    if (!root.isConnected) return;
    if (result.token && result.me) return signedIn(result);
    if (result.linked) return L.go('me/settings');
    if (!result.signup) return errorScreen(root, result);
    root.innerHTML = '<section class="shell-auth l26-kakao-result"><h1>' + text('signup') + '</h1><p>' + text('door') +
      '</p><form class="shell-form" data-kakao-signup>' + nickInput() + password(true) +
      '<p class="muted">' + text('recoveryHelp') + '</p>' +
      '<fieldset class="shell-consent">' + ['terms', 'privacy'].map(key =>
        '<label class="shell-choice"><input type="checkbox" name="' + key + '" required>' + policyLink(key) + '</label>').join('') +
      '</fieldset>' + alert + submit('signup') + '</form>' + back('login', text('login')) + '</section>';
    const form = root.querySelector('form');
    if (/^[가-힣A-Za-z0-9._]{2,12}$/.test(result.nickname)) form.elements.nick.value = result.nickname;
    formHandler(form, async data => {
      const complete = await L.api('l26_kakao_finish', {
        receipt, browser, complete: true, terms_version: result.terms_version,
        nick: data.get('nick'), pw: data.get('pw'), terms: data.has('terms'), privacy: data.has('privacy')
      });
      if (!form.isConnected) return;
      if (complete.token && complete.me) return signedIn(complete);
      if (complete.error?.startsWith('kakao_')) return errorScreen(root, complete);
      return complete;
    });
  }

  function renderRecovery(root) {
    root.innerHTML = '<section class="shell-auth"><h1>' + text('recover') + '</h1><p>' + text('recoveryHelp') +
      '</p><form class="shell-form">' + nickInput() + password() + alert + submit('continue') +
      '</form>' + back('login', text('login')) + '</section>';
    const form = root.querySelector('form');
    formHandler(form, async data => {
      const result = await L.api('l26_kakao_recover', { nick: data.get('nick'), pw: data.get('pw') });
      if (result.token && result.me && form.isConnected) return signedIn(result);
      return result;
    });
  }

  // Keep the short-lived callback handle out of the visible URL and browser history.
  let receiptOnce = '';
  if (location.hash.startsWith(resultRoute + '?')) {
    receiptOnce = new URLSearchParams(location.hash.slice(resultRoute.length + 1)).get('receipt') || '';
    history.replaceState(history.state, '', resultRoute);
  }
  L.screen('kakao-result', { title: 'auth.login', render: handleResult });
  L.screen('kakao-recover', { title: 'auth.login', render: renderRecovery });
})();
