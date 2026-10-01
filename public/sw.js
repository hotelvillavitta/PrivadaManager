/* Minimal service worker: habilita “Instalar app” sin cachear agresivamente. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Chrome exige un listener de fetch para poder instalar la app.
// No reenviamos la petición: en Safari, respondWith(fetch(event.request))
// cancela la navegación de Next.js y el clic en la barra no cambia de página.
self.addEventListener("fetch", () => {});
