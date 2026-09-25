import type { Controller } from '../app/controller';
import { ensureLayout } from './render';

export function bindEvents(root: HTMLElement, controller: Controller): void {
  const { form, input } = ensureLayout(root);
  // A native form submit covers both Enter in the field and the Add button.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (controller.addTask(input.value)) {
      input.value = '';
    }
    input.focus();
  });
}
