import type { Task } from '../domain/task';

/** The one localStorage key the app uses (03-architecture.md §Data model). */
export const STORAGE_KEY = 'task-tracker:v1';

export interface StoredData {
  version: 1;
  tasks: Task[];
}

export function encodeTasks(tasks: readonly Task[]): string {
  const data: StoredData = { version: 1, tasks: [...tasks] };
  return JSON.stringify(data);
}

export function decodeTasks(raw: string): Task[] {
  const data = JSON.parse(raw) as StoredData;
  return data.tasks;
}

/** Reads the saved tasks, in creation order. Nothing saved yet (first visit) gives an empty list. */
export function loadTasks(storage: Pick<Storage, 'getItem'>): { tasks: Task[] } {
  const raw = storage.getItem(STORAGE_KEY);
  return { tasks: raw === null ? [] : decodeTasks(raw) };
}

/** Writes the whole task list synchronously, so it is saved before the action returns (REQ-013). */
export function saveTasks(storage: Pick<Storage, 'setItem'>, tasks: readonly Task[]): void {
  storage.setItem(STORAGE_KEY, encodeTasks(tasks));
}
