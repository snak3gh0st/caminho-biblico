// Books enter this cache only when the reader explicitly saves one.
const readingCache = 'poiema-reading-v1';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(readingCache);
    if (/\/(?:media\/portal-text|en\/bible\/web)\/\d+\.json$/.test(url.pathname)) {
      const saved = await cache.match(request);
      if (saved) return saved;
    }
    try { return await fetch(request); }
    catch {
      const saved = request.mode === 'navigate'
        ? await cache.match(new URL('index.html',self.registration.scope))
        : await cache.match(request,{ignoreSearch:true});
      return saved || Response.error();
    }
  })());
});
