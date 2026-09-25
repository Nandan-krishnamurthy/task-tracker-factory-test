import { describe, expect, it } from 'vitest';
import { createTask, TITLE_REQUIRED, validateTitle, type Task } from './task';

const NOW = new Date('2026-09-25T08:00:00.000Z');
const ids = (...values: string[]) => () => values.shift() ?? 'unexpected';

describe('validateTitle', () => {
  it('#3 AC3: rejects an empty title', () => {
    expect(validateTitle('')).toEqual({ ok: false, error: TITLE_REQUIRED });
  });

  it('#3 AC3: rejects a whitespace-only title', () => {
    expect(validateTitle('  \t ')).toEqual({ ok: false, error: TITLE_REQUIRED });
  });

  it('#3 AC5: trims leading and trailing spaces', () => {
    expect(validateTitle('  Buy milk  ')).toEqual({ ok: true, title: 'Buy milk' });
  });

  it('#3 AC2: accepts a valid title', () => {
    expect(validateTitle('Buy milk')).toEqual({ ok: true, title: 'Buy milk' });
  });
});

describe('createTask', () => {
  it('#3 AC2: appends in creation order with the injected id and time', () => {
    const first = createTask([], { title: 'Buy milk' }, NOW, ids('a'));
    if (!first.ok) throw new Error('expected ok');
    const second = createTask(first.tasks, { title: 'Walk dog' }, NOW, ids('b'));
    if (!second.ok) throw new Error('expected ok');
    expect(second.tasks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(second.task).toEqual<Task>({
      id: 'b',
      title: 'Walk dog',
      dueDate: null,
      priority: null,
      completed: false,
      createdAt: '2026-09-25T08:00:00.000Z',
    });
  });

  it('#3 AC5: stores the trimmed title', () => {
    const result = createTask([], { title: '  Buy milk ' }, NOW, ids('a'));
    expect(result.ok && result.task.title).toBe('Buy milk');
  });

  it('#3 AC3: adds nothing for an invalid title and leaves the list unchanged', () => {
    const tasks: Task[] = [];
    expect(createTask(tasks, { title: '   ' }, NOW, ids('a'))).toEqual({
      ok: false,
      error: TITLE_REQUIRED,
    });
    expect(tasks).toEqual([]);
  });
});
