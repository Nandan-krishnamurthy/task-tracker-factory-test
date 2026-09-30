import type { Task } from './task';

export type View = 'active' | 'completed';

/** The tasks of a view (REQ-007): Active lists the tasks not done, Completed the done ones. */
export function tasksForView(tasks: readonly Task[], view: View): Task[] {
  const completed = view === 'completed';
  return tasks.filter((task) => task.completed === completed);
}
