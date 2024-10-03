self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('app-cache').then(cache => {
      return cache.addAll([
        '/index.php',
        '/styles.css', // Update this path to your CSS file
        '/app.js', // Update this path to your main JS file
        '/icon-192x192.png', // Update this path to your icon
        '/icon-512x512.png'  // Update this path to your icon
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('install', event => {
  self.skipWaiting(); // Skip waiting and activate the new service worker immediately
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          return caches.delete(cacheName); // Clear old caches
        })
      );
    }).then(() => {
      return clients.claim(); // Take control of uncontrolled clients immediately
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
