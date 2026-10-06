import { expect, test, type Page } from '@playwright/test';

const title = (page: Page) => page.getByLabel('Task title');
const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');
const deleteButton = (page: Page, name: string) =>
  list(page).getByRole('button', { name: `Delete ${name}`, exact: true });
const activeView = (page: Page) => page.getByRole('button', { name: 'Active', exact: true });
const completedView = (page: Page) => page.getByRole('button', { name: 'Completed', exact: true });

async function addTask(page: Page, name: string) {
  await title(page).fill(name);
  await title(page).press('Enter');
  await expect(titles(page).getByText(name, { exact: true })).toHaveCount(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('#11 AC1: deleting an active task removes it from both views at once', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await deleteButton(page, 'Buy milk').click();
  await expect(titles(page)).toHaveText(['Walk dog']);
  await completedView(page).click();
  await expect(titles(page)).toHaveCount(0);
});

test('#11 AC2: deleting a completed task in the Completed view removes it from both views', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await page.getByRole('checkbox', { name: 'Done: Buy milk', exact: true }).click();
  await completedView(page).click();
  await expect(titles(page)).toHaveText(['Buy milk']);
  await deleteButton(page, 'Buy milk').click();
  await expect(titles(page)).toHaveCount(0);
  await activeView(page).click();
  await expect(titles(page)).toHaveText(['Walk dog']);
});

test('#11 AC3: a deleted task does not come back after a reload', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await deleteButton(page, 'Buy milk').click();
  await expect(titles(page)).toHaveText(['Walk dog']);
  await page.reload();
  await expect(titles(page)).toHaveText(['Walk dog']);
  await completedView(page).click();
  await expect(titles(page)).toHaveCount(0);
});

test('#11 AC4: a keyboard delete moves focus to the next Delete button, then to the title field', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await deleteButton(page, 'Buy milk').focus();
  await page.keyboard.press('Enter');
  await expect(titles(page)).toHaveText(['Walk dog']);
  await expect(deleteButton(page, 'Walk dog')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(titles(page)).toHaveCount(0);
  await expect(title(page)).toBeFocused();
});

test('#11 AC4: deleting the last row moves focus to the Delete button of the row above', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await deleteButton(page, 'Walk dog').focus();
  await page.keyboard.press('Enter');
  await expect(titles(page)).toHaveText(['Buy milk']);
  await expect(deleteButton(page, 'Buy milk')).toBeFocused();
});
