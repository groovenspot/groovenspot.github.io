/* 그루브 라운지 서비스워커 */
const CACHE = 'groove-lounge-shell-v2';
const API = 'https://groove-lounge-api.groovenspotbusan.workers.dev/';
const SHELL = [
  '/lounge/', '/lounge/app.css', '/lounge/core.js', '/lounge/manifest.webmanifest',
  '/lounge/screens/auth.js', '/lounge/screens/me.js', '/lounge/screens/tonight.js',
  '/lounge/screens/feed.js', '/lounge/screens/photos.js', '/lounge/screens/user.js',
  '/lounge/screens/play.js', '/lounge/screens/radio.js', '/lounge/screens/vote.js',
  '/lounge/screens/alerts.js', '/lounge/screens/rooms.js', '/lounge/screens/dm.js',
  '/lounge/screens/compose.js', '/lounge/screens/challenge.js', '/lounge/screens/rewards.js',
  '/lounge/screens/shop.js', '/lounge/screens/table.js', '/lounge/screens/dj.js',
  '/lounge/screens/rank.js', '/lounge/screens/songs.js',
  '/assets/icon.png', '/assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

function loungeTarget(hash) {
  return '/lounge/' + (typeof hash === 'string' &&
    /^#\/[a-z][a-z0-9_-]*(?:[/?][^\u0000-\u001f\u007f]*)?$/.test(hash) ? hash : '#/alerts');
}

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    try {
      const sub = await self.registration.pushManager.getSubscription();
      if (!sub) return;
      const response = await fetch(API, {
        method: 'POST', headers: { 'content-type': 'text/plain' },
        body: JSON.stringify({ a: 'notices_peek', endpoint: sub.endpoint }),
        cache: 'no-store', credentials: 'omit', redirect: 'error'
      });
      if (!response.ok) return;
      const result = await response.json();
      if (!result.ok) return;
      for (const n of result.notices) {
        // Notification API 는 제목과 내용을 HTML 이 아닌 글자로 표시한다.
        await self.registration.showNotification(n.title, {
          body: n.body, icon: '/assets/icon.png',
          tag: n.tag ? 'lounge:' + n.kind + ':' + n.tag : 'lounge:' + n.id,
          data: { hash: n.url }
        });
      }
    } catch {
      // 기기에서 내용을 가져오지 못해도 알림은 알림함에 남아 있다.
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const dest = new URL(loungeTarget(event.notification.data?.hash), self.location.origin);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      const url = new URL(client.url);
      if (url.origin !== dest.origin || !['/lounge/', '/lounge/index.html'].includes(url.pathname)) continue;
      try {
        const opened = url.href === dest.href ? client : await client.navigate(dest.href);
        if (opened) return opened.focus();
      } catch {
        // 이 창이 사라졌으면 다른 라운지 창을 찾는다.
      }
    }
    return self.clients.openWindow(dest.href);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('groove-lounge-shell-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const { origin, pathname } = new URL(request.url);
  if (request.method !== 'GET' || origin !== self.location.origin) return;
  const key = request.mode === 'navigate' && ['/lounge/', '/lounge/index.html'].includes(pathname)
    ? '/lounge/' : pathname;
  if (!SHELL.includes(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) {
        try { await cache.put(key, response.clone()); } catch (e) {}
      }
      return response;
    } catch (e) {
      return await cache.match(key) || Response.error();
    }
  })());
});
