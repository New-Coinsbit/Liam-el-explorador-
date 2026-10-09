// Versioned public assets only. Authenticated API responses and user photos are never cached.
const CACHE='liam-public-0.3.2';
const SHELL=['/','/styles.css','/icon.svg','/manifest.webmanifest','/js/app.js','/js/components.js','/js/api.js','/js/selectors.js','/js/ambience.js','/js/adventure-map.js','/js/world.js','/js/platform.js','/js/activity-editor.js','/js/question-input.js','/js/mobile.js','/js/rigged-companions.js','/vendor/three.module.js','/vendor/three.core.js','/assets/welcome-art.webp','/assets/adventure-approved.webp','/assets/avatar-reference.webp','/assets/companions-atlas.webp'];
// Activate only after the complete public shell is ready. Existing pages are not reloaded,
// so an open exercise keeps its answers; the next reload uses the current public assets.
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(k=>k.startsWith('liam-public-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/')));return;}
 if(!SHELL.includes(url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request).then(response=>{if(response.ok)cache.put(event.request,response.clone());return response;})));
});
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{};}catch{}const test=data.kind==='test';event.waitUntil(self.registration.showNotification('Liam El Explorador',{body:test?'¡Listo! Los avisos de Liam llegan a este teléfono.':'Tienes novedades en tu comunidad.',icon:'/icon-192.png',badge:'/icon-192.png',tag:test?'liam-test':'liam-community',data:{url:'/#notifications'}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});if(clients.length){await clients[0].navigate('/#notifications');return clients[0].focus();}return self.clients.openWindow('/#notifications');})());});
