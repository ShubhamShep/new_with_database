// Enhanced Service Worker for PWA offline support
const CACHE_NAME = 'indices-survey-v2';
const STATIC_CACHE = 'indices-static-v2';
const DYNAMIC_CACHE = 'indices-dynamic-v2';

// Static assets to cache during install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

// API endpoints to cache with network-first strategy
const API_CACHE_PATTERNS = [
    '/rest/v1/', // Supabase API
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old versions of our caches
                    if (cacheName.startsWith('indices-') &&
                        cacheName !== STATIC_CACHE &&
                        cacheName !== DYNAMIC_CACHE &&
                        cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Claim all clients immediately
            return self.clients.claim();
        })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Network-first for API requests
    if (isApiRequest(url)) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Network-first for navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // Cache-first for static assets (JS, CSS, images)
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Stale-while-revalidate for everything else
    event.respondWith(staleWhileRevalidate(request));
});

// Network-first strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Serving from cache (network failed):', request.url);
            return cachedResponse;
        }

        // If it's a navigation request, return offline page
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('/index.html');
            if (offlinePage) {
                return offlinePage;
            }
        }

        throw error;
    }
}

// Cache-first strategy
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache-first failed:', request.url);
        throw error;
    }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);

    const fetchPromise = fetch(request).then(async (networkResponse) => {
        if (networkResponse.ok) {
            try {
                const responseToCache = networkResponse.clone();
                const cache = await caches.open(DYNAMIC_CACHE);
                await cache.put(request, responseToCache);
            } catch (err) {
                console.warn('[SW] Failed to cache response:', err);
            }
        }
        return networkResponse;
    }).catch(() => cachedResponse);

    return cachedResponse || fetchPromise;
}

// Helper: Check if request is an API request
function isApiRequest(url) {
    return API_CACHE_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// Helper: Check if request is for a static asset
function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Background sync for pending surveys
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync event:', event.tag);
    if (event.tag === 'sync-surveys') {
        event.waitUntil(syncPendingSurveys());
    }
});

// Sync pending surveys (called by background sync)
async function syncPendingSurveys() {
    console.log('[SW] Attempting to sync pending surveys...');
    // This will be handled by the main app
    // Notify all clients to trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'SYNC_SURVEYS',
            message: 'Background sync triggered'
        });
    });
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'New update available',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'INDICES Survey', options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((windowClients) => {
            // Focus existing window or open new one
            for (const client of windowClients) {
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});

console.log('[SW] Service worker loaded');
