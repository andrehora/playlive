// Bugs: of the mistakes a site can be broken with, which ones the tests catch.
// A hunt breaks the page on purpose and runs the suite against each version, so
// these tests drive the real thing and then read the panel and the report.
import { test, expect } from '@playwright/test';
import { openApp, runAll, setSpeed } from './app.mjs';

// Coupon code is the one example that ships bugs so far, and its own tests use
// every control it has: 100% coverage with a bug still getting through is the
// whole reason the second score exists.
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
    await page.click('.cov-seg [data-cov="bugs"]');
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);

    // Before a hunt the bugs are listed, unchecked, with nothing scored.
    const before = await report(page);
    expect(before.total).toBe(8);
    expect(before.unchecked).toBe(8);
    expect(before.scored).toBe(0);
    await expect(page.locator('#bugScore')).toHaveText('8 bugs to try');
    await expect(page.locator('#hunt')).toHaveText('Check bugs');

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
    await expect(page.locator('#bugScore')).toHaveText('6 of 8 bugs caught (75%)');
    await expect(page.locator('.coverage-panel')).toHaveAttribute('data-band', 'warn');
    await expect(page.locator('#summary')).toHaveText('Bug hunt: 6 of 8 bugs caught, 2 through');
    await expect(page.locator('#hunt')).toHaveText('Check again');

    // Escaped is the group that leads the list: it is the work left to do.
    const escaped = page.locator('.bug-group[data-state="escaped"]');
    await expect(escaped.locator('.bug-row')).toHaveCount(2);
    await expect(page.locator('.bug-group').first()).toHaveAttribute('data-state', 'escaped');

    // The page is whole again, and the hunt left the run's own score alone:
    // every control used, and still two bugs through.
    expect(await page.evaluate(() => window.playlive.bugs.report().items.some(i => i.live))).toBe(false);
    await expect(page.locator('#bugbar')).toBeHidden();
    const cov = await page.evaluate(() => window.playlive.coverage.report());
    expect(cov.used).toBe(cov.total);

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
    await page.click('.cov-seg [data-cov="bugs"]');
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
    await page.click('.cov-seg [data-cov="bugs"]');
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);

    // Injecting leaves the bug on the page, so it can be run by hand or read in
    // the HTML view. A bar over the site says the page is broken on purpose.
    await page.click('.bug-row:has-text("The discount is 15%") .bug-btn');
    await expect(page.locator('#bugbar')).toBeVisible();
    await expect(page.locator('#bugbarText')).toHaveText('Bug on the page: The discount is 15% instead of 10%');

    // The markup view has a row of its own, so the message moves into it rather
    // than taking a second one, and the line the bug changed is marked there.
    await page.click('.view-seg [data-view="html"]');
    await expect(page.locator('#bugbar')).toBeHidden();
    await expect(page.locator('#htmlBugText')).toHaveText('Bug on the page: The discount is 15% instead of 10%');
    expect(await page.evaluate(() => window.playlive.html.markup())).toContain('disc=SUB*0.15;');
    const marked = page.locator('.htmlcode .l.bug');
    await expect(marked).toHaveCount(1);
    await expect(marked).toContainText('disc=SUB*0.15;');
    await expect(marked.locator('.tag')).toHaveText('bug');

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

  test('a hunt needs a green suite first', async ({ page }) => {
    await openApp(page, { site: SITE });
    await setSpeed(page, 'fast');
    await page.click('.cov-seg [data-cov="bugs"]');
    await expect(page.locator('#bugs .bug-row')).toHaveCount(8);

    // A suite that is already red would call every bug caught, so the hunt says
    // so instead of scoring anything.
    await page.fill('#spec', 'test: Asks for text the page does not have\nsteps:\n  - expectText: Nothing here says this\n');
    await expect(page.locator('#error')).toHaveText('');
    await page.click('#hunt');
    await expect(page.locator('#hunt')).toBeEnabled({ timeout: HUNT_TIMEOUT });
    await expect(page.locator('#summary')).toHaveText('1 of 1 tests fail on the page as it is. A bug hunt needs them green first.');
    expect((await report(page)).scored).toBe(0);
  });

  test('an example with no bugs says so', async ({ page }) => {
    await openApp(page, { site: 'click-counter' });
    await page.click('.cov-seg [data-cov="bugs"]');
    await expect(page.locator('#bugs .cov-note')).toContainText('ships no bugs yet');
    const r = await report(page);
    expect(r.total).toBe(0);
    await expect(page.locator('#bugs .cov-note')).toContainText('ships no bugs yet');
    await expect(page.locator('#hunt')).toBeDisabled();
  });
});
