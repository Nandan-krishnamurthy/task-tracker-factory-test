import { expect, test, type Page } from '@playwright/test';

const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');
const row = (page: Page, name: string) =>
  list(page).getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) });

async function addTask(page: Page, name: string, due = '', level = '') {
  await page.getByLabel('Task title').fill(name);
  await page.getByLabel('Due date', { exact: true }).fill(due);
  await page.getByLabel('Priority', { exact: true }).selectOption(level);
  await page.getByLabel('Task title').press('Enter');
  await expect(titles(page).getByText(name, { exact: true })).toHaveCount(1);
}

async function edit(page: Page, name: string, change: { due?: string; level?: string }) {
  await list(page).getByRole('button', { name: `Edit ${name}`, exact: true }).click();
  if (change.due !== undefined) await list(page).getByLabel('New due date').fill(change.due);
  if (change.level !== undefined) await list(page).getByLabel('New priority').selectOption(change.level);
  await list(page).getByRole('button', { name: 'Save' }).click();
  await expect(list(page).getByLabel('New due date')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('#10 AC1: a set or changed due date is shown and moves the task', async ({ page }) => {
  await addTask(page, 'Pay rent', '2026-10-05');
  await addTask(page, 'Call mum');
  await expect(titles(page)).toHaveText(['Pay rent', 'Call mum']);
  await edit(page, 'Call mum', { due: '2026-10-01' });
  await expect(titles(page)).toHaveText(['Call mum', 'Pay rent']);
  await expect(row(page, 'Call mum').locator('time')).toHaveAttribute('datetime', '2026-10-01');
  await edit(page, 'Call mum', { due: '2026-10-09' });
  await expect(titles(page)).toHaveText(['Pay rent', 'Call mum']);
  await expect(row(page, 'Call mum').locator('time')).toHaveAttribute('datetime', '2026-10-09');
});

test('#10 AC2: a cleared due date is not shown and the task moves last', async ({ page }) => {
  await addTask(page, 'Pay rent', '2026-10-01');
  await addTask(page, 'Call mum', '2026-10-02');
  await edit(page, 'Pay rent', { due: '' });
  await expect(row(page, 'Pay rent').locator('time')).toHaveCount(0);
  await expect(titles(page)).toHaveText(['Call mum', 'Pay rent']);
});

test('#10 AC3: a set or changed priority is shown', async ({ page }) => {
  await addTask(page, 'Pay rent');
  for (const [value, label] of [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]) {
    await edit(page, 'Pay rent', { level: value });
    await expect(row(page, 'Pay rent').locator('.task-priority')).toHaveText(`${label} priority`);
  }
});

test('#10 AC4: "No priority" removes the priority', async ({ page }) => {
  await addTask(page, 'Pay rent', '', 'high');
  await edit(page, 'Pay rent', { level: '' });
  await expect(row(page, 'Pay rent').locator('.task-priority')).toHaveCount(0);
});

test('#10 AC5: changes to a completed task are kept after a reload', async ({ page }) => {
  await addTask(page, 'Pay rent', '2026-10-01', 'low');
  await page.getByRole('checkbox', { name: 'Done: Pay rent', exact: true }).click();
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await edit(page, 'Pay rent', { due: '2026-11-15', level: 'high' });
  await page.reload();
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(row(page, 'Pay rent').locator('time')).toHaveAttribute('datetime', '2026-11-15');
  await expect(row(page, 'Pay rent').locator('.task-priority')).toHaveText('High priority');
  await expect(page.getByRole('checkbox', { name: 'Done: Pay rent', exact: true })).toBeChecked();
});
