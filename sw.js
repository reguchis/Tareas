/* Tareas y Calificaciones (versión general, Tareas-G): copia sin internet. Vive en el mismo sitio que la app de Asistencia: solo borra SUS copias viejas (tareasg-app-…)
   y, si otra app le borrara la suya, la vuelve a guardar sola la siguiente vez que se abre con internet (heal).
   beta.7: lo que la app pide «sin copia» (revisar si hay versión nueva) va directo a internet. */
const C='tareasg-app-1.0.0-beta.5',F=['index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(F.map(u=>fetch(new Request(u,{cache:'reload'})).then(r=>{if(!r.ok)throw new Error(u);return c.put(u,r)})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C&&x.startsWith('tareasg-app-')).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
function heal(){return caches.open(C).then(c=>Promise.all(F.map(f=>c.match(f).then(r=>r||fetch(new Request(f,{cache:'reload'})).then(x=>x.ok?c.put(f,x):0)).catch(()=>0))))}
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!='GET'||new URL(q.url).origin!=location.origin)return;if(q.cache=='no-store')return;
if(q.mode=='navigate'){const p=new URL(q.url).pathname,b=new URL('./',self.registration.scope).pathname;if(p!=b&&p!=b+'index.html')return;e.respondWith((async()=>{const c=await caches.open(C),old=await c.match('index.html');
const net=fetch(q.url,{cache:'no-cache'}).then(r=>r.ok&&/text\/html/.test(r.headers.get('content-type')||'')?c.put('index.html',r.clone()).then(()=>r):r);e.waitUntil(net.then(r=>r.ok?heal():0).catch(()=>{}));
if(old)return old;
return net.catch(()=>new Response('Sin conexion',{status:503}))})());return}
e.respondWith(caches.match(q,{ignoreSearch:true}).then(r=>r||fetch(q).then(x=>{const u=new URL(q.url);u.search='';if(x.ok&&F.some(f=>new URL(f,location.href).href==u.href)){const y=x.clone();e.waitUntil(caches.open(C).then(c=>c.put(u.href,y)))}return x})))});
