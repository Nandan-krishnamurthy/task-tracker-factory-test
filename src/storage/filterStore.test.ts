import { describe, expect, it } from 'vitest';
import { PRIORITY_FILTERS } from '../domain/filter';
import { FILTER_KEY, loadPriorityFilter, savePriorityFilter } from './filterStore';
import { STORAGE_KEY } from './taskStore';

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

describe('loadPriorityFilter', () => {
  it.each(PRIORITY_FILTERS)('#36 AC1: a remembered "%s" is loaded as it was saved', (filter) => {
    expect(loadPriorityFilter(fakeStorage({ [FILTER_KEY]: filter }))).toBe(filter);
  });

  it('#36 AC3: with nothing remembered, it gives "all"', () => {
    expect(loadPriorityFilter(fakeStorage())).toBe('all');
  });

  it.each(['urgent', 'High', '', ' high', '"high"', 'null'])(
    '#36 AC4: a value that is not a filter choice (%j) gives "all"',
    (raw) => {
      expect(loadPriorityFilter(fakeStorage({ [FILTER_KEY]: raw }))).toBe('all');
    },
  );

  it('#36 AC4: a read that throws gives "all" and does not throw', () => {
    const storage = {
      getItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    };
    expect(loadPriorityFilter(storage)).toBe('all');
  });

  it('#36 AC4: it reads only its own key, never task-tracker:v1', () => {
    const read: string[] = [];
    loadPriorityFilter({
      getItem: (key: string) => {
        read.push(key);
        return null;
      },
    });
    expect(read).toEqual([FILTER_KEY]);
  });
});

describe('savePriorityFilter', () => {
  it('#36 AC1: writes the filter under its own key, and a load gives it back', () => {
    const storage = fakeStorage();
    expect(savePriorityFilter(storage, 'high')).toBe(true);
    expect(storage.items.get(FILTER_KEY)).toBe('high');
    expect(loadPriorityFilter(storage)).toBe('high');
  });

  it('#36 AC5: leaves the task data under task-tracker:v1 unchanged', () => {
    const tasks = '{"version":1,"tasks":[]}';
    const storage = fakeStorage({ [STORAGE_KEY]: tasks });
    savePriorityFilter(storage, 'low');
    expect(storage.items.get(STORAGE_KEY)).toBe(tasks);
    expect([...storage.items.keys()].sort()).toEqual([FILTER_KEY, STORAGE_KEY].sort());
  });

  it('#36 AC5: a write that throws returns false and does not throw', () => {
    const storage = {
      setItem: () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      },
    };
    expect(savePriorityFilter(storage, 'medium')).toBe(false);
  });
});
