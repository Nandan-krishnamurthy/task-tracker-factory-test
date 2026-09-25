// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createController } from '../app/controller';
import { bindEvents } from './events';
import { ensureLayout, render } from './render';

let root: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  root = document.createElement('main');
  document.body.append(root);
});

describe('render', () => {
  it('#3 AC1: shows a labelled title field and an Add button', () => {
    render(root, { tasks: [], validationMessage: null });
    const input = root.querySelector<HTMLInputElement>('input#task-title')!;
    const label = root.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)!;
    expect(label.textContent).toBe('Task title');
    expect(root.querySelector('button[type="submit"]')!.textContent).toBe('Add');
    const message = root.querySelector('#task-title-message')!;
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
    expect(message.getAttribute('aria-live')).toBe('polite');
  });

  it('#3 AC2: lists titles as text, never as HTML', () => {
    render(root, {
      tasks: [
        { id: 'a', title: '<b>x</b>', dueDate: null, priority: null, completed: false, createdAt: '' },
      ],
      validationMessage: null,
    });
    const item = root.querySelector('#task-list li')!;
    expect(item.textContent).toBe('<b>x</b>');
    expect(item.querySelector('b')).toBeNull();
  });

  it('#6 AC5: the priority control offers exactly none, Low, Medium and High, and is labelled', () => {
    render(root, { tasks: [], validationMessage: null });
    const select = root.querySelector<HTMLSelectElement>('select#task-priority')!;
    expect(root.querySelector(`label[for="${select.id}"]`)!.textContent).toBe('Priority');
    expect([...select.options].map((o) => [o.value, o.text])).toEqual([
      ['', 'No priority'],
      ['low', 'Low'],
      ['medium', 'Medium'],
      ['high', 'High'],
    ]);
    expect(select.value).toBe('');
  });

  it('#6 AC1: the due date field is a labelled date input', () => {
    render(root, { tasks: [], validationMessage: null });
    const input = root.querySelector<HTMLInputElement>('input#task-due-date')!;
    expect(input.type).toBe('date');
    expect(root.querySelector(`label[for="${input.id}"]`)!.textContent).toBe('Due date');
  });

  it('#6 AC1 AC2: a task shows its due date and priority', () => {
    const task = {
      id: 'a',
      title: 'Pay rent',
      dueDate: '2026-10-01',
      priority: 'high' as const,
      completed: false,
      createdAt: '',
    };
    render(root, { tasks: [task], validationMessage: null });
    const item = root.querySelector('#task-list li')!;
    const due = item.querySelector('time')!;
    expect(due.dateTime).toBe('2026-10-01');
    expect(due.textContent).toMatch(/^Due .*2026/);
    expect(item.querySelector('.task-priority')!.textContent).toBe('High priority');
  });

  it('#6 AC3: a task without a due date or priority shows only its title', () => {
    const task = {
      id: 'a',
      title: 'Walk dog',
      dueDate: null,
      priority: null,
      completed: false,
      createdAt: '',
    };
    render(root, { tasks: [task], validationMessage: null });
    const item = root.querySelector('#task-list li')!;
    expect(item.textContent).toBe('Walk dog');
    expect(item.querySelector('time, .task-priority')).toBeNull();
  });

  it('#5 AC3: shows the storage warning in an alert region, and empties it when cleared', () => {
    render(root, { tasks: [], validationMessage: null });
    const warning = root.querySelector('#storage-warning')!;
    expect(warning.getAttribute('role')).toBe('alert');
    expect(warning.textContent).toBe('');
    render(root, { tasks: [], validationMessage: null, storageWarning: 'May not be saved.' });
    expect(root.querySelector('#storage-warning')).toBe(warning); // same live region
    expect(warning.textContent).toBe('May not be saved.');
    render(root, { tasks: [], validationMessage: null });
    expect(warning.textContent).toBe('');
  });

  it('#3 AC2: re-rendering keeps the same form, so the field keeps its focus', () => {
    const first = ensureLayout(root).form;
    render(root, { tasks: [], validationMessage: 'x' });
    expect(ensureLayout(root).form).toBe(first);
    expect(root.querySelectorAll('form')).toHaveLength(1);
  });
});

describe('bindEvents', () => {
  it('#3 AC2: submitting adds the task and clears the field', () => {
    const controller = createController({
      tasks: [],
      storage: { setItem: () => {} },
      render: (state) => render(root, state),
      now: () => new Date(),
      newId: () => 'a',
    });
    render(root, controller.state());
    bindEvents(root, controller);
    const { form, input, list } = ensureLayout(root);
    input.value = 'Buy milk';
    form.requestSubmit();
    expect(list.textContent).toBe('Buy milk');
    expect(input.value).toBe('');
  });

  it('#6 AC1 AC2: the date and priority are passed on, then reset with the title', () => {
    const controller = createController({
      tasks: [],
      storage: { setItem: () => {} },
      render: (state) => render(root, state),
      now: () => new Date(),
      newId: () => 'a',
    });
    render(root, controller.state());
    bindEvents(root, controller);
    const { form, input, dueDate, priority } = ensureLayout(root);
    input.value = 'Pay rent';
    dueDate.value = '2026-10-01';
    priority.value = 'medium';
    form.requestSubmit();
    const [task] = controller.state().tasks;
    expect([task.dueDate, task.priority]).toEqual(['2026-10-01', 'medium']);
    expect([input.value, dueDate.value, priority.value]).toEqual(['', '', '']);
  });
});
