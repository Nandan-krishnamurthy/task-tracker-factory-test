import { expect, test, type Page } from '@playwright/test';

const KEY = 'task-tracker:v1';
const WARNING = 'Your changes may not be saved: this browser could not store them.';
const title = (page: Page) => page.getByLabel('Task title');
const tasks = (page: Page) => page.getByRole('list', { name: 'Tasks' }).getByRole('listitem');

/** Stores `raw` under the app's key before any page script runs, on every navigation. */
async function seed(page: Page, raw: string) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, value);
        sessionStorage.setItem('seeded', '1');
      }
    },
    [KEY, raw],
  );
}

/** Collects uncaught page errors, so "without crashing" can be checked. */
function pageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function addTask(page: Page, value: string) {
  await title(page).fill(value);
  await title(page).press('Enter');
}

test('#5 AC1: text that is not JSON gives an empty list, and a task can be added', async ({ page }) => {
  const errors = pageErrors(page);
  await seed(page, '{"version": 1, "tasks": [');
  await page.goto('/');
  await expect(title(page)).toBeVisible();
  await expect(tasks(page)).toHaveCount(0);
  await addTask(page, 'Buy milk');
  await expect(tasks(page)).toHaveText(['Buy milk']);
  expect(errors).toEqual([]);
});

const WRONG_SHAPES: [string, unknown][] = [
  ['a wrong version', { version: 2, tasks: [] }],
  ['tasks not a list', { version: 1, tasks: 'Buy milk' }],
  [
    'a task with an invalid field',
    {
      version: 1,
      tasks: [
        {
          id: 'a',
          title: 'Buy milk',
          dueDate: null,
          priority: 'urgent',
          completed: false,
          createdAt: '2026-09-25T08:00:00.000Z',
        },
      ],
    },
  ],
];

for (const [name, value] of WRONG_SHAPES) {
  test(`#5 AC2: ${name} gives an empty list without crashing`, async ({ page }) => {
    const errors = pageErrors(page);
    await seed(page, JSON.stringify(value));
    await page.goto('/');
    await expect(title(page)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Tasks' })).toBeAttached();
    await expect(tasks(page)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('#5 AC3: when saving throws, the task still appears with an announced warning', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText('');
  await addTask(page, 'Buy milk');
  await expect(tasks(page)).toHaveText(['Buy milk']);
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toHaveText(WARNING);
});

test('#5 AC4: opening the app with corrupted data and changing nothing leaves it as it was', async ({
  page,
}) => {
  const corrupted = '{"version": 1, "tasks": [';
  await seed(page, corrupted);
  await page.goto('/');
  await expect(tasks(page)).toHaveCount(0);
  await page.reload();
  await expect(tasks(page)).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(corrupted);
});
