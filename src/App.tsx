import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Home, ListTodo, FolderOpen, CircleCheck, Plus, Settings as SettingsIcon, Search, SlidersHorizontal, ChevronDown, ChevronUp, MoreHorizontal, ListChecks, ArrowLeft, Leaf, X, RefreshCw } from 'lucide-react';
import { Modal, IconButton, Empty, Chips } from './components';
import { Settings } from './Settings';
import { TaskDetail } from './TaskDetail';
import { store } from './storage';
import { pwaSnapshot, pwaSubscribe, applyUpdate } from './pwa';
import { id, newTask, priorities, listColors, dueOf, localDay, dayLabel, timeLabel, selectTasks, type Task, type TaskList, type Action, type Due, type Sort, type Settings as SettingsType } from './model';

const nav=[{name:'Übersicht',icon:Home},{name:'Alle Aufgaben',icon:ListTodo},{name:'Listen',icon:FolderOpen},{name:'Erledigt',icon:CircleCheck}];
const sections: {key:Due;name:string}[]=[{key:'PAST',name:'Noch offen'},{key:'TODAY',name:'Heute'},{key:'FUTURE',name:'Demnächst'},{key:'NONE',name:'Ohne Termin'}];
interface Confirmation {title:string;body:string;label:string;action:()=>Promise<void>}
interface Notice {text:string;undo?:()=>Promise<boolean>}
export function App() {
  const state=useSyncExternalStore(store.subscribe,store.snapshot),pwa=useSyncExternalStore(pwaSubscribe,pwaSnapshot);
  const [bootError,setBootError]=useState(''),[page,setPage]=useState(0),[selectedList,setSelectedList]=useState<string|null>(null),[details,setDetails]=useState<string|null>(null);
  const [quick,setQuick]=useState(false),[settings,setSettings]=useState(false),[listEditor,setListEditor]=useState<TaskList|null>(null),[menu,setMenu]=useState<string|null>(null),[listMenu,setListMenu]=useState<TaskList|null>(null);
  const [confirm,setConfirm]=useState<Confirmation|null>(null),[notice,setNotice]=useState<Notice|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(0);
  const failed=useRef<Action[]>([]);
  const [query,setQuery]=useState(''),[priority,setPriority]=useState<number|null>(null),[filterList,setFilterList]=useState<string|null>(null),[filterDue,setFilterDue]=useState<Due|null>(null),[filterOpen,setFilterOpen]=useState(false),[today,setToday]=useState(localDay());
  const [systemDark,setSystemDark]=useState(matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(()=>{void store.open().catch(e=>setBootError(e instanceof Error?e.message:'Speicher nicht verfügbar.'));const blocked=()=>setError('Der lokale Speicher wurde geschlossen. Bitte offene Texte kopieren und die App neu laden.');window.addEventListener('storage-blocked',blocked);return()=>window.removeEventListener('storage-blocked',blocked);},[]);
  useEffect(()=>{const mq=matchMedia('(prefers-color-scheme: dark)');const change=()=>setSystemDark(mq.matches);mq.addEventListener('change',change);return()=>mq.removeEventListener('change',change);},[]);
  useEffect(()=>{
    const resize=()=>{document.documentElement.style.setProperty('--viewport-height',`${window.visualViewport?.height??window.innerHeight}px`);document.documentElement.style.setProperty('--viewport-top',`${window.visualViewport?.offsetTop??0}px`);};
    resize();window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize);window.addEventListener('resize',resize);
    const refresh=()=>{setToday(localDay());if(!document.hidden&&store.snapshot())void store.refresh().catch(()=>setError('Speicher konnte nicht gelesen werden. Bitte offene Texte sichern und neu laden.'));};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);const timer=setInterval(()=>setToday(localDay()),30_000);
    return()=>{clearInterval(timer);window.visualViewport?.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('scroll',resize);window.removeEventListener('resize',resize);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  const theme=state?.settings.theme??'System',dark=theme==='Dunkel'||(theme==='System'&&systemDark);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#171923':'#F5F6FA');},[dark]);
  useEffect(()=>{const before=(e:BeforeUnloadEvent)=>{if(pending>0||error){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[pending,error]);
  useEffect(()=>{if(!notice||notice.undo)return;const timer=setTimeout(()=>setNotice(null),5000);return()=>clearTimeout(timer);},[notice]);
  async function commit(action:Action):Promise<boolean>{setPending(n=>n+1);try{await store.dispatch(action);return true;}catch(e){failed.current.push(action);setError(`Nicht gespeichert: ${e instanceof Error?e.message:'Der Speicher ist nicht verfügbar.'}`);return false;}finally{setPending(n=>n-1);}}
  async function retry(){const actions=failed.current.splice(0);setError('');for(const action of actions)await commit(action);}
  const announce=(text:string,undo?:()=>Promise<boolean>)=>setNotice({text,undo});
  async function complete(task:Task){
    const run=async()=>{const previous=task.completedAt;if(await commit({type:'patch',id:task.id,patch:{completedAt:previous===null?Date.now():null}})){setDetails(null);announce(previous===null?'Aufgabe erledigt':'Aufgabe wiederhergestellt',()=>commit({type:'patch',id:task.id,patch:{completedAt:previous}}));}};
    if(task.completedAt===null&&task.subtasks.some(s=>!s.done))setConfirm({title:'Aufgabe abschließen?',body:'Es sind noch Unteraufgaben offen. Du kannst die Aufgabe trotzdem abschließen.',label:'Abschließen',action:run});else await run();
  }
  function deleteTask(task:Task){setConfirm({title:'Aufgabe löschen?',body:task.title,label:'Löschen',action:async()=>{if(await commit({type:'delete',id:task.id})){setDetails(null);announce('Aufgabe gelöscht',()=>commit({type:'restore',task}));}}});}
  if(!state)return <main className="loading"><img src="./icon.svg" alt="Freiraum" width="64" height="64"/><h1>Freiraum</h1>{bootError?<><p role="alert">Der lokale Speicher konnte nicht geöffnet werden. {bootError}</p><p>Bitte prüfe, ob Website-Speicher erlaubt ist. Bereits gespeicherte Daten werden nicht überschrieben.</p><button className="button primary" onClick={()=>location.reload()}>Erneut versuchen</button></>:<p>Deine Aufgaben werden geöffnet …</p>}</main>;
  const tasks=state.tasks,lists=[...state.lists].sort((a,b)=>a.name.localeCompare(b.name,'de')),sort=state.settings.sort;
  const detail=tasks.find(t=>t.id===details),menuTask=tasks.find(t=>t.id===menu);
  const title=page===2&&selectedList?(selectedList==='inbox'?'Eingang':lists.find(l=>l.id===selectedList)?.name??'Liste'):['Meine Aufgaben','Alle Aufgaben','Listen','Erledigt'][page];
  const visible=selectTasks(tasks.filter(t=>(t.completedAt!==null)===(page===3)),page===0?'':query,page===0?null:priority,page===2?selectedList:page===0?null:filterList,page===0?null:filterDue,page===0?'Fälligkeit':sort,today);
  const showingLists=page===2&&!selectedList;
  const activeFilters=priority!==null||filterList!==null||filterDue!==null;
  const date=new Date();
  const dateString=date.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
  return <>
    <div className="app-shell" inert={details||quick||settings||filterOpen||menu||listEditor||listMenu||confirm?true:undefined}>
      <aside className="sidebar"><div className="brand"><img src="./icon.svg" alt=""/><span>Freiraum<small>Raum für deine Gedanken</small></span></div><nav aria-label="Hauptnavigation">{nav.map((n,i)=><button key={n.name} className={page===i?'active':''} aria-current={page===i?'page':undefined} onClick={()=>{setPage(i);setSelectedList(null);}}><n.icon size={21}/><span>{n.name}</span></button>)}</nav><div className="sidebar-bottom"><Leaf size={19}/><span>Dein Tempo.<br/>Deine Aufgaben.</span></div></aside>
      <main className="main-content" id="main">
        <header className="page-header"><div>{selectedList&&<button className="back-link" onClick={()=>setSelectedList(null)}><ArrowLeft size={16}/>Alle Listen</button>}<p className="eyebrow">{page===0?dateString.charAt(0).toUpperCase()+dateString.slice(1):'F R E I R A U M'}</p><h1>{title}</h1></div><IconButton icon={SettingsIcon} label="Einstellungen" onClick={()=>setSettings(true)}/></header>
        {page===0&&<p className="page-intro">Platz für das, was dir wichtig ist.</p>}
        {error&&<div className="error-banner" role="alert"><p>{error}</p><button className="text-button" onClick={()=>void retry()}>Speichern erneut versuchen</button></div>}
        {pwa.update&&<div className="update-banner"><RefreshCw size={16}/><span>Eine neue Version ist bereit.</span><button className="text-button" disabled={pending>0||!!error} onClick={()=>void applyUpdate(()=>store.idle()).catch(()=>announce('Bitte später erneut aktualisieren.'))}>Aktualisieren</button></div>}
        {!showingLists&&page!==0&&<div className="search-toolbar"><label className="search-box"><Search size={19}/><input type="search" aria-label="Aufgaben und Notizen suchen" placeholder="Aufgaben und Notizen suchen" value={query} onChange={e=>setQuery(e.target.value)}/></label><button className={`filter-button ${activeFilters?'has-filters':''}`} aria-label="Filter und Sortierung" onClick={()=>setFilterOpen(true)}><SlidersHorizontal size={20}/><span>Ansicht</span></button></div>}
        {!showingLists&&page!==0&&activeFilters&&<button className="text-button reset-filters" onClick={()=>{setPriority(null);setFilterList(null);setFilterDue(null);}}>Filter zurücksetzen</button>}
        {showingLists?<div className="list-grid"><ListCard name="Eingang" color={listColors[0]} onOpen={()=>setSelectedList('inbox')}/>{lists.map(l=><ListCard key={l.id} name={l.name} color={listColors[l.color]} onOpen={()=>setSelectedList(l.id)} onMenu={()=>setListMenu(l)}/>)}<button className="new-list" onClick={()=>setListEditor({id:id(),name:'',color:0})}><Plus size={20}/>Neue Liste</button></div>:
          visible.length===0?<Empty title={query||activeFilters?'Nichts gefunden':page===3?'Hier ist noch Raum':undefined}>{query||activeFilters?'Versuche einen anderen Suchbegriff oder passe deine Filter an.':page===3?'Erledigte Aufgaben findest du später hier.':'Mit + kannst du einen Gedanken als Aufgabe festhalten. Ein Termin ist freiwillig.'}</Empty>:
          <div className="task-sections">{(page===0?sections:[{key:'all' as const,name:''}]).map(section=>{
            const group=section.key==='all'?visible:visible.filter(t=>dueOf(t,today)===section.key);
            const collapsed=state.settings.collapsed.includes(section.key);
            if(!group.length)return null;
            return <section key={section.key} className="task-section">{section.name&&<button className="section-heading" aria-expanded={!collapsed} onClick={()=>void commit({type:'settings',patch:{collapsed:collapsed?state.settings.collapsed.filter(k=>k!==section.key):[...state.settings.collapsed,section.key]}})}><h2>{section.name}</h2>{collapsed?<ChevronDown size={19}/>:<ChevronUp size={19}/>}</button>}
              {!collapsed&&<div className="task-list">{group.map(t=><TaskCard key={t.id} task={t} lists={lists} today={today} onOpen={()=>setDetails(t.id)} onComplete={()=>void complete(t)} onMenu={()=>setMenu(t.id)}/>)}</div>}</section>;
          })}</div>}
      </main>
      {page!==3&&<button className="fab" aria-label="Aufgabe erstellen" onClick={()=>setQuick(true)}><Plus size={27}/><span>Neue Aufgabe</span></button>}
      <nav className="bottom-nav" aria-label="Hauptnavigation">{nav.map((n,i)=><button key={n.name} className={page===i?'active':''} aria-current={page===i?'page':undefined} onClick={()=>{setPage(i);setSelectedList(null);}}><span className="nav-icon"><n.icon size={22}/></span><span>{n.name}</span></button>)}</nav>
    </div>
    {notice&&<div className="snackbar" role="status"><span>{notice.text}</span>{notice.undo&&<button onClick={()=>{const undo=notice.undo;setNotice(null);void undo?.();}}>Rückgängig</button>}<IconButton icon={X} label="Hinweis schließen" onClick={()=>setNotice(null)}/></div>}
    {quick&&<QuickAdd onClose={()=>setQuick(false)} onSave={async(title,open)=>{const task=newTask(title,selectedList==='inbox'?null:selectedList);if(await commit({type:'add',task})){setQuick(false);if(open)setDetails(task.id);return true;}return false;}}/>}
    {detail&&<TaskDetail key={detail.id} task={detail} lists={lists} commit={commit} onClose={()=>setDetails(null)} onComplete={()=>void complete(detail)} onMenu={()=>setMenu(detail.id)} saveStatus={error?'Nicht gespeichert – bitte Texte sichern und erneut versuchen.':pending?'Wird gespeichert …':'Änderungen werden automatisch gespeichert.'}/>}
    {settings&&<Settings state={state} commit={commit} onClose={()=>setSettings(false)} canUpdate={pending===0&&!error}/>}
    {filterOpen&&<FilterDialog priority={priority} list={filterList} due={filterDue} sort={sort} lists={lists} onClose={()=>setFilterOpen(false)} onApply={(p,l,d,s)=>{setPriority(p);setFilterList(l);setFilterDue(d);void commit({type:'settings',patch:{sort:s}});setFilterOpen(false);}}/>}
    {listEditor&&<ListEditor key={listEditor.id} list={listEditor} onClose={()=>setListEditor(null)} onSave={async list=>{if(await commit({type:'list',list}))setListEditor(null);}}/>}
    {listMenu&&<Modal title={listMenu.name} onClose={()=>setListMenu(null)}><div className="menu-actions"><button onClick={()=>{setListEditor(listMenu);setListMenu(null);}}>Liste bearbeiten</button><button onClick={()=>{const list=listMenu;setListMenu(null);setConfirm({title:'Liste löschen?',body:`Die Aufgaben aus „${list.name}“ bleiben erhalten und werden in den Eingang verschoben.`,label:'Liste löschen',action:async()=>{if(await commit({type:'deleteList',id:list.id})){if(selectedList===list.id)setSelectedList('inbox');announce('Liste gelöscht. Die Aufgaben bleiben im Eingang.');}}});}}>Liste löschen</button></div></Modal>}
    {menuTask&&<Modal title="Aufgabenmenü" onClose={()=>setMenu(null)}><div className="menu-actions"><button onClick={()=>{setDetails(menuTask.id);setMenu(null);}}>Details bearbeiten</button><button onClick={()=>{void commit({type:'duplicate',id:menuTask.id}).then(ok=>ok&&announce('Aufgabe dupliziert'));setMenu(null);}}>Duplizieren</button>
      {page!==0&&sort==='Manuell'&&(['up','down'] as const).map(direction=>{const index=visible.findIndex(t=>t.id===menuTask.id),other=visible[index+(direction==='up'?-1:1)];return <button key={direction} disabled={!other} onClick={()=>{if(other)void commit({type:'swap',first:menuTask.id,second:other.id});setMenu(null);}}>{direction==='up'?'Nach oben':'Nach unten'}</button>;})}
      <button onClick={()=>{setMenu(null);deleteTask(menuTask);}}>Aufgabe löschen</button></div></Modal>}
    {confirm&&<Modal title={confirm.title} onClose={()=>setConfirm(null)} footer={<><button className="button quiet" onClick={()=>setConfirm(null)}>Zurück</button><button className="button primary" onClick={()=>{const action=confirm.action;setConfirm(null);void action();}}>{confirm.label}</button></>}><p>{confirm.body}</p></Modal>}
  </>;
}

function TaskCard({task:t,lists,today,onOpen,onComplete,onMenu}:{task:Task;lists:TaskList[];today:number;onOpen:()=>void;onComplete:()=>void;onMenu:()=>void}){
  const list=lists.find(l=>l.id===t.listId);
  return <article className={`task-card ${t.completedAt!==null?'completed':''}`}>
    <input className="checkbox" type="checkbox" checked={t.completedAt!==null} aria-label={`${t.completedAt===null?'Abschließen':'Wiederherstellen'}: ${t.title}`} onChange={onComplete}/>
    <button className="task-main" onClick={onOpen} aria-label={`Details: ${t.title}`}><span className="task-title">{t.title}</span>{t.notes.trim()&&<span className="task-notes">{t.notes}</span>}<span className="task-meta"><span className={`priority p${t.priority}`}><i/>{priorities[t.priority]}</span>{t.dueDay!==null&&<span>{dayLabel(t.dueDay,today)}{t.dueMinute!==null?` · ${timeLabel(t.dueMinute)}`:''}</span>}{list&&<span>{list.name}</span>}{t.subtasks.length>0&&<ListChecks size={15} aria-label="Enthält Unteraufgaben"/>}</span></button>
    <IconButton icon={MoreHorizontal} label={`Aufgabenmenü: ${t.title}`} onClick={onMenu}/>
  </article>;
}
function ListCard({name,color,onOpen,onMenu}:{name:string;color:string;onOpen:()=>void;onMenu?:()=>void}){return <article className="list-card" style={{'--list-color':color} as CSSProperties}><button className="list-main" onClick={onOpen}><span className="list-symbol"><FolderOpen size={25}/></span><span>{name}</span></button>{onMenu&&<IconButton icon={MoreHorizontal} label={`Liste verwalten: ${name}`} onClick={onMenu}/>}</article>;}
function QuickAdd({onClose,onSave}:{onClose:()=>void;onSave:(title:string,open:boolean)=>Promise<boolean>}){
  const [title,setTitle]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function save(open=false){if(!title.trim()||busy)return;setBusy(true);if(!await onSave(title,open)){setError('Die Aufgabe konnte nicht gespeichert werden. Dein Text bleibt hier erhalten.');setBusy(false);}}
  return <Modal title="Ein Gedanke weniger im Kopf" onClose={onClose} footer={<><button className="button quiet" onClick={onClose}>Abbrechen</button><button className="button primary" disabled={!title.trim()||busy} onClick={()=>void save()}>{busy?'Wird hinzugefügt …':'Hinzufügen'}</button></>}><form onSubmit={e=>{e.preventDefault();void save();}}><label className="field">Aufgabentitel<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Was möchtest du festhalten?" enterKeyHint="done"/></label><p className="muted quick-hint">Ohne Termin. Alles Weitere kannst du später ergänzen.</p><button type="button" className="text-button" disabled={!title.trim()||busy} onClick={()=>void save(true)}>Hinzufügen & Details öffnen</button>{error&&<p className="field-error" role="alert">{error}</p>}</form></Modal>;
}
function ListEditor({list,onClose,onSave}:{list:TaskList;onClose:()=>void;onSave:(list:TaskList)=>Promise<void>}){
  const [name,setName]=useState(list.name),[color,setColor]=useState(list.color),[busy,setBusy]=useState(false);
  return <Modal title={list.name?'Liste bearbeiten':'Neue Liste'} onClose={onClose} footer={<><button className="button quiet" onClick={onClose}>Abbrechen</button><button className="button primary" disabled={!name.trim()||busy} onClick={()=>{setBusy(true);void onSave({...list,name:name.trim(),color}).finally(()=>setBusy(false));}}>Speichern</button></>}><label className="field">Listenname<input value={name} autoFocus onChange={e=>setName(e.target.value)}/></label><fieldset><legend>Farbe</legend><div className="color-options">{listColors.map((c,i)=><button key={c} className={color===i?'selected':''} style={{'--list-color':c} as CSSProperties} aria-label={`Farbe ${i+1}`} aria-pressed={color===i} onClick={()=>setColor(i)}><span/>{color===i&&<CircleCheck size={22}/>}</button>)}</div></fieldset></Modal>;
}
function FilterDialog({priority,list,due,sort,lists,onClose,onApply}:{priority:number|null;list:string|null;due:Due|null;sort:Sort;lists:TaskList[];onClose:()=>void;onApply:(p:number|null,l:string|null,d:Due|null,s:Sort)=>void}){
  const [p,setP]=useState(priority),[l,setL]=useState(list),[d,setD]=useState(due),[s,setS]=useState(sort);
  return <Modal title="Deine Ansicht" onClose={onClose} footer={<><button className="button quiet" onClick={()=>onApply(null,null,null,'Manuell')}>Zurücksetzen</button><button className="button primary" onClick={()=>onApply(p,l,d,s)}>Anwenden</button></>}>
    <fieldset><legend>Priorität</legend><Chips label="Prioritätsfilter" values={['Alle',...priorities]} selected={p===null?'Alle':priorities[p]} onChange={v=>setP(v==='Alle'?null:priorities.indexOf(v as typeof priorities[number]))}/></fieldset>
    <label className="field">Liste<select value={l??'all'} onChange={e=>setL(e.target.value==='all'?null:e.target.value)}><option value="all">Alle Listen</option><option value="inbox">Eingang</option>{lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
    <fieldset><legend>Termin</legend><div className="chips">{[{key:null,name:'Alle'},...sections].map(option=><button key={option.key??'all'} className={`chip ${d===option.key?'selected':''}`} aria-pressed={d===option.key} onClick={()=>setD(option.key)}>{option.name}</button>)}</div></fieldset>
    <fieldset><legend>Sortierung</legend><Chips label="Sortierung" values={['Manuell','Fälligkeit','Priorität','Neueste']} selected={s} onChange={v=>setS(v as SettingsType['sort'])}/>{s==='Manuell'&&<p className="muted">Ändere die Reihenfolge über das Aufgabenmenü mit „Nach oben“ und „Nach unten“.</p>}</fieldset>
  </Modal>;
}
