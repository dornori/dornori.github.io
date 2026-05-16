const CACHE_NAME = 'dornori-v1';
const URLS_TO_CACHE = [
  '/en/',
  '/css/main.css',
  '/css/shop.css',
  '/css/shop-bridge.css',
  '/css/profiles.css',
  '/data/products.json',
  '/data/countries.json',
  '/data/shipping.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n.startsWith('dornori-') && n !== CACHE_NAME).map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('/data/') || event.request.url.includes('/api/')) {
    // Network-first for APIs and data
    event.respondWith(
      fetch(event.request)
        .then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(fetchResponse => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, fetchResponse.clone()));
          return fetchResponse;
        });
      })
    );
  }
});
