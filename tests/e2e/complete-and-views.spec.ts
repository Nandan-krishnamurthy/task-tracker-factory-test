import { expect, test, type Page } from '@playwright/test';

const title = (page: Page) => page.getByLabel('Task title');
const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');
const views = (page: Page) => page.getByRole('group', { name: 'Show' });
const activeView = (page: Page) => views(page).getByRole('button', { name: 'Active', exact: true });
const completedView = (page: Page) =>
  views(page).getByRole('button', { name: 'Completed', exact: true });
// Clicked, not check()ed: ticking moves the row out of the current view, so check() cannot confirm it.
const doneBox = (page: Page, name: string) =>
  page.getByRole('checkbox', { name: `Done: ${name}`, exact: true });

async function addTask(page: Page, name: string) {
  await title(page).fill(name);
  await title(page).press('Enter');
  await expect(titles(page).getByText(name, { exact: true })).toHaveCount(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('#8 AC1: the app opens on the Active view, marked as current, listing only open tasks', async ({
  page,
}) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await doneBox(page, 'Walk dog').click();
  await page.reload();
  await expect(activeView(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(completedView(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(titles(page)).toHaveText(['Buy milk']);
});

test('#8 AC2: ticking an active task moves it from Active to Completed', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await doneBox(page, 'Buy milk').click();
  await expect(titles(page)).toHaveText(['Walk dog']);
  await completedView(page).click();
  await expect(titles(page)).toHaveText(['Buy milk']);
  await expect(doneBox(page, 'Buy milk')).toBeChecked();
});

test('#8 AC3: unticking a completed task moves it from Completed to Active', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await doneBox(page, 'Buy milk').click();
  await completedView(page).click();
  await doneBox(page, 'Buy milk').click();
  await expect(titles(page)).toHaveCount(0);
  await activeView(page).click();
  await expect(titles(page)).toHaveText(['Buy milk']);
  await expect(doneBox(page, 'Buy milk')).not.toBeChecked();
});

test('#8 AC4: the Completed view lists only done tasks and is marked as current', async ({
  page,
}) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await addTask(page, 'Pay rent');
  await doneBox(page, 'Walk dog').click();
  await doneBox(page, 'Pay rent').click();
  await completedView(page).click();
  await expect(completedView(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(activeView(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(titles(page)).toHaveText(['Walk dog', 'Pay rent']);
});

test('#8 AC4: the views and checkboxes work from the keyboard', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await doneBox(page, 'Buy milk').focus();
  await page.keyboard.press('Space');
  await expect(titles(page)).toHaveCount(0);
  await completedView(page).focus();
  await page.keyboard.press('Enter');
  await expect(completedView(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(titles(page)).toHaveText(['Buy milk']);
});

test('#8 AC5: a completed task is still completed after a reload', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await doneBox(page, 'Buy milk').click();
  await page.reload();
  await expect(titles(page)).toHaveText(['Walk dog']);
  await completedView(page).click();
  await expect(titles(page)).toHaveText(['Buy milk']);
  await expect(doneBox(page, 'Buy milk')).toBeChecked();
});

test('#8: adding a task while Completed is shown switches to Active', async ({ page }) => {
  await completedView(page).click();
  await addTask(page, 'Buy milk');
  await expect(activeView(page)).toHaveAttribute('aria-pressed', 'true');
});
