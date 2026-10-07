import { expect, test, type Page } from '@playwright/test';

const KEY = 'task-tracker:v1';
const SEEDED = 500;
const RUNS = 5;
const LIMIT_MS = 100;
const list = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const titles = (page: Page) => list(page).locator('.task-title');

/** Stores 500 tasks before the app starts, as an earlier session would have (REQ-019). */
async function seed(page: Page, completed: boolean) {
  await page.addInitScript(
    ({ key, count, completed }) => {
      const tasks = Array.from({ length: count }, (_, i) => ({
        id: `seed-${i}`,
        title: `Seeded task ${i}`,
        dueDate: i % 3 === 0 ? `2026-${String((i % 12) + 1).padStart(2, '0')}-15` : null,
        priority: (['low', 'medium', 'high', null] as const)[i % 4],
        completed,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
      }));
      localStorage.setItem(key, JSON.stringify({ version: 1, tasks }));
    },
    { key: KEY, count: SEEDED, completed },
  );
  await page.goto('/');
}

/**
 * Inside the page: runs `act`, then waits for `done` to hold, re-checking on every DOM change,
 * and returns the time between the two from `performance.now()`.
 */
async function timeInPage(page: Page, step: string, index: number): Promise<number> {
  return page.evaluate(
    ({ step, index }) => {
      const root = document.querySelector('#task-list')!;
      const rowOf = (id: string) => root.querySelector(`[data-id="${id}"]`);
      const id = `seed-${index}`;
      const steps: Record<string, { act: () => void; done: () => boolean }> = {
        add: {
          act: () => {
            const input = document.querySelector<HTMLInputElement>('#task-title')!;
            input.value = `Timed task ${index}`;
            document.querySelector<HTMLFormElement>('#add-task')!.requestSubmit();
          },
          done: () =>
            [...root.querySelectorAll('.task-title')].some((t) => t.textContent === `Timed task ${index}`),
        },
        toggle: {
          act: () => root.querySelector<HTMLInputElement>(`.task-done[data-id="${id}"]`)!.click(),
          done: () => rowOf(id) === null,
        },
        edit: {
          act: () => {
            const form = root.querySelector<HTMLFormElement>(`.task-edit-form[data-id="${id}"]`)!;
            form.querySelector<HTMLInputElement>('.task-edit-title')!.value = `Edited task ${index}`;
            form.requestSubmit();
          },
          done: () =>
            [...root.querySelectorAll('.task-title')].some((t) => t.textContent === `Edited task ${index}`),
        },
        delete: {
          act: () => root.querySelector<HTMLButtonElement>(`.task-delete[data-id="${id}"]`)!.click(),
          done: () => rowOf(id) === null,
        },
      };
      const { act, done } = steps[step];
      return new Promise<number>((resolve) => {
        const start = performance.now();
        const check = () => {
          if (done()) {
            observer.disconnect();
            resolve(performance.now() - start);
          }
        };
        const observer = new MutationObserver(check);
        observer.observe(root, { childList: true, subtree: true, characterData: true });
        act();
        check();
      });
    },
    { step, index },
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Times one change on five different tasks, and checks the median against 100 ms. */
async function expectFast(page: Page, step: string, before?: (index: number) => Promise<void>) {
  const times: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const index = run * 7;
    await before?.(index);
    times.push(await timeInPage(page, step, index));
  }
  const result = median(times);
  test.info().annotations.push({
    type: `${step} latency`,
    description: `median ${result.toFixed(1)} ms of ${times.map((t) => t.toFixed(1)).join(', ')} ms`,
  });
  console.log(`${step}: median ${result.toFixed(1)} ms (${times.map((t) => t.toFixed(1)).join(', ')})`);
  expect(result, `${step} median in ms`).toBeLessThan(LIMIT_MS);
}

test('#13 AC1: with 500 tasks stored, an added task appears within 100 ms', async ({ page }) => {
  await seed(page, false);
  await expect(titles(page)).toHaveCount(SEEDED);
  await expectFast(page, 'add');
  await expect(titles(page)).toHaveCount(SEEDED + RUNS);
});

test('#13 AC2: with 500 tasks stored, completing a task is shown within 100 ms', async ({ page }) => {
  await seed(page, false);
  await expect(titles(page)).toHaveCount(SEEDED);
  await expectFast(page, 'toggle');
  await expect(titles(page)).toHaveCount(SEEDED - RUNS);
});

test('#13 AC2: with 500 tasks stored, reopening a task is shown within 100 ms', async ({ page }) => {
  await seed(page, true);
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(titles(page)).toHaveCount(SEEDED);
  await expectFast(page, 'toggle');
  await expect(titles(page)).toHaveCount(SEEDED - RUNS);
});

test('#13 AC2: with 500 tasks stored, an edit is shown within 100 ms', async ({ page }) => {
  await seed(page, false);
  await expect(titles(page)).toHaveCount(SEEDED);
  // Opening edit mode is set up outside the timing; the saved change is what is timed.
  await expectFast(page, 'edit', async (index) => {
    await list(page).getByRole('button', { name: `Edit Seeded task ${index}`, exact: true }).click();
    await expect(list(page).getByLabel('New title')).toBeVisible();
  });
  await expect(titles(page).filter({ hasText: /^Edited task / })).toHaveCount(RUNS);
});

test('#13 AC2: with 500 tasks stored, deleting a task is shown within 100 ms', async ({ page }) => {
  await seed(page, false);
  await expect(titles(page)).toHaveCount(SEEDED);
  await expectFast(page, 'delete');
  await expect(titles(page)).toHaveCount(SEEDED - RUNS);
});

test('#13 AC3: a full journey makes no requests beyond the page’s own files on load', async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const phases: Record<string, { url: string; method: string; type: string }[]> = {};
  let phase = 'load';
  page.on('request', (r) =>
    (phases[phase] ??= []).push({ url: r.url(), method: r.method(), type: r.resourceType() }),
  );

  await page.goto('/');
  await expect(page.getByLabel('Task title')).toBeVisible();

  phase = 'journey';
  const field = page.getByLabel('Task title');
  await field.fill('Buy milk');
  await page.getByLabel('Due date', { exact: true }).fill('2026-10-05');
  await page.getByLabel('Priority', { exact: true }).selectOption('high');
  await field.press('Enter');
  await field.fill('Walk dog');
  await field.press('Enter');
  await expect(titles(page)).toHaveText(['Buy milk', 'Walk dog']);
  await page.getByRole('checkbox', { name: 'Done: Buy milk' }).click();
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await list(page).getByRole('button', { name: 'Edit Buy milk' }).click();
  await list(page).getByLabel('New title').fill('Buy oat milk');
  await list(page).getByLabel('New title').press('Enter');
  await expect(titles(page)).toHaveText(['Buy oat milk']);
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await list(page).getByRole('button', { name: 'Delete Walk dog' }).click();
  await expect(titles(page)).toHaveCount(0);
  const journey = phases.journey ?? [];

  phase = 'reload';
  await page.reload();
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(titles(page)).toHaveText(['Buy oat milk']);

  phase = 'after';
  await page.waitForTimeout(500); // anything sent late, after the page settled
  expect(journey, 'requests during the journey').toEqual([]);
  expect(phases.after ?? [], 'requests after the reload').toEqual([]);
  for (const name of ['load', 'reload']) {
    const requests = phases[name] ?? [];
    expect(requests.length, `${name} requests`).toBeGreaterThan(0);
    for (const r of requests) {
      expect(new URL(r.url).origin, `${name}: ${r.url}`).toBe(origin);
      expect(r.method, `${name}: ${r.url}`).toBe('GET');
      expect(['document', 'script', 'stylesheet', 'image', 'font'], `${name}: ${r.url}`).toContain(r.type);
    }
  }
});
