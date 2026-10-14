const CACHE_NAME = "club-kebab-shell-v21";
const APP_SHELL = [
  "./",
  "./index.html",
  "./producto.html",
  "./css/estilos.css",
  "./js/supabase-config.js",
  "./js/app.js",
  "./js/producto.js",
  "./icon.svg",
  "./assets/logo1.jpeg",
  "./assets/banner.webp",
  "./vendor/qrcode.min.js",
  "./vendor/jsQR.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
