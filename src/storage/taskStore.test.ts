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

describe('saveTasks', () => {
  it('#4 AC3: writes the exact stored format under task-tracker:v1', () => {
    const storage = fakeStorage();
    saveTasks(storage, TASKS);
    expect(STORAGE_KEY).toBe('task-tracker:v1');
    expect(JSON.parse(storage.items.get('task-tracker:v1')!)).toEqual({ version: 1, tasks: TASKS });
  });
});
