import { describe, expect, it, vi } from 'vitest';
import { TITLE_REQUIRED } from '../domain/task';
import { createController, type AppState } from './controller';

function setup() {
  const render = vi.fn<(state: AppState) => void>();
  let n = 0;
  const controller = createController({
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
