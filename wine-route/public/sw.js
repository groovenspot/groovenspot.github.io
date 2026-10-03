/* 셀러도어 브라우저 알림 (푸시만 처리합니다. 화면 저장·오프라인 기능은 없습니다) */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: "셀러도어", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "셀러도어", {
    body: d.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: d.url || "/" },
    lang: "ko",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) if (w.url === url && "focus" in w) return w.focus();
    return self.clients.openWindow(url);
  })());
});
