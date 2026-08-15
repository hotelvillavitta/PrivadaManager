/* Minimal service worker: habilita “Instalar app” sin cachear agresivamente. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Requerido por Chrome para PWA instalable; siempre va a la red.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
