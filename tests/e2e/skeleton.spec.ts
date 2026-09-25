import { expect, test } from '@playwright/test';

test('#2 AC1: the build writes index.html and its assets to dist/', async ({ request }) => {
  // The web server serves only the built output (vite preview of dist/).
  const page = await request.get('/');
  expect(page.status()).toBe(200);
  const html = await page.text();

  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  expect(assets.length).toBeGreaterThan(0);
  for (const asset of assets) {
    expect((await request.get(asset)).status(), asset).toBe(200);
  }
});

test('#2 AC3 AC4: shows the heading and requests only its own files', async ({ page, baseURL }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Task Tracker' })).toBeVisible();
  expect(requested.length).toBeGreaterThan(0);
  const ownOrigin = new URL(baseURL!).origin;
  const foreign = requested.filter((url) => new URL(url).origin !== ownOrigin);
  expect(foreign).toEqual([]);
});
