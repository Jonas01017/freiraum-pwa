import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function files(dir, prefix = '') {
  const entries = await readdir(dir,{withFileTypes:true});
  const result=[];
  for(const entry of entries) {
    const relative = `${prefix}${entry.name}`;
    if(entry.isDirectory()) result.push(...await files(`${dir}/${entry.name}`,`${relative}/`));
    else if(!['sw.js'].includes(relative)) result.push(relative);
  }
  return result.sort();
}
const paths = await files('dist');
const digest = createHash('sha256');
for(const path of paths) digest.update(path).update(await readFile(`dist/${path}`));
const version=digest.digest('hex').slice(0,16);
const source = `/* Freiraum app shell ${version}. User records live only in IndexedDB. */
const VERSION = ${JSON.stringify(version)};
const PREFIX = 'freiraum-shell-';
const BASE = new URL('./', self.location.href).href;
const CACHE = PREFIX + encodeURIComponent(BASE) + '-' + VERSION;
const RESOURCES = ${JSON.stringify(paths)}.map(path => new URL(path,BASE).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(RESOURCES)));
  // Updates wait until the user chooses to restart, or all old windows close.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const owned = (await caches.keys()).filter(key => key.startsWith(PREFIX + encodeURIComponent(BASE)) && key !== CACHE);
    // Keep one previous shell so other open windows can finish their current session.
    await Promise.all(owned.slice(0,-1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if(event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
  if(event.data?.type === 'VERSION') event.ports[0]?.postMessage(VERSION);
});
self.addEventListener('fetch', event => {
  const request=event.request, url=new URL(request.url);
  if(request.method !== 'GET' || !url.href.startsWith(BASE) || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache=await caches.open(CACHE);
    // A navigation always uses its complete installed shell, including when online.
    if(request.mode === 'navigate') return (await cache.match(new URL('index.html',BASE).href)) || fetch(request);
    return (await cache.match(request)) || (await caches.match(request)) || fetch(request);
  })());
});
`;
await writeFile('dist/sw.js', source);
console.log(`Offline app shell ${version}: ${paths.length} local resources.`);
