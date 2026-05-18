const CACHE_NAME = 'dornori-v3';

// Only cache static assets — not pages (they redirect and break cache.addAll)
const URLS_TO_CACHE = [
  '/css/main.css',
  '/css/shop.css',
  '/css/shop-bridge.css',
  '/css/profiles.css',
  '/css/integration.css',
  '/css/about.css',
  '/css/built.css',
  '/css/gallery.css',
  '/css/home.css',
  '/css/kit.css',
  '/css/parts.css',
  '/css/product.css',
  '/css/success.css',
  '/css/support.css',
  '/data/products.json',
  '/data/countries.json',
  '/data/shipping.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n.startsWith('dornori-') && n !== CACHE_NAME)
             .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Network-first for data/API — always want fresh data
  if (url.includes('/data/') || url.includes('/api/') || url.includes('ipapi.co')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (css, js, images, fonts)
  if (url.includes('/css/') || url.includes('/js/') ||
      url.includes('/assets/') || url.includes('/lang/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else (HTML pages) — network only, no caching
});
