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

function isCacheable(response) {
  return response && response.ok && response.status !== 206;
}

// 🔍 ADD THIS: Log all fetch events
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Log ALL requests to see what's happening
  console.log('🔍 SW Fetch:', url);
  
  // Specifically log products.json requests
  if (url.includes('products.json')) {
    console.log('🎯 PRODUCTS.JSON REQUEST:', url);
    console.log('📋 Request details:', {
      url: url,
      referrer: event.request.referrer,
      mode: event.request.mode,
      destination: event.request.destination
    });
  }
  
  // Continue with normal handling...
  if (event.request.method !== 'GET') return;
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

  // Network-first for lang files
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

  // Everything else - network only
});