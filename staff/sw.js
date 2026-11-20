/* GROOVE STAFF 알림 (웹 푸시). 서버는 내용 없는 신호만 보내고, 여기서 로그인 토큰으로 무엇이 왔는지(peek) 받아 보여 준다.
   📶 앱 화면 저장 (2026-11-19): 앱 화면(staff/index.html)·아이콘·manifest 를 이 폰에 저장해 둔다.
   항상 새로 받아 보고(먼저 인터넷), 3.5초 안에 안 오거나 끊기면 저장된 화면을 띄운다 — 지하·신호 약한 곳에서도 첫 화면이 뜨게.
   받아지면 저장본을 새것으로 바꾼다. 새 버전 확인은 화면이 staff/version.json 으로 한다(다르면 새로 받아 새로고침).
   서버(API)·사진·version.json 같은 다른 요청은 저장하지 않는다. */
var API = 'https://groove-staff-api.groovenspotbusan.workers.dev/';
var SHELL = 'gs-shell-v1', WAIT = 3500;
var PAGE = '/staff/', STATIC = ['/staff/manifest.webmanifest', '/staff/icon-192.png', '/staff/icon-512.png', '/staff/badge-72.png'];
function noop() {}
// 안드로이드 알림 버튼은 2개까지 → 가장 많은 답 하나 + '다른 답' (누르면 앱의 전체 화면 카드: 4개 버튼·직접 입력) (2026-11-21)
var WHERE_ACTIONS = [
  { action: 'where-left', title: '🚪 나가심' },
  { action: 'where-open', title: '다른 답 · 직접 입력' }
];
var WHERE_ANSWER_ACTIONS = ['where-left', 'where-moved', 'where-smoke', 'where-rest', 'where-seat', 'where-unknown'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  // 미리 저장 (실패해도 설치는 그대로 — 알림이 먼저)
  e.waitUntil(caches.open(SHELL).then(function (c) {
    return Promise.all([PAGE].concat(STATIC).map(function (u) {
      return fetch(u, { cache: 'no-cache' }).then(function (r) { if (r.ok && !r.redirected) return c.put(u, r); }).catch(noop);
    }));
  }).catch(noop));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return /^gs-shell-/.test(k) && k !== SHELL; }).map(function (k) { return caches.delete(k); }));
  }).catch(noop).then(function () { return self.clients.claim(); }));
});
// 저장할 요청이면 저장 이름(키), 아니면 '' (손대지 않음)
function shellKey(rq) {
  if (rq.method !== 'GET') return '';
  var u = new URL(rq.url);
  if (u.origin !== self.location.origin) return '';   // API·사진(드라이브) 등 다른 곳은 그대로
  var page = u.pathname === '/staff/' || u.pathname === '/staff/index.html';
  if (page && rq.mode === 'navigate') return PAGE;   // 앱 열기 (#탭·?주소가 붙어도)
  if (u.search) return '';   // ?v= 버전 확인 등은 그대로
  if (page) return PAGE;
  return STATIC.indexOf(u.pathname) >= 0 ? u.pathname : '';
}
self.addEventListener('fetch', function (e) {
  var rq = e.request, key = '';
  try { key = shellKey(rq); } catch (x) { key = ''; }
  if (!key) return;
  var nav = rq.mode === 'navigate', saved = null;
  var net = fetch(rq.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) {   // no-cache: 브라우저 저장본도 서버에 확인(바뀐 것만 받음)
    if (r.redirected) return nav ? fetch(rq) : r;   // 옮겨진 주소는 저장하지 않고 브라우저에 맡긴다
    if (!r.ok) return r;
    saved = caches.open(SHELL).then(function (c) { return c.put(key, r.clone()); }).catch(noop);
    return saved.then(function () { return r; });
  });
  var fromCache = function () { return caches.open(SHELL).then(function (c) { return c.match(key); }).catch(function () { return null; }); };
  e.respondWith(new Promise(function (res, rej) {
    var done = false, t = null;
    var fin = function (r) { if (!done) { done = true; clearTimeout(t); res(r); } };
    net.then(function (r) {
      if (r.ok || r.type === 'opaqueredirect' || r.redirected) return fin(r);
      return fromCache().then(function (m) { fin(m || r); });   // 서버 오류(5xx 등) → 저장된 화면
    }, function (err) {
      return fromCache().then(function (m) { if (m) fin(m); else if (!done) { done = true; clearTimeout(t); rej(err); } });   // 끊김 → 저장된 화면
    });
    t = setTimeout(function () { fromCache().then(function (m) { if (m) fin(m); }); }, WAIT);   // 느리면 저장된 화면 (받는 건 계속 받아서 저장)
  }));
  e.waitUntil(net.then(function () { return saved; }, noop));
});

// 토큰: 있으면 문자열, 로그아웃(없음)이면 '', 읽지 못하면 null
function token() {
  return new Promise(function (res) {
    try {
      var rq = indexedDB.open('gs', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
      rq.onsuccess = function () {
        try { var q = rq.result.transaction('kv').objectStore('kv').get('token'); q.onsuccess = function () { res(q.result || ''); }; q.onerror = function () { res(null); }; }
        catch (e) { res(null); }
      };
      rq.onerror = function () { res(null); };
    } catch (e) { res(null); }
  });
}
function clearToken() {
  return new Promise(function (res) {
    try {
      var rq = indexedDB.open('gs', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
      rq.onsuccess = function () { try { var tx = rq.result.transaction('kv', 'readwrite'); tx.objectStore('kv').delete('token'); tx.oncomplete = tx.onerror = tx.onabort = function () { res(); }; } catch (e) { res(); } };
      rq.onerror = function () { res(); };
    } catch (e) { res(); }
  });
}
// 🔕 로그아웃된 기기 (2026-11-19): 서버가 '이 로그인은 끝남(gone)'이라고 하거나 이 기기에 로그인이 없으면,
// 알림 하나만 보여 주고(푸시가 오면 꼭 무언가 보여 줘야 함) 이 기기 알림 구독을 끈다 → 다음부터 안 옴.
function goneOff() {
  return self.registration.showNotification('GROOVE STAFF', { body: '로그아웃됐어요 · 이 기기 알림을 껐어요', tag: 'gs-off', icon: '/staff/icon-192.png', badge: '/staff/badge-72.png', data: { tab: '' } })
    .catch(noop)
    .then(function () { return self.registration.pushManager.getSubscription(); })
    .then(function (s) { return s && s.unsubscribe(); })
    .catch(noop)
    .then(clearToken);
}
// 📱 끝난 일 알림 지우기 (대표 요청 2026-11-20 2시): 떠 있는 알림의 ref(ops:ID 등)를 peek 에 같이 보내고, 답의 done(끝났거나 다른 사람이 받아 간 일)은 새 알림을 띄운 뒤 닫음
function openNotices() {
  try { return self.registration.getNotifications().catch(function () { return []; }); }
  catch (x) { return Promise.resolve([]); }
}
function closeDone(done) {
  if (!done || !done.length) return;
  return openNotices().then(function (ns) {
    ns.forEach(function (x) { if (x.data && x.data.ref && done.indexOf(x.data.ref) >= 0) x.close(); });
  });
}
function locationNotice(n) {
  return /^where(?:-answer)?:[-\w]{1,40}$/.test(n.ref || '') && (n.kind === 'where' || n.kind === 'where-answer');
}
function showPeek(n, previous, secondary) {
  var sos = n.kind === 'sos', loc = locationNotice(n);
  var seen = loc && previous.some(function (x) { return x.data && x.data.ref === n.ref && x.data.at === n.at; });
  if (seen && secondary) return Promise.resolve();
  var message = seen ? Promise.resolve() : self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    cs.forEach(function (c) { try { c.postMessage({ peek: { title: n.title, body: n.body, kind: n.kind || '', ref: n.ref || '' } }); } catch (x) {} });
  }).catch(noop);
  // 경호 알림과 위치 질문은 각각 같은 호출끼리 묶는다.
  var tag = sos ? 'gs-sos' : loc ? 'gs-' + n.ref : 'gs-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  var opt = { body: n.body, tag: tag, renotify: !seen, icon: '/staff/icon-192.png', badge: '/staff/badge-72.png', data: { tab: n.tab || '', ref: n.ref || '' } };
  if (loc) opt.data.at = n.at;
  if (loc && n.kind === 'where') {
    opt.vibrate = [240, 120, 240]; opt.silent = false; opt.requireInteraction = true;   // 답할 때까지 알림이 남게
    if (/Android.*Chrome\//i.test((self.navigator || {}).userAgent || '')) {
      var max = typeof Notification !== 'undefined' ? Notification.maxActions : undefined;
      opt.actions = WHERE_ACTIONS.slice(0, Number.isFinite(max) ? max : 2);
    }
  }
  if (sos) { opt.requireInteraction = true; opt.vibrate = [300, 100, 300, 100, 600]; opt.silent = false; }
  if (n.kind === 'roar') { opt.requireInteraction = true; opt.vibrate = [500, 120, 500, 120, 900]; opt.silent = false; }
  return Promise.all([message, self.registration.showNotification(n.title, opt)]);
}
self.addEventListener('push', function (e) {
  var previous;
  e.waitUntil(Promise.all([token(), openNotices()]).then(function (v) {
    var t = v[0]; previous = v[1];
    if (t === '') return { gone: true };
    if (!t) return null;
    var refs = previous.map(function (x) { return x.data && x.data.ref; }).filter(Boolean).slice(-60);
    var body = { a: 'peek', token: t, wherePush: true }; if (refs.length) body.refs = refs;
    return fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }).then(function (n) {
    if (n && n.gone) return goneOff();
    n = n && n.ok ? n : { title: 'GROOVE STAFF', body: '새 소식이 있어요', tab: '' };
    var list = [showPeek(n, previous, false)];
    if (Array.isArray(n.locations)) n.locations.filter(locationNotice).forEach(function (x) { list.push(showPeek(x, previous, true)); });
    return Promise.all(list).then(function () { return closeDone(n.done); });
  }));
});
function openStaff(tab, ref) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) {
      if (new URL(cs[i].url).pathname.indexOf('/staff/') === 0) { cs[i].postMessage({ tab: tab, ref: ref }); return cs[i].focus(); }
    }
    return self.clients.openWindow('/staff/' + (/^dec:[-\w]{1,40}$/.test(ref) ? '#' + ref : tab ? '#' + tab : ''));
  });
}
function whereAction(ref, action) {
  var id = /^where:([-\w]{1,40})$/.exec(ref);
  if (!id || WHERE_ANSWER_ACTIONS.indexOf(action) < 0) return Promise.resolve(false);
  return token().then(function (t) {
    if (typeof t !== 'string' || !t) return false;
    return fetch(API, { method: 'POST', body: JSON.stringify({ a: 'where_answer', token: t, id: id[1], answer: action.slice(6) }) })
      .then(function (r) { return r.json(); }).then(function (r) { return !!r.ok; });
  }).catch(function () { return false; });
}
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var tab = (e.notification.data && e.notification.data.tab) || '', ref = (e.notification.data && e.notification.data.ref) || '';
  if (tab !== 'where' || !e.action || e.action === 'where-open') { e.waitUntil(openStaff(tab, ref)); return; }
  e.waitUntil(whereAction(ref, e.action).then(function (ok) {
    if (!ok) return openStaff('where', ref);
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
      cs.forEach(function (c) { if (new URL(c.url).pathname.indexOf('/staff/') === 0) c.postMessage({ whereDone: true }); });
    });
  }));
});
