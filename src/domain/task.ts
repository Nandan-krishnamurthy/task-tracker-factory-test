export type Priority = 'low' | 'medium' | 'high';

export const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high'];

export interface Task {
  id: string;
  title: string;
  dueDate: string | null; // calendar date YYYY-MM-DD
  priority: Priority | null;
  completed: boolean;
  createdAt: string; // ISO 8601 timestamp
}

export const TITLE_REQUIRED = 'A title is required.';
export const INVALID_DUE_DATE = 'Enter a valid due date.';
export const INVALID_PRIORITY = 'Choose Low, Medium or High, or no priority.';

export type TitleResult = { ok: true; title: string } | { ok: false; error: string };

export function validateTitle(raw: string): TitleResult {
  const title = raw.trim();
  return title.length > 0 ? { ok: true, title } : { ok: false, error: TITLE_REQUIRED };
}

export interface NewTask {
  title: string;
  dueDate?: string | null; // YYYY-MM-DD; empty or null means none
  priority?: string | null; // 'low' | 'medium' | 'high'; empty or null means none
}

export function isPriority(value: unknown): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

/** A real calendar day as `YYYY-MM-DD` (so `2026-02-30` is rejected). */
export function isCalendarDate(value: unknown): value is string {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export type CreateResult =
  | { ok: true; tasks: Task[]; task: Task }
  | { ok: false; error: string };

/** Appends a new task, keeping the list in creation order. Never mutates `tasks`. */
export function createTask(
  tasks: readonly Task[],
  input: NewTask,
  now: Date,
  newId: () => string,
): CreateResult {
  const title = validateTitle(input.title);
  if (!title.ok) {
    return title;
  }
  const dueDate = input.dueDate || null;
  if (dueDate !== null && !isCalendarDate(dueDate)) {
    return { ok: false, error: INVALID_DUE_DATE };
  }
  const priority = input.priority || null;
  if (priority !== null && !isPriority(priority)) {
    return { ok: false, error: INVALID_PRIORITY };
  }
  const task: Task = {
    id: newId(),
    title: title.title,
    dueDate,
    priority,
    completed: false,
    createdAt: now.toISOString(),
  };
  return { ok: true, tasks: [...tasks, task], task };
}
