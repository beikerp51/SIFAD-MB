/**
 * SIFAD-MB - Service Worker para PWA y Soporte Móvil Offline (Android APK / iOS)
 * Alcaldía Bolivariana de Maracaibo - Dirección General de Administración y Finanzas
 */

const CACHE_NAME = 'sifad-mb-cache-v1.0.0';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/css/styles.css',
    './assets/js/app.js',
    './assets/js/main.js',
    './assets/js/dashboard.js',
    './assets/js/forms.js',
    './assets/js/report.js',
    './assets/js/backup.js',
    './assets/images/logo_alcaldia.png',
    './assets/images/logo_gestion.png',
    './assets/images/icon-192.png',
    './assets/images/icon-512.png'
];

// Instalación del Service Worker y precacheo de recursos locales
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[SIFAD-MB SW] Advertencia precacheando archivos:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activación y limpieza de caches antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Estrategia de Fetch: Network-First con fallback a Cache para máxima frescura
self.addEventListener('fetch', (event) => {
    // Solo manejar peticiones HTTP/HTTPS GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Si la respuesta es válida, clonar y guardar en cache
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Fallback offline a cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
