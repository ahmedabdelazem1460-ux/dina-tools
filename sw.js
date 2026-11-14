/* منصة دينا — Service Worker: تثبيت كتطبيق، فتح أسرع، وعرض الإشعارات والضغط عليها.
   الاستراتيجية: الشبكة أولاً لكل شيء (حتى لا تظهر نسخة قديمة)، والمخزن احتياطي عند انقطاع الاتصال. */
const CACHE = 'dina-v1';
const SHELL = ['./', './index.html', './assets/logo_white.svg', './assets/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return; // Supabase وغيرها: لا تدخّل
  e.respondWith(fetch(r).then(res => { if (res.ok && (r.mode === 'navigate' || /\.(js|css|svg|png|woff2?|ttf|otf)$/.test(u.pathname))) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {}); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const d = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.includes('index.html') || x.url.endsWith('/'));
    if (c) { c.postMessage({ type: 'nf-open', id: d.id, link: d.link }); return c.focus(); }
    return self.clients.openWindow('./index.html' + (d.id ? '?nf=' + encodeURIComponent(d.id) : '') + (d.link && d.link.startsWith('#/') ? d.link : ''));
  }));
});
// جاهز لاستقبال Web Push لاحقاً (عند تفعيله من الخادم)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'منصة دينا', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'منصة دينا', { body: d.body || '', icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', dir: 'rtl', lang: 'ar', tag: 'dina-' + (d.id || Date.now()), data: { id: d.id, link: d.link || '' } }));
});
