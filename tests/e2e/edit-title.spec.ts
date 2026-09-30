import { expect, test, type Page } from '@playwright/test';

const title = (page: Page) => page.getByLabel('Task title');
const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');
const editButton = (page: Page, name: string) =>
  list(page).getByRole('button', { name: `Edit ${name}`, exact: true });
const editField = (page: Page) => list(page).getByLabel('New title');
const completedView = (page: Page) => page.getByRole('button', { name: 'Completed', exact: true });
const REQUIRED = 'A title is required.';

async function addTask(page: Page, name: string) {
  await title(page).fill(name);
  await title(page).press('Enter');
  await expect(titles(page).getByText(name, { exact: true })).toHaveCount(1);
}

async function rename(page: Page, from: string, to: string) {
  await editButton(page, from).click();
  await expect(editField(page)).toHaveValue(from);
  await editField(page).fill(to);
  await editField(page).press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('#9 AC1: editing an active task shows the new title immediately', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await rename(page, 'Buy milk', 'Buy oat milk');
  await expect(titles(page)).toHaveText(['Buy oat milk', 'Walk dog']);
  await expect(editField(page)).toHaveCount(0);
  await expect(editButton(page, 'Buy oat milk')).toBeFocused();
});

test('#9 AC2: editing a completed task shows the new title and it stays completed', async ({
  page,
}) => {
  await addTask(page, 'Buy milk');
  await page.getByRole('checkbox', { name: 'Done: Buy milk', exact: true }).click();
  await completedView(page).click();
  await rename(page, 'Buy milk', 'Buy oat milk');
  await expect(titles(page)).toHaveText(['Buy oat milk']);
  await expect(page.getByRole('checkbox', { name: 'Done: Buy oat milk', exact: true })).toBeChecked();
});

test('#9 AC3: an empty or whitespace-only title is rejected with a message, and the old title kept', async ({
  page,
}) => {
  await addTask(page, 'Buy milk');
  for (const empty of ['', '   ']) {
    await editButton(page, 'Buy milk').click();
    await editField(page).fill(empty);
    await editField(page).press('Enter');
    await expect(list(page).getByText(REQUIRED)).toBeVisible();
    await expect(editField(page)).toBeFocused();
    await editField(page).press('Escape');
    await expect(titles(page)).toHaveText(['Buy milk']);
  }
  await page.reload();
  await expect(titles(page)).toHaveText(['Buy milk']);
});

test('#9 AC4: Escape cancels, keeps the old title and returns focus to the Edit button', async ({
  page,
}) => {
  await addTask(page, 'Buy milk');
  await editButton(page, 'Buy milk').click();
  await expect(editField(page)).toBeFocused();
  await editField(page).fill('Something else');
  await page.keyboard.press('Escape');
  await expect(editField(page)).toHaveCount(0);
  await expect(titles(page)).toHaveText(['Buy milk']);
  await expect(editButton(page, 'Buy milk')).toBeFocused();
});

test('#9 AC5: an edited title is still shown after a reload', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await rename(page, 'Buy milk', 'Buy oat milk');
  await expect(titles(page)).toHaveText(['Buy oat milk']);
  await page.reload();
  await expect(titles(page)).toHaveText(['Buy oat milk']);
});
