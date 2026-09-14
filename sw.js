/* Network-first cache so the app still opens with bad gym Wi-Fi, and updates as soon as you're online. */
const CACHE = 'fds-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'assets/icon.svg',
  'assets/css/app.css', 'assets/css/views-a.css', 'assets/css/views-b.css', 'assets/css/views-c.css', 'assets/css/views-d.css',
  'assets/js/data.js', 'assets/js/logic.js', 'assets/js/core.js',
  'assets/js/views/today.js', 'assets/js/views/plan.js', 'assets/js/views/exercise.js', 'assets/js/views/workout.js',
  'assets/js/views/food.js', 'assets/js/views/body.js', 'assets/js/views/activity.js', 'assets/js/views/recovery.js',
  'assets/js/views/week.js', 'assets/js/views/learn.js', 'assets/js/views/settings.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
