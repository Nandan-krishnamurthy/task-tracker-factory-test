import type { Priority, Task } from './task';

export type View = 'active' | 'completed';

/** A priority filter choice (REQ-027): every task, one priority, or the tasks with none. */
export type PriorityFilter = 'all' | Priority | 'none';

/** The priority filter choices, in the order they are shown (REQ-027). */
export const PRIORITY_FILTERS: readonly PriorityFilter[] = ['all', 'high', 'medium', 'low', 'none'];

/** The tasks of a view (REQ-007): Active lists the tasks not done, Completed the done ones. */
export function tasksForView(tasks: readonly Task[], view: View): Task[] {
  const completed = view === 'completed';
  return tasks.filter((task) => task.completed === completed);
}

/**
 * The tasks that match a priority filter (REQ-028), in their input order: "all" keeps every
 * task, a priority keeps the tasks with that priority, and "none" the tasks without one.
 */
export function tasksForPriority(tasks: readonly Task[], filter: PriorityFilter): Task[] {
  if (filter === 'all') {
    return [...tasks];
  }
  const priority = filter === 'none' ? null : filter;
  return tasks.filter((task) => task.priority === priority);
}
