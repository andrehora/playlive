// Every example site's own tests must pass, run through the real app.
// This is the check AGENTS.md asks for before any change is finished.
import { test, expect } from '@playwright/test';
import { describeFailures, manifest, openApp, runAll, setSpeed, siteIds, RUN_TIMEOUT } from './app.mjs';

const ids = await siteIds();
const SITES = await manifest();

// The Flaky examples fail some of the time on purpose — that is the whole
// theme — so running them would make this suite flaky too. The category is
// what says so, rather than a list kept by hand beside it; they are still
// covered by the export tests and by the smells corpus.
const SKIP = new Set(ids.filter(id => SITES[id].category === 'Flaky'));

test.describe('Example sites', () => {
  test('index.html defines every example exactly once', async ({ page }) => {
    await openApp(page);
    const inApp = await page.$$eval('#tabs .tab', els => els.map(e => e.dataset.site));
    expect(inApp).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
    await expect(page.locator('#siteCount')).toHaveText(`1 of ${ids.length}`);
  });

  for (const id of ids.filter(i => !SKIP.has(i))){
    test(`${id}: example tests pass`, async ({ page }) => {
      test.setTimeout(RUN_TIMEOUT + 60_000);
      const { errors } = await openApp(page, { site: id });
      await setSpeed(page, 'fast');

      const res = await runAll(page);
      expect(res.tests.length, 'the site should ship at least one example test').toBeGreaterThan(0);
      expect(res.state, describeFailures(res)).toBe('ok');
      expect(res.tests.every(t => t.state === 'passed')).toBe(true);

      // A page error in the site under test is a bug in the example, not a test failure.
      const warnings = res.tests.flatMap(t => t.warnings);
      expect(warnings, `page errors in ${id}`).toEqual([]);
      expect(errors, `errors on the Playlive page while running ${id}`).toEqual([]);
    });
  }
});
