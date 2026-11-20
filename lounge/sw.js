/* 그루브 라운지 서비스워커 — ⑧ C-shell 담당 */
const CACHE = 'groove-lounge-shell-v1';
const SHELL = [
  '/lounge/', '/lounge/app.css', '/lounge/core.js', '/lounge/manifest.webmanifest',
  '/lounge/screens/auth.js', '/lounge/screens/me.js', '/lounge/screens/tonight.js',
  '/lounge/screens/feed.js', '/lounge/screens/photos.js', '/lounge/screens/user.js',
  '/lounge/screens/play.js', '/lounge/screens/radio.js', '/lounge/screens/vote.js',
  '/assets/icon.png', '/assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
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
