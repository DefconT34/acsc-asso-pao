const CACHE='acsc-premium-v8-7';
const ASSETS=['/','/index.html','/logo.svg','/manifest.json',
'/js/01-core.js','/js/02-storage.js','/js/03-sites.js','/js/04-personnes.js','/js/05-calcul.js','/js/06-actions.js','/js/07-historique.js','/js/07-hist2.js','/js/08-projet-state.js','/js/08-ui.js','/js/09-dashboard.js','/js/10-import.js'];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=> Promise.all(keys.filter(k=>k!==CACHE).map(k=> caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const url=new URL(e.request.url);
  // network-first for API
  if(url.pathname.startsWith('/api/')){
    e.respondWith(fetch(e.request).catch(()=> caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=> cached || fetch(e.request).then(r=>{
    if(e.request.method==='GET' && r.ok) caches.open(CACHE).then(c=> c.put(e.request, r.clone()));
    return r;
  }).catch(()=> cached)));
});
