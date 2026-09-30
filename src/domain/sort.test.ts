import { describe, expect, it } from 'vitest';
import { sortTasks } from './sort';
import type { Priority, Task } from './task';

/** Tasks in creation order: the n-th task was created n minutes after the first. */
function tasks(...specs: [id: string, dueDate: string | null, priority?: Priority][]): Task[] {
  return specs.map(([id, dueDate, priority = null], n) => ({
    id,
    title: id,
    dueDate,
    priority,
    completed: false,
    createdAt: new Date(Date.UTC(2026, 8, 30, 8, n)).toISOString(),
  }));
}

const ids = (list: Task[]) => list.map((t) => t.id);

describe('sortTasks', () => {
  it('#7 AC1: orders due dates soonest first', () => {
    const list = tasks(['oct3', '2026-10-03'], ['oct1', '2026-10-01'], ['oct2', '2026-10-02']);
    expect(ids(sortTasks(list))).toEqual(['oct1', 'oct2', 'oct3']);
  });

  it('#7 AC1: compares across months and years, not just days', () => {
    const list = tasks(['2027', '2027-01-01'], ['nov', '2026-11-05'], ['oct', '2026-10-31']);
    expect(ids(sortTasks(list))).toEqual(['oct', 'nov', '2027']);
  });

  it('#7 AC2: puts every task without a due date after every task with one', () => {
    const list = tasks(['none1', null], ['late', '2026-12-31'], ['none2', null], ['early', '2026-10-01']);
    expect(ids(sortTasks(list))).toEqual(['early', 'late', 'none1', 'none2']);
  });

  it('#7 AC3: keeps creation order for tasks with the same due date', () => {
    const list = tasks(['first', '2026-10-01'], ['other', '2026-09-30'], ['second', '2026-10-01']);
    expect(ids(sortTasks(list))).toEqual(['other', 'first', 'second']);
  });

  it('#7 AC3: keeps creation order for tasks without a due date', () => {
    const list = tasks(['a', null], ['b', null], ['c', null]);
    expect(ids(sortTasks(list))).toEqual(['a', 'b', 'c']);
  });

  it('#7 AC4: priority does not change the order of tasks with the same due date', () => {
    const list = tasks(
      ['low', '2026-10-01', 'low'],
      ['none', '2026-10-01'],
      ['high', '2026-10-01', 'high'],
      ['medium', '2026-10-01', 'medium'],
    );
    expect(ids(sortTasks(list))).toEqual(['low', 'none', 'high', 'medium']);
  });

  it('#7 AC5: the order is a pure function of the tasks, and the input is not mutated', () => {
    const list = tasks(['b', '2026-10-02'], ['none', null], ['a', '2026-10-01']);
    const copy = structuredClone(list);
    const sorted = sortTasks(list);
    expect(list).toEqual(copy);
    expect(sorted).not.toBe(list);
    expect(ids(sortTasks(copy))).toEqual(ids(sorted));
  });

  it('returns an empty list for no tasks', () => {
    expect(sortTasks([])).toEqual([]);
  });
});
