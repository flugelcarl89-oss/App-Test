// Service Worker: App offline verfügbar machen
const VERSION = '1.1.0';
const SHELL = `shell-${VERSION}`;
const RUNTIME = 'runtime-v1';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/nav.js', 'js/ui.js', 'js/db.js', 'js/data.js', 'js/store.js', 'js/sketch.js', 'js/eval.js',
  'js/photos.js', 'js/ocr.js', 'js/pdf.js',
  'js/views/home.js', 'js/views/new.js', 'js/views/assessment.js', 'js/views/typeIcons.js', 'js/views/settings.js',
  'js/views/tabVehicle.js', 'js/views/tabBody.js', 'js/views/tabTires.js', 'js/views/tabChecklist.js',
  'js/views/tabPhotos.js', 'js/views/tabResult.js',
  'vendor/jspdf.umd.min.js', 'vendor/tesseract/tesseract.min.js', 'vendor/tesseract/worker.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html', { ignoreSearch: true }).then((r) => r || fetch(req)));
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && (url.pathname.includes('/vendor/') || url.pathname.includes('/icons/'))) {
      const c = await caches.open(RUNTIME);
      c.put(req, res.clone());
    }
    return res;
  })());
});
