// App-Dateien offline vorhalten. GitHub-API-Aufrufe (andere Domain) laufen nie über den Cache.
const CACHE = 'einkaufl-v1'; // bei jeder Code-Änderung hochzählen (wie VERSION in version.js), damit Handys die neue Version laden
const FILES = ['./', 'index.html', 'app.js', 'merge.js', 'sort.js', 'version.js', 'catalog.js', 'changelog.js', 'sprache.js', 'style.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  // Erst Netz (aktuelle Version), bei Offline aus dem Cache
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
