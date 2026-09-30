import { describe, expect, it } from 'vitest';
import { tasksForView } from './filter';
import { setCompleted, type Task } from './task';

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
