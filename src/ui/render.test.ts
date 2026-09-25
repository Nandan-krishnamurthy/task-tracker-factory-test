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
});
