import type { Task } from './task';

/**
 * The one list order (REQ-012): due date ascending, tasks without a due date last,
 * ties in creation order. `tasks` is in creation order, and the sort is stable, so ties
 * keep it. Priority never affects the order. Never mutates `tasks`.
 */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => compareDueDates(a.dueDate, b.dueDate));
}

/** ISO `YYYY-MM-DD` strings sort correctly as plain strings; `null` sorts last. */
function compareDueDates(a: string | null, b: string | null): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a < b ? -1 : 1;
}
