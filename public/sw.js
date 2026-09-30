/**
 * Smth For Love — minimal service worker.
 *
 * Goals:
 *   - Make the app installable (browsers require a SW that handles fetch events).
 *   - Speed up repeat visits by caching the app shell and static assets.
 *   - Always go to the network for API calls (avoids serving stale data).
 *
 * Caching strategies:
 *   - install:  precache the offline fallback page.
 *   - activate: clear any old caches from previous versions.
 *   - fetch:
 *       • navigation requests → network-first, fall back to cached offline page.
 *       • static asset requests (/_next/static, /icons/, images, fonts) →
 *         stale-while-revalidate.
 *       • everything else (e.g. /api/*) → network-only.
 */

const SW_VERSION = 'v1';
const STATIC_CACHE = `static-${SW_VERSION}`;
const RUNTIME_CACHE = `runtime-${SW_VERSION}`;
const OFFLINE_URL = '/offline';

const PRECACHE_URLS = [OFFLINE_URL];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(STATIC_CACHE);
            // Best-effort precache — if the offline page doesn't exist yet,
            // don't block SW install.
            await cache.addAll(PRECACHE_URLS).catch(() => undefined);
            await self.skipWaiting();
        })(),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
                    .map((key) => caches.delete(key)),
            );
            await self.clients.claim();
        })(),
    );
});

function isStaticAsset(url) {
    if (url.pathname.startsWith('/_next/static/')) return true;
    if (url.pathname.startsWith('/icons/')) return true;
    if (url.pathname.startsWith('/favicon')) return true;
    // Same-origin images / fonts.
    if (/\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot)$/i.test(url.pathname)) return true;
    return false;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    // Only handle same-origin requests. Let cross-origin (e.g. avatar CDN) go through normally.
    if (url.origin !== self.location.origin) return;

    // API: always network, never cache.
    if (url.pathname.startsWith('/api/')) return;

    // Navigation requests — network first, fall back to cached page or offline shell.
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const fresh = await fetch(request);
                    return fresh;
                } catch {
                    const cache = await caches.open(RUNTIME_CACHE);
                    const cached = await cache.match(request);
                    if (cached) return cached;
                    const offline = await caches.match(OFFLINE_URL);
                    if (offline) return offline;
                    return new Response('Offline', { status: 503, statusText: 'Offline' });
                }
            })(),
        );
        return;
    }

    // Static assets — stale-while-revalidate.
    if (isStaticAsset(url)) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(RUNTIME_CACHE);
                const cached = await cache.match(request);
                const networkPromise = fetch(request)
                    .then((response) => {
                        if (response && response.ok) {
                            cache.put(request, response.clone()).catch(() => undefined);
                        }
                        return response;
                    })
                    .catch(() => undefined);
                return cached || (await networkPromise) || new Response('', { status: 504 });
            })(),
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
