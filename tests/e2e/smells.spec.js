// The Test smells panel. Each rule, and what the rules make of all hundred
// examples, is read in tests/unit/smells.test.mjs — it is a function of the
// file, with no browser in it. What is left here is the panel: its two tabs,
// its empty state, the folds, and that it follows the editor as it is typed.
import { test, expect } from '@playwright/test';
import { openApp, setMode } from './app.mjs';

const SITE = 'contact-form';
const report = page => page.evaluate(() => window.playlive.smells.report());
// The file settles 400ms after the last keystroke, so read the panel, not the clock.
const score = page => page.locator('#smellScore');

test.describe('Test smells', () => {
  test('the example tests are clean, and the panel says so', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE, mode: 'smells' });
    await expect(score(page)).toHaveText('No smells in 3 tests');
    await expect(page.locator('.smells-panel')).toHaveAttribute('data-band', 'ok');
    await expect(page.locator('#smells .cov-note')).toHaveText('Nothing to report.');
    await expect(page.locator('.smell-group')).toHaveCount(0);

    // Its three tests open three different ways, so there is no opening to share.
    const r = await report(page);
    expect(r.parsed).toBe(true);
    expect(r.items).toEqual([]);
    expect(errors).toEqual([]);
  });

  // The mode leaves the example list alone. It once narrowed it to the
  // examples that have a smell, which hid the clean ones you would compare them
  // with and made the list change length under you; the All smells tab is where
  // "which examples have one" is answered now.
  test('the mode leaves every example in the list', async ({ page }) => {
    await openApp(page, { site: SITE });
    const listed = () => page.$$eval('#tabs .tab:not([hidden])', t => t.map(x => x.dataset.site));
    await page.click('#siteBtn');
    expect(await listed()).toHaveLength(100);
    await expect(page.locator('#siteCount')).toHaveText('8 of 100');
    await page.keyboard.press('Escape');

    await setMode(page, 'smells');
    await expect.poll(async () => (await page.evaluate(() => window.playlive.smells.sites())).length).toBe(8);
    await page.click('#siteBtn');
    const all = await listed();
    expect(all).toHaveLength(100);
    expect(all).toContain('click-counter');          // has one
    expect(all).toContain('coupon-code');            // has none, and is still listed
    await page.keyboard.press('Escape');
    await expect(page.locator('#siteCount')).toHaveText('8 of 100');

    // And the stepper walks all of them, in manifest order.
    await page.click('#nextSite');
    await expect(page.locator('#siteName')).toHaveText('FAQ accordion');
    await expect(page.locator('#siteCount')).toHaveText('9 of 100');
  });

  // The catalogue is read from the files, and the file on screen is the one
  // being typed into, so it follows the editor the way the panel's other tab
  // does — a smell you have just written names your example straight away.
  test('the All smells tab follows a smell typed into the editor', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'smells' });
    await page.click('.smell-seg [data-smellview="all"]');
    await expect(score(page)).toHaveText('8 of 100 examples have one');
    const unknown = page.locator('.smell-group[data-smell="unknown-test"]');
    await expect(unknown.locator('.cov-n')).toHaveText('2');
    await expect(unknown.locator('.smell-what')).toHaveText(['Like button', 'Counter']);

    // This example checks nothing now, and the catalogue says so.
    await page.fill('#spec', 'test: Does a thing\nsteps:\n  - click: { role: button, name: Send }\n');
    await expect(unknown.locator('.cov-n')).toHaveText('3');
    await expect(unknown.locator('.smell-what')).toHaveText(['Contact form', 'Like button', 'Counter']);
    await expect(score(page)).toHaveText('9 of 100 examples have one');
  });

  test('the panel folds to its one row and Results takes the room back', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openApp(page, { site: SITE, mode: 'smells' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const wasPanel = await h('.smells-panel'), wasResults = await h('.results-panel');

    await page.click('#foldSmells');
    await expect(page.locator('#smells')).toBeHidden();
    await expect(page.locator('#foldSmells')).toHaveAttribute('aria-expanded', 'false');
    await expect(score(page)).toBeVisible();                 // the count stays
    expect(await h('.smells-panel')).toBeLessThanOrEqual(await h('.smells-panel .panel-head') + 2);
    expect(await h('.results-panel')).toBeGreaterThan(wasResults);
    // Its handle has no height left to set, so it stops taking the pointer.
    await expect(page.locator('#smellResizer')).toBeHidden();

    await page.click('#foldSmells');
    await expect(page.locator('#smells')).toBeVisible();
    expect(await h('.smells-panel')).toBe(wasPanel);
  });

  test('a file that does not parse is left to the error box', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE, mode: 'smells' });
    await page.fill('#spec', 'test: Broken\nsteps:\n  - click:\n');
    await expect(page.locator('#error')).not.toHaveText('');
    await expect(score(page)).toHaveText('');
    await expect(page.locator('.smells-panel')).toHaveAttribute('data-band', '');
    await expect(page.locator('#smells .cov-note')).toContainText('Fix the problems in the file first');
    expect((await report(page)).parsed).toBe(false);
    expect(errors).toEqual([]);
  });

  // The panel answers two questions and they are not the same one: what the
  // file on screen smells of, and what the app looks for at all. The second is
  // the catalogue, and it is a way into the examples rather than a glossary.
  test('the All smells tab lists every smell and the examples that have one', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE, mode: 'smells' });
    await expect(page.locator('#smells .cov-note')).toHaveText('Nothing to report.');

    await page.click('.smell-seg [data-smellview="all"]');
    await expect(page.locator('.smell-seg [data-smellview="all"]')).toHaveAttribute('aria-pressed', 'true');
    // Every smell is named and explained, in the order the panel keeps them.
    const names = await page.$$eval('.smell-group .cov-title', t => t.map(x => x.textContent));
    expect(names).toEqual(['Unknown Test', 'Assertion Roulette', 'Duplication of Setup', 'General Fixture']);
    await expect(score(page)).toHaveText('8 of 100 examples have one');

    // Each group counts the examples that have it, and names them.
    const group = page.locator('.smell-group[data-smell="assertion-roulette"]');
    await expect(group.locator('.cov-n')).toHaveText('2');
    await expect(group.locator('.smell-what').first()).toHaveText('Status page');
    await expect(group.locator('.smell-line')).toHaveCount(2);

    // A row opens that example, in the file tab, at the line it is about.
    await group.locator('.smell-line').first().click();
    await expect(page.locator('#siteName')).toHaveText('Status page');
    await expect(page.locator('.smell-seg [data-smellview="file"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => {
      const t = document.getElementById('spec');
      return t.value.slice(t.selectionStart, t.selectionEnd);
    })).toBe('test: Reads the whole page in one go');
    expect(errors).toEqual([]);
  });

  // Switching tabs changes what the list holds, not how much room the column
  // gives it: the catalogue is longer than any one file's findings.
  test('switching tabs leaves the panels the size they were', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, { site: SITE, mode: 'smells' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const was = [await h('.results-panel'), await h('.smells-panel')];

    await page.click('.smell-seg [data-smellview="all"]');
    await expect(page.locator('.smell-group').first()).toBeVisible();
    expect([await h('.results-panel'), await h('.smells-panel')]).toEqual(was);
    expect(await page.evaluate(() =>
      document.documentElement.scrollHeight - document.documentElement.clientHeight)).toBeLessThanOrEqual(1);
  });

  // The catalogue is long enough to want the whole column, and the folds hand
  // it the room other panels give up. A panel folded to its one row has none to
  // give: it must still be that row, head and all, whatever the list wants.
  test('the catalogue never squeezes a folded panel out of its own head', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, { site: SITE, mode: 'smells' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const state = k => page.evaluate(k => document.getElementById('left').dataset[k] || 'open', k);

    // Results all the way down to its one row, and the code folded with it.
    for (let i = 0; i < 4 && await state('results') !== 'collapsed'; i++) await page.click('#foldAll');
    await page.click('#foldSpec');
    expect(await state('spec')).toBe('collapsed');

    for (const view of ['all', 'file', 'all']){
      await page.click(`.smell-seg [data-smellview="${view}"]`);
      await expect(page.locator(`.smell-seg [data-smellview="${view}"]`)).toHaveAttribute('aria-pressed', 'true');
      const head = await h('.results-panel .panel-head');
      expect(await h('.results-panel'), `Results is squeezed below its head in the ${view} tab`)
        .toBeGreaterThanOrEqual(head);
      expect(await page.evaluate(() =>
        document.documentElement.scrollHeight - document.documentElement.clientHeight)).toBeLessThanOrEqual(1);
    }
  });
});
