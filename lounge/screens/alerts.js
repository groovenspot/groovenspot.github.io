// 라운지 알림함과 이 기기의 푸시 설정 (SPEC2 5-1).
(function (L) {
  const words = {
    ko: {
      title: '알림함', empty: '아직 알림이 없어요.', unread: '안 읽음 {n}개', read: '읽음',
      readAll: '모두 읽음', more: '이전 알림 더 보기', phone: '이 기기에서 알림 받기',
      enable: '폰 알림 켜기', disable: '폰 알림 끄기', types: '받을 폰 알림',
      preview: '잠금 화면에 표시할 내용', sensitive: '메시지·신고·안심 알림 내용 숨기기',
      all: '모든 내용 숨기기', details: '내용 표시',
      hours: '서비스 알림은 오전 7시부터 낮 12시까지 쉬어요.',
      serviceNight: '밤에도 서비스 알림 받기', promo: '광고 알림 설정', ad: '광고',
      install: '아이폰·아이패드(16.4 이상)는 Safari에서 공유 → 홈 화면에 추가를 누르세요. 홈 화면에서 라운지를 열고 폰 알림을 켜 주세요.',
      unsupported: '이 브라우저는 폰 알림을 지원하지 않아요.', denied: '브라우저 설정에서 알림을 허용해 주세요.',
      failed: '알림을 불러오거나 저장하지 못했어요. 다시 시도해 주세요.', retry: '다시 시도',
      lostPage: '분실물 확인', dj: '팔로우한 DJ', lost: '분실물', keep: '킵 만료', dm: '메시지',
      rooms: '오픈 대화방', social: '팔로우와 활동', md: '매장·예약 안내', rewards: '보상',
      follow: '새 팔로워', follow_request: '팔로우 요청', follow_accept: '팔로우 요청 수락'
    },
    en: {
      title: 'Notifications', empty: 'No notifications yet.', unread: '{n} unread', read: 'Read',
      readAll: 'Mark all as read', more: 'Load older notifications', phone: 'Notifications on this device',
      enable: 'Turn on push', disable: 'Turn off push', types: 'Push categories',
      preview: 'Lock screen previews', sensitive: 'Hide messages, reports and safety alerts',
      all: 'Hide all details', details: 'Show details',
      hours: 'Service notifications are quiet from 7 am to noon.',
      serviceNight: 'Receive service notifications at night', promo: 'Promotional notification settings', ad: 'Ad',
      install: 'On iPhone or iPad, use version 16.4 or later. In Safari, tap Share → Add to Home Screen. Open Lounge from your Home Screen and turn on push.',
      unsupported: 'This browser does not support push notifications.', denied: 'Allow notifications in your browser settings.',
      failed: 'Could not load or save notifications. Please try again.', retry: 'Try again',
      lostPage: 'Check lost and found', dj: 'DJs you follow', lost: 'Lost and found', keep: 'Keep expiry', dm: 'Messages',
      rooms: 'Open Chat', social: 'Follows and activity', md: 'Club and reservation updates', rewards: 'Rewards',
      follow: 'New follower', follow_request: 'Follow request', follow_accept: 'Follow request accepted'
    },
    ja: {
      serviceNight: '夜間もサービス通知を受け取る', promo: '広告通知の設定', ad: '広告',
      preview: 'ロック画面の通知プレビュー', sensitive: 'メッセージ・通報・安全通知の内容を隠す',
      all: 'すべての内容を隠す', details: '内容を表示する'
    },
    zh: {
      serviceNight: '夜间也接收服务通知', promo: '广告通知设置', ad: '广告',
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
  const followKinds = ['follow', 'follow_request', 'follow_accept'];
  L.i18n(Object.fromEntries(Object.entries(words).map(([lang, copy]) => [lang,
    Object.fromEntries(Object.entries(copy).map(([key, value]) => ['alerts.' + key, value]))
  ])));
  // 4차(인스타그램 방식 알림 줄) 문구 — 새 키라서 네 언어를 여기 같이 둔다 (SPEC4 1장)
  L.i18n({
    ko: { 'alerts4.settings': '알림 설정', 'alerts4.today': '오늘', 'alerts4.week': '이번 주', 'alerts4.earlier': '이전',
      'alerts4.others': '{nick}님 외 {n}명', 'alerts4.others1': '{nick}님 외 1명', 'alerts4.one': '{nick}님',
      'alerts4.like': '이 회원님의 게시물을 좋아해요.', 'alerts4.comment': '이 댓글을 남겼어요.', 'alerts4.reply': '이 답글을 남겼어요.',
      'alerts4.mention': '이 회원님을 언급했어요.', 'alerts4.tag': '이 사진에 회원님을 태그했어요.', 'alerts4.tag_approved': '이 사진 태그를 승인했어요.',
      'alerts4.follow': '이 회원님을 팔로우하기 시작했어요.', 'alerts4.follow_request': '이 팔로우를 요청했어요.',
      'alerts4.follow_accept': '이 팔로우 요청을 수락했어요.', 'alerts4.story_like': '이 회원님의 스토리를 좋아해요.',
      'alerts4.share': '이 메시지로 공유했어요.', 'alerts4.kind.share': '전달', 'alerts4.kind.other': '알림', 'alerts4.unreadDot': '안 읽음' },
    en: { 'alerts4.settings': 'Notification settings', 'alerts4.today': 'Today', 'alerts4.week': 'This week', 'alerts4.earlier': 'Earlier',
      'alerts4.others': '{nick} and {n} others', 'alerts4.others1': '{nick} and 1 other', 'alerts4.one': '{nick}',
      'alerts4.like': ' liked your post.', 'alerts4.comment': ' commented on your post.', 'alerts4.reply': ' replied to your comment.',
      'alerts4.mention': ' mentioned you.', 'alerts4.tag': ' tagged you in a photo.', 'alerts4.tag_approved': ' approved your photo tag.',
      'alerts4.follow': ' started following you.', 'alerts4.follow_request': ' requested to follow you.',
      'alerts4.follow_accept': ' accepted your follow request.', 'alerts4.story_like': ' liked your story.',
      'alerts4.share': ' shared something with you.', 'alerts4.kind.share': 'Share', 'alerts4.kind.other': 'Notification', 'alerts4.unreadDot': 'Unread' },
    ja: { 'alerts4.settings': '通知設定', 'alerts4.today': '今日', 'alerts4.week': '今週', 'alerts4.earlier': '以前',
      'alerts4.others': '{nick}さん、他{n}人', 'alerts4.others1': '{nick}さん、他1人', 'alerts4.one': '{nick}さん',
      'alerts4.like': 'があなたの投稿に「いいね」しました。', 'alerts4.comment': 'がコメントしました。', 'alerts4.reply': 'が返信しました。',
      'alerts4.mention': 'があなたをメンションしました。', 'alerts4.tag': 'が写真にあなたをタグ付けしました。', 'alerts4.tag_approved': 'が写真のタグを承認しました。',
      'alerts4.follow': 'があなたをフォローしました。', 'alerts4.follow_request': 'からフォローリクエストが届きました。',
      'alerts4.follow_accept': 'がフォローリクエストを承認しました。', 'alerts4.story_like': 'があなたのストーリーに「いいね」しました。',
      'alerts4.share': 'がメッセージで共有しました。', 'alerts4.kind.share': '共有', 'alerts4.kind.other': 'お知らせ', 'alerts4.unreadDot': '未読' },
    zh: { 'alerts4.settings': '通知设置', 'alerts4.today': '今天', 'alerts4.week': '本周', 'alerts4.earlier': '更早',
      'alerts4.others': '{nick}等{n}人', 'alerts4.others1': '{nick}等2人', 'alerts4.one': '{nick}',
      'alerts4.like': '赞了你的帖子。', 'alerts4.comment': '评论了你的帖子。', 'alerts4.reply': '回复了你的评论。',
      'alerts4.mention': '提到了你。', 'alerts4.tag': '在照片中标记了你。', 'alerts4.tag_approved': '通过了你的照片标记。',
      'alerts4.follow': '关注了你。', 'alerts4.follow_request': '请求关注你。',
      'alerts4.follow_accept': '通过了你的关注请求。', 'alerts4.story_like': '赞了你的快拍。',
      'alerts4.share': '通过私信分享给你。', 'alerts4.kind.share': '分享', 'alerts4.kind.other': '通知', 'alerts4.unreadDot': '未读' }
  });
  const t = (key, vars) => L.t('alerts.' + key, vars);
  const t4 = (key, vars) => L.t('alerts4.' + key, vars);
  const TYPES = ['like', 'comment', 'reply', 'mention', 'tag', 'tag_approved', 'follow', 'follow_request', 'follow_accept', 'story_like', 'share'];
  const KIND_ICON = { dj: 'play', lost: 'search', keep: 'pin', dm: 'chat', rooms: 'chat', social: 'heart', md: 'user', rewards: 'check',
    follow: 'userPlus', follow_request: 'userPlus', follow_accept: 'check', share: 'send' };
  // 알림 종류 이름 (화면 읽기용 머리말). 낱말 표에 없는 종류가 키 그대로('alerts.share') 보이던 버그(B3)를 막는다.
  function kindLabel(kind) {
    const known = L.t('alerts.' + kind);
    if (known !== 'alerts.' + kind) return known;
    const extra = t4('kind.' + kind);
    return extra !== 'alerts4.kind.' + kind ? extra : t4('kind.other');
  }
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
    L.setInbox('alerts', unread);   // 공통 헤더·화면 자체 막대의 알림 아이콘 배지를 모두 맞춤
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

  // ── 알림 설정 (#/alerts/settings) — 위 막대 ⚙ 로 들어온다: 이 기기 푸시 켜기·받을 종류·잠금 화면 내용 ──
  async function renderSettings(root) {
    root.className = 'al4 al4-settings shell-stack';
    root.innerHTML = L.bar({ title: t4('settings'), back: 'alerts' }) +
      '<section class="shell-card" data-phone><h2>' + e(t('phone')) + '</h2>' +
      '<button type="button" class="btn btn-hot" data-push hidden></button><p class="muted" role="status" data-push-hint></p>' +
      '<p class="muted">' + e(t('hours')) + '</p><fieldset class="shell-consent" data-prefs disabled><legend>' + e(t('types')) + '</legend>' +
      '<label class="shell-choice"><input type="checkbox" name="serviceNight">' + e(t('serviceNight')) + '</label>' +
      kinds.map(kind => '<label class="shell-choice"><input type="checkbox" name="' + kind + '">' + e(t(kind)) + '</label>').join('') +
      '<label class="shell-field">' + e(t('preview')) + '<select name="preview">' +
      ['sensitive', 'all', 'details'].map(mode => '<option value="' + mode + '">' + e(t(mode)) + '</option>').join('') +
      '</select></label>' +
      '</fieldset><p role="alert" class="shell-error" data-pref-error hidden></p><button type="button" class="btn" data-pref-retry hidden>' +
      e(t('retry')) + '</button></section><section class="shell-card"><a class="shell-link" href="#/me/settings">' +
      e(t('promo')) + '</a></section>';
    const prefs = root.querySelector('[data-prefs]');
    const preview = prefs.querySelector('[name=preview]');
    const serviceNight = prefs.querySelector('[name=serviceNight]');
    const prefError = root.querySelector('[data-pref-error]');
    const prefRetry = root.querySelector('[data-pref-retry]');
    let savedPreview = 'sensitive';

    async function loadPrefs() {
      prefs.disabled = true;
      prefError.hidden = true;
      prefRetry.hidden = true;
      try {
        const result = await action('alert_prefs');
        for (const kind of followKinds) {
          const old = prefs.querySelector(`[name="${kind}"]`);
          if (!Object.hasOwn(result.prefs, kind)) { old?.closest('label').remove(); continue; }
          if (old) continue;
          const label = document.createElement('label');
          label.className = 'shell-choice';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.name = kind;
          label.append(input, t(kind));
          preview.closest('label').before(label);
        }
        for (const input of prefs.querySelectorAll('input')) input.checked = result.prefs[input.name];
        serviceNight.checked = result.serviceNight === true;
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
      if (input !== preview && input !== serviceNight && !kinds.includes(input.name) && !followKinds.includes(input.name)) return;
      prefs.disabled = true;
      prefError.hidden = true;
      try {
        if (input === preview) {
          const result = await action('alert_prefs', { preview: preview.value });
          preview.value = savedPreview = result.preview;
        } else if (input === serviceNight) await action('alert_prefs', { serviceNight: input.checked });
        else await action('alert_prefs', { prefs: { [input.name]: input.checked } });
      } catch {
        if (input === preview) preview.value = savedPreview;
        else input.checked = !input.checked;
        prefError.textContent = t('failed');
        prefError.hidden = false;
      } finally {
        prefs.disabled = false;
      }
    };
    await Promise.all([loadPrefs(), pushSettings(root.querySelector('[data-phone]'))]);
  }

  // ── 알림 한 줄 (F55) ── 아바타(보낸 사람) 또는 종류 아이콘 + 한 문장(굵은 닉네임 + 내용 + 회색 지난 시간) + 오른쪽 글 사진 / 팔로우 버튼
  function sentence(n) {
    const isSafetyAck = n.kind === 'rooms' && n.url === '#/safety' && /^safety:safe[a-z0-9]{10}$/.test(n.tag);
    const { title, body } = isSafetyAck ? safetyAcknowledged[L.lang] || safetyAcknowledged.en : n;
    const from = n.from && typeof n.from.nick === 'string' && n.from.nick ? n.from : null;
    const type = TYPES.includes(n.type) ? n.type : '';
    const others = Number.isSafeInteger(n.others) && n.others > 0 ? n.others : 0;
    if (from && type) {
      // 닉네임만 굵게: '{nick}님 외 3명' 에서 닉네임 자리만 <strong>
      const key = others === 1 ? 'others1' : others ? 'others' : 'one';
      const who = t4(key, { nick: '\u0001', n: L.count(others) });
      return e(who).replace('\u0001', '<strong>' + e(from.nick) + '</strong>') + e(t4(type));
    }
    if (from && body && body.startsWith(from.nick)) return '<strong>' + e(from.nick) + '</strong><span>' + e(body.slice(from.nick.length)) + '</span>';
    return '<strong>' + e(title) + '</strong>' + (body ? ' <span>' + e(body) + '</span>' : '');
  }

  function rowOf(n) {
    const row = document.createElement('li');
    row.className = 'al4-item';
    row.dataset.read = String(Boolean(n.read));
    row.dataset.id = n.id;
    const from = n.from && typeof n.from.nick === 'string' && n.from.nick ? n.from : null;
    const thumb = typeof n.thumb === 'string' && n.thumb ? L.photoSrc(n.thumb) : '';
    const lead = from ? L.avatar(from, 44)
      : '<span class="al4-kind" aria-hidden="true">' + L.icon(KIND_ICON[n.kind] || 'bell', { size: 22 }) + '</span>';
    // 태그 알림은 태그 승인 화면(#/tags)으로 (스토리·글쓰기 작업창이 만든 화면)
    const target = n.category === 'promo' ? (L.open('l26_shell') ? '#/l26_home' : '#/tonight')
      : n.type === 'tag' && L.hasScreen('tags') ? '#/tags' : safeTarget(n.url);
    row.innerHTML = '<a class="al4-row" href="' + e(target) + '">' + lead +
      '<span class="al4-text"><span class="sr-only">' + e(n.category === 'promo' ? t('ad') : kindLabel(n.kind)) + ': </span>' + sentence(n) +
      ' <time class="al4-time" datetime="' + e(new Date(n.at).toISOString()) + '">' + e(L.ago(n.at)) + '</time></span>' +
      (thumb ? '<img class="al4-thumb" src="' + e(thumb) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') +
      '<i class="al4-dot" role="img" aria-label="' + e(t4('unreadDot')) + '"></i></a>';
    // 새 팔로워 알림: 맞팔로우 버튼 (프로필 작업창의 L.followButton 이 있으면)
    if (from && (n.type || n.kind) === 'follow' && typeof L.followButton === 'function') {
      const made = L.followButton(from);
      const side = document.createElement('span');
      side.className = 'al4-side';
      if (typeof made === 'string') side.innerHTML = made; else if (made instanceof Node) side.append(made);
      if (side.firstChild) row.append(side);
    }
    return row;
  }

  function groupOf(at, now) {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return at >= start.getTime() ? 'today' : at >= start.getTime() - 6 * 86400e3 ? 'week' : 'earlier';
  }

  async function render(root, params) {
    if (params?.id === 'settings') return renderSettings(root);
    const memberId = L.me.id;
    const stillHere = () => root.isConnected && L.me?.id === memberId;
    root.className = 'al4';
    root.innerHTML = '<div class="al4-page">' +
      L.bar({ title: t('title'), back: 'tonight', right: '<a class="ui-bar-btn" href="#/alerts/settings" data-al-settings aria-label="' + e(t4('settings')) + '">' + L.icon('settings') + '</a>' }) +
      '<div class="al4-requests" data-al-requests></div>' +
      '<div class="al4-status" data-al-status hidden><p role="status" data-unread></p><button type="button" class="al4-readall" data-read-all hidden>' + e(t('readAll')) + '</button></div>' +
      '<div data-notices aria-label="' + e(t('title')) + '"></div>' +
      '<p class="al4-empty muted" data-al-empty hidden>' + e(t('empty')) + '</p>' +
      '<p role="alert" class="shell-error" data-list-error hidden></p><button type="button" class="btn" data-more hidden></button>' +
      '<div data-al-end aria-hidden="true"></div></div>';

    // 팔로우 요청: 맨 위 한 줄(누르면 펼쳐서 수락·거절). 요청이 없으면 줄을 감춘다.
    const requests = root.querySelector('[data-al-requests]');
    if (L.profileFollows?.requests) {
      void Promise.resolve(L.profileFollows.requests(requests, true)).then(() => {
        if (requests.isConnected && !requests.querySelector('button, a')) requests.hidden = true;
      }, () => { requests.hidden = true; });
    }

    const inbox = root.querySelector('[data-notices]');
    const bar = root.querySelector('[data-al-status]');
    const status = root.querySelector('[data-unread]');
    const readAll = root.querySelector('[data-read-all]');
    const empty = root.querySelector('[data-al-empty]');
    const listError = root.querySelector('[data-list-error]');
    const more = root.querySelector('[data-more]');
    let before, newest = 0, unread = 0, loading = false, failed = false;

    function updateUnread() {
      const any = inbox.querySelector('li');
      status.textContent = unread ? t('unread', { n: unread }) : '';
      readAll.hidden = !unread;
      bar.hidden = !unread;
      empty.hidden = Boolean(any) || failed;
      if (stillHere()) paintAlertBadge(unread);
    }

    function listFor(group) {
      let section = inbox.querySelector('[data-group="' + group + '"]');
      if (!section) {
        section = document.createElement('section');
        section.dataset.group = group;
        section.innerHTML = '<h2 class="al4-head">' + e(t4(group)) + '</h2><ul class="al4-list"></ul>';
        const order = ['today', 'week', 'earlier'];
        const next = order.slice(order.indexOf(group) + 1).map(name => inbox.querySelector('[data-group="' + name + '"]')).find(Boolean);
        inbox.insertBefore(section, next || null);
      }
      return section.querySelector('ul');
    }

    // 줄 전체를 누르면 읽음 처리 + 이동 (따로 '읽음' 버튼 없음)
    inbox.addEventListener('click', async event => {
      const link = event.target.closest('a.al4-row');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const row = link.closest('li');
      event.preventDefault();
      const target = link.getAttribute('href');
      if (row.dataset.read !== 'true') {
        row.dataset.read = 'true';
        try {
          const result = await action('notices_read', { id: Number(row.dataset.id) });
          unread = result.unread;
          if (stillHere()) updateUnread();
        } catch { /* 읽음 처리가 안 돼도 이동은 한다 */ }
      }
      if (!stillHere()) return;
      if (target !== '#/alerts') L.go(target);
    });

    async function load(cursor) {
      if (loading) return;
      loading = true;
      more.hidden = true;
      listError.hidden = true;
      try {
        const result = await action('notices', cursor ? { before: cursor } : {});
        if (!stillHere()) return;
        failed = false;
        const now = Date.now();
        for (const n of result.notices) {
          listFor(groupOf(n.at, now)).append(rowOf(n));
          newest = Math.max(newest, n.id);
        }
        unread = result.unread;
        before = result.before;
        updateUnread();
      } catch {
        if (!stillHere()) return;
        failed = true;
        empty.hidden = true;
        listError.textContent = t('failed');
        listError.hidden = false;
        more.textContent = t('retry');
        more.hidden = false;
      } finally {
        loading = false;
      }
    }

    more.onclick = () => load(before);
    readAll.onclick = async () => {
      readAll.disabled = true;
      try {
        const result = await action('notices_read', { before: newest });
        if (!stillHere()) return;
        unread = result.unread;
        inbox.querySelectorAll('li[data-read="false"]').forEach(row => { row.dataset.read = 'true'; });
        updateUnread();
      } catch {
        listError.textContent = t('failed');
        listError.hidden = false;
      } finally {
        readAll.disabled = false;
      }
    };

    await load();
    // 끝에 닿으면 이전 알림을 이어서 불러온다 (실패했을 땐 '다시 시도' 버튼)
    stopMore?.();
    stopMore = L.more(root.querySelector('[data-al-end]'), async () => { if (before && !failed && stillHere()) await load(before); });
  }
  let stopMore;

  L.screen('alerts', { nav: 'me', auth: true, title: 'alerts.title', bar: 'own', keepScroll: true, render,
    leave() { stopMore?.(); stopMore = null; } });
  L.screen('lost', { title: 'alerts.lostPage', render(root) {
    const link = document.createElement('a');
    link.className = 'btn';
    link.href = ['ja', 'zh'].includes(L.lang) ? '/' + L.lang + '/lost/' : '/lost/';
    link.textContent = t('lostPage');
    root.append(link);
    location.replace(link.href);
  } });
})(window.Lounge);
