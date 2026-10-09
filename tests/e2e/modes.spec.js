// Modes: which panels the left column has at all. Explore is the tests, and
// Create adds a panel of its own. The choice is in the app bar, beside the
// example, because every panel below answers to it. Mutation and Smells are
// tabs beside Results in both.
import { test, expect } from '@playwright/test';
import { openApp, runAll, setMode, setSpeed, setTab } from './app.mjs';

const SITE = 'coupon-code';
const overflow = page => page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
// The panels on screen, top to bottom, named the way the column reads.
const panels = page => page.evaluate(() => [...document.querySelectorAll('.left > .panel')]
  .filter(p => p.getClientRects().length)
  .map(p => p.className.match(/([a-z]+)-panel/)[1]));
// What the column leaves unused below its last panel: a mode must not leave a
// gap, and a fold must not leave a panel stretched past its own rows.
const slack = page => page.evaluate(() => {
  const open = [...document.querySelectorAll('.left > .panel')].filter(p => p.getClientRects().length);
  return Math.round(document.getElementById('left').getBoundingClientRect().bottom
    - open[open.length - 1].getBoundingClientRect().bottom);
});

test.describe('Modes', () => {
  test('Create adds its panel, and Mutation and Smells are tabs beside Results', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE });

    // Explore is the tests and what they did.
    await expect(page.locator('.mode-seg [data-mode="explore"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.mode-seg [data-mode="mutation"]')).toHaveCount(0);
    await expect(page.locator('.mode-seg [data-mode="smells"]')).toHaveCount(0);
    expect(await panels(page)).toEqual(['tests', 'results']);
    await expect(page.locator('.res-seg [data-resview="results"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#hunt')).toBeHidden();

    // Mutation asks whether these tests would notice the page going wrong.
    await setTab(page, 'mutation');
    expect(await panels(page)).toEqual(['tests', 'results']);
    await expect(page.locator('#results')).toBeHidden();
    await expect(page.locator('#hunt')).toBeVisible();
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);
    await expect(page.locator('#bugScore')).toHaveText('8 mutations');

    // Smells reads the tests rather than a run.
    await setTab(page, 'smells');
    await expect(page.locator('#bugTab')).toBeHidden();
    await expect(page.locator('#smellScore')).toHaveText('No smells in 3 tests');

    // Create is the one that changes what the editor holds, so it adds a panel,
    // and the tabs stay.
    await setMode(page, 'create');
    expect(await panels(page)).toEqual(['tests', 'results', 'create']);
    await expect(page.locator('#createResizer')).toBeVisible();
    await expect(page.locator('#smellTab')).toBeVisible();

    await setMode(page, 'explore');
    await setTab(page, 'results');
    expect(await panels(page)).toEqual(['tests', 'results']);
    await expect(page.locator('#results .test').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('no mode makes the desktop page scroll, or leaves the column half empty', async ({ page }) => {
    await openApp(page, { site: SITE });
    for (const mode of ['explore', 'create']) for (const tab of ['results', 'mutation', 'smells']){
      await setMode(page, mode);
      await setTab(page, tab);
      for (const height of [720, 900, 1000]){
        await page.setViewportSize({ width: 1440, height });
        expect(await overflow(page), `page scrolls at 1440x${height} in ${mode}, ${tab}`).toBeLessThanOrEqual(1);
        expect(await slack(page), `${mode}, ${tab} leaves a gap at 1440x${height}`).toBeLessThanOrEqual(2);
      }
    }
  });

  // Every fold is a way to hide a list, and between them they can leave the
  // column scrolling, half empty, or showing a panel stretched over a body it
  // is no longer drawing. None of the three is allowed in any mode.
  test('no combination of folds scrolls the page or leaves a panel blank', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openApp(page, { site: SITE });
    const state = k => page.evaluate(k => document.getElementById('left').dataset[k] || 'open', k);
    const setResults = async want => {
      for (let i = 0; i < 4 && (await state('results') === 'collapsed') !== want; i++) await page.click('#foldAll');
    };
    const toggle = async (sel, k, want) => {
      if ((await state(k) === 'collapsed') !== want) await page.click(sel);
    };
    for (const [mode, foldSel, foldKey, tab = 'results'] of [['explore'],
      ['explore', null, null, 'mutation'], ['explore', null, null, 'smells'],
      ['create', '#foldCreate', 'create']]){
      await setMode(page, mode);
      await setResults(false);
      await setTab(page, tab);
      for (const results of [false, true]) for (const other of foldSel ? [false, true] : [false]) for (const spec of [false, true]){
        await setResults(results);
        if (foldSel) await toggle(foldSel, foldKey, other);
        await toggle('#foldSpec', 'spec', spec);
        const where = `${mode} ${tab}: results=${results} ${foldKey || ''}=${other} code=${spec}`;
        expect(await overflow(page), `page scrolls with ${where}`).toBeLessThanOrEqual(1);
        // Folding everything leaves nothing on screen that could grow, and a
        // gap is honester there than a panel stretched over its hidden body.
        if (!(spec && results && (!foldSel || other))) expect(await slack(page), `gap with ${where}`).toBeLessThanOrEqual(2);
        const blank = await page.evaluate(() => [...document.querySelectorAll('.left > .panel')]
          .filter(p => p.getClientRects().length && !p.classList.contains('tests-panel'))
          .filter(p => {
            const head = p.querySelector('.panel-head');
            const body = [...p.children].find(c => c !== head && c.getClientRects().length) || [...p.children].find(c => c !== head);
            return body && body.hidden && p.getBoundingClientRect().height > head.getBoundingClientRect().height + 4;
          }).map(p => p.className));
        expect(blank, `panel stretched over a hidden body with ${where}`).toEqual([]);
      }
      await setResults(false);
      if (foldSel) await toggle(foldSel, foldKey, false);
      await toggle('#foldSpec', 'spec', false);
    }
  });

  test('folding the code gives the room to Results', async ({ page }) => {
    await openApp(page, { site: SITE, tab: 'mutation' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const was = await h('.results-panel');
    await page.click('#foldSpec');
    await expect(page.locator('#editor')).toBeHidden();
    expect(await h('.results-panel')).toBeGreaterThan(was);
    expect(await slack(page)).toBeLessThanOrEqual(2);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
    // Nothing above the editor's handle left to split.
    await expect(page.locator('#rowResizer')).toBeHidden();
  });

  test('the mode is remembered, and changing it repairs the page', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'create' });
    await page.reload();
    await page.waitForFunction(() => typeof window.playlive?.selectSite === 'function');
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('create');
    await setMode(page, 'explore');

    // A page left broken on purpose stays broken across tabs, with the bar
    // saying so, but not into another mode.
    await setTab(page, 'mutation');
    await page.locator('.bug-row', { hasText: 'The discount is 15%' }).locator('.bug-btn').click();
    await expect(page.locator('#bugbar')).toBeVisible();
    await setTab(page, 'results');
    await expect(page.locator('#bugbar')).toBeVisible();
    await setMode(page, 'create');
    await expect(page.locator('#bugbar')).toBeHidden();
    await setMode(page, 'explore');
    await expect(page.locator('#bugbar')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.playlive.bugs.report().items.some(i => i.live))).toBe(false);

    // And the repaired page is the one the tests run against.
    await setSpeed(page, 'fast');
    expect((await runAll(page)).state).toBe('ok');
  });

  test('the Mutation tab follows the example it belongs to', async ({ page }) => {
    await openApp(page, { site: SITE, tab: 'mutation' });
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);
    await page.evaluate(() => window.playlive.selectSite('click-counter'));
    await expect(page.locator('#bugs .bug-row')).toHaveCount(0);
    await expect(page.locator('#bugs .list-note')).toContainText('ships no mutations yet');
  });

  // A link that names the mode is a link to what you were doing, not only to
  // what you were looking at. The example is left out when it is the mode's first.
  test('the mode is half the link, and the default half is left out', async ({ page }) => {
    await openApp(page, { site: SITE });
    expect(new URL(page.url()).hash).toBe('#html#coupon-code');

    await setMode(page, 'create');
    await expect.poll(() => new URL(page.url()).hash).toBe('#html-create#coupon-code');
    expect(await page.evaluate(() => window.playlive.share.url())).toMatch(/#html-create#coupon-code$/);

    // Home is the first example, so a link to it in a mode names only the mode.
    await page.evaluate(() => window.playlive.selectSite(window.playlive.SITE_IDS[0]));
    await expect.poll(() => new URL(page.url()).hash).toBe('#html-create');
    // Home is Python, so Explore on the first example names the mode too.
    await setMode(page, 'explore');
    await expect.poll(() => new URL(page.url()).hash).toBe('#html');
  });

  test('a pasted link opens the mode and the example it names', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { location.hash = '#html-create#coupon-code'; });
    await expect.poll(() => page.evaluate(() => window.playlive.modes.get())).toBe('create');
    await expect(page.locator('#siteName')).toHaveText('Coupon code');
    await expect(page.locator('.create-panel')).toBeVisible();

    // Explore names the sites' language and the example
    await page.evaluate(() => { location.hash = '#html#click-counter'; });
    await expect.poll(() => page.evaluate(() => window.playlive.modes.get())).toBe('explore');
    await expect(page.locator('#siteName')).toHaveText('Counter');

    // A code mode's link names its own example, read before the mode changes the address
    await page.evaluate(() => { location.hash = '#python-create#stack'; });
    await expect.poll(() => page.evaluate(() => window.playlive.modes.get())).toBe('python-create');
    await expect(page.locator('#siteName')).toHaveText('Stack');
    await expect.poll(() => new URL(page.url()).hash).toBe('#python-create#stack');

    // And opening one cold works the same way.
    const { errors } = await openApp(page, { hash: '#html#login' });
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('explore');
    await expect(page.locator('#siteName')).toHaveText('Login');
    expect(new URL(page.url()).hash).toBe('#html#login');

    // A hash in any other shape is home, and says so
    for (const hash of ['#login', '#explore', '#create#login', '#stack']){
      await openApp(page, { hash });
      expect(await page.evaluate(() => window.playlive.modes.get())).toBe('python');
      await expect(page.locator('#siteName')).toHaveText('Calculator');
      expect(new URL(page.url()).hash).toBe('#python');
    }
    expect(errors).toEqual([]);
  });

  test('the bar asks the language, then Explore or Create', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE });
    const area = a => page.locator(`.area-seg [data-area="${a}"]`);
    const create = page.locator('.mode-seg [data-mode="create"]');
    await expect(area('html')).toHaveAttribute('aria-pressed', 'true');
    await setMode(page, 'create');

    // A language keeps the side you are on, and a side the language
    const now = () => page.evaluate(() => window.playlive.modes.get());
    await area('python').click();
    expect(await now()).toBe('python-create');
    await expect(create).toHaveAttribute('aria-pressed', 'true');
    await expect(create).toHaveAttribute('aria-disabled', 'false');
    await area('javascript').click();
    expect(await now()).toBe('javascript-create');
    expect(new URL(page.url()).hash).toBe('#javascript-create');
    await page.click('.mode-seg [data-mode="explore"]');
    expect(await now()).toBe('javascript');
    await area('html').click();
    expect(await now()).toBe('explore');
    await create.click();
    expect(await now()).toBe('create');
    expect(errors).toEqual([]);
  });

  test('the mode is reachable and tappable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openApp(page, { site: SITE });
    await expect(page.locator('.area-seg')).toBeVisible();
    await expect(page.locator('.mode-seg')).toBeVisible();
    // A row of their own, the five names sharing it, each worth tapping, without
    // pushing the bar sideways — which the sideways check below is what guards.
    const buttons = await page.locator('.area-seg button, .mode-seg button').all();
    const boxes = await Promise.all(buttons.map(b => b.boundingBox()));
    expect(boxes).toHaveLength(5);
    expect(new Set(boxes.map(b => Math.round(b.y))).size).toBe(1);
    for (const b of boxes) expect(b.height).toBeGreaterThanOrEqual(28);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    // Stacked, the panels keep their order, and the tabs are worth tapping too.
    await setTab(page, 'mutation');
    await expect(page.locator('#bugs .bug-row').first()).toBeVisible();
    for (const b of await page.locator('.res-seg button').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(28);
    await setMode(page, 'create');
    expect(await panels(page)).toEqual(['tests', 'results', 'create']);
  });
});
