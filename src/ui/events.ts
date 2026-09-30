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
  const editButton = (id: string) =>
    [...list.querySelectorAll<HTMLButtonElement>('.task-edit')].find((b) => b.dataset.id === id);
  const editInput = (id: string) => {
    const form = [...list.querySelectorAll<HTMLFormElement>('.task-edit-form')].find(
      (f) => f.dataset.id === id,
    );
    return form?.querySelector<HTMLInputElement>('.task-edit-title');
  };
  const cancel = (id: string) => {
    controller.cancelEdit();
    editButton(id)?.focus();
  };

  list.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const id = target.closest<HTMLElement>('[data-id]')?.dataset.id;
    if (id && target.classList.contains('task-edit')) {
      controller.startEdit(id);
      editInput(id)?.focus();
    } else if (id && target.classList.contains('task-edit-cancel')) {
      cancel(id);
    }
  });
  list.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.classList.contains('task-edit-form')) {
      return;
    }
    event.preventDefault();
    const id = form.dataset.id!;
    const title = form.querySelector<HTMLInputElement>('.task-edit-title')!.value;
    if (controller.editTask(id, title)) {
      editButton(id)?.focus();
    } else {
      editInput(id)?.focus();
    }
  });
  list.addEventListener('keydown', (event) => {
    const form = (event.target as Element).closest?.('.task-edit-form');
    if (event.key === 'Escape' && form instanceof HTMLFormElement && form.dataset.id) {
      event.preventDefault();
      cancel(form.dataset.id);
    }
  });
}
