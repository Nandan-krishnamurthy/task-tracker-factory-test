import { expect, test, type Page } from '@playwright/test';

const KEY = 'task-tracker:v1';
const title = (page: Page) => page.getByLabel('Task title');
const tasks = (page: Page) => page.getByRole('list', { name: 'Tasks' }).getByRole('listitem');

async function addTasks(page: Page, ...titles: string[]) {
  for (const value of titles) {
    await title(page).fill(value);
    await title(page).press('Enter');
  }
  await expect(tasks(page)).toHaveText(titles);
}

// Each test gets a fresh browser context, so localStorage starts empty.

test('#4 AC1: after a reload the same tasks are shown, in the same order', async ({ page }) => {
  await page.goto('/');
  await addTasks(page, 'Buy milk', 'Walk dog', 'Call mum');
  await page.reload();
  await expect(tasks(page)).toHaveText(['Buy milk', 'Walk dog', 'Call mum']);
});

test('#4 AC2: a new page in the same browser profile shows the tasks with no user action', async ({
  context,
  page,
}) => {
  await page.goto('/');
  await addTasks(page, 'Buy milk', 'Walk dog');
  await page.close();

  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(tasks(reopened)).toHaveText(['Buy milk', 'Walk dog']);
});

test('#4 AC3: once the add has returned, task-tracker:v1 already holds the task', async ({ page }) => {
  await page.goto('/');
  // Submit and read storage in the same synchronous turn: no render or timer can run in between.
  const stored = await page.evaluate((key) => {
    const input = document.querySelector<HTMLInputElement>('#task-title')!;
    input.value = 'Buy milk';
    input.form!.requestSubmit();
    return window.localStorage.getItem(key);
  }, KEY);
  expect(stored).not.toBeNull();
  const data = JSON.parse(stored!);
  expect(data.version).toBe(1);
  expect(data.tasks.map((t: { title: string }) => t.title)).toEqual(['Buy milk']);
});

test('#4 AC4: on a first visit the list is empty and there is no error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), KEY)).toBeNull();
  await expect(title(page)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Tasks' })).toBeAttached();
  await expect(tasks(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});
