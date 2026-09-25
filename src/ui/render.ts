import type { AppState } from '../app/controller';
import type { Priority, Task } from '../domain/task';

export interface Layout {
  form: HTMLFormElement;
  input: HTMLInputElement;
  dueDate: HTMLInputElement;
  priority: HTMLSelectElement;
  message: HTMLElement;
  list: HTMLUListElement;
  warning: HTMLElement;
}

const FORM_ID = 'add-task';
const INPUT_ID = 'task-title';
const DUE_ID = 'task-due-date';
const PRIORITY_ID = 'task-priority';
const MESSAGE_ID = 'task-title-message';
const LIST_ID = 'task-list';
const WARNING_ID = 'storage-warning';

/** The form and the list, created once so the title field keeps its focus and value. */
export function ensureLayout(root: HTMLElement): Layout {
  const existing = root.querySelector<HTMLFormElement>(`#${FORM_ID}`);
  if (existing) {
    return {
      form: existing,
      input: root.querySelector<HTMLInputElement>(`#${INPUT_ID}`)!,
      dueDate: root.querySelector<HTMLInputElement>(`#${DUE_ID}`)!,
      priority: root.querySelector<HTMLSelectElement>(`#${PRIORITY_ID}`)!,
      message: root.querySelector<HTMLElement>(`#${MESSAGE_ID}`)!,
      list: root.querySelector<HTMLUListElement>(`#${LIST_ID}`)!,
      warning: root.querySelector<HTMLElement>(`#${WARNING_ID}`)!,
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

  const dueLabel = labelFor(DUE_ID, 'Due date');
  const dueDate = document.createElement('input');
  dueDate.id = DUE_ID;
  dueDate.name = 'dueDate';
  dueDate.type = 'date'; // value is YYYY-MM-DD, stored as is

  const priorityLabel = labelFor(PRIORITY_ID, 'Priority');
  const priority = document.createElement('select');
  priority.id = PRIORITY_ID;
  priority.name = 'priority';
  const choices: [string, string][] = [['', 'No priority'], ...Object.entries(PRIORITY_NAMES)];
  for (const [value, text] of choices) {
    priority.append(new Option(text, value));
  }

  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Add';

  const message = document.createElement('p');
  message.id = MESSAGE_ID;
  message.setAttribute('aria-live', 'polite');

  form.append(label, input, dueLabel, dueDate, priorityLabel, priority, button, message);

  const list = document.createElement('ul');
  list.id = LIST_ID;
  list.setAttribute('aria-label', 'Tasks');

  // Present from the start, so that assistive technology announces the text when it appears.
  const warning = document.createElement('p');
  warning.id = WARNING_ID;
  warning.setAttribute('role', 'alert');

  root.append(warning, form, list);
  return { form, input, dueDate, priority, message, list, warning };
}

export function render(root: HTMLElement, state: AppState): void {
  const { message, list, warning } = ensureLayout(root);
  message.textContent = state.validationMessage ?? '';
  warning.textContent = state.storageWarning ?? '';
  list.replaceChildren(...state.tasks.map(taskItem));
}

const PRIORITY_NAMES: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function labelFor(id: string, text: string): HTMLLabelElement {
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = text;
  return label;
}

function taskItem(task: Task): HTMLLIElement {
  const item = document.createElement('li');
  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title; // textContent, never innerHTML: titles are user input
  item.append(title);
  if (task.dueDate) {
    const due = document.createElement('time');
    due.className = 'task-due';
    due.dateTime = task.dueDate;
    due.textContent = `Due ${formatDate(task.dueDate)}`;
    item.append(' ', due);
  }
  if (task.priority) {
    const priority = document.createElement('span');
    priority.className = 'task-priority';
    priority.textContent = `${PRIORITY_NAMES[task.priority]} priority`;
    item.append(' ', priority);
  }
  return item;
}

/** The calendar day in the user's locale. Built from its parts, so no time zone can shift it. */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
