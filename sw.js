// Service Worker for ITN Survey PWA
// =============================================
// IMPORTANT: When updating the app, increment the version number below!
// This ensures users get the latest version when they click UPDATE.
// =============================================
const CACHE_VERSION = 1;
const CACHE_NAME = 'itn-survey-v' + CACHE_VERSION;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './cascading_data.csv',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  // External CDN resources
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  'https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] All assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Google Apps Script submissions
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          console.log('[SW] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache the new resource for future
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            // Return offline fallback for HTML pages
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-submissions') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncPendingSubmissions());
  }
});

async function syncPendingSubmissions() {
  // This would sync pending submissions when back online
  console.log('[SW] Syncing pending submissions...');
}
