import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { type State, type Task, type TaskList, type Settings, type Action, defaults, parseSettings, reduce, decodeBackup, encodeBackup } from './model';
interface Database extends DBSchema {
  tasks: {key: string; value: Task};
  lists: {key: string; value: TaskList};
  settings: {key: string; value: Settings};
}
export class Store {
  private db?: IDBPDatabase<Database>;
  private state: State | null = null;
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private channel?: BroadcastChannel;
  constructor(private name = 'freiraum-pwa') {}
  snapshot = () => this.state;
  subscribe = (callback: () => void) => { this.listeners.add(callback); return () => this.listeners.delete(callback) };
  private publish(state: State) { this.state = state; this.listeners.forEach(fn => fn()); }
  async open() {
    if (this.db) return;
    this.db = await openDB<Database>(this.name, 1, {
      upgrade(db) { db.createObjectStore('tasks',{keyPath:'id'}); db.createObjectStore('lists',{keyPath:'id'}); db.createObjectStore('settings'); },
      blocking: () => { this.db?.close(); this.db = undefined; window.dispatchEvent(new CustomEvent('storage-blocked')); },
      terminated: () => { window.dispatchEvent(new CustomEvent('storage-blocked')); },
    });
    await this.refresh();
    if (typeof BroadcastChannel !== 'undefined') { this.channel = new BroadcastChannel(this.name); this.channel.onmessage = () => { void this.refresh().catch(() => window.dispatchEvent(new CustomEvent('storage-blocked'))) }; }
  }
  async refresh() {
    if (!this.db) throw new Error('Die Datenbank ist nicht geöffnet. Bitte die App neu laden.');
    const tx = this.db.transaction(['tasks','lists','settings'],'readonly');
    const [tasks, lists, raw] = await Promise.all([tx.objectStore('tasks').getAll(),tx.objectStore('lists').getAll(),tx.objectStore('settings').get('preferences')]);
    await tx.done;
    const settings = raw ? parseSettings(raw) : {...defaults, collapsed: []};
    const checked = decodeBackup(encodeBackup({tasks, lists, settings}));
    this.publish({tasks: checked.tasks, lists: checked.lists, settings});
  }
  dispatch(action: Action): Promise<void> {
    const operation = this.queue.then(async () => {
      if (!this.db) throw new Error('Die Datenbank ist nicht verfügbar. Bitte neu laden.');
      const tx = this.db.transaction(['tasks','lists','settings'],'readwrite', {durability:'strict'});
      try {
        const [tasks, lists, raw] = await Promise.all([tx.objectStore('tasks').getAll(),tx.objectStore('lists').getAll(),tx.objectStore('settings').get('preferences')]);
        const next = reduce({tasks,lists,settings:raw ?? {...defaults,collapsed:[]}}, action);
        await Promise.all([tx.objectStore('tasks').clear(), tx.objectStore('lists').clear()]);
        await Promise.all([...next.tasks.map(t => tx.objectStore('tasks').put(t)), ...next.lists.map(l => tx.objectStore('lists').put(l)), tx.objectStore('settings').put(next.settings,'preferences')]);
        await tx.done;
        this.publish(next);
        this.channel?.postMessage('changed');
      } catch (error) { try { tx.abort(); } catch { /* Already aborted. */ } await tx.done.catch(() => {}); throw error; }
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  async idle() { await this.queue; }
  async export() { await this.idle(); await this.refresh(); return encodeBackup(this.state!); }
  close() { this.channel?.close(); this.db?.close(); this.db = undefined; }
}
export const store = new Store();
