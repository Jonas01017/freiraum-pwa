export const priorities = ['Dringend', 'Hoch', 'Normal', 'Niedrig'] as const;
export const listColors = ['#5B5CE2', '#427E71', '#996E9E', '#AD7548', '#4E8299', '#808594'];
export type Theme = 'System' | 'Hell' | 'Dunkel';
export type Sort = 'Manuell' | 'Fälligkeit' | 'Priorität' | 'Neueste';
export type Due = 'PAST' | 'TODAY' | 'FUTURE' | 'NONE';
export interface Subtask { id: string; title: string; done: boolean }
export interface TaskList { id: string; name: string; color: number }
export interface Task {
  id: string; title: string; notes: string; priority: number;
  dueDay: number | null; dueMinute: number | null; listId: string | null;
  subtasks: Subtask[]; createdAt: number; completedAt: number | null; position: number;
}
export interface Settings { theme: Theme; sort: Sort; collapsed: string[] }
export interface State { tasks: Task[]; lists: TaskList[]; settings: Settings }
export interface Backup {
  format: 'freiraum'; version: 1; exportedAt: number;
  tasks: Task[]; lists: TaskList[]; pwaSettings?: Settings;
}
export const defaults: Settings = { theme: 'System', sort: 'Manuell', collapsed: [] };
export const emptyState = (): State => ({ tasks: [], lists: [], settings: { ...defaults, collapsed: [] } });
export const id = () => crypto.randomUUID();
export function newTask(title: string, listId: string | null = null): Task {
  return { id: id(), title: title.trim(), notes: '', priority: 2, dueDay: null, dueMinute: null, listId,
    subtasks: [], createdAt: Date.now(), completedAt: null, position: Date.now() };
}
export function localDay(date = new Date()): number {
  return isoToDay(`${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`)!;
}
export function isoToDay(value: string): number | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) throw new Error('Bitte ein gültiges Datum wählen.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) throw new Error('Ungültiger Kalendertag.');
  return date.getTime() / 86400000;
}
export function dayToISO(day: number | null): string {
  if (day === null || day < -719162 || day > 2932896) return '';
  return new Date(day * 86400000).toISOString().slice(0,10);
}
export function dayLabel(day: number, today = localDay()): string {
  if (day === today) return 'Heute';
  if (day === today+1) return 'Morgen';
  if (!dayToISO(day)) return `Kalendertag ${day}`;
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(day * 86400000));
}
export function dueOf(task: Task, today = localDay()): Due {
  return task.dueDay === null ? 'NONE' : task.dueDay < today ? 'PAST' : task.dueDay === today ? 'TODAY' : 'FUTURE';
}
export const timeLabel = (minute: number) => `${Math.floor(minute/60).toString().padStart(2,'0')}:${(minute%60).toString().padStart(2,'0')}`;
export function selectTasks(tasks: Task[], query = '', priority: number | null = null, list: string | null = null, due: Due | null = null, sort: Sort = 'Manuell', today = localDay()): Task[] {
  const q = query.trim().toLocaleLowerCase('de-DE');
  const result = tasks.filter(t => (!q || `${t.title}\n${t.notes}`.toLocaleLowerCase('de-DE').includes(q)) &&
    (priority === null || t.priority === priority) && (list === null || (list === 'inbox' ? t.listId === null : t.listId === list)) &&
    (due === null || dueOf(t,today) === due));
  return result.sort((a,b) => {
    if (sort === 'Fälligkeit') return (a.dueDay ?? Infinity) - (b.dueDay ?? Infinity) || (a.dueMinute ?? 1440) - (b.dueMinute ?? 1440) || a.position-b.position || a.id.localeCompare(b.id);
    if (sort === 'Priorität') return a.priority-b.priority || a.position-b.position || a.id.localeCompare(b.id);
    if (sort === 'Neueste') return b.createdAt-a.createdAt || a.id.localeCompare(b.id);
    return a.position-b.position || a.id.localeCompare(b.id);
  });
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ein Datenobjekt fehlt oder ist ungültig.');
  return value as Record<string, unknown>;
}
function string(value: unknown, label: string, nonblank = false): string {
  if (typeof value !== 'string' || (nonblank && !value.trim())) throw new Error(`Ungültiges Feld: ${label}.`);
  return value;
}
function integer(value: unknown, label: string, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new Error(`Ungültige Zahl: ${label}.`);
  return value as number;
}
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('Eine Liste fehlt.'); return value }
function unique(values: string[]) { if (new Set(values).size !== values.length) throw new Error('Doppelte IDs in der Sicherung.'); }
export function parseSettings(value: unknown): Settings {
  const s = record(value);
  if (!['System','Hell','Dunkel'].includes(s.theme as string) || !['Manuell','Fälligkeit','Priorität','Neueste'].includes(s.sort as string)) throw new Error('Ungültige Einstellungen.');
  const collapsed = array(s.collapsed).map(v => string(v, 'Abschnitt'));
  if (collapsed.some(v => !['PAST','TODAY','FUTURE','NONE'].includes(v))) throw new Error('Unbekannter Abschnitt.');
  return { theme: s.theme as Theme, sort: s.sort as Sort, collapsed: [...new Set(collapsed)] };
}
export function decodeBackup(text: string): Backup {
  if (new TextEncoder().encode(text).length > 10_000_000) throw new Error('Die Sicherung ist zu groß (maximal 10 MB).');
  let root: Record<string, unknown>;
  try { root = record(JSON.parse(text)); } catch { throw new Error('Die Datei enthält keine gültige JSON-Sicherung.'); }
  if (root.format !== 'freiraum' || root.version !== 1) throw new Error('Unbekanntes Sicherungsformat oder nicht unterstützte Version.');
  const lists = array(root.lists).map(v => { const l = record(v); return { id: string(l.id, 'Listen-ID', true), name: string(l.name, 'Listenname', true), color: integer(l.color, 'Listenfarbe', 0, 5) } });
  unique(lists.map(l => l.id));
  const listIds = new Set(lists.map(l => l.id));
  const tasks: Task[] = array(root.tasks).map(v => {
    const t = record(v);
    const dueDay = t.dueDay == null ? null : integer(t.dueDay, 'Kalendertag', -365243219162, 365241780471);
    const dueMinute = t.dueMinute == null ? null : integer(t.dueMinute, 'Uhrzeit', 0, 1439);
    if (dueMinute !== null && dueDay === null) throw new Error('Eine Uhrzeit benötigt ein Datum.');
    const listId = t.listId == null ? null : string(t.listId, 'Listenreferenz', true);
    if (listId !== null && !listIds.has(listId)) throw new Error('Eine verknüpfte Liste fehlt.');
    const subtasks = array(t.subtasks).map(v => {
      const s = record(v); if (typeof s.done !== 'boolean') throw new Error('Ungültiger Unteraufgabenstatus.');
      return { id: string(s.id, 'Unteraufgaben-ID', true), title: string(s.title, 'Unteraufgabentitel', true), done: s.done };
    });
    unique(subtasks.map(s => s.id));
    return { id: string(t.id, 'Aufgaben-ID', true), title: string(t.title, 'Titel', true), notes: string(t.notes, 'Notizen'),
      priority: integer(t.priority, 'Priorität', 0, 3), dueDay, dueMinute, listId, subtasks,
      createdAt: integer(t.createdAt, 'Erstellungszeit'), completedAt: t.completedAt == null ? null : integer(t.completedAt, 'Abschlusszeit'), position: integer(t.position, 'Position') };
  });
  unique(tasks.map(t => t.id));
  return { format: 'freiraum', version: 1, exportedAt: root.exportedAt == null ? Date.now() : integer(root.exportedAt, 'Exportzeit'), tasks, lists,
    ...(root.pwaSettings === undefined ? {} : { pwaSettings: parseSettings(root.pwaSettings) }) };
}
export function encodeBackup(state: State): string {
  return JSON.stringify({ format: 'freiraum', version: 1, exportedAt: Date.now(), tasks: state.tasks, lists: state.lists, pwaSettings: state.settings }, null, 2);
}
export type Action =
  | {type: 'add'; task: Task}
  | {type: 'patch'; id: string; patch: Partial<Omit<Task, 'id' | 'subtasks'>>}
  | {type: 'delete'; id: string}
  | {type: 'restore'; task: Task}
  | {type: 'duplicate'; id: string}
  | {type: 'swap'; first: string; second: string}
  | {type: 'list'; list: TaskList}
  | {type: 'deleteList'; id: string}
  | {type: 'subAdd'; id: string; title: string}
  | {type: 'subPatch'; id: string; subId: string; patch: Partial<Pick<Subtask, 'title'|'done'>>}
  | {type: 'subDelete'; id: string; subId: string}
  | {type: 'subMove'; id: string; subId: string; by: number}
  | {type: 'settings'; patch: Partial<Settings>}
  | {type: 'import'; backup: Backup; settings: boolean};

export function reduce(state: State, action: Action): State {
  let tasks = state.tasks.map(t => ({ ...t, subtasks: t.subtasks.map(s => ({...s})) }));
  let lists = state.lists.map(l => ({...l}));
  let settings = { ...state.settings, collapsed: [...state.settings.collapsed] };
  const task = 'id' in action ? tasks.find(t => t.id === action.id) : undefined;
  switch (action.type) {
    case 'add': if (tasks.some(t => t.id === action.task.id)) throw new Error('Aufgabe existiert bereits.'); tasks.push(action.task); break;
    case 'patch': if (task) { Object.assign(task, action.patch); if (task.dueDay === null) task.dueMinute = null; } break;
    case 'delete': tasks = tasks.filter(t => t.id !== action.id); break;
    case 'restore': if (!tasks.some(t => t.id === action.task.id)) tasks.push({...action.task, listId: lists.some(l => l.id === action.task.listId) ? action.task.listId : null}); break;
    case 'duplicate': if (task) tasks.push({...task, id: id(), title: `${task.title} (Kopie)`, completedAt: null, createdAt: Date.now(), position: Date.now(), subtasks: task.subtasks.map(s => ({...s, id: id(), done: false}))}); break;
    case 'swap': {
      tasks.sort((a,b) => a.position-b.position || a.id.localeCompare(b.id));
      const a = tasks.findIndex(t => t.id === action.first), b = tasks.findIndex(t => t.id === action.second);
      if (a >= 0 && b >= 0) { [tasks[a], tasks[b]] = [tasks[b], tasks[a]]; tasks.forEach((t,i) => t.position = i); } break;
    }
    case 'list': lists = [...lists.filter(l => l.id !== action.list.id), action.list]; break;
    case 'deleteList': lists = lists.filter(l => l.id !== action.id); tasks.forEach(t => { if (t.listId === action.id) t.listId = null }); break;
    case 'subAdd': if (task) task.subtasks.push({id: id(), title: action.title.trim(), done: false}); break;
    case 'subPatch': { const sub = task?.subtasks.find(s => s.id === action.subId); if (sub) Object.assign(sub, action.patch); break; }
    case 'subDelete': if (task) task.subtasks = task.subtasks.filter(s => s.id !== action.subId); break;
    case 'subMove': if (task) { const a = task.subtasks.findIndex(s => s.id === action.subId), b = a+action.by; if (a >= 0 && b >= 0 && b < task.subtasks.length) [task.subtasks[a],task.subtasks[b]] = [task.subtasks[b],task.subtasks[a]]; } break;
    case 'settings': settings = {...settings, ...action.patch}; break;
    case 'import': {
      const mapping = new Map(action.backup.lists.map(l => [l.id, id()]));
      lists.push(...action.backup.lists.map(l => ({...l, id: mapping.get(l.id)!})));
      tasks.push(...action.backup.tasks.map(t => ({...t, id: id(), listId: t.listId === null ? null : mapping.get(t.listId)!, subtasks: t.subtasks.map(s => ({...s,id: id()}))})));
      if (action.settings && action.backup.pwaSettings) settings = action.backup.pwaSettings;
    }
  }
  // All writes pass the same validator as external imports before a transaction commits.
  const checked = decodeBackup(encodeBackup({tasks,lists,settings}));
  return {tasks: checked.tasks, lists: checked.lists, settings: checked.pwaSettings!};
}
