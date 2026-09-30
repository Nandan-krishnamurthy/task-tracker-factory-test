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
}
