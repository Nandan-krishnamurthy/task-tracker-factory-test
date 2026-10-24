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

async function editPriority(page: Page, name: string, level: string) {
  await list(page).getByRole('button', { name: `Edit ${name}`, exact: true }).click();
  await list(page).getByLabel('New priority').selectOption(level);
  await list(page).getByRole('button', { name: 'Save' }).click();
  await expect(list(page).getByLabel('New priority')).toHaveCount(0);
}

test('#35 AC1: with "High" chosen, changing, clearing and completing tasks update the list at once', async ({
  page,
}) => {
  await addTask(page, 'Ship release', 'high');
  await addTask(page, 'Review notes', 'high');
  await addTask(page, 'Fix bug', 'high');
  await addTask(page, 'Water plants', 'low');
  await filter(page, 'High').click();
  await expect(titles(page)).toHaveText(['Ship release', 'Review notes', 'Fix bug']);
  await editPriority(page, 'Ship release', 'low');
  await expect(titles(page)).toHaveText(['Review notes', 'Fix bug']);
  await editPriority(page, 'Review notes', '');
  await expect(titles(page)).toHaveText(['Fix bug']);
  await doneBox(page, 'Fix bug').click();
  await expect(titles(page)).toHaveCount(0);
  await view(page, 'Completed').click();
  await expectPressed(page, 'High');
  await expect(titles(page)).toHaveText(['Fix bug']);
  // A Low task changed to High leaves "Low" and is listed under "High".
  await view(page, 'Active').click();
  await filter(page, 'Low').click();
  await expect(titles(page)).toHaveText(['Ship release', 'Water plants']);
  await editPriority(page, 'Water plants', 'high');
  await expect(titles(page)).toHaveText(['Ship release']);
  await filter(page, 'High').click();
  await expect(titles(page)).toHaveText(['Water plants']);
});

test('#35 AC2: adding a task chooses "All", and a rejected add keeps the chosen filter', async ({ page }) => {
  await addTask(page, 'Water plants', 'low');
  await addTask(page, 'Ship release', 'high');
  await filter(page, 'Low').click();
  await expect(titles(page)).toHaveText(['Water plants']);
  await title(page).fill('');
  await title(page).press('Enter');
  await expect(page.locator('#task-title-message')).toHaveText('A title is required.');
  await expectPressed(page, 'Low');
  await expect(titles(page)).toHaveText(['Water plants']);
  await addTask(page, 'Call mum');
  await expectPressed(page, 'All');
  await expect(titles(page)).toHaveText(['Water plants', 'Ship release', 'Call mum']);
});
