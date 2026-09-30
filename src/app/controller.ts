import type { View } from '../domain/filter';
import { createTask, setCompleted, updateTask, type NewTask, type Task } from '../domain/task';
import { saveTasks } from '../storage/taskStore';

export interface AppState {
  readonly tasks: readonly Task[];
  readonly validationMessage: string | null;
  /** The view shown (REQ-007). Absent means Active. */
  readonly view?: View;
  /** The task being edited in its row, and the message for a rejected title (REQ-008). */
  readonly editing?: { readonly id: string; readonly error: string | null };
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
  /** Marks a task done or not done (REQ-005, REQ-006). */
  toggleTask(id: string, completed: boolean): void;
  /** Shows the Active or the Completed tasks (REQ-007). */
  setView(view: View): void;
  /** Opens the inline edit form of a task. */
  startEdit(id: string): void;
  /** Saves a new title; returns false (keeping the old title and the form open) if it is invalid. */
  editTask(id: string, title: string): boolean;
  /** Closes the edit form without changing the task. */
  cancelEdit(): void;
  state(): AppState;
}

export function createController({ tasks, storage, render, now, newId }: ControllerDeps): Controller {
  // The app always opens on Active; the view is not stored.
  let current: AppState = { tasks, validationMessage: null, view: 'active' };

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
      // Switch to Active, so the new task is visible.
      update({ ...current, tasks: result.tasks, validationMessage: null, view: 'active' });
      return true;
    },
    toggleTask(id, completed) {
      update({ ...current, tasks: setCompleted(current.tasks, id, completed) });
    },
    setView(view) {
      update({ ...current, view });
    },
    startEdit(id) {
      update({ ...current, editing: { id, error: null } });
    },
    editTask(id, title) {
      const result = updateTask(current.tasks, id, { title });
      if (!result.ok) {
        update({ ...current, editing: { id, error: result.error } });
        return false;
      }
      update({ ...current, tasks: result.tasks, editing: undefined });
      return true;
    },
    cancelEdit() {
      update({ ...current, editing: undefined });
    },
    state: () => current,
  };
}
