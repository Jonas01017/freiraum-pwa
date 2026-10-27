import 'fake-indexeddb/auto';
import { it,expect } from 'vitest';
import { Store } from '../src/storage';
import { newTask,decodeBackup } from '../src/model';
it('persists after closing and reopening IndexedDB, including settings and subtasks',async()=>{
  const name=`test-${crypto.randomUUID()}`;const first=new Store(name);await first.open();
  const task=newTask('Persistiert');await first.dispatch({type:'add',task});await first.dispatch({type:'subAdd',id:task.id,title:'Unteraufgabe'});await first.dispatch({type:'settings',patch:{theme:'Dunkel'}});first.close();
  const second=new Store(name);try{await second.open();expect(second.snapshot()!.tasks[0].title).toBe('Persistiert');expect(second.snapshot()!.tasks[0].subtasks).toHaveLength(1);expect(second.snapshot()!.settings.theme).toBe('Dunkel');}finally{second.close();}
});
it('serializes edits from two instances without overwriting unrelated fields',async()=>{
  const name=`test-${crypto.randomUUID()}`,a=new Store(name),b=new Store(name);await a.open();await b.open();
  try{const task=newTask('A');await a.dispatch({type:'add',task});await Promise.all([a.dispatch({type:'patch',id:task.id,patch:{notes:'Notiz'}}),b.dispatch({type:'patch',id:task.id,patch:{priority:0}})]);await a.refresh();expect(a.snapshot()!.tasks[0].notes).toBe('Notiz');expect(a.snapshot()!.tasks[0].priority).toBe(0);}finally{a.close();b.close();}
});
it('rolls back failed writes and imports as additional copies in one transaction',async()=>{
  const store=new Store(`test-${crypto.randomUUID()}`);await store.open();
  try{const task=newTask('Original');await store.dispatch({type:'add',task});const backup=decodeBackup(await store.export());await store.dispatch({type:'import',backup,settings:false});expect(store.snapshot()!.tasks).toHaveLength(2);await expect(store.dispatch({type:'patch',id:task.id,patch:{title:''}})).rejects.toThrow();await store.refresh();expect(store.snapshot()!.tasks.find(t=>t.id===task.id)!.title).toBe('Original');await store.dispatch({type:'patch',id:task.id,patch:{notes:'Nach Fehler'}});expect(store.snapshot()!.tasks.find(t=>t.id===task.id)!.notes).toBe('Nach Fehler');}finally{store.close();}
});
