// Create: the example's tests, taken away and handed back as titles to write.
// The mode holds a file of its own, so most of these are about the two files
// never treading on each other.
import { test, expect } from '@playwright/test';
import { openApp, setMode, selectSite } from './app.mjs';

const SITE = 'address-form';
const report = page => page.evaluate(() => window.playlive.create.report());
const spec = page => page.inputValue('#spec');

test.describe('Create', () => {
  test('the editor is the titles as comments, and the panel says how many', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE });
    const shipped = await spec(page);
    expect(shipped).toContain('test: Saves a US address');

    await setMode(page, 'create');
    // Three panels: nothing is being measured here, there is something to write.
    await expect(page.locator('.create-panel')).toBeVisible();
    await expect(page.locator('.coverage-panel')).toBeHidden();
    await expect(page.locator('.bugs-panel')).toBeHidden();
    await expect(page.locator('.smells-panel')).toBeHidden();

    // The titles, as comments, and nothing else: no steps, no settings.
    await expect(page.locator('#spec')).toHaveValue('# Saves a US address\n\n# The postal field follows the country\n\n# Rejects a short ZIP code\n');
    await expect(page.locator('#createScore')).toHaveText('0 of 3 done');
    await expect(page.locator('.create-group[data-state="todo"] .cov-title')).toHaveText('TODO');
    await expect(page.locator('.create-group[data-state="todo"] .create-row')).toHaveCount(3);
    await expect(page.locator('#create .cov-note')).toHaveCount(0);   // the list is the panel
    expect(errors).toEqual([]);
  });

  test('a title is done on its exact name and the example\u2019s own checks', async ({ page }) => {
    await openApp(page, { site: 'click-counter', mode: 'create' });
    await expect(page.locator('#createScore')).toHaveText('0 of 3 done');

    await page.fill('#spec', [
      // The brief nobody has answered keeps its comment, as the mode wrote it.
      '# Uses a bigger step', '',
      // The example's own check, reached by a route of its own: what the test
      // proves is fixed, the steps that get there are not.
      'test: Counts up',
      'steps:',
      '  - select: { label: Step, value: 3 }',
      '  - click: { role: button, name: Increment }',
      '  - expectText: "Count: 3"', '',
      // The right steps under a title the example does not have: the panel is
      // matching briefs, so a near miss is not an answer to one.
      'test: Counts down',
      'steps:',
      '  - click: { role: button, name: Decrement }',
      '  - expectText: "Count can\'t go below 0."', '',
      // The right title, checking something the example does not check.
      'test: Cannot go below zero',
      'steps:',
      '  - click: { role: button, name: Decrement }',
      '  - expectText: "Count: 0"'
    ].join('\n'));

    await expect(page.locator('#createScore')).toHaveText('1 of 3 done');
    // The three parts read as a board: what is left, what is under way, what is done.
    expect(await page.$$eval('.create-group .cov-title', g => g.map(x => x.textContent)))
      .toEqual(['TODO', 'DOING', 'DONE']);
    await expect.poll(async () => (await report(page)).items.map(i => [i.title, i.state])).toEqual([
      ['Counts up', 'done'],
      ['Uses a bigger step', 'todo'],
      ['Cannot go below zero', 'nocheck']
    ]);

    // A row goes to its line: its comment while it is still to write.
    await page.locator('.create-group[data-state="todo"] .create-line').click();
    expect(await page.evaluate(() => {
      const t = document.getElementById('spec');
      return t.value.slice(t.selectionStart, t.selectionEnd);
    })).toBe('# Uses a bigger step');

    // Make the check the one the example makes and it is done, with nothing run.
    await page.fill('#spec', (await page.inputValue('#spec')).replace('"Count: 0"', '"Count can\'t go below 0."'));
    await expect(page.locator('#createScore')).toHaveText('2 of 3 done');
  });

  // The example's own file is the answer key, so it has to score full marks —
  // every one of the hundred, or the rule is asking for something unreachable.
  test('every example\u2019s own tests are a full answer to its own briefs', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'create' });
    const short = await page.evaluate(async () => {
      const out = [];
      for (const id of window.playlive.SITE_IDS){
        const text = await (await fetch(`examples/${id}/tests.yaml`)).text();
        await window.playlive.create.skeleton(id);         // warms the shipped file
        const r = window.playlive.create.report(text, id);
        if (!r.total) out.push(`${id}: no titles`);
        else if (r.done !== r.total) out.push(`${id}: ${r.done} of ${r.total}`);
      }
      return out;
    });
    expect(short).toEqual([]);
  });

  test('a check inherited from beforeEach does not count as the test\u2019s own', async ({ page }) => {
    await openApp(page, { site: 'click-counter', mode: 'create' });
    await page.fill('#spec', [
      'beforeEach:',
      '  - expectText: "Count: 3"', '',
      'test: Counts up',
      'steps:',
      '  - click: { role: button, name: Increment }'
    ].join('\n'));
    // It runs inside the test, but it is not what the test claims.
    await expect(page.locator('#createScore')).toHaveText('0 of 3 done');
    expect((await report(page)).items[0].state).toBe('nocheck');
  });

  test('neither file treads on the other, across modes, sites and a reload', async ({ page }) => {
    await openApp(page, { site: SITE });
    const shipped = await spec(page);
    await page.fill('#spec', shipped + '\ntest: One I wrote in Explore\nsteps:\n  - expectText: Address\n');
    const mine = await spec(page);

    await setMode(page, 'create');
    await expect(page.locator('#spec')).toHaveValue(/^# Saves a US address/);
    await page.fill('#spec', '# Saves a US address\n\ntest: Saves a US address\nsteps:\n  - expectText: Address\n');
    const draft = await spec(page);

    // Back and forth: each mode gets its own file back.
    await setMode(page, 'explore');
    await expect(page.locator('#spec')).toHaveValue(mine);
    await setMode(page, 'create');
    await expect(page.locator('#spec')).toHaveValue(draft);

    // Another example starts from its own titles, and coming back keeps the draft.
    await selectSite(page, 'click-counter');
    await expect(page.locator('#spec')).toHaveValue('# Counts up\n\n# Uses a bigger step\n\n# Cannot go below zero\n');
    await selectSite(page, SITE);
    await expect(page.locator('#spec')).toHaveValue(draft);

    // And a reload comes back to the mode, the draft and the other file.
    await page.reload();
    await page.waitForFunction(() => typeof window.playlive?.selectSite === 'function');
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('create');
    await expect(page.locator('#spec')).toHaveValue(draft);
    await setMode(page, 'explore');
    await expect(page.locator('#spec')).toHaveValue(mine);
  });

  test('Reset takes back what was written here too', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'create' });
    await page.fill('#spec', '# Saves a US address\n\ntest: Saves a US address\nsteps:\n  - expectText: Address saved for United States.\n');
    await expect(page.locator('#createScore')).toHaveText('1 of 3 done');

    await page.click('#reset');
    // Back to the titles, with nothing of ours left in storage.
    await expect(page.locator('#spec')).toHaveValue('# Saves a US address\n\n# The postal field follows the country\n\n# Rejects a short ZIP code\n');
    await expect(page.locator('#createScore')).toHaveText('0 of 3 done');
    expect(await page.evaluate(() => Object.keys(localStorage)
      .filter(k => k.startsWith('live-test-runner') && k !== 'live-test-runner:layout'))).toEqual([]);
  });

  test('the panel folds to its one row and Results takes the room back', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openApp(page, { site: SITE, mode: 'create' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const wasPanel = await h('.create-panel'), wasResults = await h('.results-panel');

    await page.click('#foldCreate');
    await expect(page.locator('#create')).toBeHidden();
    await expect(page.locator('#createScore')).toBeVisible();      // the count stays
    expect(await h('.create-panel')).toBeLessThanOrEqual(await h('.create-panel .panel-head') + 2);
    expect(await h('.results-panel')).toBeGreaterThan(wasResults);
    await expect(page.locator('#createResizer')).toBeHidden();

    await page.click('#foldCreate');
    await expect(page.locator('#create')).toBeVisible();
    expect(await h('.create-panel')).toBe(wasPanel);
  });

  // A brief is "prove this", so a test that checks nothing is not one. It is
  // also how the answer key can hold the Unknown Tests Smells mode needs to
  // point at without failing its own briefs.
  test('a test that checks nothing is not a brief', async ({ page }) => {
    await openApp(page, { site: 'click-counter', mode: 'create' });
    // The example ships four tests, the last of which deliberately checks nothing.
    await expect(page.locator('#createScore')).toHaveText('0 of 3 done');
    await expect(page.locator('#spec'))
      .toHaveValue('# Counts up\n\n# Uses a bigger step\n\n# Cannot go below zero\n');
    expect(await page.evaluate(() => window.playlive.create.titles([
      'test: Proves something', 'steps:', '  - expectText: hi', '',
      'test: Proves nothing', 'steps:', '  - click: { role: button, name: Increment }'
    ].join('\n')))).toEqual(['Proves something']);
  });
});
