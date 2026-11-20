/* 그루브 라운지 서비스워커 */
const CACHE = 'groove-lounge-shell-v2';
const API = 'https://groove-lounge-api.groovenspotbusan.workers.dev/';
const SHELL = [
  '/lounge/', '/lounge/app.css', '/lounge/core.js', '/lounge/manifest.webmanifest',
  '/lounge/screens/auth.js', '/lounge/screens/me.js', '/lounge/screens/tonight.js',
  '/lounge/screens/feed.js', '/lounge/screens/photos.js', '/lounge/screens/user.js',
  '/lounge/screens/profile_edit.js', '/lounge/screens/follows.js',
  '/lounge/screens/play.js', '/lounge/screens/radio.js', '/lounge/screens/vote.js', '/lounge/screens/guess.js',
  '/lounge/screens/alerts.js', '/lounge/screens/rooms.js', '/lounge/screens/dm.js',
  '/lounge/screens/compose.js', '/lounge/screens/challenge.js', '/lounge/screens/rewards.js',
  '/lounge/screens/shop.js', '/lounge/screens/table.js', '/lounge/screens/dj.js',
  '/lounge/screens/rank.js', '/lounge/screens/songs.js',
  '/lounge/i18n/ja.js', '/lounge/i18n/zh.js',
  '/assets/icon.png', '/assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

async function deviceBinding(change) {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('groove-lounge-push', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('binding');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('binding', change ? 'readwrite' : 'readonly');
      const store = tx.objectStore('binding');
      const req = store.get('active');
      let current;
      req.onsuccess = () => {
        const previous = req.result;
        const next = change?.(previous);
        current = next === undefined ? previous : next;
        if (next === null) store.delete('active');
        else if (next !== undefined) store.put(next, 'active');
      };
      tx.oncomplete = () => resolve(current);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function loungeTarget(hash) {
  return '/lounge/' + (typeof hash === 'string' &&
    /^#\/[a-z][a-z0-9_-]*(?:[/?][^\u0000-\u001f\u007f]*)?$/.test(hash) ? hash : '#/alerts');
}

function isLoungeWindow(client) {
  if (!client?.url) return false;
  const url = new URL(client.url);
  return url.origin === self.location.origin && ['/lounge/', '/lounge/index.html'].includes(url.pathname);
}

async function loungeWindows() {
  return (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(isLoungeWindow);
}

async function closeNotifications(device) {
  for (const notice of await self.registration.getNotifications?.() || []) {
    if (notice.tag.startsWith('lounge:') && (!device || notice.data?.device === device)) notice.close();
  }
}

self.addEventListener('message', event => {
  const { type, owner, endpoint, device, secret } = event.data || {};
  const port = event.ports[0];
  if (!port || !isLoungeWindow(event.source) || typeof owner !== 'string' || !owner ||
      !['lounge-push-status', 'lounge-push-bind', 'lounge-push-clear'].includes(type)) return;
  event.waitUntil((async () => {
    try {
      if (type === 'lounge-push-status') {
        const current = await deviceBinding();
        port.postMessage({ ok: true, device: current?.owner === owner && current.endpoint === endpoint ? current.device : null });
      } else if (type === 'lounge-push-bind') {
        const sub = await self.registration.pushManager.getSubscription();
        if (!sub || sub.endpoint !== endpoint || typeof device !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(device) ||
            typeof secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(secret)) {
          port.postMessage({ ok: false });
          return;
        }
        await deviceBinding(() => ({ owner, endpoint, device, secret }));
        await closeNotifications().catch(() => {});
        await self.navigator?.clearAppBadge?.().catch(() => {});
        port.postMessage({ ok: true });
      } else {
        const remaining = await deviceBinding(current =>
          !current || (current.owner === owner && (!device || current.device === device)) ? null : undefined);
        if (!remaining) {
          await closeNotifications().catch(() => {});
          await self.navigator?.clearAppBadge?.().catch(() => {});
        }
        port.postMessage({ ok: true, cleared: !remaining });
      }
    } catch {
      port.postMessage({ ok: false });
    }
  })());
});

async function refreshLoungeBadges(unread) {
  // 탭은 현재 로그인한 회원의 수를 직접 확인한다. 기기 구독의 회원 정보는 보내지 않는다.
  for (const client of await loungeWindows()) client.postMessage?.({ type: 'lounge-notices-changed' });
  if (!Number.isSafeInteger(unread) || unread < 0) return;
  try {
    if (unread) await self.navigator?.setAppBadge?.(unread);
    else await self.navigator?.clearAppBadge?.();
  } catch {
    // 앱 아이콘 배지를 지원하지 않아도 알림은 표시한다.
  }
}

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(deviceBinding(current =>
    current && current.endpoint === event.oldSubscription?.endpoint ? null : undefined)
    .then(current => current || closeNotifications()).catch(() => {}));
});

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    try {
      const sub = await self.registration.pushManager.getSubscription();
      const binding = await deviceBinding();
      if (!sub || !binding || sub.endpoint !== binding.endpoint) return;
      const { endpoint, device, secret } = binding;
      const current = async () => (await deviceBinding())?.device === device;
      const response = await fetch(API, {
        method: 'POST', headers: { 'content-type': 'text/plain' },
        body: JSON.stringify({ a: 'notices_peek', endpoint, device, secret }),
        cache: 'no-store', credentials: 'omit', redirect: 'error'
      });
      if (!response.ok) return;
      const result = await response.json();
      if (!await current()) return;
      if (!result.ok) {
        if (result.error === 'auth') {
          const remaining = await deviceBinding(value => value?.device === device ? null : undefined);
          await closeNotifications(device);
          if (!remaining) await refreshLoungeBadges(0);
        }
        return;
      }
      const badges = refreshLoungeBadges(result.unread).catch(() => {});
      for (const n of result.notices) {
        if (!await current()) break;
        // Notification API 는 제목과 내용을 HTML 이 아닌 글자로 표시한다.
        await self.registration.showNotification(n.title, {
          body: n.body, icon: '/assets/icon.png',
          tag: 'lounge:' + device + ':' + (n.tag ? n.kind + ':' + n.tag : n.id),
          data: { hash: n.url, device }
        });
        if (!await current()) await closeNotifications(device);
      }
      await badges;
    } catch {
      // 기기에서 내용을 가져오지 못해도 알림은 알림함에 남아 있다.
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const current = await deviceBinding().catch(() => null);
    const data = event.notification.data;
    const dest = new URL(loungeTarget(current && current.device === data?.device ? data.hash : ''), self.location.origin);
    for (const client of await loungeWindows()) {
      try {
        const opened = client.url === dest.href ? client : await client.navigate(dest.href);
        if (!opened) continue;
        await opened.focus();
        opened.postMessage?.({ type: 'lounge-notices-changed' });
        return;
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
    .map(key => caches.delete(key)))).then(async () => {
    if (!await deviceBinding().catch(() => null)) await closeNotifications().catch(() => {});
    await self.clients.claim();
  }));
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
