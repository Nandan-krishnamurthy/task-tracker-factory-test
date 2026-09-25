import { createTask, type Task } from '../domain/task';

export interface AppState {
  readonly tasks: readonly Task[];
  readonly validationMessage: string | null;
}

export interface ControllerDeps {
  render: (state: AppState) => void;
  now: () => Date;
  newId: () => string;
}

export interface Controller {
  /** Adds a task; returns false (and sets the validation message) if the title is invalid. */
  addTask(title: string): boolean;
  state(): AppState;
}

export function createController({ render, now, newId }: ControllerDeps): Controller {
  let current: AppState = { tasks: [], validationMessage: null };

  function update(next: AppState): void {
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
