// Bump this on any SW logic change so old caches are dropped.
const CACHE_NAME = 'ims-v3';

// Only precache assets that are safe to keep long-term (not index.html — that caused stale app shells).
const PRECACHE_URLS = ['/logo_AB.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => console.warn(`Precache failed ${url}:`, err))
          )
        )
      )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[sw] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

function isApiOrCrossOrigin(request) {
  if (request.url.includes('/api/')) return true;
  try {
    const u = new URL(request.url);
    return u.origin !== self.location.origin;
  } catch {
    return true;
  }
}

function isNavigationOrHtmlDocument(request) {
  if (request.mode === 'navigate') return true;
  const dest = request.destination;
  if (dest === 'document') return true;
  try {
    const u = new URL(request.url);
    if (u.pathname === '/' || u.pathname.endsWith('/index.html')) return true;
  } catch {
    /* ignore */
  }
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

// Network-first for HTML so new deploys load immediately; cache-first for hashed build assets is OK.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (isApiOrCrossOrigin(event.request)) return;

  const url = new URL(event.request.url);
  if (!url.href.startsWith(self.location.origin)) return;

  // HTML / app shell: network first, then cache (offline fallback)
  if (isNavigationOrHtmlDocument(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Hashed JS/CSS and static files: cache-first (URLs change each build once HTML is fresh)
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
