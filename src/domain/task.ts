export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  dueDate: string | null; // calendar date YYYY-MM-DD
  priority: Priority | null;
  completed: boolean;
  createdAt: string; // ISO 8601 timestamp
}

export const TITLE_REQUIRED = 'A title is required.';

export type TitleResult = { ok: true; title: string } | { ok: false; error: string };

export function validateTitle(raw: string): TitleResult {
  const title = raw.trim();
  return title.length > 0 ? { ok: true, title } : { ok: false, error: TITLE_REQUIRED };
}

export interface NewTask {
  title: string;
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
  const task: Task = {
    id: newId(),
    title: title.title,
    dueDate: null,
    priority: null,
    completed: false,
    createdAt: now.toISOString(),
  };
  return { ok: true, tasks: [...tasks, task], task };
}
