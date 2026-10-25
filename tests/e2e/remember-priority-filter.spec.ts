import { expect, test, type Page } from '@playwright/test';

const KEY = 'task-tracker:v1';
const FILTER_KEY = 'task-tracker:priority-filter';
const title = (page: Page) => page.getByLabel('Task title');
const priority = (page: Page) => page.getByLabel('Priority', { exact: true });
const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');
const filters = (page: Page) => page.getByRole('group', { name: 'Filter by priority' });
const filter = (page: Page, name: string) => filters(page).getByRole('button', { name, exact: true });
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);

async function addTask(page: Page, name: string, level = '') {
  await title(page).fill(name);
  await priority(page).selectOption(level);
  await title(page).press('Enter');
  await expect(titles(page).getByText(name, { exact: true })).toHaveCount(1);
}

async function expectPressed(page: Page, name: string) {
  for (const choice of ['All', 'High', 'Medium', 'Low', 'None']) {
    await expect(filter(page, choice)).toHaveAttribute('aria-pressed', String(choice === name));
  }
}

/** Collects uncaught page errors and console errors, so "no error is shown" can be checked. */
function pageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/** Stores `items` before any page script runs, on the first navigation only. */
async function seed(page: Page, items: Record<string, string>) {
  await page.addInitScript((values) => {
    if (!sessionStorage.getItem('seeded')) {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
      sessionStorage.setItem('seeded', '1');
    }
  }, items);
}

const SEEDED_TASKS = JSON.stringify({
  version: 1,
  tasks: [
    ['a', 'Ship release', 'high'],
    ['b', 'Water plants', 'low'],
    ['c', 'Call mum', null],
  ].map(([id, name, level], index) => ({
    id,
    title: name,
    dueDate: null,
    priority: level,
    completed: false,
    createdAt: `2026-09-25T0${index}:00:00.000Z`,
  })),
});

// Each test gets a fresh browser context, so localStorage starts empty.

test('#36 AC1: after choosing "High" and reloading, "High" is pressed and only High tasks are listed', async ({
  page,
}) => {
  await page.goto('/');
  await addTask(page, 'Ship release', 'high');
  await addTask(page, 'Water plants', 'low');
  await addTask(page, 'Call mum');
  await filter(page, 'High').click();
  await expect(titles(page)).toHaveText(['Ship release']);
  await page.reload();
  await expectPressed(page, 'High');
  await expect(titles(page)).toHaveText(['Ship release']);
});

test('#36 AC2: after choosing "Low", a new page in the same browser opens with "Low" pressed', async ({
  context,
  page,
}) => {
  await page.goto('/');
  await addTask(page, 'Ship release', 'high');
  await addTask(page, 'Water plants', 'low');
  await filter(page, 'Low').click();
  await expectPressed(page, 'Low');
  await page.close();

  const reopened = await context.newPage();
  await reopened.goto('/');
  await expectPressed(reopened, 'Low');
  await expect(titles(reopened)).toHaveText(['Water plants']);
});

test('#36 AC3: on a first visit "All" is pressed and every task of the view is listed', async ({ page }) => {
  await seed(page, { [KEY]: SEEDED_TASKS });
  await page.goto('/');
  expect(await stored(page, FILTER_KEY)).toBeNull();
  await expectPressed(page, 'All');
  await expect(titles(page)).toHaveText(['Ship release', 'Water plants', 'Call mum']);
});

test('#36 AC4: an unknown remembered value opens on "All" with no error, and the tasks load as without it', async ({
  page,
}) => {
  const errors = pageErrors(page);
  await seed(page, { [KEY]: SEEDED_TASKS, [FILTER_KEY]: 'urgent' });
  await page.goto('/');
  await expectPressed(page, 'All');
  await expect(titles(page)).toHaveText(['Ship release', 'Water plants', 'Call mum']);
  await expect(page.getByRole('alert')).toHaveText('');
  expect(errors).toEqual([]);
  expect(await stored(page, KEY)).toBe(SEEDED_TASKS);
});

test('#36 AC5: choosing filters and reloading leaves task-tracker:v1 unchanged', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Ship release', 'high');
  await addTask(page, 'Water plants', 'low');
  await addTask(page, 'Call mum');
  const before = await stored(page, KEY);
  expect(before).not.toBeNull();
  for (const choice of ['High', 'Medium', 'Low', 'None', 'All', 'High']) {
    await filter(page, choice).click();
    await expectPressed(page, choice);
  }
  await page.reload();
  await expectPressed(page, 'High');
  expect(await stored(page, KEY)).toBe(before);
  expect(await stored(page, FILTER_KEY)).toBe('high');
});
