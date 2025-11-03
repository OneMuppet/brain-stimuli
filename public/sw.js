// Service Worker for AURA-NX0 PWA
const CACHE_NAME = 'aura-nx0-v5'; // Bump version to force cache refresh
const STATIC_CACHE = [
  '/manifest.json',
  '/logo.svg',
  '/logo-animated.svg',
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
  const request = event.request;
  const url = new URL(request.url);
  
  // Completely bypass service worker for auth routes - let browser handle normally
  // This must be checked BEFORE any other logic
  if (url.pathname.startsWith('/api/auth/')) {
    // Don't intercept at all - let browser handle the request normally
    return;
  }

  // Skip cross-origin requests (after auth check)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For navigation requests (HTML pages): Network first, cache only as fallback
  // Never cache HTML pages proactively
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request, {
        cache: 'no-store', // Don't use browser cache, always go to network
        redirect: 'follow'
      })
        .then((response) => {
          // Network succeeded - return fresh response, don't cache
          return response;
        })
        .catch(() => {
          // Network failed - only then try cache as last resort
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

  // For API routes: Network first, no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
        redirect: 'follow'
      }).catch((error) => {
        console.error('API request failed:', error);
        throw error;
      })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts): Network first, cache as fallback
  // Only cache successful GET requests for static assets
  event.respondWith(
    fetch(request, {
      cache: 'no-store' // Always try network first
    })
      .then((response) => {
        // Network succeeded
        // Only cache successful GET requests for static assets
        if (response.status === 200 && request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            })
            .catch(() => {
              // Cache write failed, ignore
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache as fallback for static assets only
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache, request fails
            throw new Error('Network failed and no cache available');
          });
      })
  );
});

