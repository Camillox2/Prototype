const CACHE='futmaster-v7';
const ASSETS=['./','index.html','styles.css','v04.css','v05.css','core.js','v04-compat.js','match-engine.js','systems.js','rules.js','app.js','career-v04.js','international-v04.js','universe-v05.js','match2d-v05.js','manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})))});
