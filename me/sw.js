// 손님 내 페이지의 웹 알림. 직원 서비스워커·캐시와는 범위를 나눈다.
'use strict';
var API = 'https://groove-staff-api.groovenspotbusan.workers.dev/', HOME = '/me/';

function post(action, sub, extra) {
  return fetch(API, { method: 'POST', cache: 'no-store', body: JSON.stringify(Object.assign({ a: action, sub: sub }, extra)) })
    .then(function (r) { if (!r.ok) throw new Error('push'); return r.json(); });
}
self.addEventListener('push', function (e) {
  e.waitUntil((async function () {
    var p = await self.registration.pushManager.getSubscription(); if (!p) return;
    var j = p.toJSON(), auth = j.keys && j.keys.auth; if (!auth) return;
    var sub = { endpoint: j.endpoint, auth: auth }, r = await post('me_push_read', sub);
    if (r.error === 'inactive') { await p.unsubscribe(); return; }
    if (!r.ok || !Array.isArray(r.items)) return;
    var shown = [];
    for (var i = 0; i < r.items.length; i++) {
      var n = r.items[i];
      await self.registration.showNotification(n.title, {
        body: n.body, tag: 'groove-me-' + n.id, icon: '/staff/icon-192.png', badge: '/staff/badge-72.png', data: { url: n.url }
      });
      shown.push(n.id);
    }
    if (shown.length) await post('me_push_ack', sub, { ids: shown });
  })().catch(function () {}));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil((async function () {
    var raw = e.notification.data && e.notification.data.url, to;
    try { to = new URL(raw || HOME, self.location.origin); } catch (err) { to = new URL(HOME, self.location.origin); }
    if (to.protocol !== 'https:') to = new URL(HOME, self.location.origin);
    if (to.origin === self.location.origin && to.pathname === HOME && !to.search) {
      var windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      var existing = windows.find(function (w) { var u = new URL(w.url); return u.origin === to.origin && u.pathname === HOME; });
      if (existing) { await existing.focus(); return; }
    }
    await self.clients.openWindow(to.href);
  })());
});
