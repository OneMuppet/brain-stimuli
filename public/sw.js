// Service Worker for AURA-NX0 PWA
const CACHE_NAME = 'aura-nx0-v2';
const STATIC_CACHE = [
  '/manifest.json',
  '/logo.svg',
];

// Install event - cache static assets only (not HTML pages)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE);
      })
      .catch((error) => {
        // Silently fail if cache fails
        console.error('Cache install failed:', error);
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all pages
});

// Fetch event - network first for navigation, cache for static assets
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const request = event.request;
  const url = new URL(request.url);

  // For navigation requests (HTML pages), always try network first
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache as fallback
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If no cache, try index fallback
              return caches.match('/');
            });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images), cache first, then network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Only cache successful GET requests
            if (response.status === 200 && request.method === 'GET') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            return response;
          });
      })
      .catch(() => {
        // Both cache and network failed
        if (request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

