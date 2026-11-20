/* 그루브 라운지 서비스워커 — ⑧ C-shell 담당 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
