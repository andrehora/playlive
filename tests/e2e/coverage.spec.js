// UI coverage against a watched run. What a step credits and how the score
// bands are read in tests/unit/coverage.test.mjs; the score is measured while
// the run happens, so what is left here runs something and then reads the
// panel and the report side by side.
import { test, expect } from '@playwright/test';
import { openApp, runAll, setSpeed } from './app.mjs';

// Coupon code is the smallest site with both a field and a button: two controls,
// and its own tests use both.
const SITE = 'coupon-code';
const FIELD = '{ label: Coupon code }';
const APPLY = '{ role: button, name: Apply }';

const report = page => page.evaluate(() => window.playlive.coverage.report());
// The groups the panel shows, with their targets sorted: the list follows the
// page's own order, which is not what these tests are about.
const rows = page => page.$$eval('.cov-group', gs => gs.map(g => ({
  state: g.dataset.state,
  n: g.querySelector('.cov-n').textContent,
  targets: [...g.querySelectorAll('.cov-t')].map(t => t.textContent).sort()
})));

// One test with the given steps, run at full speed.
async function runSteps(page, steps){
  await page.fill('#spec', `test: Coverage\nsteps:\n${steps.map(s => `  - ${s}\n`).join('')}`);
  await expect(page.locator('#error')).toHaveText('');
  return runAll(page);
}

test.describe('Coverage', () => {
  test('counts every control and credits the ones a run used', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE, mode: 'coverage' });
    await setSpeed(page, 'fast');

    // Before anything runs, the page has been read but nothing is used.
    const before = await report(page);
    expect(before.site).toBe(SITE);
    expect(before.total).toBe(2);
    expect(before.used).toBe(0);
    expect(before.untested).toBe(2);
    await expect(page.locator('#covScore')).toHaveText('0 of 2 controls (0%)');
    await expect(page.locator('.coverage-panel')).toHaveAttribute('data-band', 'bad');

    // The site's own tests fill the field and press Apply, so both are used.
    const res = await runAll(page);
    expect(res.state).toBe('ok');
    const after = await report(page);
    expect(after.total).toBe(2);
    expect(after.used).toBe(2);
    expect(after.untested).toBe(0);
    expect(after.score).toBe(1);
    await expect(page.locator('#covScore')).toHaveText('2 of 2 controls (100%)');
    await expect(page.locator('.coverage-panel')).toHaveAttribute('data-band', 'ok');
    expect(await rows(page)).toEqual([
      { state: 'used', n: '2', targets: [APPLY, FIELD].sort() }
    ]);
    expect(errors).toEqual([]);
  });

  test('a step credits the element it landed on, however the target is written', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'coverage' });
    await setSpeed(page, 'fast');
    // "- click: Apply" is the bare-text shorthand: it finds the same button the
    // catalog lists as { role: button, name: Apply }, so it credits that entry.
    await runSteps(page, ['click: Apply']);
    const r = await report(page);
    expect(r.items.find(i => i.target === APPLY).state).toBe('used');
    expect(r.items.find(i => i.target === FIELD).state).toBe('untested');
    expect(r.used).toBe(1);
  });

  test('a full run forgets the run before it', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'coverage' });
    await setSpeed(page, 'fast');
    await runAll(page);
    expect((await report(page)).used).toBe(2);

    // A different file, so the score is about this run and not the last one.
    await runSteps(page, ['fill: { label: Coupon code, value: save10 }']);
    const r = await report(page);
    expect(r.used).toBe(1);
    expect(r.untested).toBe(1);
    expect(await rows(page)).toEqual([
      { state: 'untested', n: '1', targets: [APPLY] },
      { state: 'used', n: '1', targets: [FIELD] }
    ]);
  });

  test('the score reads in the app’s own three colours', async ({ page }) => {
    // Shopping cart adds three things to a cart and never presses Checkout, so
    // it lands in the middle band.
    await openApp(page, { site: 'shopping-cart', mode: 'coverage' });
    await setSpeed(page, 'fast');
    await runAll(page);
    const r = await report(page);
    expect(r.used).toBeLessThan(r.total);
    expect(r.used / r.total).toBeGreaterThanOrEqual(0.6);
    await expect(page.locator('.coverage-panel')).toHaveAttribute('data-band', 'warn');
    await expect(page.locator('#covScore')).toHaveText(/\(\d\d%\)$/);
  });

  test('an untested control gets a test of its own', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'coverage' });
    await setSpeed(page, 'fast');
    await runSteps(page, ['fill: { label: Coupon code, value: save10 }']);

    const row = page.locator('.cov-group[data-state="untested"] .cov-row').first();
    await expect(row.locator('.cov-t')).toHaveText(APPLY);
    await row.locator('.cov-add').click();

    // A whole test lands at the end of the file, titled after what it does,
    // and the file still parses.
    expect(await page.inputValue('#spec')).toContain(`test: Clicks Apply\nsteps:\n  - click: ${APPLY}`);
    await expect(page.locator('#error')).toHaveText('');
    expect(await page.evaluate(() => {
      const { spec } = window.playlive.validate(document.getElementById('spec').value);
      return spec.tests.map(t => ({ title: t.title, steps: t.steps.map(s => s.action) }));
    })).toEqual([
      { title: 'Coverage', steps: ['fill'] },
      { title: 'Clicks Apply', steps: ['click'] }
    ]);

    // One test is all it has to give: the button goes, and the row says why,
    // so the same control cannot be added twice.
    await expect(row.locator('.cov-add')).toHaveCount(0);
    await expect(row.locator('.cov-m')).toHaveText('test added');

    // Running the file now uses the button, which is the point of the button.
    await runAll(page);
    expect((await report(page)).untested).toBe(0);
    expect(await page.locator('.cov-add').count()).toBe(0);
  });

  test('it writes the first test of an empty file too', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'coverage' });
    await setSpeed(page, 'fast');
    await page.fill('#spec', '');

    // The controls come from the page, not the file, so they are all still listed.
    const row = page.locator('.cov-group[data-state="untested"] .cov-row').first();
    await expect(row.locator('.cov-t')).toHaveText(FIELD);
    await row.locator('.cov-add').click();

    expect(await page.inputValue('#spec'))
      .toBe(`test: Fills Coupon code\nsteps:\n  - fill: { label: Coupon code, value: text }\n`);
    await expect(page.locator('#error')).toHaveText('');
    const res = await runAll(page);
    expect(res.state).toBe('ok');
  });

  test('Reset clears the score with everything else', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'coverage' });
    await setSpeed(page, 'fast');
    await runAll(page);
    expect((await report(page)).used).toBe(2);

    await page.click('#reset');
    await expect(page.locator('#summary')).toHaveText('');
    // The page is read again on load, so the controls come back with nothing used.
    await expect(page.locator('#covScore')).toHaveText('0 of 2 controls (0%)');
    await expect(page.locator('.coverage-panel')).toHaveAttribute('data-band', 'bad');
    const r = await report(page);
    expect(r.used).toBe(0);
    expect(r.total).toBe(2);
  });

  test('its own handle resizes the panel, and the size is remembered', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openApp(page, { site: SITE, mode: 'coverage' });
    const height = () => page.locator('.coverage-panel').boundingBox().then(b => Math.round(b.height));
    const fits = () => page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);

    const before = await height();
    await page.focus('#covResizer');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
    const taller = await height();
    expect(taller).toBeGreaterThan(before);
    expect(await fits()).toBeLessThanOrEqual(1);

    // Kept in the layout, like the other two handles.
    await page.reload();
    await page.waitForFunction(() => typeof window.playlive?.selectSite === 'function');
    expect(await height()).toBe(taller);

    // And a double-click puts it back where it started.
    await page.dblclick('#covResizer');
    expect(await height()).toBe(before);

    // However far it is dragged, it stops before it would squeeze Results away.
    await page.focus('#covResizer');
    for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowUp');
    expect(await fits()).toBeLessThanOrEqual(1);
    expect((await page.locator('.results-panel').boundingBox()).height).toBeGreaterThanOrEqual(130);
  });

  test('its handle still resizes the panel when Results is collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openApp(page, { site: SITE, mode: 'coverage' });
    const height = () => page.locator('.coverage-panel').boundingBox().then(b => Math.round(b.height));
    const editor = () => page.locator('#editor').boundingBox().then(b => Math.round(b.height));
    const fits = () => page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);

    await page.click('#foldAll');                      // folded -> collapsed
    await expect(page.locator('#results')).toBeHidden();
    await expect(page.locator('#covResizer')).toBeVisible();

    // Nothing below Results left to split, so the room comes from the editor
    // above it. The handle still means the same thing: Coverage's top edge.
    const before = await height(), wasEditor = await editor();
    await page.focus('#covResizer');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
    expect(await height()).toBeGreaterThan(before);
    expect(await editor()).toBeLessThan(wasEditor);
    expect(await fits()).toBeLessThanOrEqual(1);

    // However far it is dragged, the editor keeps its floor and the page
    // still does not scroll.
    for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowUp');
    expect(await editor()).toBeGreaterThanOrEqual(110);
    expect(await fits()).toBeLessThanOrEqual(1);

    // And a double-click puts it back, like the other two handles.
    await page.dblclick('#covResizer');
    expect(await editor()).toBe(wasEditor);
    expect(await height()).toBe(before);
  });

  test('folded, the panel is its one row and Results takes the space back', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openApp(page, { site: SITE, mode: 'coverage' });
    const panel = () => page.locator('.coverage-panel').boundingBox().then(b => Math.round(b.height));
    const results = () => page.locator('.results-panel').boundingBox().then(b => Math.round(b.height));
    const head = () => page.locator('.coverage-panel .panel-head').boundingBox().then(b => Math.round(b.height));

    const wasPanel = await panel(), wasResults = await results();
    await page.click('#foldCov');
    await expect(page.locator('#covBody')).toBeHidden();

    // No blank panel left behind: what it gave up goes to Results above it.
    expect(await panel()).toBeLessThanOrEqual(await head() + 2);
    expect(await panel()).toBeLessThan(wasPanel);
    expect(await results()).toBeGreaterThan(wasResults);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight))
      .toBeLessThanOrEqual(1);

    // Its handle has no height left to set, so it stops taking the pointer.
    await expect(page.locator('#covResizer')).toBeHidden();

    // With Results collapsed too there is no list left to take the room, so the
    // editor takes it rather than leaving the column half empty.
    const editor = () => page.locator('#editor').boundingBox().then(b => Math.round(b.height));
    const wasEditor = await editor();
    await page.click('#foldAll');
    await expect(page.locator('#results')).toBeHidden();
    expect(await editor()).toBeGreaterThan(wasEditor);
    const bottom = await page.locator('.coverage-panel').boundingBox().then(b => b.y + b.height);
    const column = await page.locator('#left').boundingBox().then(b => b.y + b.height);
    expect(Math.abs(bottom - column)).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight))
      .toBeLessThanOrEqual(1);
    await page.click('#foldAll'); await page.click('#foldAll');   // back to folded

    // Unfolded, the panel is the size it was.
    await page.click('#foldCov');
    await expect(page.locator('#covBody')).toBeVisible();
    expect(await panel()).toBe(wasPanel);
  });

  test('the panel folds and keeps the page from scrolling', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'coverage' });
    await expect(page.locator('#coverage')).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('coverage')).overflowY))
      .toMatch(/auto|scroll/);

    // A third panel in the left column must not push the page past the window,
    // on a short desktop screen as much as a tall one.
    for (const height of [720, 900]){
      await page.setViewportSize({ width: 1440, height });
      await expect(page.locator('.coverage-panel')).toBeInViewport();
      const overflow = await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
      expect(overflow, `page scrolls at 1440x${height}`).toBeLessThanOrEqual(1);
    }

    await page.click('#foldCov');
    await expect(page.locator('#coverage')).toBeHidden();
    await expect(page.locator('#foldCov')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#covScore')).toBeVisible();   // the score stays
    await page.click('#foldCov');
    await expect(page.locator('#coverage')).toBeVisible();
  });
});
