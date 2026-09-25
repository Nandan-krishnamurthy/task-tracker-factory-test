import { expect, test, type Page } from '@playwright/test';

const REQUIRED = 'A title is required.';
const title = (page: Page) => page.getByLabel('Task title');
const tasks = (page: Page) => page.getByRole('list', { name: 'Tasks' }).getByRole('listitem');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // A marker that a page reload would erase.
  await page.evaluate(() => {
    (window as unknown as { marker: number }).marker = 1;
  });
});

async function expectNoReload(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
}

test('#3 AC1: opens straight onto the add-task form, with no setup step', async ({ page }) => {
  await expect(title(page)).toBeVisible();
  await expect(title(page)).toBeEditable();
  await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
  await expect(page.getByText(/sign ?up|log ?in|password/i)).toHaveCount(0);
});

test('#3 AC2: Enter adds the task without a reload and clears the field', async ({ page }) => {
  await title(page).fill('Buy milk');
  await title(page).press('Enter');
  await expect(tasks(page)).toHaveText(['Buy milk']);
  await expect(title(page)).toHaveValue('');
  await expectNoReload(page);
});

test('#3 AC2: the Add button adds the task too', async ({ page }) => {
  await title(page).fill('Buy milk');
  await page.getByRole('button', { name: 'Add' }).click();
  await title(page).fill('Walk dog');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(tasks(page)).toHaveText(['Buy milk', 'Walk dog']);
  await expect(title(page)).toHaveValue('');
  await expectNoReload(page);
});

test('#3 AC3: an empty or whitespace-only title adds nothing and shows a message', async ({ page }) => {
  for (const value of ['', '   ']) {
    await title(page).fill(value);
    await title(page).press('Enter');
    await expect(page.getByText(REQUIRED)).toBeVisible();
    await expect(tasks(page)).toHaveCount(0);
  }
});

test('#3 AC4: the message disappears after a valid title is added', async ({ page }) => {
  await title(page).press('Enter');
  await expect(page.getByText(REQUIRED)).toBeVisible();
  await title(page).fill('Buy milk');
  await title(page).press('Enter');
  await expect(tasks(page)).toHaveText(['Buy milk']);
  await expect(page.getByText(REQUIRED)).toHaveCount(0);
});

test('#3 AC5: shows the trimmed title', async ({ page }) => {
  await title(page).fill('   Buy milk   ');
  await title(page).press('Enter');
  expect(await tasks(page).first().evaluate((li) => li.textContent)).toBe('Buy milk');
});
