// Bugs: of the mistakes a site can be broken with, which ones the tests catch.
// A hunt breaks the page on purpose and runs the suite against each version, so
// these tests drive the real thing and then read the panel and the report.
import { test, expect } from '@playwright/test';
import { RUN_TIMEOUT, openApp, runAll, setSpeed, setTab } from './app.mjs';

// Coupon code ships bugs, and its own tests use every control it has: touching
// every control with a bug still getting through is the reason Mutation exists.
const SITE = 'coupon-code';
const HUNT_TIMEOUT = 180_000;

const report = page => page.evaluate(() => window.playlive.bugs.report());
const states = async page => Object.fromEntries((await report(page)).items.map(i => [i.id, i.state]));

async function hunt(page){
  await page.click('#hunt');
  await expect(page.locator('#hunt')).toBeDisabled();
  await expect(page.locator('#hunt')).toBeEnabled({ timeout: HUNT_TIMEOUT });
  return report(page);
}

test.describe('Bugs', () => {
  test('tries every bug and says which the tests caught', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE });
    await setSpeed(page, 'fast');
    await setTab(page, 'mutation');
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);

    // Before a hunt the bugs are listed, unchecked, with nothing scored.
    const before = await report(page);
    expect(before.total).toBe(8);
    expect(before.unchecked).toBe(8);
    expect(before.scored).toBe(0);
    await expect(page.locator('#bugScore')).toHaveText('8 mutations');
    await expect(page.locator('#hunt')).toHaveText('Run mutations');

    const r = await hunt(page);
    expect(r.stale).toBe(0);             // every patch still matches the page it breaks
    expect(r.unchecked).toBe(0);
    expect(r.caught + r.escaped).toBe(8);

    // The shipped tests check the numbers, so the six bugs that change what the
    // order says are caught. The two that leave the order right get through:
    // nothing clears a stale error, and nothing reads the success banner.
    expect(await states(page)).toEqual({
      rate: 'caught', freeship: 'caught', total: 'caught', case: 'caught',
      expired: 'caught', unknown: 'caught', stale: 'escaped', banner: 'escaped'
    });
    await expect(page.locator('#bugScore')).toHaveText('6 of 8 mutations caught (75%)');
    await expect(page.locator('#bugTab')).toHaveAttribute('data-band', 'warn');
    await expect(page.locator('#summary')).toHaveText('Mutation: 6 of 8 caught, 2 through');
    await expect(page.locator('#hunt')).toHaveText('Run again');

    // Escaped is the group that leads the list: it is the work left to do.
    const escaped = page.locator('.bug-group[data-state="escaped"]');
    await expect(escaped.locator('.bug-row')).toHaveCount(2);
    await expect(page.locator('.bug-group').first()).toHaveAttribute('data-state', 'escaped');

    // The page is whole again
    expect(await page.evaluate(() => window.playlive.bugs.report().items.some(i => i.live))).toBe(false);
    await expect(page.locator('#bugbar')).toBeHidden();

    // Eight deliberate failures are not this site's verdict and not these
    // tests' history: only the hunt's own baseline run is recorded.
    await expect(page.locator('#siteBtn')).toHaveAttribute('data-status', 'pass');
    const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('live-test-runner:history') || '{}'));
    expect(Object.values(hist)).toHaveLength(3);
    expect(Object.values(hist).every(h => h.length === 1 && h[0] === 1)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('a test written for an escaped bug catches it', async ({ page }) => {
    await openApp(page, { site: SITE });
    await setSpeed(page, 'fast');
    await setTab(page, 'mutation');
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);

    // The stale-error bug needs two codes in one test to see: one that fails,
    // then one that works. That is the test the file is missing.
    await page.fill('#spec', [
      'test: A good code clears the error from a bad one',
      'steps:',
      '  - fill: { label: Coupon code, value: BOGUS }',
      '  - click: { role: button, name: Apply }',
      "  - expectText: \"We don't recognize the code BOGUS.\"",
      '  - fill: { label: Coupon code, value: SAVE10 }',
      '  - click: { role: button, name: Apply }',
      "  - expectNoText: \"We don't recognize the code BOGUS.\""
    ].join('\n'));
    await expect(page.locator('#error')).toHaveText('');

    const r = await hunt(page);
    expect(r.items.find(i => i.id === 'stale').state).toBe('caught');
  });

  test('injects one bug to look at, and repairs the page', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE });
    await setSpeed(page, 'fast');
    await setTab(page, 'mutation');
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);

    // Injecting leaves the bug on the page, so it can be run by hand or read in
    // the HTML view. A bar over the site says the page is broken on purpose.
    await page.click('.bug-row:has-text("The discount is 15%") .bug-btn');
    await expect(page.locator('#bugbar')).toBeVisible();
    await expect(page.locator('#bugbarText')).toHaveText('Mutation on the page: The discount is 15% instead of 10%');

    // The markup view has a row of its own, so the message moves into it rather
    // than taking a second one, and the line the bug changed is marked there.
    await page.click('.view-seg [data-view="html"]');
    await expect(page.locator('#bugbar')).toBeHidden();
    await expect(page.locator('#htmlBugText')).toHaveText('Mutation on the page: The discount is 15% instead of 10%');
    expect(await page.evaluate(() => window.playlive.html.markup())).toContain('disc=SUB*0.15;');
    const marked = page.locator('.htmlcode .l.bug');
    await expect(marked).toHaveCount(1);
    await expect(marked).toContainText('disc=SUB*0.15;');
    // The name sits in the gutter, in place of that line's number, so the
    // markup it names keeps its place.
    await expect(page.locator('#htmlGutter div.bug .tag')).toHaveText('mutation');
    await expect(marked.locator('.tag')).toHaveCount(0);

    // The suite is red while it is injected, and that run is a real run: it is
    // the user's own, not a hunt's.
    const bad = await runAll(page);
    expect(bad.state).toBe('bad');
    expect(bad.tests.find(t => t.state === 'failed').error).toContain('Discount: -$6.00');

    // Repair sits with Revert and Save while the markup is showing.
    await page.click('#htmlBugRepair');
    await expect(page.locator('#htmlBugText')).toBeHidden();
    await expect(page.locator('.htmlcode .l.bug')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.playlive.html.markup())).toContain('disc=SUB*0.1;');
    await page.click('.view-seg [data-view="site"]');
    await expect(page.locator('#bugbar')).toBeHidden();
    const good = await runAll(page);
    expect(good.state).toBe('ok');
    expect(errors).toEqual([]);
  });

  test('a test that is failing now is not called flaky', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE });
    await setSpeed(page, 'fast');
    const flaky = page.locator('#results .test[data-state="failed"] .flaky');

    // Green once, so the history has a pass in it.
    expect((await runAll(page)).state).toBe('ok');

    // Then break the page and run again: the test has now both passed and
    // failed without being changed, but it is failing, and that is what the
    // row should say.
    await page.evaluate(async () => {
      const list = await window.playlive.bugs.list('coupon-code');
      await window.playlive.bugs.inject('coupon-code', list.find(b => b.id === 'rate'));
    });
    const bad = await runAll(page);
    expect(bad.state).toBe('bad');
    await expect(flaky).toBeHidden();

    // Green again, and the badge is the right thing to say: it passes and
    // fails without being changed.
    await page.evaluate(() => window.playlive.bugs.repair());
    expect((await runAll(page)).state).toBe('ok');
    await expect(page.locator('#results .test[data-state="passed"] .flaky').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a hunt needs a green suite first', async ({ page }) => {
    await openApp(page, { site: SITE });
    await setSpeed(page, 'fast');
    await setTab(page, 'mutation');
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);

    // A suite that is already red would call every bug caught, so the hunt says
    // so instead of scoring anything.
    await page.fill('#spec', 'test: Asks for text the page does not have\nsteps:\n  - expectText: Nothing here says this\n');
    await expect(page.locator('#error')).toHaveText('');
    await page.click('#hunt');
    await expect(page.locator('#hunt')).toBeEnabled({ timeout: HUNT_TIMEOUT });
    await expect(page.locator('#summary')).toHaveText('1 of 1 tests fail on the page as it is. A mutation run needs them green first.');
    expect((await report(page)).scored).toBe(0);
  });

  test('the hunt greys out while the runner is busy, and comes back', async ({ page }) => {
    await openApp(page, { site: SITE });
    await setTab(page, 'mutation');
    await setSpeed(page, 'slow');
    await page.click('#run');
    await expect(page.locator('#hunt')).toBeDisabled();
    await page.click('#stop');
    await expect(page.locator('#run')).toBeEnabled({ timeout: RUN_TIMEOUT });
    await expect(page.locator('#hunt')).toBeEnabled();

    // And a hunt that will not start puts its own button back: the click
    // disabled it, so every way out of the hunt has to say so.
    await page.fill('#spec', 'test: Asks for text the page does not have\nsteps:\n  - expectText: Nothing here says this\n');
    await expect(page.locator('#error')).toHaveText('');
    await setSpeed(page, 'fast');
    await page.click('#hunt');
    await expect(page.locator('#hunt')).toBeEnabled({ timeout: RUN_TIMEOUT });
  });

  test('an example with no bugs says so', async ({ page }) => {
    await openApp(page, { site: 'click-counter' });
    await setTab(page, 'mutation');
    await expect(page.locator('#bugs .list-note')).toContainText('ships no mutations yet');
    const r = await report(page);
    expect(r.total).toBe(0);
    await expect(page.locator('#bugs .list-note')).toContainText('ships no mutations yet');
    await expect(page.locator('#hunt')).toBeDisabled();
  });

  // The tab folds with Results, to the panel's one row, and opens back on it.
  test('the tab folds with Results, and the code takes the room', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openApp(page, { site: SITE, tab: 'mutation' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const wasEditor = await h('#editor');
    await expect(page.locator('#foldAll')).toHaveAttribute('aria-label', 'Collapse the panel');

    await page.click('#foldAll');
    await expect(page.locator('#bugTab')).toBeHidden();
    expect(await h('.results-panel')).toBeLessThanOrEqual(await h('.results-panel .panel-head') + 2);
    expect(await h('#editor')).toBeGreaterThan(wasEditor);
    await expect(page.locator('#foldAll')).toHaveAttribute('aria-label', 'Expand the panel');

    // Choosing a tab opens the panel on it.
    await setTab(page, 'smells');
    await expect(page.locator('#smellTab')).toBeVisible();
    await setTab(page, 'mutation');
    await expect(page.locator('#bugs')).toBeVisible();
    await expect(page.locator('#results')).toBeHidden();
  });
});
