import { createTask, type Task } from '../domain/task';
import { saveTasks } from '../storage/taskStore';

export interface AppState {
  readonly tasks: readonly Task[];
  readonly validationMessage: string | null;
}

export interface ControllerDeps {
  /** The tasks loaded at start, in creation order. */
  tasks: readonly Task[];
  storage: Pick<Storage, 'setItem'>;
  render: (state: AppState) => void;
  now: () => Date;
  newId: () => string;
}

export interface Controller {
  /** Adds a task; returns false (and sets the validation message) if the title is invalid. */
  addTask(title: string): boolean;
  state(): AppState;
}

export function createController({ tasks, storage, render, now, newId }: ControllerDeps): Controller {
  let current: AppState = { tasks, validationMessage: null };

  // The single save path: every change to the tasks is saved before rendering (REQ-013).
  function update(next: AppState): void {
    if (next.tasks !== current.tasks) {
      saveTasks(storage, next.tasks);
    }
    current = next;
    render(current);
  }

  return {
    addTask(title) {
      const result = createTask(current.tasks, { title }, now(), newId);
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
