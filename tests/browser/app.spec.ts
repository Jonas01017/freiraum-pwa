import { test,expect,type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { isoToDay,localDay,type Backup } from '../../src/model';

async function add(page:Page,title:string,details=false){await page.getByRole('button',{name:'Aufgabe erstellen',exact:true}).click();await page.getByRole('textbox',{name:'Aufgabentitel',exact:true}).fill(title);await page.getByRole('button',{name:details?'Hinzufügen & Details öffnen':'Hinzufügen',exact:true}).click();await expect(page.getByRole('heading',{name:'Ein Gedanke weniger im Kopf',exact:true})).toHaveCount(0);if(details)await expect(page.getByRole('dialog',{name:'Aufgabendetails',exact:true})).toBeVisible();else await expect(page.getByRole('button',{name:'Details: '+title,exact:true})).toBeVisible();}
async function importBackup(page:Page,backup:unknown){await page.getByRole('button',{name:'Einstellungen',exact:true}).click();await page.getByLabel('Sicherungsdatei wählen').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.getByRole('button',{name:'Als Kopien importieren',exact:true}).click();await page.getByRole('button',{name:'Fertig',exact:true}).click();}
async function database(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('freiraum-pwa');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise<unknown[]>((resolve,reject)=>{const r=db.transaction('tasks').objectStore('tasks').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}});}
function fixture():Backup{
  const today=localDay(),base={notes:'',priority:2,dueDay:null,dueMinute:null,listId:null,subtasks:[],createdAt:1720000000000,completedAt:null,position:1};
  return {format:'freiraum',version:1,exportedAt:Date.now(),lists:[{id:'privat',name:'Privat',color:1}],tasks:[
    {...base,id:'balcony',title:'Den Balkon neu gestalten',notes:'Kräuter, ein gemütlicher Stuhl und ein bisschen Grün.',dueDay:today,listId:'privat',subtasks:[{id:'s1',title:'Pflanzen aussuchen',done:true},{id:'s2',title:'Töpfe besorgen',done:false}]},
    {...base,id:'walk',title:'Zeit für einen Spaziergang',priority:3,dueDay:today,position:2},
    {...base,id:'weekend',title:'Wochenende am See planen',priority:1,dueDay:today+3,listId:'privat',position:3},
    {...base,id:'book',title:'Ein neues Buch entdecken',notes:'Empfehlungen in Ruhe anschauen',priority:3,position:4},
    {...base,id:'ideas',title:'Ideen für die Wohnung sammeln',position:5},
  ]};
}
test.beforeEach(async({page})=>{await page.goto('./');await expect(page.getByRole('heading',{name:'Meine Aufgaben',exact:true})).toBeVisible();});

test('quick creation, date removal, notes, subtasks, confirmation and undo survive restart',async({page})=>{
  await add(page,'Präsentation vorbereiten',true);
  const dialog=page.getByRole('dialog',{name:'Aufgabendetails',exact:true});
  await expect(dialog.getByLabel('Fälligkeitsdatum',{exact:true})).toHaveValue('');
  await expect(dialog.getByLabel('Uhrzeit',{exact:false})).toHaveCount(0);
  await dialog.getByLabel('Notizen',{exact:true}).fill('Folien gestalten\nGedanken und Links sammeln');
  await dialog.getByLabel('Fälligkeitsdatum',{exact:true}).fill('2026-10-28');
  await dialog.getByLabel('Uhrzeit',{exact:false}).fill('14:30');
  await expect.poll(async()=>JSON.stringify(await database(page))).toContain('870');
  await dialog.getByRole('button',{name:'Termin entfernen',exact:true}).click();
  await expect(dialog.getByLabel('Fälligkeitsdatum',{exact:true})).toHaveValue('');
  await expect(dialog.getByLabel('Uhrzeit',{exact:false})).toHaveCount(0);
  await dialog.getByRole('textbox',{name:'Neue Unteraufgabe',exact:true}).fill('Folien erstellen');await dialog.getByRole('button',{name:'Unteraufgabe hinzufügen',exact:true}).click();
  await expect(dialog.getByText('0 von 1 erledigt')).toBeVisible();
  await dialog.getByRole('checkbox',{name:'Unteraufgabe Folien erstellen abhaken',exact:true}).click();
  await dialog.getByRole('textbox',{name:'Neue Unteraufgabe',exact:true}).fill('Vortrag üben');await dialog.getByRole('button',{name:'Unteraufgabe hinzufügen',exact:true}).click();
  await dialog.getByRole('button',{name:'Aufgabe abschließen',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Aufgabe abschließen?',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Abschließen',exact:true}).click();await page.getByRole('button',{name:'Rückgängig',exact:true}).click();
  await expect(page.getByRole('button',{name:'Details: Präsentation vorbereiten',exact:true})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'Details: Präsentation vorbereiten',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Notizen',exact:true})).toHaveValue('Folien gestalten\nGedanken und Links sammeln');
  await expect(page.getByText('1 von 2 erledigt')).toBeVisible();
});

test('service worker caches the whole shell and permits offline editing after reload',async({page,context,request,browserName})=>{
  await add(page,'Ohne Internet');await page.getByRole('button',{name:'Einstellungen',exact:true}).click();
  await expect(page.getByText('Für Offline-Nutzung bereit',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Fertig',exact:true}).click();
  await request.post('http://127.0.0.1:4173/__test/offline?enabled=1');try{await expect(request.get('http://127.0.0.1:4173/freiraum-pwa/manifest.webmanifest')).rejects.toThrow();if(browserName==='chromium')await context.setOffline(true);await page.reload();await expect(page.getByRole('button',{name:'Details: Ohne Internet',exact:true})).toBeVisible();
  await add(page,'Auch offline gespeichert');await page.reload();await expect(page.getByRole('button',{name:'Details: Auch offline gespeichert',exact:true})).toBeVisible();
  const cached=await page.evaluate(async()=>{const names=await caches.keys();const c=await caches.open(names.find(n=>n.startsWith('freiraum-shell-'))!);return(await c.keys()).map(r=>r.url);});
  expect(cached.some(url=>url.endsWith('/index.html'))).toBe(true);expect(cached.some(url=>url.endsWith('/icons/apple-touch-icon.png'))).toBe(true);expect(cached.some(url=>url.includes('/assets/')&&url.endsWith('.js'))).toBe(true);
  } finally { await request.post('http://127.0.0.1:4173/__test/offline?enabled=0'); }
});

test('Android import, full export, invalid import and settings restoration',async({page})=>{
  const backup=fixture();backup.tasks[0].dueDay=isoToDay('2026-10-27');backup.tasks[0].dueMinute=720;
  await importBackup(page,backup);expect(await database(page)).toHaveLength(5);
  await page.getByRole('button',{name:'Einstellungen',exact:true}).click();
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Sicherung exportieren',exact:true}).click();const download=await downloadEvent;
  const exported=JSON.parse(await readFile((await download.path())!,'utf8'));expect(exported.format).toBe('freiraum');expect(exported.version).toBe(1);expect(exported.tasks).toHaveLength(5);expect(exported.pwaSettings.theme).toBe('System');
  const task=exported.tasks.find((t:{title:string})=>t.title==='Den Balkon neu gestalten');expect(task.notes).toBe(backup.tasks[0].notes);expect(task.dueMinute).toBe(720);expect(task.subtasks[0].done).toBe(true);expect(exported.lists[0].name).toBe('Privat');
  await page.getByLabel('Sicherungsdatei wählen').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"format":"wrong"}')});await expect(page.getByText('Unbekanntes Sicherungsformat oder nicht unterstützte Version.')).toBeVisible();expect(await database(page)).toHaveLength(5);
  exported.pwaSettings.theme='Dunkel';await page.getByLabel('Sicherungsdatei wählen').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.getByRole('button',{name:'Als Kopien importieren',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');expect(await database(page)).toHaveLength(10);
});

test('updates wait for consent and preserve IndexedDB data',async({page,request})=>{
  await add(page,'Bei Updates behalten');await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await page.evaluate(()=>{document.body.dataset.testSession='unchanged';});
  await request.post('http://127.0.0.1:4173/__test/update');await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r?.update();});
  await expect(page.getByRole('button',{name:'Aktualisieren',exact:true})).toBeVisible();expect(await page.locator('body').getAttribute('data-test-session')).toBe('unchanged');
  await page.getByRole('button',{name:'Aktualisieren',exact:true}).click();await expect(page.getByRole('button',{name:'Details: Bei Updates behalten',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('body').getAttribute('data-test-session')).toBeNull();expect(await database(page)).toHaveLength(1);
});

test('list deletion preserves tasks, duplication and completion restoration work',async({page})=>{
  await page.getByRole('button',{name:'Listen',exact:true}).click();await page.getByRole('button',{name:'Neue Liste',exact:true}).click();await page.getByRole('textbox',{name:'Listenname',exact:true}).fill('Studium');await page.getByRole('button',{name:'Speichern',exact:true}).click();await page.getByRole('button',{name:'Studium',exact:true}).click();await add(page,'Literatur lesen');
  await page.getByRole('button',{name:'Alle Listen',exact:true}).click();await page.getByRole('button',{name:'Liste verwalten: Studium',exact:true}).click();await page.getByRole('button',{name:'Liste löschen',exact:true}).click();await page.getByRole('button',{name:'Liste löschen',exact:true}).click();
  await expect.poll(async()=>JSON.stringify(await database(page))).toContain('"listId":null');
  await page.getByRole('button',{name:'Alle Aufgaben',exact:true}).click();await page.getByRole('button',{name:'Aufgabenmenü: Literatur lesen',exact:true}).click();await page.getByRole('button',{name:'Duplizieren',exact:true}).click();await expect(page.getByRole('button',{name:'Details: Literatur lesen (Kopie)',exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:'Abschließen: Literatur lesen',exact:true}).click();await page.getByRole('button',{name:'Erledigt',exact:true}).click();await page.getByRole('checkbox',{name:'Wiederherstellen: Literatur lesen',exact:true}).click();await expect(page.getByRole('heading',{name:'Hier ist noch Raum',exact:true})).toBeVisible();
});

test('responsive previews, manifest icons, dark mode and overflow',async({page},info)=>{
  await importBackup(page,fixture());
  const root=page.locator('html');await expect(root).toHaveAttribute('data-theme','light');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({path:`qa-artifacts/${info.project.name}/01-uebersicht-hell.png`,fullPage:false});
  await page.getByRole('button',{name:'Details: Den Balkon neu gestalten',exact:true}).click();await page.screenshot({path:`qa-artifacts/${info.project.name}/02-details-hell.png`,fullPage:false});await page.getByRole('button',{name:'Schließen',exact:true}).click();
  await page.getByRole('button',{name:'Einstellungen',exact:true}).click();await page.getByRole('button',{name:'Dunkel',exact:true}).click();await expect(root).toHaveAttribute('data-theme','dark');await page.getByRole('button',{name:'Fertig',exact:true}).click();
  await page.screenshot({path:`qa-artifacts/${info.project.name}/03-uebersicht-dunkel.png`,fullPage:false});await page.reload();await expect(root).toHaveAttribute('data-theme','dark');
  const manifest=await page.evaluate(async()=>{const url=document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href;return(await fetch(url)).json();});expect(manifest.display).toBe('standalone');expect(manifest.start_url).toBe('./');expect(manifest.icons).toHaveLength(3);
  for(const icon of manifest.icons){const response=await page.request.get(icon.src);expect(response.ok()).toBe(true);expect(response.headers()['content-type']).toContain('image/png');}
});



