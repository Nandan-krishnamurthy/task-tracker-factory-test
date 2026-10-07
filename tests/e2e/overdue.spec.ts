import { expect, test, type Page } from '@playwright/test';

const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');
const row = (page: Page, name: string) =>
  list(page).getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) });
const overdue = (page: Page, name: string) => row(page, name).locator('.task-overdue');

async function addTask(page: Page, name: string, due = '') {
  await page.getByLabel('Task title').fill(name);
  await page.getByLabel('Due date', { exact: true }).fill(due);
  await page.getByLabel('Task title').press('Enter');
  await expect(titles(page).getByText(name, { exact: true })).toHaveCount(1);
}

async function editDue(page: Page, name: string, due: string) {
  await list(page).getByRole('button', { name: `Edit ${name}`, exact: true }).click();
  await list(page).getByLabel('New due date').fill(due);
  await list(page).getByRole('button', { name: 'Save' }).click();
  await expect(list(page).getByLabel('New due date')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  // Today is 2026-10-07 on the device, whatever the real date is.
  await page.clock.setFixedTime(new Date(2026, 9, 7, 10, 0));
  await page.goto('/');
});

test('#27 AC1: an active task due before today is marked "Overdue"', async ({ page }) => {
  await addTask(page, 'Pay rent', '2026-10-06');
  await expect(overdue(page, 'Pay rent')).toHaveText('Overdue');
});

test('#27 AC2: tasks due today, tomorrow or never are not marked', async ({ page }) => {
  await addTask(page, 'Due today', '2026-10-07');
  await addTask(page, 'Due tomorrow', '2026-10-08');
  await addTask(page, 'No date');
  for (const name of ['Due today', 'Due tomorrow', 'No date']) {
    await expect(overdue(page, name)).toHaveCount(0);
  }
});

test('#27 AC3: completing removes the label, and reopening shows it again', async ({ page }) => {
  await addTask(page, 'Pay rent', '2026-10-06');
  await page.getByRole('checkbox', { name: 'Done: Pay rent', exact: true }).click();
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(titles(page)).toHaveText(['Pay rent']);
  await expect(overdue(page, 'Pay rent')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Done: Pay rent', exact: true }).click();
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(overdue(page, 'Pay rent')).toHaveText('Overdue');
});

test('#27 AC4: editing the due date shows or removes the label at once', async ({ page }) => {
  await addTask(page, 'Pay rent', '2026-10-06');
  await addTask(page, 'Call mum', '2026-10-09');
  await editDue(page, 'Pay rent', '2026-10-08');
  await expect(overdue(page, 'Pay rent')).toHaveCount(0);
  await editDue(page, 'Pay rent', '2026-10-01');
  await expect(overdue(page, 'Pay rent')).toHaveText('Overdue');
  await editDue(page, 'Pay rent', '');
  await expect(overdue(page, 'Pay rent')).toHaveCount(0);
  await expect(overdue(page, 'Call mum')).toHaveCount(0);
  await editDue(page, 'Call mum', '2026-10-05');
  await expect(overdue(page, 'Call mum')).toHaveText('Overdue');
});

test('#27 AC5: the order and the due text are unchanged by the label', async ({ page }) => {
  await addTask(page, 'Later', '2026-10-20');
  await addTask(page, 'Late', '2026-10-01');
  await addTask(page, 'Undated');
  await expect(titles(page)).toHaveText(['Late', 'Later', 'Undated']);
  await expect(row(page, 'Late').locator('time')).toHaveText(/^Due .*2026/);
  await expect(row(page, 'Late').locator('time')).toHaveAttribute('datetime', '2026-10-01');
});
