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
    expect(controller.state()).toEqual({
      tasks: [],
      validationMessage: TITLE_REQUIRED,
      view: 'active',
      today: '2026-09-25',
    });
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
    expect(persistent().controller.state()).toEqual({
      tasks: [],
      validationMessage: null,
      view: 'active',
      today: '2026-09-25',
    });
  });

  it('#9 AC5: an edited title is saved, and is shown when loaded again', () => {
    const first = persistent();
    first.controller.addTask('Buy milk');
    first.controller.editTask('id-1', 'Buy oat milk');
    const second = persistent({ [STORAGE_KEY]: first.storage.getItem(STORAGE_KEY)! });
    expect(second.controller.state().tasks.map((t) => t.title)).toEqual(['Buy oat milk']);
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

describe('controller views and completion', () => {
  it('#8 AC1: starts on the Active view', () => {
    expect(setup().controller.state().view).toBe('active');
  });

  it('#8 AC2 AC3: toggleTask marks a task done and not done, and renders', () => {
    const { controller, render } = setup();
    controller.addTask('Buy milk');
    const [{ id }] = controller.state().tasks;
    controller.toggleTask(id, true);
    expect(controller.state().tasks[0].completed).toBe(true);
    expect(render).toHaveBeenLastCalledWith(controller.state());
    controller.toggleTask(id, false);
    expect(controller.state().tasks[0].completed).toBe(false);
  });

  it('#8 AC4: setView switches the view and renders', () => {
    const { controller, render } = setup();
    controller.setView('completed');
    expect(controller.state().view).toBe('completed');
    expect(render).toHaveBeenLastCalledWith(controller.state());
  });

  it('#8: adding a task while Completed is shown switches to Active', () => {
    const { controller } = setup();
    controller.setView('completed');
    controller.addTask('');
    expect(controller.state().view).toBe('completed'); // an invalid title changes nothing
    controller.addTask('Buy milk');
    expect(controller.state().view).toBe('active');
  });
});

describe('controller completion persistence', () => {
  it('#8 AC5: a completed task is saved, and is still completed when loaded again', () => {
    const items = new Map<string, string>();
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        items.set(key, value);
      },
    };
    const deps = { storage, render: () => {}, now: () => new Date(), newId: () => 'a' };
    const first = createController({ ...deps, tasks: [] });
    first.addTask('Buy milk');
    first.toggleTask('a', true);
    const second = createController({ ...deps, tasks: loadTasks(storage).tasks });
    expect(second.state().tasks.map((t) => [t.id, t.completed])).toEqual([['a', true]]);
    expect(second.state().view).toBe('active');
  });
});

describe('controller editing', () => {
  function editing() {
    const { controller, render } = setup();
    controller.addTask('Buy milk');
    controller.startEdit('id-1');
    return { controller, render };
  }

  it('#9 AC1: startEdit opens the form, and editTask saves the new title and closes it', () => {
    const { controller, render } = editing();
    expect(controller.state().editing).toEqual({ id: 'id-1', error: null });
    expect(controller.editTask('id-1', 'Buy oat milk')).toBe(true);
    expect(controller.state().tasks[0].title).toBe('Buy oat milk');
    expect(controller.state().editing).toBeUndefined();
    expect(render).toHaveBeenLastCalledWith(controller.state());
  });

  it('#9 AC3: an empty title is rejected, the old title kept and the form left open with a message', () => {
    const { controller } = editing();
    expect(controller.editTask('id-1', '   ')).toBe(false);
    expect(controller.state().tasks[0].title).toBe('Buy milk');
    expect(controller.state().editing).toEqual({ id: 'id-1', error: TITLE_REQUIRED });
  });

  it('#9 AC4: cancelEdit closes the form and keeps the old title', () => {
    const { controller } = editing();
    controller.cancelEdit();
    expect(controller.state().editing).toBeUndefined();
    expect(controller.state().tasks[0].title).toBe('Buy milk');
  });
});

describe('controller deleting', () => {
  function deleting() {
    const items = new Map<string, string>();
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        items.set(key, value);
      },
    };
    const render = vi.fn<(state: AppState) => void>();
    let n = 0;
    const controller = createController({
      tasks: [],
      storage,
      render,
      now: () => new Date('2026-09-25T08:00:00.000Z'),
      newId: () => `id-${++n}`,
    });
    controller.addTask('Buy milk');
    controller.addTask('Walk dog');
    return { controller, storage, render };
  }

  it('#11 AC1: removeTask removes an active task at once and renders', () => {
    const { controller, render } = deleting();
    controller.removeTask('id-1');
    expect(controller.state().tasks.map((t) => t.title)).toEqual(['Walk dog']);
    expect(render).toHaveBeenLastCalledWith(controller.state());
  });

  it('#11 AC2: removeTask removes a completed task', () => {
    const { controller } = deleting();
    controller.toggleTask('id-2', true);
    controller.setView('completed');
    controller.removeTask('id-2');
    expect(controller.state().tasks.map((t) => t.title)).toEqual(['Buy milk']);
  });

  it('#11 AC3: the deletion is saved, and the task is gone when loaded again', () => {
    const { controller, storage } = deleting();
    controller.removeTask('id-1');
    expect(loadTasks(storage).tasks.map((t) => t.title)).toEqual(['Walk dog']);
  });

  it('#11: deleting the task being edited closes its edit form', () => {
    const { controller } = deleting();
    controller.startEdit('id-1');
    controller.removeTask('id-1');
    expect(controller.state().editing).toBeUndefined();
  });
});

describe('controller today', () => {
  it('#27 AC1: the state carries the local date of the injected clock', () => {
    const { controller } = setup();
    expect(controller.state().today).toBe('2026-09-25');
  });

  it('#27 AC4: every rendered state reads the clock again', () => {
    let clock = new Date(2026, 9, 7, 23, 59);
    const render = vi.fn<(state: AppState) => void>();
    const controller = createController({
      tasks: [],
      storage: { setItem: vi.fn() },
      render,
      now: () => clock,
      newId: () => 'id-1',
    });
    expect(controller.state().today).toBe('2026-10-07');
    clock = new Date(2026, 9, 8, 0, 1);
    controller.addTask('Pay rent', { dueDate: '2026-10-07' });
    expect(render).toHaveBeenLastCalledWith(expect.objectContaining({ today: '2026-10-08' }));
  });
});
