import { describe, expect, it } from 'vitest';
import { PRIORITY_FILTERS, tasksForPriority, tasksForView } from './filter';
import { sortTasks } from './sort';
import { setCompleted, type Priority, type Task } from './task';

function task(id: string, completed = false): Task {
  return { id, title: id, dueDate: null, priority: null, completed, createdAt: '' };
}

const ids = (list: readonly Task[]) => list.map((t) => t.id);

describe('setCompleted', () => {
  it('#8 AC2: marks an active task done, without mutating the list', () => {
    const list = [task('a'), task('b')];
    const next = setCompleted(list, 'b', true);
    expect(next.map((t) => t.completed)).toEqual([false, true]);
    expect(list.map((t) => t.completed)).toEqual([false, false]);
    expect(ids(next)).toEqual(['a', 'b']); // keeps its place in creation order
  });

  it('#8 AC3: marks a done task not done again', () => {
    const list = [task('a', true), task('b', true)];
    const next = setCompleted(list, 'a', false);
    expect(next.map((t) => t.completed)).toEqual([false, true]);
  });

  it('returns the same list for an unknown id or no change', () => {
    const list = [task('a', true)];
    expect(setCompleted(list, 'missing', false)).toBe(list);
    expect(setCompleted(list, 'a', true)).toBe(list);
  });
});

describe('tasksForView', () => {
  const list = [task('open1'), task('done1', true), task('open2'), task('done2', true)];

  it('#8 AC1: Active lists only tasks that are not done', () => {
    expect(ids(tasksForView(list, 'active'))).toEqual(['open1', 'open2']);
  });

  it('#8 AC4: Completed lists only done tasks', () => {
    expect(ids(tasksForView(list, 'completed'))).toEqual(['done1', 'done2']);
  });
});

describe('tasksForPriority', () => {
  const at = (id: string, priority: Priority | null, dueDate: string | null = null): Task => ({
    id,
    title: id,
    dueDate,
    priority,
    completed: false,
    createdAt: '',
  });
  const mixed = [at('h1', 'high'), at('m1', 'medium'), at('l1', 'low'), at('n1', null), at('h2', 'high')];

  it('#34 AC1: the choices are All, High, Medium, Low and No priority, in that order', () => {
    expect(PRIORITY_FILTERS).toEqual(['all', 'high', 'medium', 'low', 'none']);
  });

  it('#34 AC2: "all" keeps every task, in order, without mutating the list', () => {
    const before = ids(mixed);
    const all = tasksForPriority(mixed, 'all');
    expect(ids(all)).toEqual(before);
    expect(all).not.toBe(mixed);
    expect(ids(mixed)).toEqual(before);
  });

  it('#34 AC2: a priority keeps only the tasks with that priority', () => {
    expect(ids(tasksForPriority(mixed, 'high'))).toEqual(['h1']);
    expect(ids(tasksForPriority(mixed, 'medium'))).toEqual(['m1']);
    expect(ids(tasksForPriority(mixed, 'low'))).toEqual(['l1']);
  });

  it('#34 AC2: "No priority" keeps only the tasks without a priority', () => {
    expect(ids(tasksForPriority(mixed, 'none'))).toEqual(['n1']);
  });

  it('#34 AC2: within a view, only that view\'s matching tasks are kept', () => {
    const list = [at('open', 'high'), { ...at('done', 'high'), completed: true }, at('low', 'low')];
    expect(ids(tasksForPriority(tasksForView(list, 'active'), 'high'))).toEqual(['open']);
    expect(ids(tasksForPriority(tasksForView(list, 'completed'), 'high'))).toEqual(['done']);
  });

  it('#34 AC3: matching tasks keep the REQ-012 order: soonest due first, undated last, ties by creation', () => {
    const created = [
      at('undated', 'high'),
      at('later', 'high', '2026-11-02'),
      at('other', 'low', '2026-10-01'),
      at('sooner', 'high', '2026-10-30'),
      at('same-day', 'high', '2026-11-02'),
    ];
    expect(ids(sortTasks(tasksForPriority(created, 'high')))).toEqual([
      'sooner',
      'later',
      'same-day',
      'undated',
    ]);
  });
});
