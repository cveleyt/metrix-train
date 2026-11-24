/* Offline cache: serves cached files instantly, refreshes them in the background.
   Workout data lives in localStorage, never in this cache. */
const V = 'mx-train-v28';
const FILES = ['./', './index.html', './js-core.js', './js-shell.js', './js-today.js', './js-workout.js', './js-history.js', './js-me.js', './js-extras.js', './js-notes.js', './js-daily.js', './js-actions.js', './js-boot.js', './program.js', './users.js', './sync.js', './manifest.webmanifest',
  './icons/icon-192.png', './fonts/inter-latin-400-normal.woff2', './fonts/inter-latin-500-normal.woff2', './fonts/inter-latin-600-normal.woff2', './fonts/inter-latin-700-normal.woff2', './fonts/barlow-condensed-latin-600-normal.woff2', './fonts/barlow-condensed-latin-700-normal.woff2', './fonts/barlow-condensed-latin-800-normal.woff2', './fonts/jetbrains-mono-latin-500-normal.woff2', './fonts/jetbrains-mono-latin-600-normal.woff2', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  e.respondWith(
    caches.open(V).then(async c => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request, { cache: 'no-cache' })
        .then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
