import { describe, expect, it, vi } from 'vitest';
import { TITLE_REQUIRED } from '../domain/task';
import { loadTasks, STORAGE_KEY } from '../storage/taskStore';
import { createController, SAVE_WARNING, type AppState } from './controller';

function setup() {
  const render = vi.fn<(state: AppState) => void>();
  let n = 0;
  const controller = createController({
    tasks: [],
    storage: { setItem: vi.fn() },
    render,
    now: () => new Date('2026-09-25T08:00:00.000Z'),
    newId: () => `id-${++n}`,
  });
  return { controller, render };
}

describe('controller.addTask', () => {
  it('#3 AC2: adds the task to the state and renders it', () => {
    const { controller, render } = setup();
    expect(controller.addTask('Buy milk')).toBe(true);
    expect(controller.state().tasks.map((t) => t.title)).toEqual(['Buy milk']);
    expect(render).toHaveBeenLastCalledWith(controller.state());
  });

  it('#3 AC3: an empty title adds nothing and sets the validation message', () => {
    const { controller, render } = setup();
    expect(controller.addTask('  ')).toBe(false);
    expect(controller.state()).toEqual({ tasks: [], validationMessage: TITLE_REQUIRED });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('#3 AC4: a valid title after an error clears the message', () => {
    const { controller } = setup();
    controller.addTask('');
    controller.addTask('Buy milk');
    expect(controller.state().validationMessage).toBeNull();
    expect(controller.state().tasks).toHaveLength(1);
  });
});

describe('controller persistence', () => {
  function persistent(initial: Record<string, string> = {}) {
    const items = new Map(Object.entries(initial));
    let n = 0;
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        items.set(key, value);
      },
    };
    const controller = createController({
      tasks: loadTasks(storage).tasks,
      storage,
      render: () => {},
      now: () => new Date('2026-09-25T08:00:00.000Z'),
      newId: () => `id-${++n}`,
    });
    return { controller, storage };
  }

  it('#4 AC3: when addTask returns, task-tracker:v1 already holds the new task', () => {
    const { controller, storage } = persistent();
    controller.addTask('Buy milk');
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(stored.version).toBe(1);
    expect(stored.tasks.map((t: { title: string }) => t.title)).toEqual(['Buy milk']);
  });

  it('#4 AC3: an invalid title saves nothing', () => {
    const { controller, storage } = persistent();
    controller.addTask('  ');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('#4 AC1: a new controller on the same storage starts with the same tasks, in order', () => {
    const first = persistent();
    first.controller.addTask('Buy milk');
    first.controller.addTask('Walk dog');
    const saved = { [STORAGE_KEY]: first.storage.getItem(STORAGE_KEY)! };
    const second = persistent(saved);
    expect(second.controller.state().tasks).toEqual(first.controller.state().tasks);
  });

  it('#4 AC4: with nothing stored, the controller starts with an empty list and no message', () => {
    expect(persistent().controller.state()).toEqual({ tasks: [], validationMessage: null });
  });
});

describe('controller when saving fails', () => {
  function failing() {
    let fail = true;
    const storage = {
      setItem: () => {
        if (fail) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      },
    };
    const render = vi.fn<(state: AppState) => void>();
    const controller = createController({
      tasks: [],
      storage,
      render,
      now: () => new Date('2026-09-25T08:00:00.000Z'),
      newId: () => 'id-1',
    });
    return { controller, render, recover: () => (fail = false) };
  }

  it('#5 AC3: the task is still added and shown, with the storage warning', () => {
    const { controller, render } = failing();
    expect(controller.addTask('Buy milk')).toBe(true);
    expect(controller.state().tasks.map((t) => t.title)).toEqual(['Buy milk']);
    expect(controller.state().storageWarning).toBe(SAVE_WARNING);
    expect(render).toHaveBeenLastCalledWith(controller.state());
  });

  it('#5 AC3: the warning stays through a validation error and clears after a good save', () => {
    const { controller, recover } = failing();
    controller.addTask('Buy milk');
    controller.addTask('  ');
    expect(controller.state().storageWarning).toBe(SAVE_WARNING);
    recover();
    controller.addTask('Walk dog');
    expect(controller.state().storageWarning).toBeUndefined();
    expect(controller.state().tasks).toHaveLength(2);
  });
});
