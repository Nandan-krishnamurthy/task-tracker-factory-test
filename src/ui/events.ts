import type { Controller } from '../app/controller';
import { ensureLayout } from './render';

export function bindEvents(root: HTMLElement, controller: Controller): void {
  const { form, input, dueDate, priority, views, list } = ensureLayout(root);
  // A native form submit covers both Enter in the field and the Add button.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const details = { dueDate: dueDate.value, priority: priority.value };
    if (controller.addTask(input.value, details)) {
      input.value = '';
      dueDate.value = '';
      priority.value = '';
    }
    input.focus();
  });
  // The rows are rebuilt on every render, so their checkboxes are handled on the list.
  list.addEventListener('change', (event) => {
    const box = event.target;
    if (box instanceof HTMLInputElement && box.classList.contains('task-done') && box.dataset.id) {
      controller.toggleTask(box.dataset.id, box.checked);
    }
  });
  views.active.addEventListener('click', () => controller.setView('active'));
  views.completed.addEventListener('click', () => controller.setView('completed'));

  // Inline editing (architecture decision 8). Rendering rebuilds the rows, so focus is set afterwards.
  const focusEdit = (id: string) =>
    [...list.querySelectorAll<HTMLElement>('.task-edit')].find((b) => b.dataset.id === id)?.focus();
  const focusField = (id: string) => document.getElementById(`edit-title-${id}`)?.focus();
  const cancel = (id: string) => {
    controller.cancelEdit();
    focusEdit(id);
  };
  list.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLButtonElement ? event.target : null;
    const id = button?.closest<HTMLElement>('[data-id]')?.dataset.id;
    if (id && button?.classList.contains('task-edit')) {
      controller.startEdit(id);
      focusField(id);
    } else if (id && button?.classList.contains('task-edit-cancel')) {
      cancel(id);
    }
  });
  // Only the rows' edit forms are inside the list; the add-task form is not.
  list.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const id = form.dataset.id!;
    const title = form.querySelector<HTMLInputElement>('.task-edit-title')!.value;
    (controller.editTask(id, title) ? focusEdit : focusField)(id);
  });
  list.addEventListener('keydown', (event) => {
    const id = (event.target as Element).closest<HTMLElement>('.task-edit-form')?.dataset.id;
    if (event.key === 'Escape' && id) {
      event.preventDefault();
      cancel(id);
    }
  });
}
