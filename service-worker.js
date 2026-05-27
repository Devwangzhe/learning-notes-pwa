/**
 * Service Worker - 离线缓存
 */

const CACHE_NAME = 'learning-notes-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/book-analysis.js',
    '/manifest.json'
];

// 安装：预缓存核心文件
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// 拦截请求：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
    // 只缓存GET请求
    if (event.request.method !== 'GET') return;
    
    // API请求不走缓存
    if (event.request.url.includes('api.deepseek.com')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    // 缓存新请求
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
            .catch(() => {
                // 离线回退页面
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});