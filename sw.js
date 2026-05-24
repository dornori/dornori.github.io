const CACHE_NAME = 'dornori-v5';

const URLS_TO_CACHE = [
  '/css/variables.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/pages.css',
  '/css/shop.css',
  '/css/shop-bridge.css',
  '/css/profiles.css',
  '/css/product.css',
  '/data/products.json',
  '/data/countries.json',
  '/data/shipping.json',
];

// Only cache full (non-partial) successful responses
function isCacheable(response) {
  return response && response.ok && response.status !== 206;
}

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

  // Never intercept external API calls — let them go direct (or fail gracefully)
  if (!url.startsWith(self.location.origin)) return;

  // Network-first for /data/ and /api/
  if (url.includes('/data/') || url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for lang files (change with deployments)
  if (url.includes('/lang/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  if (url.includes('/css/') || url.includes('/js/') || url.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else (HTML, images, etc.) — network only, no caching
});
