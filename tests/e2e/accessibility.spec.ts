import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');
const view = (page: Page, name: 'Active' | 'Completed') =>
  page.getByRole('button', { name, exact: true });

async function addTask(page: Page, name: string) {
  await page.getByLabel('Task title').fill(name);
  await page.getByLabel('Task title').press('Enter');
  await expect(titles(page).getByText(name, { exact: true })).toHaveCount(1);
}

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
}

/** Presses Tab (or Shift+Tab) until the target has focus: proves it is reachable by keyboard. */
async function tabTo(page: Page, target: Locator, key: 'Tab' | 'Shift+Tab' = 'Tab') {
  for (let i = 0; i < 30; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  await expect(target).toBeFocused();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('#12 AC1: axe reports no violations in the Active view', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await addTask(page, 'Walk dog');
  await expectNoViolations(page);
});

test('#12 AC1: axe reports no violations in the Completed view', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await page.getByRole('checkbox', { name: 'Done: Buy milk' }).click();
  await view(page, 'Completed').click();
  await expect(titles(page)).toHaveText(['Buy milk']);
  await expectNoViolations(page);
});

test('#12 AC1: axe reports no violations with a task in edit mode', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await list(page).getByRole('button', { name: 'Edit Buy milk' }).click();
  await expect(list(page).getByLabel('New title')).toBeVisible();
  await expectNoViolations(page);
  // And with the edit form's validation message showing.
  await list(page).getByLabel('New title').fill('');
  await list(page).getByLabel('New title').press('Enter');
  await expect(list(page).locator('.task-edit-message')).not.toBeEmpty();
  await expectNoViolations(page);
});

test('#12 AC2: the whole task journey works with the keyboard only', async ({ page }) => {
  const kb = page.keyboard;
  // Add a task with a due date and priority.
  await tabTo(page, page.getByLabel('Task title'));
  await kb.type('Buy milk');
  await tabTo(page, page.getByLabel('Due date', { exact: true }));
  await kb.type('05052026'); // day equals month, so the OS locale's segment order does not matter
  await tabTo(page, page.getByLabel('Priority', { exact: true }));
  await kb.type('High');
  await tabTo(page, page.getByRole('button', { name: 'Add' }));
  await kb.press('Enter');
  await expect(titles(page)).toHaveText(['Buy milk']);
  await expect(list(page).locator('time')).toHaveAttribute('datetime', '2026-05-05');
  await expect(list(page).locator('.task-priority')).toHaveText('High priority');

  // Complete it, then switch to the Completed view.
  await tabTo(page, page.getByRole('checkbox', { name: 'Done: Buy milk' }));
  await kb.press('Space');
  await expect(titles(page)).toHaveCount(0);
  await tabTo(page, view(page, 'Completed'), 'Shift+Tab');
  await kb.press('Enter');
  await expect(titles(page)).toHaveText(['Buy milk']);

  // Edit it: Enter on Edit focuses the title field, Enter saves.
  await tabTo(page, list(page).getByRole('button', { name: 'Edit Buy milk' }));
  await kb.press('Enter');
  await expect(list(page).getByLabel('New title')).toBeFocused();
  await kb.press('ControlOrMeta+a');
  await kb.type('Buy oat milk');
  await kb.press('Enter');
  await expect(titles(page)).toHaveText(['Buy oat milk']);

  // Reopen it, go back to Active and delete it.
  await tabTo(page, page.getByRole('checkbox', { name: 'Done: Buy oat milk' }), 'Shift+Tab');
  await kb.press('Space');
  await expect(titles(page)).toHaveCount(0);
  await tabTo(page, view(page, 'Active'), 'Shift+Tab');
  await kb.press('Enter');
  await expect(titles(page)).toHaveText(['Buy oat milk']);
  await tabTo(page, list(page).getByRole('button', { name: 'Delete Buy oat milk' }));
  await kb.press('Enter');
  await expect(titles(page)).toHaveCount(0);
});

test('#12 AC3: the checkbox, Edit and Delete names include the task title', async ({ page }) => {
  await addTask(page, 'Buy milk');
  const row = list(page).getByRole('listitem');
  await expect(row.getByRole('checkbox')).toHaveAccessibleName(/Buy milk/);
  await expect(row.locator('.task-edit')).toHaveAccessibleName(/Buy milk/);
  await expect(row.locator('.task-delete')).toHaveAccessibleName(/Buy milk/);
  // getByRole with the name finds each one.
  await expect(row.getByRole('checkbox', { name: 'Buy milk' })).toHaveCount(1);
  await expect(row.getByRole('button', { name: 'Edit Buy milk' })).toHaveCount(1);
  await expect(row.getByRole('button', { name: 'Delete Buy milk' })).toHaveCount(1);
});

test('#12 AC4: the empty-title message is in a live region the field refers to', async ({ page }) => {
  const field = page.getByLabel('Task title');
  await field.press('Enter');
  const id = await field.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  const message = page.locator(`#${id}`);
  await expect(message).toHaveText('A title is required.');
  await expect(message).toHaveAttribute('aria-live', /polite|assertive/);
  await expect(field).toHaveAccessibleDescription('A title is required.');
});

/** Tabs through every focusable element and checks that each shows a focus outline. */
async function expectVisibleFocus(page: Page) {
  const seen = new Set<string>();
  let previous = '';
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return {
        key: el.id || el.getAttribute('aria-label') || el.textContent || el.tagName,
        outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
        shadow: style.boxShadow !== 'none',
      };
    });
    // Tab also steps through a date input's segments, so the same element can stay focused.
    if (!focus || focus.key === previous) continue;
    if (seen.has(focus.key)) break; // wrapped around
    previous = focus.key;
    seen.add(focus.key);
    expect(focus.outline || focus.shadow, `focus indicator on ${focus.key}`).toBe(true);
  }
  expect(seen.size).toBeGreaterThan(3);
}

test('#12 AC5: every focused element shows a visible focus indicator', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await expectVisibleFocus(page);
  await list(page).getByRole('button', { name: 'Edit Buy milk' }).click();
  await expectVisibleFocus(page);
});
