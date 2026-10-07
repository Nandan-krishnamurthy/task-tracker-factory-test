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

/** WCAG contrast ratio of two `rgb(r, g, b)` colours. */
function contrast(a: string, b: string): number {
  const luminance = (rgb: string) => {
    const [r, g, bl] = rgb.match(/\d+(\.\d+)?/g)!.slice(0, 3).map((c) => {
      const s = Number(c) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test.describe('overdue label', () => {
  test.beforeEach(async ({ page }) => {
    // Today is 2026-10-07 on the device, as in the STORY-013 tests.
    await page.clock.setFixedTime(new Date(2026, 9, 7, 10, 0));
    await page.goto('/');
  });

  async function addDue(page: Page, name: string, due: string) {
    await page.getByLabel('Task title').fill(name);
    await page.getByLabel('Due date', { exact: true }).fill(due);
    await page.getByLabel('Task title').press('Enter');
    await expect(titles(page).getByText(name, { exact: true })).toHaveCount(1);
  }

  test('#28 AC1: the Overdue label has its own style with AA contrast', async ({ page }) => {
    await addDue(page, 'Pay rent', '2026-10-06');
    const label = list(page).locator('.task-overdue');
    await expect(label).toHaveText('Overdue');
    const styles = await label.evaluate((el) => {
      const own = getComputedStyle(el);
      const title = getComputedStyle(el.parentElement!.querySelector('.task-title')!);
      // The nearest ancestor with a painted background; none means the white canvas.
      let bg = 'rgb(255, 255, 255)';
      for (let node: Element | null = el; node; node = node.parentElement) {
        const color = getComputedStyle(node).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
          bg = color;
          break;
        }
      }
      return {
        color: own.color,
        weight: own.fontWeight,
        titleColor: title.color,
        titleWeight: title.fontWeight,
        bg,
      };
    });
    expect([styles.color, styles.weight]).not.toEqual([styles.titleColor, styles.titleWeight]);
    expect(contrast(styles.color, styles.bg)).toBeGreaterThanOrEqual(4.5);
  });

  test('#28 AC2: axe reports no violations with an overdue task in the Active view', async ({ page }) => {
    await addDue(page, 'Pay rent', '2026-10-06');
    await expect(list(page).locator('.task-overdue')).toHaveText('Overdue');
    await expectNoViolations(page);
  });

  test('#28 AC3: axe reports no violations with a past-dated task in the Completed view', async ({ page }) => {
    await addDue(page, 'Pay rent', '2026-10-01');
    await page.getByRole('checkbox', { name: 'Done: Pay rent' }).click();
    await view(page, 'Completed').click();
    await expect(titles(page)).toHaveText(['Pay rent']);
    await expectNoViolations(page);
  });

  test('#28 AC4: the overdue row is read with its title and "Overdue"', async ({ page }) => {
    await addDue(page, 'Pay rent', '2026-10-06');
    const row = list(page).getByRole('listitem').filter({ hasText: 'Pay rent' });
    await expect(row).toContainText('Pay rent');
    await expect(row).toContainText('Overdue');
    const snapshot = await row.ariaSnapshot();
    expect(snapshot).toContain('Pay rent');
    expect(snapshot).toContain('Overdue');
  });
});
