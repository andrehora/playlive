// Lessons: the bar above the site and the group at the top of the example list.
// Which lesson an example is and what marks it done are read in
// tests/unit/lessons.test.mjs; what is left here is what a person sees.
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { openApp } from './app.mjs';

const bar = page => page.locator('#lessonbar');

test.describe('Lessons', () => {
  test('home invites lesson 1, and writing its tests leads to lesson 2', async ({ page }) => {
    const { errors } = await openApp(page);
    await expect(bar(page)).toBeVisible();
    await expect(bar(page)).toHaveAttribute('data-state', 'invite');
    await expect(page.locator('#lessonText')).toContainText('lesson 1 of');

    await page.locator('#lessonGo').click();
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('create');
    await expect(bar(page)).toHaveAttribute('data-state', 'doing');
    await expect(page.locator('#lessonGo')).toBeHidden();

    // The example's own tests answer every brief.
    const shipped = await readFile(new URL('../../examples/address-form/tests.yaml', import.meta.url), 'utf8');
    await page.fill('#spec', shipped);
    await expect(bar(page)).toHaveAttribute('data-state', 'done');
    expect(await page.evaluate(() => window.playlive.lessons.done())).toEqual(['first-test']);

    await page.locator('#lessonGo').click();
    await expect(page.locator('#siteName')).toHaveText('FAQ accordion');
    await expect(bar(page)).toHaveAttribute('data-state', 'doing');
    expect(errors).toEqual([]);
  });

  test('the example list starts with the lessons, ticked when done', async ({ page }) => {
    await openApp(page);
    await page.locator('#siteBtn').click();
    const first = page.locator('#tabs .pop-group').first();
    await expect(first.locator('.pop-cat')).toHaveText('Lessons');
    await expect(first.locator('.lesson')).toHaveCount(await page.evaluate(() => window.playlive.lessons.list.length));
    await first.locator('.lesson').nth(1).click();
    await expect(page.locator('#siteName')).toHaveText('FAQ accordion');
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('create');

    // Searching finds a lesson by its title.
    await page.locator('#siteBtn').click();
    await page.fill('#siteSearch', 'first test');
    await expect(page.locator('#tabs .lesson:visible')).toHaveCount(1);
  });
});
