import type { Priority, Task } from '../domain/task';

/** The one localStorage key the app uses (03-architecture.md §Data model). */
export const STORAGE_KEY = 'task-tracker:v1';

export interface StoredData {
  version: 1;
  tasks: Task[];
}

export type SaveResult = { ok: true } | { ok: false; error: string };

const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high'];
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function encodeTasks(tasks: readonly Task[]): string {
  const data: StoredData = { version: 1, tasks: [...tasks] };
  return JSON.stringify(data);
}

/**
 * Decodes the stored value, all or nothing (03-architecture.md decision 5): any
 * unparsable or invalid data throws, so a partly valid list is never shown.
 */
export function decodeTasks(raw: string): Task[] {
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data) || data.version !== 1) {
    throw new Error('unsupported stored format');
  }
  if (!Array.isArray(data.tasks)) {
    throw new Error('stored tasks are not a list');
  }
  return data.tasks.map((task, index) => {
    if (!isTask(task)) {
      throw new Error(`stored task ${index} is invalid`);
    }
    return task;
  });
}

/**
 * Reads the saved tasks, in creation order. Nothing saved yet (first visit) gives an
 * empty list. Corrupted data gives an empty list and the reason; it is left in place
 * until the next successful save (REQ-020). Never throws.
 */
export function loadTasks(storage: Pick<Storage, 'getItem'>): { tasks: Task[]; problem?: string } {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { tasks: raw === null ? [] : decodeTasks(raw) };
  } catch (error) {
    return { tasks: [], problem: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Writes the whole task list synchronously, so it is saved before the action returns
 * (REQ-013). A failed write (quota exceeded, storage disabled) is reported, not thrown.
 */
export function saveTasks(storage: Pick<Storage, 'setItem'>, tasks: readonly Task[]): SaveResult {
  try {
    storage.setItem(STORAGE_KEY, encodeTasks(tasks));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTask(value: unknown): value is Task {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.title === 'string' &&
    value.title.length > 0 &&
    value.title === value.title.trim() &&
    (value.dueDate === null || isCalendarDate(value.dueDate)) &&
    (value.priority === null || PRIORITIES.includes(value.priority as Priority)) &&
    typeof value.completed === 'boolean' &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt))
  );
}

/** A real calendar day as `YYYY-MM-DD` (so `2026-02-30` is rejected). */
function isCalendarDate(value: unknown): boolean {
  const match = typeof value === 'string' ? DATE.exec(value) : null;
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
