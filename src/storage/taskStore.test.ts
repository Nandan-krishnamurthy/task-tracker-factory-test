import { describe, expect, it } from 'vitest';
import type { Task } from '../domain/task';
import { decodeTasks, encodeTasks, loadTasks, saveTasks, STORAGE_KEY } from './taskStore';

/** An in-memory stand-in for localStorage. */
function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

const TASKS: Task[] = [
  {
    id: 'a',
    title: 'Buy milk',
    dueDate: '2026-10-01',
    priority: 'high',
    completed: true,
    createdAt: '2026-09-25T08:00:00.000Z',
  },
  {
    id: 'b',
    title: 'Walk dog',
    dueDate: null,
    priority: null,
    completed: false,
    createdAt: '2026-09-25T09:00:00.000Z',
  },
];

describe('encodeTasks / decodeTasks', () => {
  it('#4 AC1: round-trips every Task field, in the same order', () => {
    expect(decodeTasks(encodeTasks(TASKS))).toEqual(TASKS);
  });
});

describe('loadTasks', () => {
  it('#4 AC4: nothing stored yet (first visit) gives an empty list', () => {
    expect(loadTasks(fakeStorage())).toEqual({ tasks: [] });
  });

  it('#4 AC1: returns the saved tasks with the same titles in the same order', () => {
    const storage = fakeStorage();
    saveTasks(storage, TASKS);
    expect(loadTasks(storage).tasks.map((t) => t.title)).toEqual(['Buy milk', 'Walk dog']);
  });
});

describe('loadTasks with corrupted data', () => {
  const task = TASKS[0];
  const stored = (value: unknown) => JSON.stringify(value);
  const MALFORMED: [string, string][] = [
    ['#5 AC1: not JSON', '{"version": 1, "tasks": ['],
    ['#5 AC1: empty string', ''],
    ['#5 AC2: wrong version', stored({ version: 2, tasks: [] })],
    ['#5 AC2: no version', stored({ tasks: [] })],
    ['#5 AC2: not an object', stored([task])],
    ['#5 AC2: null', 'null'],
    ['#5 AC2: tasks not a list', stored({ version: 1, tasks: { a: task } })],
    ['#5 AC2: task not an object', stored({ version: 1, tasks: ['Buy milk'] })],
    ['#5 AC2: missing id', stored({ version: 1, tasks: [{ ...task, id: undefined }] })],
    ['#5 AC2: empty id', stored({ version: 1, tasks: [{ ...task, id: '' }] })],
    ['#5 AC2: title not a string', stored({ version: 1, tasks: [{ ...task, title: 7 }] })],
    ['#5 AC2: empty title', stored({ version: 1, tasks: [{ ...task, title: '' }] })],
    ['#5 AC2: untrimmed title', stored({ version: 1, tasks: [{ ...task, title: ' x ' }] })],
    ['#5 AC2: bad date format', stored({ version: 1, tasks: [{ ...task, dueDate: '01/10/2026' }] })],
    ['#5 AC2: impossible date', stored({ version: 1, tasks: [{ ...task, dueDate: '2026-02-30' }] })],
    ['#5 AC2: bad priority', stored({ version: 1, tasks: [{ ...task, priority: 'urgent' }] })],
    ['#5 AC2: completed not boolean', stored({ version: 1, tasks: [{ ...task, completed: 'no' }] })],
    ['#5 AC2: bad createdAt', stored({ version: 1, tasks: [{ ...task, createdAt: 'yesterday' }] })],
    [
      '#5 AC2: one bad task among good ones (all or nothing)',
      stored({ version: 1, tasks: [task, { ...task, id: 'c', priority: 'urgent' }] }),
    ],
  ];

  for (const [name, raw] of MALFORMED) {
    it(`${name} gives an empty list and a reason, without throwing`, () => {
      const result = loadTasks(fakeStorage({ [STORAGE_KEY]: raw }));
      expect(result.tasks).toEqual([]);
      expect(result.problem).toEqual(expect.any(String));
    });
  }

  it('#5 AC2: a getItem that throws gives an empty list', () => {
    const storage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(loadTasks(storage)).toEqual({ tasks: [], problem: 'SecurityError' });
  });

  it('#5 AC4: loading never writes, so corrupted data stays as it was', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: 'not json' });
    loadTasks(storage);
    expect([...storage.items]).toEqual([[STORAGE_KEY, 'not json']]);
  });

  it('#5 AC2: valid data with every field still loads', () => {
    expect(loadTasks(fakeStorage({ [STORAGE_KEY]: encodeTasks(TASKS) }))).toEqual({ tasks: TASKS });
  });
});

describe('saveTasks', () => {
  it('#5 AC3: a setItem that throws is reported, not thrown', () => {
    const storage = {
      setItem: () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      },
    };
    expect(saveTasks(storage, TASKS)).toEqual({
      ok: false,
      error: 'The quota has been exceeded.',
    });
  });

  it('#5 AC3: a successful save reports ok', () => {
    expect(saveTasks(fakeStorage(), TASKS)).toEqual({ ok: true });
  });

  it('#4 AC3: writes the exact stored format under task-tracker:v1', () => {
    const storage = fakeStorage();
    saveTasks(storage, TASKS);
    expect(STORAGE_KEY).toBe('task-tracker:v1');
    expect(JSON.parse(storage.items.get('task-tracker:v1')!)).toEqual({ version: 1, tasks: TASKS });
  });
});
