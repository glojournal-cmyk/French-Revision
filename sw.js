const CACHE='mon-jardin-francais-v2-github-1';
const SHELL=['./','index.html','styles.css','app.js','reference-marker.js','manifest.webmanifest',
'icons/icon-192.png','icons/icon-512.png',
'data/question-bank.json','data/vocab-bank.json','data/notes-by-date.json','data/writing-bank.json','data/block-question-map.json',
'assets/hero-main.webp','assets/theme-school.webp','assets/theme-paris.webp','assets/theme-friends.webp','assets/theme-travel.webp','assets/theme-interests.webp',
'assets/feature-vocab.webp','assets/feature-grammar.webp','assets/feature-games.webp','assets/feature-writing.webp','assets/daily-lesson.webp','assets/footer-paris.webp',
'assets/decor-book.webp','assets/decor-tape.webp','assets/decor-sprout.webp','assets/girl-main.webp','assets/eiffel.webp','assets/decor-flower-01.webp','assets/decor-flower-02.webp','assets/decor-watercolor.webp'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
   if(!r||r.status!==200||r.type==='opaque')return r;
   const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
 }).catch(()=>{
   if(e.request.mode==='navigate') return caches.match('index.html');
   return Response.error();
 })));
});