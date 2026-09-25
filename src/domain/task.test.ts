import { describe, expect, it } from 'vitest';
import {
  createTask,
  INVALID_DUE_DATE,
  INVALID_PRIORITY,
  isCalendarDate,
  TITLE_REQUIRED,
  validateTitle,
  type Task,
} from './task';

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

describe('createTask with a due date and a priority', () => {
  it('#6 AC1 AC2: keeps the given due date and priority', () => {
    const result = createTask(
      [],
      { title: 'Pay rent', dueDate: '2026-10-01', priority: 'high' },
      NOW,
      ids('a'),
    );
    expect(result.ok && [result.task.dueDate, result.task.priority]).toEqual(['2026-10-01', 'high']);
  });

  it('#6 AC2: accepts each of low, medium and high', () => {
    for (const priority of ['low', 'medium', 'high']) {
      const result = createTask([], { title: 'x', priority }, NOW, ids('a'));
      expect(result.ok && result.task.priority).toBe(priority);
    }
  });

  it('#6 AC3: an empty or missing due date and priority give none', () => {
    for (const input of [{ title: 'x' }, { title: 'x', dueDate: '', priority: '' }]) {
      const result = createTask([], input, NOW, ids('a'));
      expect(result.ok && [result.task.dueDate, result.task.priority]).toEqual([null, null]);
    }
  });

  it('#6 AC2: rejects a priority that is not low, medium or high', () => {
    expect(createTask([], { title: 'x', priority: 'urgent' }, NOW, ids('a'))).toEqual({
      ok: false,
      error: INVALID_PRIORITY,
    });
  });

  it('#6 AC1: rejects a due date that is not a calendar day', () => {
    for (const dueDate of ['01/10/2026', '2026-02-30', '2026-1-1']) {
      expect(createTask([], { title: 'x', dueDate }, NOW, ids('a'))).toEqual({
        ok: false,
        error: INVALID_DUE_DATE,
      });
    }
  });

  it('#6 AC1: any real calendar day is allowed, including past dates', () => {
    expect(isCalendarDate('2020-02-29')).toBe(true);
    expect(isCalendarDate('2021-02-29')).toBe(false);
  });
});
