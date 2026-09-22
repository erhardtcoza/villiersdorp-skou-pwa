const CACHE = "villiersdorp-skou-static-v5";
const CORE = ["/manifest.webmanifest", "/skou-app-icon.png", "/skou-crest.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Navigation and app documents stay network-first. Caching these responses
  // could reopen a previous module after a PWA deployment.
  const isStatic = url.pathname.startsWith("/assets/") || CORE.includes(url.pathname);
  if (!isStatic) return;

  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && response.type === "basic") {
      caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
