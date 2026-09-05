const CACHE='mon-jardin-francais-v33-local-tutor-20260905-5';
const SHELL=['./','index.html','styles.css','app.js','reference-marker.js','manifest.webmanifest',
'icon-192.png','icon-512.png',
'question-bank.json','vocab-bank.json','notes-by-date.json','writing-bank.json','block-question-map.json',
'hero-main.webp','theme-school.webp','theme-paris.webp','theme-friends.webp','theme-travel.webp','theme-interests.webp',
'feature-vocab.webp','feature-grammar.webp','feature-games.webp','feature-writing.webp','daily-lesson.webp','footer-paris.webp',
'decor-book.webp','decor-tape.webp','decor-sprout.webp','girl-main.webp','eiffel.webp','decor-flower-01.webp','decor-flower-02.webp','decor-watercolor.webp'];
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