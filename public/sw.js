// Service worker do Dons CRM. De propósito, NÃO guarda páginas nem dados em cache:
// o CRM sempre busca o que é atual. Ele só mostra uma tela amigável quando
// não há internet e permite instalar o app na tela inicial.
const CACHE = 'dons-offline-v1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(OFFLINE, { cache: 'reload' }))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode !== 'navigate' || req.method !== 'GET') return;
  event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
});
