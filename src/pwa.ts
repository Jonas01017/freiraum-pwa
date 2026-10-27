export interface PwaState { offlineReady: boolean; update: boolean; error: string | null }
let registration: ServiceWorkerRegistration | undefined;
let state: PwaState = {offlineReady:false,update:false,error:null};
const listeners = new Set<() => void>();
let applying = false;
const publish = (patch: Partial<PwaState>) => { state = {...state,...patch}; listeners.forEach(fn => fn()); };
export const pwaSnapshot = () => state;
export const pwaSubscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export async function setupPwa() {
  if (!('serviceWorker' in navigator)) { publish({error:'Dieser Browser unterstützt keine Offline-Installation.'}); return; }
  try {
    registration = await navigator.serviceWorker.register(new URL('./sw.js', location.href).pathname, {scope: new URL('./', location.href).pathname, updateViaCache:'none'});
    function inspect() { if (registration?.waiting && navigator.serviceWorker.controller) publish({update:true}); }
    inspect();
    registration.addEventListener('updatefound', () => {
      registration?.installing?.addEventListener('statechange', () => { inspect(); });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (applying) location.reload();
      else { publish({offlineReady:true}); void registration?.update().catch(() => {}); }
    });
    await navigator.serviceWorker.ready;
    // `ready` can resolve before clients.claim() controls this first page in WebKit.
    // Do not promise offline readiness until the actual page has a controller.
    if (navigator.serviceWorker.controller) publish({offlineReady:true});
    setInterval(() => { if (navigator.onLine) void registration?.update().catch(() => {}); }, 60*60*1000);
    window.addEventListener('focus', () => { if (navigator.onLine) void registration?.update().catch(() => {}); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && navigator.onLine) void registration?.update().catch(() => {}); });
  } catch { publish({error:'Die Offline-Einrichtung ist noch nicht abgeschlossen. Bitte später erneut online öffnen.'}); }
}
export async function applyUpdate(flush: () => Promise<void>) {
  await flush();
  if (!registration?.waiting) { await registration?.update(); return; }
  applying = true;
  registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
}
export async function requestPersistence(): Promise<boolean> {
  try { return (await navigator.storage?.persisted?.()) || (await navigator.storage?.persist?.()) || false; } catch { return false; }
}
