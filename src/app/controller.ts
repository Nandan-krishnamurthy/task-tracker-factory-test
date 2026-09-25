import { createTask, type NewTask, type Task } from '../domain/task';
import { saveTasks } from '../storage/taskStore';

export interface AppState {
  readonly tasks: readonly Task[];
  readonly validationMessage: string | null;
  /** Set while the last save failed: the tasks are shown but may not be stored. */
  readonly storageWarning?: string;
}

export const SAVE_WARNING = 'Your changes may not be saved: this browser could not store them.';

export interface ControllerDeps {
  /** The tasks loaded at start, in creation order. */
  tasks: readonly Task[];
  storage: Pick<Storage, 'setItem'>;
  render: (state: AppState) => void;
  now: () => Date;
  newId: () => string;
}

export interface Controller {
  /** Adds a task; returns false (and sets the validation message) if the input is invalid. */
  addTask(title: string, details?: Omit<NewTask, 'title'>): boolean;
  state(): AppState;
}

export function createController({ tasks, storage, render, now, newId }: ControllerDeps): Controller {
  let current: AppState = { tasks, validationMessage: null };

  // The single save path: every change to the tasks is saved before rendering (REQ-013).
  // A failed save keeps the change in memory and shows a warning until a save succeeds.
  function update(next: AppState): void {
    if (next.tasks !== current.tasks) {
      const saved = saveTasks(storage, next.tasks);
      next = { ...next, storageWarning: saved.ok ? undefined : SAVE_WARNING };
    }
    current = next;
    render(current);
  }

  return {
    addTask(title, details = {}) {
      const result = createTask(current.tasks, { ...details, title }, now(), newId);
      if (!result.ok) {
        update({ ...current, validationMessage: result.error });
        return false;
      }
      update({ tasks: result.tasks, validationMessage: null });
      return true;
    },
    state: () => current,
  };
}
