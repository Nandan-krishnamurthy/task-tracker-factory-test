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

  it('#7 AC1 AC2: lists tasks soonest due first, undated last, without reordering the state', () => {
    const task = (id: string, dueDate: string | null) => ({
      id,
      title: id,
      dueDate,
      priority: null,
      completed: false,
      createdAt: '',
    });
    const tasks = [task('none', null), task('oct3', '2026-10-03'), task('oct1', '2026-10-01')];
    render(root, { tasks, validationMessage: null });
    const titles = [...root.querySelectorAll('#task-list .task-title')].map((t) => t.textContent);
    expect(titles).toEqual(['oct1', 'oct3', 'none']);
    expect(tasks.map((t) => t.id)).toEqual(['none', 'oct3', 'oct1']);
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

describe('Active and Completed views', () => {
  const task = (id: string, completed: boolean) => ({
    id,
    title: id,
    dueDate: null,
    priority: null,
    completed,
    createdAt: '',
  });
  const tasks = [task('open', false), task('done', true)];
  const titles = () => [...root.querySelectorAll('#task-list .task-title')].map((t) => t.textContent);
  const pressed = () =>
    [...root.querySelectorAll('#task-views button')].map((b) => [
      b.textContent,
      b.getAttribute('aria-pressed'),
    ]);

  it('#8 AC1: Active is shown by default, marked as current, with only tasks not done', () => {
    render(root, { tasks, validationMessage: null });
    expect(root.querySelector('#task-views')!.getAttribute('role')).toBe('group');
    expect(pressed()).toEqual([
      ['Active', 'true'],
      ['Completed', 'false'],
    ]);
    expect(titles()).toEqual(['open']);
  });

  it('#8 AC4: the Completed view lists only done tasks and is marked as current', () => {
    render(root, { tasks, validationMessage: null, view: 'completed' });
    expect(pressed()).toEqual([
      ['Active', 'false'],
      ['Completed', 'true'],
    ]);
    expect(titles()).toEqual(['done']);
  });

  it('#8 AC2 AC3: each task has a checkbox that names the task and shows whether it is done', () => {
    render(root, { tasks, validationMessage: null, view: 'completed' });
    const box = root.querySelector<HTMLInputElement>('#task-list input[type="checkbox"]')!;
    expect(box.getAttribute('aria-label')).toBe('Done: done');
    expect(box.checked).toBe(true);
  });

  it('#8 AC2 AC3 AC4: ticking and unticking moves a task between the views', () => {
    const controller = createController({
      tasks: [],
      storage: { setItem: () => {} },
      render: (state) => render(root, state),
      now: () => new Date(),
      newId: () => 'a',
    });
    render(root, controller.state());
    bindEvents(root, controller);
    controller.addTask('Buy milk');
    const { views } = ensureLayout(root);
    const box = () => root.querySelector<HTMLInputElement>('#task-list .task-done');

    box()!.click(); // tick
    expect(titles()).toEqual([]);
    views.completed.click();
    expect(titles()).toEqual(['Buy milk']);
    expect(box()!.checked).toBe(true);

    box()!.click(); // untick
    expect(titles()).toEqual([]);
    views.active.click();
    expect(titles()).toEqual(['Buy milk']);
    expect(box()!.checked).toBe(false);
  });
});
