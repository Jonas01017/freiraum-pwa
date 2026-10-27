import { describe, it, expect } from 'vitest';
import { newTask, emptyState, reduce, localDay, isoToDay, dayToISO, dueOf, decodeBackup, encodeBackup, selectTasks, type Backup, type State } from '../src/model';

describe('Android-compatible tasks and backups',()=>{
  it('creates tasks with only a title, normal priority and no date or time',()=>{
    const task=newTask('  Ein Gedanke  ');expect(task.title).toBe('Ein Gedanke');expect(task.priority).toBe(2);expect(task.dueDay).toBeNull();expect(task.dueMinute).toBeNull();
  });
  it('handles leap days, invalid days and local calendar days without UTC shifts',()=>{
    for(const value of ['2024-02-29','2026-03-29','2026-10-25','0001-01-01','9999-12-31'])expect(dayToISO(isoToDay(value))).toBe(value);
    expect(()=>isoToDay('2025-02-29')).toThrow();expect(()=>isoToDay('2026-13-01')).toThrow();
    expect(localDay(new Date(2026,9,27,23,59))).toBe(isoToDay('2026-10-27'));
    const task=newTask('A'),today=isoToDay('2026-10-27')!;
    expect(dueOf(task,today)).toBe('NONE');expect(dueOf({...task,dueDay:today},today)).toBe('TODAY');expect(dueOf({...task,dueDay:today-1},today)).toBe('PAST');expect(dueOf({...task,dueDay:today+1},today)).toBe('FUTURE');
  });
  it('removes the time with its date',()=>{
    const task={...newTask('A'),dueDay:100,dueMinute:500};
    const next=reduce({...emptyState(),tasks:[task]},{type:'patch',id:task.id,patch:{dueDay:null}});
    expect(next.tasks[0].dueMinute).toBeNull();
  });
  it('roundtrips all Android fields and additional PWA settings',()=>{
    let state=emptyState();state=reduce(state,{type:'list',list:{id:'list',name:'Privat',color:4}});
    state=reduce(state,{type:'add',task:{...newTask('Text <script> & ÄÖÜ'),notes:'Lange Notiz\nhttps://example.org',priority:0,dueDay:isoToDay('2026-10-27'),dueMinute:1439,listId:'list',completedAt:123,subtasks:[{id:'s1',title:'Erster',done:true},{id:'s2',title:'Zweiter',done:false}],position:42}});
    state.settings={theme:'Dunkel',sort:'Priorität',collapsed:['PAST']};
    const backup=decodeBackup(encodeBackup(state));expect(backup.tasks).toEqual(state.tasks);expect(backup.lists).toEqual(state.lists);expect(backup.pwaSettings).toEqual(state.settings);
    // Android Gson omits optional nulls and has no settings field.
    const android:Backup={format:'freiraum',version:1,exportedAt:123,tasks:state.tasks,lists:state.lists};
    const json=JSON.stringify(android,(_k,v)=>v===null?undefined:v);
    expect(decodeBackup(json).tasks).toEqual(state.tasks);
  });
  it('keeps tasks when renaming or deleting a list',()=>{
    let state=reduce(emptyState(),{type:'list',list:{id:'l',name:'Alt',color:0}});
    state=reduce(state,{type:'add',task:newTask('A','l')});
    state=reduce(state,{type:'list',list:{id:'l',name:'Neu',color:1}});expect(state.tasks[0].listId).toBe('l');
    state=reduce(state,{type:'deleteList',id:'l'});expect(state.tasks[0].listId).toBeNull();expect(state.tasks).toHaveLength(1);
  });
  it('edits, completes and moves subtasks independently of parent completion',()=>{
    const task=newTask('A');let state={...emptyState(),tasks:[task]};
    state=reduce(state,{type:'subAdd',id:task.id,title:'Erster'});state=reduce(state,{type:'subAdd',id:task.id,title:'Zweiter'});
    const sub=state.tasks[0].subtasks[0];state=reduce(state,{type:'subPatch',id:task.id,subId:sub.id,patch:{title:'Bearbeitet',done:true}});
    state=reduce(state,{type:'subMove',id:task.id,subId:sub.id,by:1});expect(state.tasks[0].subtasks[1].title).toBe('Bearbeitet');expect(state.tasks[0].subtasks[1].done).toBe(true);
    state=reduce(state,{type:'patch',id:task.id,patch:{completedAt:123}});expect(state.tasks[0].subtasks[0].done).toBe(false);
    state=reduce(state,{type:'subDelete',id:task.id,subId:sub.id});expect(state.tasks[0].subtasks).toHaveLength(1);
  });
  it('duplicates with reset status and imports with preserved status and new IDs',()=>{
    const task={...newTask('A'),completedAt:123,subtasks:[{id:'s',title:'S',done:true}]};let state:State={...emptyState(),tasks:[task]};
    state=reduce(state,{type:'duplicate',id:task.id});expect(state.tasks[1].completedAt).toBeNull();expect(state.tasks[1].subtasks[0].done).toBe(false);
    const backup=decodeBackup(encodeBackup({...emptyState(),tasks:[task]}));
    state=reduce(state,{type:'import',backup,settings:true});expect(state.tasks[2].completedAt).toBe(123);expect(state.tasks[2].subtasks[0].done).toBe(true);expect(state.tasks[2].id).not.toBe(task.id);
  });
  it('searches notes, combines filters and orders undated tasks last',()=>{
    const a={...newTask('A'),notes:'Bibliothek',priority:0,position:0},b={...newTask('B'),dueDay:100,listId:'l',position:1};
    expect(selectTasks([a,b],'BIBLIO',0,'inbox','NONE','Priorität',100)).toEqual([a]);expect(selectTasks([a,b],'',null,null,null,'Fälligkeit',100)).toEqual([b,a]);
    const next=reduce({...emptyState(),tasks:[a,{...b,listId:null}]},{type:'swap',first:a.id,second:b.id});expect(selectTasks(next.tasks).map(t=>t.id)).toEqual([b.id,a.id]);
  });
  it('rejects malformed data, invalid types and broken references before any import',()=>{
    const valid=JSON.parse(encodeBackup({...emptyState(),tasks:[newTask('A')]}));
    const malformed=[{}, {...valid,version:2},{...valid,tasks:[{...valid.tasks[0],priority:4}]},{...valid,tasks:[{...valid.tasks[0],notes:null}]},{...valid,tasks:[{...valid.tasks[0],dueMinute:60,dueDay:null}]},{...valid,tasks:[{...valid.tasks[0],listId:'missing'}]},{...valid,tasks:[valid.tasks[0],valid.tasks[0]]},{...valid,tasks:[{...valid.tasks[0],createdAt:1.1}]},{...valid,pwaSettings:{theme:'invalid'}}];
    for(const value of malformed)expect(()=>decodeBackup(JSON.stringify(value))).toThrow();
    expect(()=>decodeBackup('not JSON')).toThrow();
  });
  it('preserves extreme Android calendar days without losing their numeric value',()=>{
    const task={...newTask('Fern'),dueDay:365241780471};const decoded=decodeBackup(encodeBackup({...emptyState(),tasks:[task]}));expect(decoded.tasks[0].dueDay).toBe(task.dueDay);expect(dayToISO(task.dueDay)).toBe('');
  });
});
