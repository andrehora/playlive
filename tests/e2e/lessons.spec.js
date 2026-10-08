// Lessons: the bar above the site and the group at the top of the example list.
// Which lesson an example is and what marks it done are read in
// tests/unit/lessons.test.mjs; what is left here is what a person sees.
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { openApp, runAll, setSpeed } from './app.mjs';

const bar = page => page.locator('#lessonbar');
const shipped = id => readFile(new URL(`../../examples/${id}/tests.yaml`, import.meta.url), 'utf8');
const done = page => page.evaluate(() => window.playlive.lessons.done());
async function start(page, id, name){
  await page.evaluate(id => window.playlive.lessons.start(id), id);
  await expect(page.locator('#siteName')).toHaveText(name);
  await expect(bar(page)).toHaveAttribute('data-state', 'doing');
  await setSpeed(page, 'fast');
}

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
    await page.fill('#spec', await shipped('address-form'));
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

  // The other graders: the shipped tests leave each one short, and the fix a
  // student would write finishes it.
  test('Coverage is done by a finished run that used every control', async ({ page }) => {
    const { errors } = await openApp(page);
    await start(page, 'reach', 'Weather widget');
    await runAll(page);
    await expect(bar(page)).toHaveAttribute('data-state', 'doing');
    await page.fill('#spec', await shipped('weather-widget') + '\ntest: Back to Celsius\nsteps:\n  - click: { role: button, name: Fahrenheit }\n  - click: { role: button, name: Celsius }\n  - expectText: "Lisbon now: 21°C"\n');
    await runAll(page);
    await expect(bar(page)).toHaveAttribute('data-state', 'done');
    expect(await done(page)).toEqual(['reach']);
    expect(errors).toEqual([]);
  });

  test('Mutation is done by a hunt that caught every mutation', async ({ page }) => {
    test.setTimeout(400_000);
    const hunt = async () => {
      await page.click('#hunt');
      await expect(page.locator('#hunt')).toBeDisabled();
      await expect(page.locator('#hunt')).toBeEnabled({ timeout: 180_000 });
    };
    await openApp(page);
    await start(page, 'catch', 'Coupon code');
    await hunt();
    await expect(bar(page)).toHaveAttribute('data-state', 'doing');
    await page.fill('#spec', await shipped('coupon-code') + [
      '', 'test: A good code clears the old error', 'steps:',
      '  - fill: { label: Coupon code, value: BOGUS }', '  - click: { role: button, name: Apply }',
      '  - fill: { label: Coupon code, value: SAVE10 }', '  - click: { role: button, name: Apply }',
      '  - expectNoText: recognize', '',
      'test: FREESHIP says it applied', 'steps:',
      '  - fill: { label: Coupon code, value: FREESHIP }', '  - click: { role: button, name: Apply }',
      '  - expectText: "FREESHIP applied: free shipping."', ''
    ].join('\n'));
    await hunt();
    await expect(bar(page)).toHaveAttribute('data-state', 'done');
    expect(await done(page)).toEqual(['catch']);
  });

  test('Smells is done when nothing smells and no test was deleted', async ({ page }) => {
    await openApp(page);
    await start(page, 'checks-nothing', 'Counter');
    const file = await shipped('click-counter');
    // Deleting the smelly test is not fixing it.
    await page.fill('#spec', file.slice(0, file.indexOf('test: Clicks the button a few times')));
    await expect(page.locator('#smellScore')).toHaveText(/^No smells/);
    await expect(bar(page)).toHaveAttribute('data-state', 'doing');
    await page.fill('#spec', file.trimEnd() + '\n  - expectText: "Count: 3"\n');
    await expect(bar(page)).toHaveAttribute('data-state', 'done');
    expect(await done(page)).toEqual(['checks-nothing']);
  });
});
