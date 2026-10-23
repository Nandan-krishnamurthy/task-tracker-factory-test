import { expect, test, type Page } from '@playwright/test';

const title = (page: Page) => page.getByLabel('Task title');
const dueDate = (page: Page) => page.getByLabel('Due date');
const priority = (page: Page) => page.getByLabel('Priority', { exact: true });
const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');
const views = (page: Page) => page.getByRole('group', { name: 'Show' });
const view = (page: Page, name: 'Active' | 'Completed') =>
  views(page).getByRole('button', { name, exact: true });
const filters = (page: Page) => page.getByRole('group', { name: 'Filter by priority' });
const filter = (page: Page, name: string) => filters(page).getByRole('button', { name, exact: true });
// Clicked, not check()ed: ticking moves the row out of the current view, so check() cannot confirm it.
const doneBox = (page: Page, name: string) =>
  page.getByRole('checkbox', { name: `Done: ${name}`, exact: true });

async function addTask(page: Page, name: string, level = '', due = '') {
  await title(page).fill(name);
  await dueDate(page).fill(due);
  await priority(page).selectOption(level);
  await title(page).press('Enter');
  await expect(titles(page).getByText(name, { exact: true })).toHaveCount(1);
}

async function expectPressed(page: Page, name: string) {
  for (const choice of ['All', 'High', 'Medium', 'Low', 'None']) {
    await expect(filter(page, choice)).toHaveAttribute('aria-pressed', String(choice === name));
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('#34 AC1: both views show the five filter choices in order, with All pressed', async ({ page }) => {
  await expect(filters(page).getByRole('button')).toHaveText(['All', 'High', 'Medium', 'Low', 'None']);
  await expectPressed(page, 'All');
  await view(page, 'Completed').click();
  await expect(filters(page).getByRole('button')).toHaveText(['All', 'High', 'Medium', 'Low', 'None']);
  await expectPressed(page, 'All');
});

test('#34 AC2: each choice lists only the matching tasks of the view', async ({ page }) => {
  await addTask(page, 'Ship release', 'high');
  await addTask(page, 'Review notes', 'medium');
  await addTask(page, 'Water plants', 'low');
  await addTask(page, 'Call mum');
  await filter(page, 'High').click();
  await expectPressed(page, 'High');
  await expect(titles(page)).toHaveText(['Ship release']);
  await filter(page, 'Medium').click();
  await expect(titles(page)).toHaveText(['Review notes']);
  await filter(page, 'Low').click();
  await expect(titles(page)).toHaveText(['Water plants']);
  await filter(page, 'None').click();
  await expect(titles(page)).toHaveText(['Call mum']);
  await filter(page, 'All').click();
  await expect(titles(page)).toHaveText(['Ship release', 'Review notes', 'Water plants', 'Call mum']);
});

test('#34 AC3: matching tasks keep the due-date order, undated last', async ({ page }) => {
  await addTask(page, 'Undated high', 'high');
  await addTask(page, 'Later high', 'high', '2026-11-02');
  await addTask(page, 'Sooner low', 'low', '2026-10-01');
  await addTask(page, 'Sooner high', 'high', '2026-10-30');
  await addTask(page, 'Same day high', 'high', '2026-11-02');
  await filter(page, 'High').click();
  await expect(titles(page)).toHaveText(['Sooner high', 'Later high', 'Same day high', 'Undated high']);
});

test('#34 AC4: the chosen filter stays chosen when switching views', async ({ page }) => {
  await addTask(page, 'Open high', 'high');
  await addTask(page, 'Open low', 'low');
  await addTask(page, 'Done high', 'high');
  await addTask(page, 'Done low', 'low');
  await doneBox(page, 'Done high').click();
  await doneBox(page, 'Done low').click();
  await filter(page, 'High').click();
  await expect(titles(page)).toHaveText(['Open high']);
  await view(page, 'Completed').click();
  await expectPressed(page, 'High');
  await expect(titles(page)).toHaveText(['Done high']);
  await view(page, 'Active').click();
  await expectPressed(page, 'High');
  await expect(titles(page)).toHaveText(['Open high']);
});

test('#34 AC5: with All chosen, both views list what they listed before, in the same order', async ({
  page,
}) => {
  await addTask(page, 'Second', 'low', '2026-11-05');
  await addTask(page, 'First', '', '2026-10-05');
  await addTask(page, 'Last', 'high');
  await addTask(page, 'Finished', 'medium');
  await doneBox(page, 'Finished').click();
  await expectPressed(page, 'All');
  await expect(titles(page)).toHaveText(['First', 'Second', 'Last']);
  await view(page, 'Completed').click();
  await expect(titles(page)).toHaveText(['Finished']);
});
