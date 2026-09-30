import type { AppState } from '../app/controller';
import { tasksForView, type View } from '../domain/filter';
import { sortTasks } from '../domain/sort';
import type { Priority, Task } from '../domain/task';

export interface Layout {
  form: HTMLFormElement;
  input: HTMLInputElement;
  dueDate: HTMLInputElement;
  priority: HTMLSelectElement;
  message: HTMLElement;
  views: Record<View, HTMLButtonElement>;
  list: HTMLUListElement;
  warning: HTMLElement;
}

const FORM_ID = 'add-task';
const INPUT_ID = 'task-title';
const DUE_ID = 'task-due-date';
const PRIORITY_ID = 'task-priority';
const MESSAGE_ID = 'task-title-message';
const VIEWS_ID = 'task-views';
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
      views: {
        active: root.querySelector<HTMLButtonElement>(`#${VIEWS_ID} [data-view="active"]`)!,
        completed: root.querySelector<HTMLButtonElement>(`#${VIEWS_ID} [data-view="completed"]`)!,
      },
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

  // Two toggle buttons: native buttons are keyboard-operable, and aria-pressed marks the current view.
  const viewGroup = document.createElement('div');
  viewGroup.id = VIEWS_ID;
  viewGroup.setAttribute('role', 'group');
  viewGroup.setAttribute('aria-label', 'Show');
  const views = { active: viewButton('active', 'Active'), completed: viewButton('completed', 'Completed') };
  viewGroup.append(views.active, views.completed);

  const list = document.createElement('ul');
  list.id = LIST_ID;
  list.setAttribute('aria-label', 'Tasks');

  // Present from the start, so that assistive technology announces the text when it appears.
  const warning = document.createElement('p');
  warning.id = WARNING_ID;
  warning.setAttribute('role', 'alert');

  root.append(warning, form, viewGroup, list);
  return { form, input, dueDate, priority, message, views, list, warning };
}

export function render(root: HTMLElement, state: AppState): void {
  const { message, views, list, warning } = ensureLayout(root);
  const view = state.view ?? 'active';
  message.textContent = state.validationMessage ?? '';
  warning.textContent = state.storageWarning ?? '';
  for (const [name, button] of Object.entries(views)) {
    button.setAttribute('aria-pressed', String(name === view));
  }
  const rows = sortTasks(tasksForView(state.tasks, view)).map((task) =>
    task.id === state.editing?.id ? editItem(task, state.editing.error) : taskItem(task),
  );
  list.replaceChildren(...rows);
}

const PRIORITY_NAMES: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function labelFor(id: string, text: string): HTMLLabelElement {
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = text;
  return label;
}

function viewButton(view: View, text: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.view = view;
  button.textContent = text;
  return button;
}

function taskItem(task: Task): HTMLLIElement {
  const item = document.createElement('li');
  const done = document.createElement('input');
  done.type = 'checkbox';
  done.className = 'task-done';
  done.dataset.id = task.id;
  done.checked = task.completed;
  done.setAttribute('aria-label', `Done: ${task.title}`); // names the task; the text stays the title
  item.append(done);
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
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'task-edit';
  edit.dataset.id = task.id;
  edit.textContent = 'Edit';
  edit.setAttribute('aria-label', `Edit ${task.title}`); // tells the rows' Edit buttons apart
  item.append(' ', edit);
  return item;
}

/** The row in edit mode (architecture decision 8): Enter saves, Escape cancels. */
function editItem(task: Task, error: string | null): HTMLLIElement {
  const item = document.createElement('li');
  const form = document.createElement('form');
  form.className = 'task-edit-form';
  form.dataset.id = task.id;
  form.noValidate = true;

  const inputId = `edit-title-${task.id}`;
  const messageId = `edit-message-${task.id}`;
  const input = document.createElement('input');
  input.id = inputId;
  input.className = 'task-edit-title';
  input.type = 'text';
  input.autocomplete = 'off';
  input.value = task.title;
  input.setAttribute('aria-describedby', messageId);
  if (error) {
    input.setAttribute('aria-invalid', 'true');
  }

  const save = document.createElement('button');
  save.type = 'submit';
  save.textContent = 'Save';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'task-edit-cancel';
  cancel.textContent = 'Cancel';

  const message = document.createElement('p');
  message.id = messageId;
  message.className = 'task-edit-message';
  message.setAttribute('aria-live', 'polite');
  message.textContent = error ?? '';

  form.append(labelFor(inputId, 'New title'), input, save, cancel, message);
  item.append(form);
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
