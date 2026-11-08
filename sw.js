const CACHE = "mf-app-v7";
const FONTS = "mf-fonts-v1";
const LIBS = "mf-libs-v1"; /* lector de PDF (pdf.js) y SDK de Claude (lectura de boletas), versiones fijas: se guardan tras el primer uso */
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONTS && k !== LIBS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") {
      /* Siempre la versión más nueva cuando hay internet (sin pasar por la caché del navegador); sin internet, la guardada. */
      e.respondWith(fetch(req.url, { cache: "no-store", credentials: "same-origin" }).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return r; })
        .catch(() => caches.match("./index.html")));
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { c.put(req, r.clone()); return r; }))));
    return;
  }
  if ((url.hostname === "cdnjs.cloudflare.com" && url.pathname.includes("/pdf.js/")) || (url.hostname === "cdn.jsdelivr.net" && /^\/npm\/(@[^/]+\/)?[^/@]+@\d+\.\d+\.\d+\//.test(url.pathname))) {
    e.respondWith(caches.open(LIBS).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
  }
});
