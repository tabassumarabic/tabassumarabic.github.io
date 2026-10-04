/* Tabassum xizmat fayli (service worker): ilovani telefonga to'liq o'rnatish, tez ochilish va sekin internetda ishlash uchun.
   - HTML sahifalar: avval internetdan (yangi versiya), bo'lmasa keshdan.
   - JS/rasm/ovoz/shriftlar: avval keshdan (tez), yo'q bo'lsa yuklab keshga qo'yiladi. JS fayllar ?v=… bilan keladi, shuning uchun yangilanish o'zi ishlaydi.
   - Supabase (baza) so'rovlari keshlanmaydi. */
const CACHE = "tabassum-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.hostname.endsWith("supabase.co")) return;
  const isPage = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isPage) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
        return res;
      } catch {
        return (await caches.match(req)) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && (url.origin === location.origin || url.hostname.includes("fonts.g"))) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  })());
});

// 🔔 Bildirishnomalar (push) — keyingi qadamda serverdan keladi
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Tabassum 😊", {
    body: d.body || "Bugungi missiya sizni kutyapti!", icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "./" },
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow(e.notification.data && e.notification.data.url || "./");
  })());
});
