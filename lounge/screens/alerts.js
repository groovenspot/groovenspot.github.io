// 라운지 알림함과 이 기기의 푸시 설정 (SPEC2 5-1).
(function (L) {
  const words = {
    ko: {
      title: '알림함', empty: '아직 알림이 없어요.', unread: '안 읽음 {n}개', read: '읽음',
      readAll: '모두 읽음', more: '이전 알림 더 보기', phone: '이 기기에서 알림 받기',
      enable: '폰 알림 켜기', disable: '폰 알림 끄기', types: '받을 폰 알림',
      preview: '잠금 화면에 표시할 내용', sensitive: '메시지·신고·안심 알림 내용 숨기기',
      all: '모든 내용 숨기기', details: '내용 표시',
      hours: '오전 7시부터 낮 12시까지는 폰 알림을 쉬어요. 밤 알림 동의는 나 → 설정에서 바꿀 수 있어요.',
      install: '아이폰·아이패드(16.4 이상)는 Safari에서 공유 → 홈 화면에 추가를 누르세요. 홈 화면에서 라운지를 열고 폰 알림을 켜 주세요.',
      unsupported: '이 브라우저는 폰 알림을 지원하지 않아요.', denied: '브라우저 설정에서 알림을 허용해 주세요.',
      failed: '알림을 불러오거나 저장하지 못했어요. 다시 시도해 주세요.', retry: '다시 시도',
      lostPage: '분실물 확인', dj: '팔로우한 DJ', lost: '분실물', keep: '킵 만료', dm: '메시지',
      rooms: '오픈 대화방', social: '팔로우와 활동', md: '담당 MD', rewards: '보상'
    },
    en: {
      title: 'Notifications', empty: 'No notifications yet.', unread: '{n} unread', read: 'Read',
      readAll: 'Mark all as read', more: 'Load older notifications', phone: 'Notifications on this device',
      enable: 'Turn on push', disable: 'Turn off push', types: 'Push categories',
      preview: 'Lock screen previews', sensitive: 'Hide messages, reports and safety alerts',
      all: 'Hide all details', details: 'Show details',
      hours: 'Phone notifications are quiet from 7 am to noon. Change your night preferences under Me → Settings.',
      install: 'On iPhone or iPad, use version 16.4 or later. In Safari, tap Share → Add to Home Screen. Open Lounge from your Home Screen and turn on push.',
      unsupported: 'This browser does not support push notifications.', denied: 'Allow notifications in your browser settings.',
      failed: 'Could not load or save notifications. Please try again.', retry: 'Try again',
      lostPage: 'Check lost and found', dj: 'DJs you follow', lost: 'Lost and found', keep: 'Keep expiry', dm: 'Messages',
      rooms: 'Open Chat', social: 'Follows and activity', md: 'Your host', rewards: 'Rewards'
    },
    ja: {
      preview: 'ロック画面の通知プレビュー', sensitive: 'メッセージ・通報・安全通知の内容を隠す',
      all: 'すべての内容を隠す', details: '内容を表示する'
    },
    zh: {
      preview: '锁屏通知预览', sensitive: '隐藏私信、举报和安全通知的内容',
      all: '隐藏所有内容', details: '显示通知详情'
    }
  };
  // The staff acknowledgement keeps a stable tag across retries and existing inbox history.
  const safetyAcknowledged = {
    ko: { title: '경호팀이 가고 있어요', body: '경호팀이 요청을 확인했어요.' },
    en: { title: 'Security is on the way', body: 'Security has acknowledged your request.' },
    ja: { title: '警備スタッフが向かっています', body: '警備スタッフが呼び出しを確認しました。' },
    zh: { title: '安保人员正在赶来', body: '安保人员已确认你的请求。' }
  };
  const kinds = ['dj', 'lost', 'keep', 'dm', 'rooms', 'social', 'md', 'rewards'];
  L.i18n(Object.fromEntries(Object.entries(words).map(([lang, copy]) => [lang,
    Object.fromEntries(Object.entries(copy).map(([key, value]) => ['alerts.' + key, value]))
  ])));
  const t = (key, vars) => L.t('alerts.' + key, vars);
  const e = L.esc;
  const safeTarget = url => /^#\/[a-z][a-z0-9_-]*(?:[/?][^\u0000-\u001f\u007f]*)?$/.test(url) ? url : '#/alerts';

  async function action(name, args) {
    const result = await L.api(name, args);
    if (!result.ok) {
      if (result.error === 'auth') L.needLogin();
      throw new Error(result.error);
    }
    return result;
  }

  let badgeVersion = 0;
  function paintAlertBadge(unread) {
    if (!Number.isSafeInteger(unread) || unread < 0) return;
    badgeVersion++;
    const link = document.querySelector('[data-lounge-inbox="alerts"]');
    const badge = link?.querySelector('span');
    if (badge) {
      const label = L.t('core.alerts');
      badge.hidden = unread === 0;
      badge.textContent = unread > 99 ? '99+' : unread || '';
      link.setAttribute('aria-label', unread ? L.t('core.unread', { label, count: unread }) : label);
    }
    try {
      const badgeUpdate = unread ? navigator.setAppBadge?.(unread) : navigator.clearAppBadge?.();
      badgeUpdate?.catch(() => {});
    } catch {}
  }

  navigator.serviceWorker?.addEventListener('message', async event => {
    const controller = navigator.serviceWorker.controller;
    if (!controller || event.source !== controller || event.data?.type !== 'lounge-notices-changed' || !L.me) return;
    const member = L.me.id;
    const version = ++badgeVersion;
    const result = await L.api('notices');
    if (L.me?.id === member && version === badgeVersion) paintAlertBadge(result.unread);
  });

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function deviceMessage(registration, type, fields) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const finish = result => {
        clearTimeout(timer);
        channel.port1.close();
        if (result?.ok) resolve(result);
        else reject(new Error('push-device'));
      };
      const timer = setTimeout(finish, 3000);
      channel.port1.onmessage = event => finish(event.data);
      try {
        registration.active.postMessage({ type: 'lounge-push-' + type, ...fields }, [channel.port2]);
      } catch { finish(); }
    });
  }

  async function disconnectPush(registration, subscription, owner, device) {
    // 서버 요청은 토큰이 지워지기 전에 시작한다. 오프라인이어도 로컬 증표는 지운다.
    const endpoint = subscription?.endpoint;
    const revoked = endpoint ? L.api('push_logout', { endpoint, device }) : Promise.resolve({ ok: true });
    try {
      const local = await deviceMessage(registration, 'clear', { owner, device });
      if (local.cleared && subscription) await subscription.unsubscribe();
    } finally {
      const result = await revoked;
      if (!result.ok && result.error !== 'auth') throw new Error(result.error);
    }
  }

  L.logoutPush = async () => {
    const owner = L.me?.id;
    if (!owner || !pushSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration('/lounge/');
    if (!registration?.active || L.me?.id !== owner) return;
    const subscription = await registration.pushManager.getSubscription();
    if (L.me?.id === owner) await disconnectPush(registration, subscription, owner);
  };

  function keyBytes(key) {
    return Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4)),
      c => c.charCodeAt(0));
  }

  async function pushSettings(panel) {
    const owner = L.me.id;
    const hint = panel.querySelector('[data-push-hint]');
    const button = panel.querySelector('[data-push]');
    if (L.canInstall()) {
      hint.textContent = t('install');
      return;
    }
    if (!pushSupported()) {
      hint.textContent = t('unsupported');
      return;
    }

    let registration, appKey, subscription, device, enabled = false;
    function paint() {
      button.textContent = t(enabled ? 'disable' : 'enable');
      button.disabled = !enabled && Notification.permission === 'denied';
      hint.textContent = button.disabled ? t('denied') : '';
    }

    try {
      await navigator.serviceWorker.register('/lounge/sw.js');
      // A new worker becomes ready after it has cached the lounge shell.
      registration = await navigator.serviceWorker.getRegistration('/lounge/');
      if (!registration?.active) {
        let timer;
        try {
          registration = await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => {
            timer = setTimeout(reject, 8000);
          })]);
        } finally {
          clearTimeout(timer);
        }
      }
      const key = await action('push_key');
      appKey = keyBytes(key.key);
      subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        device = (await deviceMessage(registration, 'status', { owner, endpoint })).device;
        if (device) enabled = (await action('alert_prefs', { endpoint, device })).subscribed;
      }
    } catch {
      hint.textContent = t('failed');
      button.textContent = t('retry');
      button.hidden = false;
      button.onclick = () => {
        button.hidden = true;
        return pushSettings(panel);
      };
      return;
    }

    button.hidden = false;
    paint();
    button.onclick = async () => {
      if (L.me?.id !== owner) return;
      button.disabled = true;
      try {
        if (enabled) {
          enabled = false;
          await disconnectPush(registration, subscription, owner, device);
          subscription = null;
          device = null;
        } else {
          subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
          if (L.me?.id !== owner) return;
          const endpoint = subscription.endpoint;
          const proof = await action('push_sub', { sub: subscription.toJSON() });
          try {
            if (L.me?.id !== owner) return;
            await deviceMessage(registration, 'bind', { owner, endpoint, device: proof.device, secret: proof.secret });
            device = proof.device;
            enabled = true;
          } catch (error) {
            if (L.me?.id === owner) await disconnectPush(registration, subscription, owner, proof.device).catch(() => {});
            throw error;
          }
        }
        paint();
      } catch {
        paint();
        if (!button.disabled) hint.textContent = t('failed');
      }
    };
  }

  async function render(root) {
    const memberId = L.me.id;
    const stillHere = () => root.isConnected && L.me?.id === memberId;
    root.className = 'shell-stack';
    root.innerHTML = '<h1>' + e(t('title')) + '</h1>' +
      '<section class="shell-card shell-stack" aria-label="' + e(t('title')) + '">' +
      '<div class="shell-actions"><p role="status" data-unread></p><button type="button" class="btn" data-read-all hidden>' +
      e(t('readAll')) + '</button></div><ul class="shell-ledger" data-notices></ul>' +
      '<p role="alert" class="shell-error" data-list-error hidden></p><button type="button" class="btn" data-more hidden></button></section>' +
      '<section class="shell-card" data-phone><h2>' + e(t('phone')) + '</h2>' +
      '<button type="button" class="btn btn-hot" data-push hidden></button><p class="muted" role="status" data-push-hint></p>' +
      '<p class="muted">' + e(t('hours')) + '</p><fieldset class="shell-consent" data-prefs disabled><legend>' + e(t('types')) + '</legend>' +
      kinds.map(kind => '<label class="shell-choice"><input type="checkbox" name="' + kind + '">' + e(t(kind)) + '</label>').join('') +
      '<label class="shell-field">' + e(t('preview')) + '<select name="preview">' +
      ['sensitive', 'all', 'details'].map(mode => '<option value="' + mode + '">' + e(t(mode)) + '</option>').join('') +
      '</select></label>' +
      '</fieldset><p role="alert" class="shell-error" data-pref-error hidden></p><button type="button" class="btn" data-pref-retry hidden>' +
      e(t('retry')) + '</button></section>';

    void L.profileFollows.requests(root, true);

    const inbox = root.querySelector('[data-notices]');
    const status = root.querySelector('[data-unread]');
    const readAll = root.querySelector('[data-read-all]');
    const listError = root.querySelector('[data-list-error]');
    const more = root.querySelector('[data-more]');
    const prefs = root.querySelector('[data-prefs]');
    const preview = prefs.querySelector('[name=preview]');
    const prefError = root.querySelector('[data-pref-error]');
    const prefRetry = root.querySelector('[data-pref-retry]');
    let before, newest = 0, unread = 0;
    let savedPreview = 'sensitive';
    const date = new Intl.DateTimeFormat(L.lang, {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul'
    });

    function updateUnread() {
      status.textContent = inbox.children.length ? t('unread', { n: unread }) : t('empty');
      readAll.hidden = !unread;
      if (stillHere()) paintAlertBadge(unread);
    }

    async function load(cursor) {
      more.disabled = true;
      listError.hidden = true;
      try {
        const result = await action('notices', cursor ? { before: cursor } : {});
        for (const n of result.notices) {
          const row = document.createElement('li');
          row.dataset.read = String(n.read);
          row.className = 'shell-stack';
          const isSafetyAck = n.kind === 'rooms' && n.url === '#/safety' && /^safety:safe[a-z0-9]{10}$/.test(n.tag);
          const { title, body } = isSafetyAck ? safetyAcknowledged[L.lang] : n;
          row.innerHTML = '<span><strong>' + e(title) + '</strong><small class="muted">' +
            e(date.format(n.at)) + '</small></span>' + (body ? '<p class="shell-bio"></p>' : '');
          if (body) row.querySelector('p').textContent = body;
          const link = document.createElement('a');
          link.className = 'shell-link';
          link.href = safeTarget(n.url);
          link.textContent = t(n.kind);
          link.onclick = async event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || n.read) return;
            event.preventDefault();
            try {
              const result = await action('notices_read', { id: n.id });
              if (stillHere()) {
                paintAlertBadge(result.unread);
                L.go(link.hash);
              }
            } catch {
              listError.textContent = t('failed');
              listError.hidden = false;
            }
          };
          const actions = document.createElement('div');
          actions.className = 'shell-actions';
          actions.append(link);
          if (!n.read) {
            const read = document.createElement('button');
            read.type = 'button';
            read.className = 'btn';
            read.textContent = t('read');
            read.onclick = async () => {
              read.disabled = true;
              try {
                const result = await action('notices_read', { id: n.id });
                unread = result.unread;
                n.read = true;
                row.dataset.read = 'true';
                read.remove();
                updateUnread();
              } catch {
                read.disabled = false;
                listError.textContent = t('failed');
                listError.hidden = false;
              }
            };
            actions.append(read);
          }
          row.append(actions);
          inbox.append(row);
          newest = Math.max(newest, n.id);
        }
        unread = result.unread;
        before = result.before;
        updateUnread();
        more.textContent = t('more');
        more.hidden = !before;
      } catch {
        listError.textContent = t('failed');
        listError.hidden = false;
        more.textContent = t('retry');
        more.hidden = false;
      } finally {
        more.disabled = false;
      }
    }

    more.onclick = () => load(before);
    readAll.onclick = async () => {
      readAll.disabled = true;
      more.disabled = true;
      try {
        const result = await action('notices_read', { before: newest });
        if (stillHere()) paintAlertBadge(result.unread);
        inbox.replaceChildren();
        status.textContent = '';
        newest = 0;
        before = undefined;
        await load();
      } catch {
        listError.textContent = t('failed');
        listError.hidden = false;
      } finally {
        readAll.disabled = false;
        more.disabled = false;
      }
    };

    async function loadPrefs() {
      prefs.disabled = true;
      prefError.hidden = true;
      prefRetry.hidden = true;
      try {
        const result = await action('alert_prefs');
        for (const input of prefs.querySelectorAll('input')) input.checked = result.prefs[input.name];
        preview.value = savedPreview = result.preview || 'sensitive';
        prefs.disabled = false;
      } catch {
        prefError.textContent = t('failed');
        prefError.hidden = false;
        prefRetry.hidden = false;
      }
    }

    prefRetry.onclick = loadPrefs;
    prefs.onchange = async event => {
      const input = event.target;
      if (input !== preview && !kinds.includes(input.name)) return;
      prefs.disabled = true;
      prefError.hidden = true;
      try {
        if (input === preview) {
          const result = await action('alert_prefs', { preview: preview.value });
          preview.value = savedPreview = result.preview;
        } else await action('alert_prefs', { prefs: { [input.name]: input.checked } });
      } catch {
        if (input === preview) preview.value = savedPreview;
        else input.checked = !input.checked;
        prefError.textContent = t('failed');
        prefError.hidden = false;
      } finally {
        prefs.disabled = false;
      }
    };
    await Promise.all([load(), loadPrefs(), pushSettings(root.querySelector('[data-phone]'))]);
  }

  L.screen('alerts', { nav: 'me', auth: true, title: 'alerts.title', render });
  L.screen('lost', { title: 'alerts.lostPage', render(root) {
    const link = document.createElement('a');
    link.className = 'btn';
    link.href = ['ja', 'zh'].includes(L.lang) ? '/' + L.lang + '/lost/' : '/lost/';
    link.textContent = t('lostPage');
    root.append(link);
    location.replace(link.href);
  } });
})(window.Lounge);
