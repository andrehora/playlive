// Modes: which panels the left column has at all. Explore is the tests,
// Coverage adds its panel, Mutation adds one more below it, and Smells and
// Create each step out of that line with a panel of their own. The choice is
// in the app bar, beside the example, because every panel below answers to it.
import { test, expect } from '@playwright/test';
import { openApp, runAll, setMode, setSpeed } from './app.mjs';

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
  test('each mode adds the panel it is named after', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE });

    // Explore is the tests and what they did: no score panels, and no handles
    // for panels that are not there.
    await expect(page.locator('.mode-seg [data-mode="explore"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await panels(page)).toEqual(['tests', 'results']);
    await expect(page.locator('#covResizer')).toBeHidden();
    await expect(page.locator('#bugResizer')).toBeHidden();
    await expect(page.locator('#smellResizer')).toBeHidden();
    await expect(page.locator('#hunt')).toBeHidden();

    await setMode(page, 'coverage');
    expect(await panels(page)).toEqual(['tests', 'results', 'coverage']);
    await expect(page.locator('#covResizer')).toBeVisible();
    await expect(page.locator('#bugResizer')).toBeHidden();

    // Mutation asks one question — would these tests notice the page going
    // wrong? — so it takes the column alone, like the two modes after it.
    await setMode(page, 'mutation');
    expect(await panels(page)).toEqual(['tests', 'results', 'bugs']);
    await expect(page.locator('#bugResizer')).toBeVisible();
    await expect(page.locator('#covResizer')).toBeHidden();
    await expect(page.locator('#hunt')).toBeVisible();
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);
    await expect(page.locator('#bugScore')).toHaveText('8 mutations');

    // Smells reads the tests rather than a run, so it takes the column alone:
    // neither score belongs beside it.
    await setMode(page, 'smells');
    expect(await panels(page)).toEqual(['tests', 'results', 'smells']);
    await expect(page.locator('#smellResizer')).toBeVisible();
    await expect(page.locator('#covResizer')).toBeHidden();
    await expect(page.locator('#bugResizer')).toBeHidden();

    // Create is the one that changes what the editor holds, so it takes the
    // column alone too.
    await setMode(page, 'create');
    expect(await panels(page)).toEqual(['tests', 'results', 'create']);
    await expect(page.locator('#createResizer')).toBeVisible();
    await expect(page.locator('#smellResizer')).toBeHidden();

    await setMode(page, 'explore');
    expect(await panels(page)).toEqual(['tests', 'results']);
    expect(errors).toEqual([]);
  });

  test('no mode makes the desktop page scroll, or leaves the column half empty', async ({ page }) => {
    await openApp(page, { site: SITE });
    for (const mode of ['explore', 'coverage', 'mutation', 'smells', 'create']){
      await setMode(page, mode);
      for (const height of [720, 900, 1000]){
        await page.setViewportSize({ width: 1440, height });
        expect(await overflow(page), `page scrolls at 1440x${height} in ${mode}`).toBeLessThanOrEqual(1);
        expect(await slack(page), `${mode} leaves a gap at 1440x${height}`).toBeLessThanOrEqual(2);
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
    for (const [mode, foldSel, foldKey] of [['explore'], ['coverage', '#foldCov', 'cov'],
      ['mutation', '#foldBugs', 'bug'], ['smells', '#foldSmells', 'smells'],
      ['create', '#foldCreate', 'create']]){
      await setMode(page, mode);
      for (const results of [false, true]) for (const other of foldSel ? [false, true] : [false]) for (const spec of [false, true]){
        await setResults(results);
        if (foldSel) await toggle(foldSel, foldKey, other);
        await toggle('#foldSpec', 'spec', spec);
        const where = `${mode}: results=${results} ${foldKey || ''}=${other} code=${spec}`;
        expect(await overflow(page), `page scrolls with ${where}`).toBeLessThanOrEqual(1);
        // Folding everything leaves nothing on screen that could grow, and a
        // gap is honester there than a panel stretched over its hidden body.
        if (!(spec && results && (!foldSel || other))) expect(await slack(page), `gap with ${where}`).toBeLessThanOrEqual(2);
        const blank = await page.evaluate(() => [...document.querySelectorAll('.left > .panel')]
          .filter(p => p.getClientRects().length && !p.classList.contains('tests-panel'))
          .filter(p => {
            const head = p.querySelector('.panel-head');
            const body = [...p.children].find(c => c !== head);
            return body && body.hidden && p.getBoundingClientRect().height > head.getBoundingClientRect().height + 4;
          }).map(p => p.className));
        expect(blank, `panel stretched over a hidden body with ${where}`).toEqual([]);
      }
      await setResults(false);
      if (foldSel) await toggle(foldSel, foldKey, false);
      await toggle('#foldSpec', 'spec', false);
    }
  });

  test('the Mutation panel has a handle of its own that cannot squeeze Results away', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openApp(page, { site: SITE, mode: 'mutation' });
    const height = () => page.locator('.bugs-panel').boundingBox().then(b => Math.round(b.height));
    const before = await height();
    await page.focus('#bugResizer');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
    expect(await height()).toBeGreaterThan(before);
    for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowUp');
    expect((await page.locator('.results-panel').boundingBox()).height).toBeGreaterThanOrEqual(130);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
    await page.dblclick('#bugResizer');
    expect(await height()).toBe(before);
  });

  test('folding the code gives the room to a list, not to blank space', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'mutation' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const wasBugs = await h('.bugs-panel'), wasResults = await h('.results-panel');

    await page.click('#foldSpec');
    await expect(page.locator('#editor')).toBeHidden();
    // The room goes to the list that has eight rows. Results may reach its own
    // three — it was clipped below them — but it is never stretched past what
    // it has to show.
    expect(await h('.bugs-panel') - wasBugs).toBeGreaterThan(await h('.results-panel') - wasResults);
    expect(await page.evaluate(() => {
      const el = document.getElementById('results');
      return el.clientHeight - el.scrollHeight;
    })).toBeLessThanOrEqual(2);
    expect(await slack(page)).toBeLessThanOrEqual(2);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
    // Nothing above the editor's handle left to split.
    await expect(page.locator('#rowResizer')).toBeHidden();

    // In Explore, Results is the only list there is, so it does take it all.
    await setMode(page, 'explore');
    const explore = await h('.results-panel');
    await page.click('#foldSpec');
    await expect(page.locator('#editor')).toBeVisible();
    expect(await h('.results-panel')).toBeLessThan(explore);
    expect(await slack(page)).toBeLessThanOrEqual(2);
  });

  test('the mode is remembered, and leaving Mutation repairs the page', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'mutation' });
    await page.reload();
    await page.waitForFunction(() => typeof window.playlive?.selectSite === 'function');
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('mutation');
    await expect(page.locator('.bugs-panel')).toBeVisible();

    // A page left broken on purpose must not outlive the panel that says so.
    await page.locator('.bug-row', { hasText: 'The discount is 15%' }).locator('.bug-btn').click();
    await expect(page.locator('#bugbar')).toBeVisible();
    await setMode(page, 'explore');
    await expect(page.locator('#bugbar')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.playlive.bugs.report().items.some(i => i.live))).toBe(false);

    // And the repaired page is the one the tests run against.
    await setSpeed(page, 'fast');
    expect((await runAll(page)).state).toBe('ok');
  });

  test('the panel follows the example it belongs to', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'mutation' });
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);
    await page.evaluate(() => window.playlive.selectSite('click-counter'));
    await expect(page.locator('#bugs .bug-row')).toHaveCount(0);
    await expect(page.locator('#bugs .cov-note')).toContainText('ships no mutations yet');
  });

  // A link that names the mode is a link to what you were doing, not only to
  // what you were looking at. Each half is left out when it is the default, so
  // every link written before modes existed still means what it meant.
  test('the mode is half the link, and the default half is left out', async ({ page }) => {
    await openApp(page, { site: SITE });
    expect(new URL(page.url()).hash).toBe('#coupon-code');

    await setMode(page, 'create');
    await expect.poll(() => new URL(page.url()).hash).toBe('#create#coupon-code');
    expect(await page.evaluate(() => window.playlive.share.url())).toMatch(/#create#coupon-code$/);

    // Home is the first example, so a link to it in a mode names only the mode.
    await page.evaluate(() => window.playlive.selectSite(window.playlive.SITE_IDS[0]));
    await expect.poll(() => new URL(page.url()).hash).toBe('#create');
    // And Explore on the first example is the plain address it has always been.
    await setMode(page, 'explore');
    await expect.poll(() => new URL(page.url()).hash).toBe('');
  });

  test('a pasted link opens the mode and the example it names', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { location.hash = '#mutation#coupon-code'; });
    await expect.poll(() => page.evaluate(() => window.playlive.modes.get())).toBe('mutation');
    await expect(page.locator('#siteName')).toHaveText('Coupon code');
    await expect(page.locator('.bugs-panel')).toBeVisible();

    // A link from before modes existed names only the example, and still does.
    await page.evaluate(() => { location.hash = '#click-counter'; });
    await expect.poll(() => page.evaluate(() => window.playlive.modes.get())).toBe('explore');
    await expect(page.locator('#siteName')).toHaveText('Counter');

    // And opening one cold works the same way.
    const { errors } = await openApp(page, { hash: '#smells#login' });
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('smells');
    await expect(page.locator('#siteName')).toHaveText('Login');
    await expect(page.locator('.smells-panel')).toBeVisible();
    expect(new URL(page.url()).hash).toBe('#smells#login');
    expect(errors).toEqual([]);
  });

  test('the mode is reachable and tappable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openApp(page, { site: SITE });
    const seg = page.locator('.mode-seg');
    await expect(seg).toBeVisible();
    // A row of its own, the five names sharing it, each worth tapping. At 360px
    // they do not fit on one line, so the row wraps rather than pushing the bar
    // sideways — which the sideways check below is what guards.
    const boxes = await Promise.all((await seg.locator('button').all()).map(b => b.boundingBox()));
    expect(boxes).toHaveLength(5);
    for (const b of boxes) expect(b.height).toBeGreaterThanOrEqual(28);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    // Stacked, the panels keep their order: the site, then Results, then the
    // panel this mode is named after.
    await setMode(page, 'mutation');
    expect(await panels(page)).toEqual(['tests', 'results', 'bugs']);
  });
});
