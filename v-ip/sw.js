/**
 * v-ip Service Worker — 離線預快取（含共用根目錄 assets）
 */

const CACHE_NAME = 'guiji-qms-vip-offline-v9';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/audio.js',
    './js/scanner.js',
    './js/ui.js',
    './js/app.js',
    './js/menu-board.js',
    './sw.js',
    './assets/menu-drinks-1080.jpg',
    './assets/menu-footer-band-1.jpg',
    './assets/menu-footer-band-2.jpg',
    './assets/chars/char-1.png',
    './assets/chars/char-2.png',
    './assets/chars/char-3.png',
    './assets/chars/char-4.png',
    './client/index.html',
    './client/js/client-app.js',
    '../assets/logo2.svg',
    '../assets/fonts/montserrat-700.woff2',
    '../assets/fonts/montserrat-800.woff2',
    '../assets/fonts/montserrat-900.woff2',
    '../assets/fonts/nunito-700.woff2',
    '../assets/fonts/nunito-800.woff2',
    '../assets/fonts/nunito-900.woff2'
];

function isSettingsRequest(url) {
    try {
        const path = new URL(url).pathname;
        return path.includes('/client/') && path.endsWith('settings.json');
    } catch (e) {
        return false;
    }
}

function isClientPathRequest(url) {
    try {
        return new URL(url).pathname.includes('/client/');
    } catch (e) {
        return false;
    }
}

function networkFirst(request) {
    return fetch(request).then((response) => {
        if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
    }).catch(() => caches.match(request));
}

function settingsNetworkOnly(request) {
    return fetch(request, { cache: 'no-store' }).catch(() => {
        return new Response('{}', {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    });
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await Promise.allSettled(
                PRECACHE_ASSETS.map((url) =>
                    cache.add(new Request(url, { cache: 'reload' }))
                )
            );
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = event.request.url;
    if (isSettingsRequest(url)) {
        event.respondWith(settingsNetworkOnly(event.request));
        return;
    }

    if (isClientPathRequest(url)) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200) return response;
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            }).catch(() => cached);
        })
    );
});
