/* GROOVE STAFF 알림 (웹 푸시). 서버는 내용 없는 신호만 보내고, 여기서 로그인 토큰으로 무엇이 왔는지(peek) 받아 보여 준다.
   페이지 캐시는 하지 않는다(항상 새 화면). */
var API = 'https://groove-staff-api.groovenspotbusan.workers.dev/';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
function token() {
  return new Promise(function (res) {
    try {
      var rq = indexedDB.open('gs', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
      rq.onsuccess = function () {
        try { var q = rq.result.transaction('kv').objectStore('kv').get('token'); q.onsuccess = function () { res(q.result || ''); }; q.onerror = function () { res(''); }; }
        catch (e) { res(''); }
      };
      rq.onerror = function () { res(''); };
    } catch (e) { res(''); }
  });
}
self.addEventListener('push', function (e) {
  e.waitUntil(token().then(function (t) {
    if (!t) return null;
    return fetch(API, { method: 'POST', body: JSON.stringify({ a: 'peek', token: t }) }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }).then(function (n) {
    n = n && n.ok ? n : { title: 'GROOVE STAFF', body: '새 소식이 있어요', tab: '' };
    return self.registration.showNotification(n.title, { body: n.body, tag: 'gs-staff', renotify: true, icon: '/staff/icon-192.png', badge: '/staff/badge-72.png', data: { tab: n.tab || '' } });
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var tab = (e.notification.data && e.notification.data.tab) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].url.indexOf('/staff/') >= 0) { cs[i].postMessage({ tab: tab }); return cs[i].focus(); }
    }
    return self.clients.openWindow('/staff/' + (tab ? '#' + tab : ''));
  }));
});
