import { expect, test, type Page } from '@playwright/test';

const title = (page: Page) => page.getByLabel('Task title');
const dueDate = (page: Page) => page.getByLabel('Due date');
const priority = (page: Page) => page.getByLabel('Priority');
const tasks = (page: Page) => page.getByRole('list', { name: 'Tasks' }).getByRole('listitem');
const task = (page: Page, name: string) => tasks(page).filter({ hasText: name });

async function addTask(page: Page, name: string, due = '', level = '') {
  await title(page).fill(name);
  await dueDate(page).fill(due);
  await priority(page).selectOption(level);
  await title(page).press('Enter');
  await expect(task(page, name)).toHaveCount(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('#6 AC1: a task added with a due date shows that date', async ({ page }) => {
  await addTask(page, 'Pay rent', '2026-10-01');
  const due = task(page, 'Pay rent').locator('time');
  await expect(due).toHaveAttribute('datetime', '2026-10-01');
  await expect(due).toBeVisible();
  await expect(due).toHaveText(/^Due .*2026/);
});

for (const [value, label] of [
  ['low', 'Low'],
  ['medium', 'Medium'],
  ['high', 'High'],
]) {
  test(`#6 AC2: a task added with priority ${label} shows that priority`, async ({ page }) => {
    await addTask(page, `Task ${label}`, '', value);
    await expect(task(page, `Task ${label}`)).toContainText(`${label} priority`);
  });
}

test('#6 AC3: a task added with neither shows neither', async ({ page }) => {
  await addTask(page, 'Walk dog');
  await expect(task(page, 'Walk dog')).toHaveText('Walk dog');
  await expect(task(page, 'Walk dog').locator('time')).toHaveCount(0);
  await expect(task(page, 'Walk dog')).not.toContainText('priority');
});

test('#6 AC4: due date and priority are unchanged after a reload', async ({ page }) => {
  await addTask(page, 'Pay rent', '2026-10-01', 'high');
  await addTask(page, 'Call mum', '', 'low');
  await addTask(page, 'Walk dog');
  const before = await tasks(page).allTextContents();
  await page.reload();
  await expect(tasks(page)).toHaveText(before);
  await expect(task(page, 'Pay rent').locator('time')).toHaveAttribute('datetime', '2026-10-01');
  await expect(task(page, 'Pay rent')).toContainText('High priority');
  await expect(task(page, 'Call mum')).toContainText('Low priority');
  await expect(task(page, 'Walk dog')).toHaveText('Walk dog');
});

test('#6 AC5: the priority choices are only none, Low, Medium and High', async ({ page }) => {
  const options = priority(page).locator('option');
  await expect(options).toHaveText(['No priority', 'Low', 'Medium', 'High']);
  await expect(priority(page)).toHaveValue('');
});
