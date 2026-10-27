import { useState, useSyncExternalStore, useRef } from 'react';
import { Download, Upload, Share2, Smartphone, ShieldCheck, WifiOff, RefreshCw } from 'lucide-react';
import { Chips, Modal } from './components';
import { type State, type Action, type Backup, type Theme, decodeBackup, dayToISO, localDay } from './model';
import { store } from './storage';
import { pwaSubscribe, pwaSnapshot, requestPersistence, applyUpdate } from './pwa';

export function Settings({state,commit,onClose,canUpdate}: {state:State;commit:(a:Action)=>Promise<boolean>;onClose:()=>void;canUpdate:boolean}) {
  const pwa=useSyncExternalStore(pwaSubscribe,pwaSnapshot), file=useRef<HTMLInputElement>(null);
  const [backup,setBackup]=useState<Backup|null>(null),[restoreSettings,setRestoreSettings]=useState(true),[help,setHelp]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const standalone=matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone===true;
  async function exportFile(share=false) {
    setBusy(true);
    try {
      const text=await store.export();
      const filename=`Freiraum-${dayToISO(localDay())}.json`;
      const output=new File([text],filename,{type:'application/json'});
      if(share&&navigator.canShare?.({files:[output]})) await navigator.share({files:[output],title:'Freiraum-Sicherung'});
      else { const url=URL.createObjectURL(output);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000); }
      setMessage('Sicherung bereit. Bewahre die Datei an einem sicheren Ort auf.');
    } catch(error) { if(!(error instanceof DOMException&&error.name==='AbortError')) setMessage(`Export nicht möglich: ${error instanceof Error?error.message:'Unbekannter Fehler'}`); }
    finally{setBusy(false);}
  }
  async function readFile(input:File){
    setBusy(true);setMessage('');
    try{if(input.size>10_000_000)throw new Error('Maximal 10 MB pro Sicherung.');setBackup(decodeBackup(await input.text()));}
    catch(error){setMessage(error instanceof Error?error.message:'Ungültige Sicherung.');}
    finally{setBusy(false);}
  }
  return <>
    <Modal title="Einstellungen" onClose={onClose} footer={<button className="button primary" onClick={onClose}>Fertig</button>}>
      <section className="settings-section"><h3>Erscheinungsbild</h3><Chips values={['Hell','Dunkel','System']} selected={state.settings.theme} label="Erscheinungsbild" onChange={theme=>void commit({type:'settings',patch:{theme:theme as Theme}})}/></section>
      <section className="settings-section"><h3>Deine Daten bleiben bei dir</h3><p>Aufgaben werden ausschließlich auf diesem Gerät gespeichert. Es gibt keine automatische Synchronisierung zwischen Geräten.</p><p>Beim Löschen der Website-Daten, bei Speicherbereinigung oder einem Gerätewechsel können lokale Daten verloren gehen. Eine gelegentliche Sicherung ist sinnvoll.</p>
        <div className="settings-buttons"><button className="button outline" disabled={busy} onClick={()=>void exportFile()}><Download size={18}/>Sicherung exportieren</button><button className="button outline" disabled={busy} onClick={()=>file.current?.click()}><Upload size={18}/>Sicherung importieren</button></div>
        {typeof navigator.canShare==='function'&&<button className="text-button" disabled={busy} onClick={()=>void exportFile(true)}><Share2 size={16}/>Sicherungsdatei teilen</button>}
        <input ref={file} hidden type="file" accept=".json,application/json,text/plain" aria-label="Sicherungsdatei wählen" onChange={e=>{const f=e.target.files?.[0];if(f)void readFile(f);e.target.value='';}}/>
        <button className="text-button" onClick={()=>void requestPersistence().then(ok=>setMessage(ok?'Dauerhafter Speicher wurde vom Browser gewährt. Manuelles Löschen der Website-Daten entfernt deine Aufgaben trotzdem.':'Der Browser verwaltet den Speicher automatisch. Lokale Sicherungen bleiben sinnvoll.'))}><ShieldCheck size={16}/>Dauerhaften Speicher anfragen</button>
      </section>
      <section className="settings-section"><h3>Als App verwenden</h3><p className="connection-state"><WifiOff size={17}/>{pwa.offlineReady?'Für Offline-Nutzung bereit':pwa.error??'Offline-Einrichtung läuft …'}</p>
        <p>{standalone?'Du verwendest Freiraum bereits als installierte Web-App.':'Füge Freiraum zum Home-Bildschirm hinzu, um die App eigenständig zu öffnen.'}</p>
        {!standalone&&<button className="button outline" onClick={()=>setHelp(true)}><Smartphone size={18}/>Installationshilfe öffnen</button>}
        {pwa.update&&<button className="button outline" disabled={!canUpdate} onClick={()=>void applyUpdate(()=>store.idle()).catch(()=>setMessage('Aktualisierung noch nicht möglich. Bitte später erneut versuchen.'))}><RefreshCw size={18}/>Neue Version öffnen</button>}
      </section>
      {message&&<p className="inline-message" role="status">{message}</p>}
      <p className="version">Freiraum 1.0 · Lokal. Ohne Anmeldung.<br/>Sicherungsformat kompatibel mit Freiraum für Android.</p>
    </Modal>
    {help&&<Modal title="Freiraum installieren" onClose={()=>setHelp(false)} footer={<button className="button primary" onClick={()=>setHelp(false)}>Verstanden</button>}>
      <h3>iPhone und iPad</h3><ol className="install-steps"><li>Diesen Link in <strong>Safari</strong> öffnen.</li><li>Das Menü <strong>Teilen</strong> öffnen.</li><li><strong>Zum Home-Bildschirm</strong> wählen und, falls angeboten, <strong>Als Web-App öffnen</strong> aktivieren.</li><li>Mit <strong>Hinzufügen</strong> bestätigen und Freiraum über das neue Icon starten.</li></ol>
      <p>Öffne die installierte App zunächst mit Internet, bis in den Einstellungen „Für Offline-Nutzung bereit“ steht.</p>
      <p>Safari und die installierte App können getrennte Speicherbereiche verwenden. Falls zuvor eingegebene Aufgaben fehlen, exportiere sie in Safari und importiere die Sicherung in der installierten App.</p>
      <h3>Chrome und Edge</h3><p>Im Browsermenü „App installieren“ bzw. „Diese Seite als App installieren“ wählen. Die genaue Bezeichnung hängt vom Gerät ab.</p>
      <p className="muted">Kein Apple-Account, App Store oder regelmäßiges Signieren erforderlich. Der Link bleibt auch ohne Installation nutzbar.</p>
    </Modal>}
    {backup&&<Modal title="Sicherung hinzufügen" onClose={()=>setBackup(null)} footer={<><button className="button quiet" onClick={()=>setBackup(null)}>Abbrechen</button><button className="button primary" disabled={busy} onClick={()=>{setBusy(true);void commit({type:'import',backup,settings:restoreSettings}).then(ok=>{if(ok){setMessage(`${backup.tasks.length} Aufgaben und ${backup.lists.length} Listen als Kopien importiert.`);setBackup(null);}else setMessage('Import fehlgeschlagen. Bestehende Daten bleiben erhalten.');}).finally(()=>setBusy(false));}}>Als Kopien importieren</button></>}>
      <p>Die Datei enthält {backup.tasks.length} Aufgaben und {backup.lists.length} Listen.</p><p>Bestehende Aufgaben bleiben erhalten. Wiederholtes Importieren erzeugt weitere Kopien. Abschlüsse, Termine und Unteraufgabenstatus der Sicherung bleiben erhalten.</p>
      {backup.pwaSettings&&<label className="check-label"><input type="checkbox" checked={restoreSettings} onChange={e=>setRestoreSettings(e.target.checked)}/>Einstellungen aus Sicherung übernehmen</label>}
    </Modal>}
  </>;
}
