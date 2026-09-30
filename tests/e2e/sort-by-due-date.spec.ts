import { expect, test, type Page } from '@playwright/test';

const title = (page: Page) => page.getByLabel('Task title');
const dueDate = (page: Page) => page.getByLabel('Due date');
const priority = (page: Page) => page.getByLabel('Priority');
const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');

async function addTask(page: Page, name: string, due = '', level = '') {
  await title(page).fill(name);
  await dueDate(page).fill(due);
  await priority(page).selectOption(level);
  await title(page).press('Enter');
  await expect(list(page).getByText(name, { exact: true })).toHaveCount(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('#7 AC1: tasks added out of order are listed soonest due first', async ({ page }) => {
  await addTask(page, 'Due Oct 3', '2026-10-03');
  await addTask(page, 'Due Oct 1', '2026-10-01');
  await addTask(page, 'Due Oct 2', '2026-10-02');
  await expect(titles(page)).toHaveText(['Due Oct 1', 'Due Oct 2', 'Due Oct 3']);
});

test('#7 AC2: tasks without a due date come after every task with one', async ({ page }) => {
  await addTask(page, 'Someday');
  await addTask(page, 'Late', '2026-12-31');
  await addTask(page, 'Whenever');
  await addTask(page, 'Early', '2026-10-01');
  await expect(titles(page)).toHaveText(['Early', 'Late', 'Someday', 'Whenever']);
});

test('#7 AC3: ties keep the order in which the tasks were created', async ({ page }) => {
  await addTask(page, 'Same day A', '2026-10-05');
  await addTask(page, 'Undated A');
  await addTask(page, 'Same day B', '2026-10-05');
  await addTask(page, 'Undated B');
  await expect(titles(page)).toHaveText(['Same day A', 'Same day B', 'Undated A', 'Undated B']);
});

test('#7 AC4: priority does not change the order of tasks due the same day', async ({ page }) => {
  await addTask(page, 'Low one', '2026-10-05', 'low');
  await addTask(page, 'High one', '2026-10-05', 'high');
  await addTask(page, 'Medium one', '2026-10-05', 'medium');
  await expect(titles(page)).toHaveText(['Low one', 'High one', 'Medium one']);
});

test('#7 AC5: the order is the same after a reload', async ({ page }) => {
  await addTask(page, 'Undated');
  await addTask(page, 'Due Oct 3', '2026-10-03', 'high');
  await addTask(page, 'Due Oct 1', '2026-10-01');
  await addTask(page, 'Also Oct 3', '2026-10-03', 'low');
  const expected = ['Due Oct 1', 'Due Oct 3', 'Also Oct 3', 'Undated'];
  await expect(titles(page)).toHaveText(expected);
  await page.reload();
  await expect(titles(page)).toHaveText(expected);
});
