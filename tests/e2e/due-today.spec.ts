import { expect, test, type Page } from '@playwright/test';

const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');
const row = (page: Page, name: string) =>
  list(page).getByRole('listitem').filter({ has: titles(page).getByText(name, { exact: true }) });
// By class, not by text: a task may itself be titled "Due today" (#27 AC2 in overdue.spec.ts).
const dueToday = (page: Page, name: string) => row(page, name).locator('.task-due-today');
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

test.describe('during the day', () => {
  test.beforeEach(async ({ page }) => {
    // Today is 2026-10-07 on the device, whatever the real date is.
    await page.clock.setFixedTime(new Date(2026, 9, 7, 10, 0));
    await page.goto('/');
  });

  test('#41 AC1: only the active task due today is marked "Due today", next to its due date', async ({ page }) => {
    await addTask(page, 'Pay rent', '2026-10-06');
    await addTask(page, 'Water plants', '2026-10-07');
    await addTask(page, 'Call mum', '2026-10-08');
    await addTask(page, 'No date');
    await expect(dueToday(page, 'Water plants')).toHaveText('Due today');
    await expect(row(page, 'Water plants').locator('.task-due + .task-due-today')).toHaveCount(1);
    for (const name of ['Pay rent', 'Call mum', 'No date']) {
      await expect(dueToday(page, name)).toHaveCount(0);
    }
    await expect(overdue(page, 'Pay rent')).toHaveText('Overdue');
    await expect(overdue(page, 'Water plants')).toHaveCount(0);
  });

  test('#41 AC2: completing removes the label, and reopening shows it again', async ({ page }) => {
    await addTask(page, 'Water plants', '2026-10-07');
    await page.getByRole('checkbox', { name: 'Done: Water plants', exact: true }).click();
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await expect(titles(page)).toHaveText(['Water plants']);
    await expect(dueToday(page, 'Water plants')).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'Done: Water plants', exact: true }).click();
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await expect(dueToday(page, 'Water plants')).toHaveText('Due today');
  });

  test('#41 AC4: editing the due date shows or removes the label at once', async ({ page }) => {
    await addTask(page, 'Water plants', '2026-10-07');
    await addTask(page, 'Call mum', '2026-10-08');
    await editDue(page, 'Water plants', '2026-10-08');
    await expect(dueToday(page, 'Water plants')).toHaveCount(0);
    await editDue(page, 'Water plants', '2026-10-07');
    await expect(dueToday(page, 'Water plants')).toHaveText('Due today');
    await editDue(page, 'Water plants', '');
    await expect(dueToday(page, 'Water plants')).toHaveCount(0);
    await expect(dueToday(page, 'Call mum')).toHaveCount(0);
    await editDue(page, 'Call mum', '2026-10-07');
    await expect(dueToday(page, 'Call mum')).toHaveText('Due today');
  });
});

test('#41 AC3: at midnight, with no action or reload, "Due today" turns "Overdue" and the next day\'s task is marked', async ({
  page,
}) => {
  // Start just before the test time so the page loads with timers running, then pause at 23:59.
  await page.clock.install({ time: new Date(2026, 9, 7, 23, 58) });
  await page.goto('/');
  await addTask(page, 'Water plants', '2026-10-07');
  await addTask(page, 'Call mum', '2026-10-08');
  await page.clock.pauseAt(new Date(2026, 9, 7, 23, 59));
  await expect(dueToday(page, 'Water plants')).toHaveText('Due today');
  await expect(dueToday(page, 'Call mum')).toHaveCount(0);

  // Past midnight: the controller's timer fires; nothing is clicked and the page is not reloaded.
  await page.clock.runFor('01:01');
  await expect(overdue(page, 'Water plants')).toHaveText('Overdue');
  await expect(dueToday(page, 'Water plants')).toHaveCount(0);
  await expect(dueToday(page, 'Call mum')).toHaveText('Due today');
});
