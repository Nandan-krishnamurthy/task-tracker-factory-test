import type { Controller } from '../app/controller';
import { ensureLayout } from './render';

export function bindEvents(root: HTMLElement, controller: Controller): void {
  const { form, input, dueDate, priority } = ensureLayout(root);
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
}
