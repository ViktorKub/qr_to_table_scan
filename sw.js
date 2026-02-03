// Меняйте эту цифру (v1, v2, v3...), чтобы приложение обновилось на телефонах
const CACHE_VERSION = 'v1.0.2'; 
const CACHE_NAME = `qr-scanner-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './jsQR.js'
];

// Установка: кэшируем ресурсы
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Принудительно активируем новый SW
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Активация: удаляем старые версии кэша
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
