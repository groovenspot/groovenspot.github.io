(function (L) {
  const copy = {
    title: ['입장 QR', 'Entry QR', '入場QR', '入场二维码'],
    entrance: ['입구에서 이 QR을 보여주세요', 'Show this QR at the entrance', '入口でこのQRを提示してください', '请在入口出示此二维码'],
    show: ['QR 띄우기', 'Show QR', 'QRを表示', '显示二维码'],
    retry: ['다시 시도', 'Try again', '再試行', '重试'],
    checking: ['입장 인증 확인 중…', 'Checking entry…', '入場認証を確認中…', '正在检查入场验证…'],
    issuing: ['QR 발급 중…', 'Getting your QR…', 'QRを発行中…', '正在获取二维码…'],
    renewing: ['QR 만료 · 새 QR 발급 중…', 'QR expired · getting a new code…', 'QRの期限切れ・再発行中…', '二维码已过期 · 正在更新…'],
    staff: ['입구 경호팀에게 QR을 보여 주세요.', 'Show this QR to security at the entrance.', '入口の警備スタッフにQRを提示してください。', '请向入口安保人员出示二维码。'],
    countdown: ['만료까지 {s}초', 'Expires in {s}s', '有効期限まで{s}秒', '{s} 秒后过期'],
    verified: ['오늘 입장 인증 완료', 'Entry verified for today', '本日の入場認証完了', '今日入场验证完成'],
    offline: ['연결이 끊겼어요. 연결되면 자동으로 다시 확인해요.', 'Connection lost. We’ll check again when you reconnect.', 'オフラインです。再接続後に自動で確認します。', '连接已断开。恢复后会自动重试。'],
    error: ['입장 상태를 불러오지 못했어요.', 'Could not load your entry status.', '入場状況を取得できませんでした。', '无法获取入场状态。']
  };
  const languages = ['ko', 'en', 'ja', 'zh'];
  const pollMs = 5000;
  let generator;

  function loadGenerator() {
    if (typeof window.qrcode === 'function') return Promise.resolve(window.qrcode);
    generator ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/qrcode-generator-1.4.4.js';
      script.onload = () => typeof window.qrcode === 'function' ? resolve(window.qrcode) : reject(new Error('qr'));
      script.onerror = reject;
      document.head.append(script);
    }).catch(error => { generator = null; throw error; });
    return generator;
  }

  L.mountEntryQr = function (root, { loginHref, onVerified, automatic = false } = {}) {
    const t = key => copy[key][Math.max(0, languages.indexOf(L.lang))];
    root.hidden = !L.open('l26_entry');
    if (root.hidden) return { refresh() {}, destroy() {} };

    if (!document.querySelector('link[href="/lounge/css/l26-entry-qr.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/lounge/css/l26-entry-qr.css';
      document.head.append(link);
    }
    root.classList.add('l26-entry-qr');
    root.innerHTML = '<h2>' + t(automatic ? 'entrance' : 'title') + '</h2><button type="button" class="btn" hidden></button>' +
      '<a hidden></a><strong data-entry-tier hidden></strong><img alt="' + t('title') + '" hidden><p data-entry-countdown hidden></p><p role="status" hidden></p>';
    const button = root.querySelector('button');
    const login = root.querySelector('a');
    if (loginHref) login.href = loginHref;
    login.textContent = L.t('core.login');
    const image = root.querySelector('img');
    const tier = root.querySelector('[data-entry-tier]');
    const countdown = root.querySelector('[data-entry-countdown]');
    const status = root.querySelector('[role=status]');
    if (automatic) status.insertAdjacentHTML('beforebegin', '<span class="l26-entry-placeholder" aria-hidden="true" hidden></span>');
    const placeholder = automatic && root.querySelector('.l26-entry-placeholder');
    let member, verifiedDay, verifiedUntil = 0, expires = 0, poll, tick, pending;
    let wanted = false, checked = false, failures = 0, stopped = false;
    const active = () => !stopped && root.isConnected;
    const foreground = () => active() && !root.hidden && !document.hidden && navigator.onLine;

    function message(key) {
      status.hidden = !key;
      if (placeholder) placeholder.hidden = !['checking', 'issuing', 'renewing'].includes(key);
      const value = key ? t(key) : '';
      if (status.textContent !== value) status.textContent = value;
      root.classList.toggle('is-verified', key === 'verified');
    }
    function offer(key) {
      button.hidden = !key;
      if (key) button.textContent = t(key);
    }
    function clearQr() {
      clearTimeout(tick);
      image.hidden = countdown.hidden = tier.hidden = true;
      tier.textContent = '';
      image.removeAttribute('src');
      expires = 0;
    }
    function schedule(delay) {
      clearTimeout(poll);
      if (foreground()) poll = setTimeout(refresh, delay);
    }
    function remaining() {
      const ms = expires - performance.now();
      const seconds = Math.ceil(ms / 1000);
      if (seconds <= 0) {
        clearQr();
        if (foreground()) {
          message('renewing');
          refresh();
        }
        return;
      }
      countdown.textContent = t('countdown').replace('{s}', seconds);
      tick = setTimeout(remaining, Math.ceil(ms - (seconds - 1) * 1000));
    }

    async function read(issue) {
      const operation = pending = {};
      const started = performance.now();
      let deadline;
      try {
        const result = await Promise.race([
          issue ? L.api('l26_entry_issue', { skip_if_verified: true }) : L.api('l26_entry_status'),
          new Promise(resolve => { deadline = setTimeout(resolve, 8000, { error: 'network' }); })
        ]);
        if (pending !== operation || !foreground()) return;
        if (result.error === 'auth') {
          member = undefined;
          checked = wanted = false;
          clearQr();
          offer();
          login.hidden = !loginHref;
          if (automatic) root.hidden = true;
          message();
          return;
        }
        if (L.me?.id !== member) return;
        if (result.error === 'closed') {
          clearQr();
          root.hidden = true;
          return;
        }
        if (!result.ok || typeof result.verified !== 'boolean' || !Number.isSafeInteger(result.server_now) ||
            !Number.isSafeInteger(result.day_ends_at) || !/^\d{4}-\d{2}-\d{2}$/.test(result.biz_day)) throw new Error('entry');
        checked = true;
        if (result.verified) {
          const changed = verifiedDay !== result.biz_day;
          verifiedDay = result.biz_day;
          verifiedUntil = started + result.day_ends_at - result.server_now;
          wanted = false;
          clearQr();
          offer();
          message('verified');
          schedule(Math.max(500, verifiedUntil - performance.now() + 500));
          if (changed) onVerified?.({ bizDay: verifiedDay });
        } else if (issue) {
          if (!/^l26\.[A-Za-z0-9_-]{43}$/.test(result.qr) || !Number.isSafeInteger(result.expires_at)) throw new Error('qr');
          const make = await loadGenerator();
          if (pending !== operation || !foreground() || L.me?.id !== member) return;
          expires = started + result.expires_at - result.server_now;
          if (expires <= performance.now()) {
            clearQr();
            message('renewing');
            schedule(500);
            return;
          }
          const qr = make(0, 'M');
          qr.addData(result.qr, 'Byte');
          qr.make();
          image.src = qr.createDataURL(7, 28);
          image.hidden = countdown.hidden = false;
          message(automatic ? null : 'staff');
          remaining();
          schedule(pollMs);
        } else if (wanted) {
          message(automatic ? null : 'staff');
          schedule(expires ? pollMs : 0);
        } else {
          offer('show');
          message();
        }
        tier.textContent = image.hidden ? '' : L.membershipTier(result.membership_tier);
        tier.hidden = !tier.textContent;
        failures = 0;
      } catch {
        if (pending !== operation || !foreground()) return;
        clearQr();
        failures++;
        offer('retry');
        message('error');
        if (wanted) schedule(Math.min(30_000, pollMs * 2 ** (failures - 1)));
      } finally {
        clearTimeout(deadline);
        if (pending === operation) {
          pending = null;
          // A QR can expire while its status request is in flight.
          if (!failures && foreground() && wanted && !expires) schedule(500);
        }
      }
    }

    function refresh() {
      if (!active()) return;
      clearTimeout(poll);
      if (!L.open('l26_entry')) {
        root.hidden = true;
        pending = null;
        clearQr();
        return;
      }
      root.hidden = false;
      if (L.me?.id !== member) {
        member = L.me?.id;
        pending = null;
        checked = false;
        wanted = automatic && Boolean(member);
        verifiedDay = undefined;
        failures = 0;
        clearQr();
      }
      login.hidden = !!member || !loginHref;
      if (!member) { offer(); message(); return; }
      if (!foreground() || pending) return;
      if (verifiedDay && performance.now() < verifiedUntil) {
        schedule(verifiedUntil - performance.now() + 500);
        return;
      }
      verifiedDay = undefined;
      offer();
      if (!wanted) message('checking');
      else if (!expires && status.textContent !== t('renewing')) message('issuing');
      read(wanted && !expires && (checked || automatic));
    }

    function connection() {
      if (!active()) return;
      if (foreground()) refresh();
      else {
        clearTimeout(poll);
        clearQr();
        pending = null;
        if (!navigator.onLine && member && !verifiedDay) {
          offer();
          message('offline');
        }
      }
    }

    button.onclick = () => {
      if (!foreground()) return;
      failures = 0;
      if (checked) wanted = true;
      refresh();
    };
    document.addEventListener('visibilitychange', connection);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    refresh();
    if (!navigator.onLine) connection();

    return {
      refresh,
      destroy() {
        stopped = true;
        pending = null;
        clearTimeout(poll);
        clearQr();
        document.removeEventListener('visibilitychange', connection);
        window.removeEventListener('online', connection);
        window.removeEventListener('offline', connection);
        root.replaceChildren();
        root.hidden = true;
      }
    };
  };
})(window.Lounge);
