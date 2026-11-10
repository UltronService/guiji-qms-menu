/**
 * ==========================================================================
 * 龜記叫號系統 Service Worker (sw.js) — 100% 斷網強化與持久化快取
 * - 首次開啟即自動預先快取所有 HTML / CSS / JS / 菜單圖片 / 字體 / 橫幅影片
 * - 支援 HTTP Range (206 Partial Content) 離線影片循環播放
 * - 即使門市斷網數日且每日斷電重開機，依然可從本機快取秒開運作
 * ==========================================================================
 */

const CACHE_NAME = 'guiji-qms-offline-v5';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.ico',
    './assets/icon-180.png',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './css/style.css',
    './js/audio.js',
    './js/scanner.js',
    './js/ui.js',
    './js/app.js',
    './assets/menu.jpg',
    './assets/logo2.svg',
    './assets/logo2_white.svg',
    './assets/maxhomevideo2.webm',
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
    './assets/fonts/Demo_Fonts/Fontspring-DEMO-greycliffcf-heavy.otf'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // 逐一安全快取所有資源，避免單一非關鍵資源失敗阻斷整體安裝
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
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

/**
 * 處理 <video> 的 Range 請求，確保離線快取中的 .webm 影片在 WebView 重開機後仍可順暢播放
 */
/**
 * 子應用路徑（如 v-ip）由各自 Service Worker 負責；根 SW 不得攔截或 fallback 成根目錄 index.html。
 */
function isExcludedSubAppPath(pathname) {
    return /\/v-ip(?:\/|$)/.test(pathname);
}

function shouldUseRootNavigateFallback(request) {
    if (request.mode !== 'navigate') return false;
    try {
        return !isExcludedSubAppPath(new URL(request.url).pathname);
    } catch {
        return true;
    }
}

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

    let requestPathname = '';
    try {
        requestPathname = new URL(request.url).pathname;
    } catch {
        return;
    }
    if (isExcludedSubAppPath(requestPathname)) {
        return;
    }

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            // 忽略網址查詢參數 (?mode=a 等)以匹配 index.html 快取（僅原版路徑）
            const cachedResponse =
                (await cache.match(request, { ignoreSearch: true })) ||
                (shouldUseRootNavigateFallback(request)
                    ? await cache.match('./index.html')
                    : null);

            if (cachedResponse) {
                // 背景靜默更新快取 (若有網路時)
                fetch(request)
                    .then((networkResp) => {
                        if (networkResp && networkResp.status === 200 && networkResp.type === 'basic') {
                            cache.put(request, networkResp.clone());
                        }
                    })
                    .catch(() => {});

                // 若為影片 Range 請求，回傳 206 Partial Content
                if (request.headers.get('range')) {
                    return handleRangeRequest(request, cachedResponse);
                }
                return cachedResponse;
            }

            // 若快取尚未命中則嘗試網路請求並寫入快取
            try {
                const networkResponse = await fetch(request);
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            } catch (err) {
                if (shouldUseRootNavigateFallback(request)) {
                    const fallback = await cache.match('./index.html');
                    if (fallback) return fallback;
                }
                throw err;
            }
        })()
    );
});
