import { describe, expect, it } from 'vitest';
import { APP_TITLE } from './title';

describe('APP_TITLE', () => {
  it('#2 AC3: the unit test runner runs (APP_TITLE is "Task Tracker")', () => {
    expect(APP_TITLE).toBe('Task Tracker');
  });
});
