/* Brain Lab service worker: keeps the app working with no connection. The newest page is used whenever the network is there. */
const CACHE='brainlab-r6-3';
const CORE=['index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','room3d.js','vendor/three/three.module.min.js','vendor/three/addons/environments/RoomEnvironment.js','vendor/three/addons/geometries/RoundedBoxGeometry.js','vendor/three/addons/postprocessing/EffectComposer.js','vendor/three/addons/postprocessing/RenderPass.js','vendor/three/addons/postprocessing/UnrealBloomPass.js','vendor/three/addons/postprocessing/OutputPass.js','vendor/three/addons/postprocessing/ShaderPass.js','vendor/three/addons/postprocessing/Pass.js','vendor/three/addons/postprocessing/MaskPass.js','vendor/three/addons/shaders/CopyShader.js','vendor/three/addons/shaders/LuminosityHighPassShader.js','vendor/three/addons/shaders/OutputShader.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  if(new URL(r.url).origin!==location.origin)return;/* the cloud and the fonts go straight to the network */
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put('index.html',c));return res}).catch(()=>caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c));return res})));
});
