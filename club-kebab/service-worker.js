const CACHE_NAME = "club-kebab-shell-v46";
const APP_SHELL = [
  "./",
  "./index.html",
  "./producto.html",
  "./css/estilos.css",
  "./js/supabase-config.js",
  "./js/app.js",
  "./js/producto.js",
  "./icon.svg",
  "./assets/brand/logo1.jpeg",
  "./assets/brand/banner.webp",
  "./assets/menu/kebab.webp",
  "./assets/menu/parrilla.webp",
  "./assets/menu/menu.webp",
  "./assets/alergenos/gluten.png",
  "./assets/alergenos/leche.png",
  "./assets/alergenos/huevo.png",
  "./assets/alergenos/mostaza.png",
  "./assets/alergenos/sesamo.png",
  "./assets/alergenos/soja.png",
  "./assets/alergenos/pescado.png",
  "./assets/alergenos/crustaceos.png",
  "./assets/alergenos/cacahuete.png",
  "./assets/alergenos/frutos-secos.png",
  "./assets/alergenos/apio.png",
  "./assets/alergenos/moluscos.png",
  "./assets/alergenos/altramuces.png",
  "./assets/alergenos/sulfitos.png",
  "./assets/alergenos/vegetarian.png",
  "./assets/dietas/vegetariano.svg",
  "./assets/dietas/vegano.svg",
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
