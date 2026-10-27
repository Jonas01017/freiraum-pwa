import { useState } from 'react';
import { Check, Undo2, Plus, MoreHorizontal } from 'lucide-react';
import { Modal, IconButton } from './components';
import { priorities, listColors, dayToISO, isoToDay, timeLabel, dayLabel, type Task, type TaskList, type Action, type Subtask } from './model';

type Commit = (action: Action) => Promise<boolean>;
function SubRow({sub, index, count, taskId, commit}: {sub: Subtask; index: number; count: number; taskId: string; commit: Commit}) {
  const [title,setTitle]=useState(sub.title), [menu,setMenu]=useState(false);
  return <div className="subtask-row">
    <input type="checkbox" className="checkbox" checked={sub.done} aria-label={`Unteraufgabe ${sub.title} ${sub.done?'wieder öffnen':'abhaken'}`} onChange={e=>void commit({type:'subPatch',id:taskId,subId:sub.id,patch:{done:e.target.checked}})}/>
    <div className="subtask-input"><input aria-label="Unteraufgabentitel" value={title} aria-invalid={!title.trim()} onChange={e=>{setTitle(e.target.value); if(e.target.value.trim()) void commit({type:'subPatch',id:taskId,subId:sub.id,patch:{title:e.target.value}});}}/>{!title.trim()&&<small className="field-error">Der bisherige Text bleibt gespeichert.</small>}</div>
    <IconButton icon={MoreHorizontal} label={`Unteraufgabe verwalten: ${sub.title}`} onClick={()=>setMenu(true)}/>
    {menu&&<Modal title="Unteraufgabe" onClose={()=>setMenu(false)}><div className="menu-actions">
      <button disabled={index===0} onClick={()=>{void commit({type:'subMove',id:taskId,subId:sub.id,by:-1});setMenu(false);}}>Nach oben</button>
      <button disabled={index===count-1} onClick={()=>{void commit({type:'subMove',id:taskId,subId:sub.id,by:1});setMenu(false);}}>Nach unten</button>
      <button onClick={()=>{void commit({type:'subDelete',id:taskId,subId:sub.id});setMenu(false);}}>Unteraufgabe entfernen</button>
    </div></Modal>}
  </div>;
}
export function TaskDetail({task, lists, commit, onClose, onComplete, onMenu, saveStatus}: {task:Task;lists:TaskList[];commit:Commit;onClose:()=>void;onComplete:()=>void;onMenu:()=>void;saveStatus:string}) {
  const [title,setTitle]=useState(task.title), [notes,setNotes]=useState(task.notes), [newSub,setNewSub]=useState(''), [blank,setBlank]=useState(false);
  const close=()=>{if(!title.trim()) setBlank(true);else onClose();};
  async function addSub(){if(newSub.trim()&&await commit({type:'subAdd',id:task.id,title:newSub}))setNewSub('');}
  const patch=(patch:Partial<Task>)=>void commit({type:'patch',id:task.id,patch});
  return <>
    <Modal title="Aufgabendetails" wide onClose={close} footer={<button className="button primary full" disabled={!title.trim()} onClick={onComplete}>{task.completedAt===null?<Check size={20}/>:<Undo2 size={20}/>} {task.completedAt===null?'Aufgabe abschließen':'Wiederherstellen'}</button>}>
      <div className="detail-intro"><span className={saveStatus.startsWith('Nicht')?'field-error':'muted'} aria-live="polite">{saveStatus}</span><IconButton icon={MoreHorizontal} label="Weitere Aufgabenaktionen" onClick={onMenu}/></div>
      <label className="field title-field">Titel<textarea rows={2} value={title} aria-invalid={!title.trim()} onChange={e=>{setTitle(e.target.value);if(e.target.value.trim())patch({title:e.target.value});}}/></label>
      {!title.trim()&&<p className="field-error">Bitte einen Titel eingeben. Der bisherige Titel bleibt gespeichert.</p>}
      <fieldset><legend>Priorität</legend><div className="chips">{priorities.map((name,i)=><button type="button" key={name} className={`chip ${task.priority===i?'selected':''}`} aria-pressed={task.priority===i} onClick={()=>patch({priority:i})}><span className={`priority-dot p${i}`}/>{name}</button>)}</div></fieldset>
      <fieldset><legend>Termin <span className="optional">· freiwillig</span></legend>
        <div className="date-fields"><label className="field">Fälligkeitsdatum<input type="date" min="0001-01-01" max="9999-12-31" value={dayToISO(task.dueDay)} onChange={e=>{try{patch({dueDay:isoToDay(e.target.value)});}catch{/* Intermediate native date input is not committed. */}}}/></label>
          {task.dueDay!==null&&<button className="text-button" onClick={()=>patch({dueDay:null,dueMinute:null})}>Termin entfernen</button>}
        </div>
        {task.dueDay!==null&&!dayToISO(task.dueDay)&&<p className="muted">{dayLabel(task.dueDay)} liegt außerhalb der Kalenderanzeige. Der gespeicherte Wert bleibt erhalten, bis du ihn änderst oder entfernst.</p>}
        {task.dueDay!==null&&<div className="date-fields"><label className="field">Uhrzeit <span className="optional">(optional)</span><input type="time" value={task.dueMinute===null?'':timeLabel(task.dueMinute)} onChange={e=>{const v=e.target.value;patch({dueMinute:v?Number(v.slice(0,2))*60+Number(v.slice(3,5)):null});}}/></label>{task.dueMinute!==null&&<button className="text-button" onClick={()=>patch({dueMinute:null})}>Uhrzeit entfernen</button>}</div>}
      </fieldset>
      <fieldset><legend>Liste</legend><div className="chips"><button className={`chip ${task.listId===null?'selected':''}`} aria-pressed={task.listId===null} onClick={()=>patch({listId:null})}>Eingang</button>{lists.map(l=><button key={l.id} className={`chip ${task.listId===l.id?'selected':''}`} aria-pressed={task.listId===l.id} onClick={()=>patch({listId:l.id})}><span className="color-dot" style={{backgroundColor:listColors[l.color]}}/>{l.name}</button>)}</div></fieldset>
      <label className="field">Notizen<textarea rows={5} value={notes} placeholder="Gedanken, Links und alles, was dazugehört …" onChange={e=>{setNotes(e.target.value);patch({notes:e.target.value});}}/></label>
      <fieldset><legend>Unteraufgaben</legend>{task.subtasks.length>0&&<p className="subtask-count">{task.subtasks.filter(s=>s.done).length} von {task.subtasks.length} erledigt</p>}
        <div className="subtasks">{task.subtasks.map((sub,i)=><SubRow key={sub.id} sub={sub} index={i} count={task.subtasks.length} taskId={task.id} commit={commit}/>)}</div>
        <div className="subtask-row"><input className="new-sub-input" aria-label="Neue Unteraufgabe" placeholder="Neue Unteraufgabe" value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void addSub();}}}/><IconButton icon={Plus} label="Unteraufgabe hinzufügen" disabled={!newSub.trim()} onClick={()=>void addSub()}/></div>
      </fieldset>
      <p className="timestamps">Erstellt am {timestamp(task.createdAt)}{task.completedAt!==null&&<><br/>Erledigt am {timestamp(task.completedAt)}</>}</p>
    </Modal>
    {blank&&<Modal title="Der Titel fehlt" onClose={()=>setBlank(false)} footer={<><button className="button quiet" onClick={()=>setBlank(false)}>Weiter bearbeiten</button><button className="button primary" onClick={()=>{setBlank(false);onClose();}}>Gespeicherten Titel behalten</button></>}><p>Der zuletzt gespeicherte Titel „{task.title}“ bleibt erhalten.</p></Modal>}
  </>;
}
function timestamp(value:number){const date=new Date(value);return Number.isNaN(date.getTime())?'Zeitpunkt außerhalb der Anzeige':date.toLocaleDateString('de-DE');}
