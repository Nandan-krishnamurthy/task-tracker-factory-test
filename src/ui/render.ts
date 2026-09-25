import type { AppState } from '../app/controller';
import type { Task } from '../domain/task';

export interface Layout {
  form: HTMLFormElement;
  input: HTMLInputElement;
  message: HTMLElement;
  list: HTMLUListElement;
}

const FORM_ID = 'add-task';
const INPUT_ID = 'task-title';
const MESSAGE_ID = 'task-title-message';
const LIST_ID = 'task-list';

/** The form and the list, created once so the title field keeps its focus and value. */
export function ensureLayout(root: HTMLElement): Layout {
  const existing = root.querySelector<HTMLFormElement>(`#${FORM_ID}`);
  if (existing) {
    return {
      form: existing,
      input: root.querySelector<HTMLInputElement>(`#${INPUT_ID}`)!,
      message: root.querySelector<HTMLElement>(`#${MESSAGE_ID}`)!,
      list: root.querySelector<HTMLUListElement>(`#${LIST_ID}`)!,
    };
  }

  const form = document.createElement('form');
  form.id = FORM_ID;
  form.noValidate = true;

  const label = document.createElement('label');
  label.htmlFor = INPUT_ID;
  label.textContent = 'Task title';

  const input = document.createElement('input');
  input.id = INPUT_ID;
  input.name = 'title';
  input.type = 'text';
  input.autocomplete = 'off';
  input.setAttribute('aria-describedby', MESSAGE_ID);

  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Add';

  const message = document.createElement('p');
  message.id = MESSAGE_ID;
  message.setAttribute('aria-live', 'polite');

  form.append(label, input, button, message);

  const list = document.createElement('ul');
  list.id = LIST_ID;
  list.setAttribute('aria-label', 'Tasks');

  root.append(form, list);
  return { form, input, message, list };
}

export function render(root: HTMLElement, state: AppState): void {
  const { message, list } = ensureLayout(root);
  message.textContent = state.validationMessage ?? '';
  list.replaceChildren(...state.tasks.map(taskItem));
}

function taskItem(task: Task): HTMLLIElement {
  const item = document.createElement('li');
  item.textContent = task.title; // textContent, never innerHTML: titles are user input
  return item;
}
