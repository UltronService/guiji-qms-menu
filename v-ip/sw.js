/**
 * v-ip 專用 Service Worker — 快取名稱獨立，不刪除根目錄快取
 */
const CACHE_NAME = 'guiji-qms-v-ip-v1';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './favicon.ico',
    './css/ip-anim.css',
    './css/style.css',
    './js/ip-anim.js',
    './js/audio.js',
    './js/scanner.js',
    './js/ui.js',
    './js/app.js',
    './assets/menu.jpg',
    './assets/logo2.svg',
    './assets/logo2_white.svg',
    './assets/maxhomevideo2.webm',
    './assets/icon-180.png',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/fonts/montserrat-700.woff2',
    './assets/fonts/montserrat-800.woff2',
    './assets/fonts/montserrat-900.woff2',
    './assets/fonts/poppins-700.woff2',
    './assets/fonts/poppins-800.woff2',
    './assets/fonts/poppins-900.woff2',
    './assets/fonts/nunito-700.woff2',
    './assets/fonts/nunito-800.woff2',
    './assets/fonts/nunito-900.woff2',
    './assets/fonts/Demo_Fonts/Fontspring-DEMO-greycliffcf-regular.otf',
    './assets/fonts/Demo_Fonts/Fontspring-DEMO-greycliffcf-bold.otf',
    './assets/fonts/Demo_Fonts/Fontspring-DEMO-greycliffcf-extrabold.otf',
    './assets/fonts/Demo_Fonts/Fontspring-DEMO-greycliffcf-heavy.otf',
    './characters/leader-stand.svg',
    './characters/thinker-stand.svg',
    './characters/little-stand.svg',
    './characters/thinker-sit.svg',
    './characters/little-sit.svg',
    './characters/leader-sit.svg',
    './characters/intel-stand.svg'
];

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
                keys
                    .filter((key) => key.startsWith('guiji-qms-v-ip-') && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

async function handleRangeRequest(request, cachedResponse) {
    const arrayBuffer = await cachedResponse.arrayBuffer();
    const total = arrayBuffer.byteLength;
    const rangeHeader = request.headers.get('range');
    const match = /bytes=(\d+)-(\d+)?/.exec(rangeHeader || '');

    if (!match) {
        return new Response(arrayBuffer, {
            status: 200,
            headers: cachedResponse.headers
        });
    }

    const start = Number(match[1]);
    const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;

    if (start >= total || start > end) {
        return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${total}` }
        });
    }

    const sliced = arrayBuffer.slice(start, end + 1);
    return new Response(sliced, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
            'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/webm',
            'Content-Length': String(sliced.byteLength),
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes'
        }
    });
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse =
                (await cache.match(request, { ignoreSearch: true })) ||
                (request.mode === 'navigate' ? await cache.match('./index.html') : null);

            if (cachedResponse) {
                fetch(request)
                    .then((networkResp) => {
                        if (networkResp && networkResp.status === 200 && networkResp.type === 'basic') {
                            cache.put(request, networkResp.clone());
                        }
                    })
                    .catch(() => {});

                if (request.headers.get('range')) {
                    return handleRangeRequest(request, cachedResponse);
                }
                return cachedResponse;
            }

            try {
                const networkResponse = await fetch(request);
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            } catch (err) {
                if (request.mode === 'navigate') {
                    const fallback = await cache.match('./index.html');
                    if (fallback) return fallback;
                }
                throw err;
            }
        })()
    );
});
