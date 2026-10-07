// Create: the example's tests, taken away and handed back as titles to write.
// What marks a title done is read in tests/unit/create.test.mjs; what is left
// here is the mode holding a file of its own, and the two files never treading
// on each other.
import { test, expect } from '@playwright/test';
import { openApp, setMode, selectSite } from './app.mjs';

const SITE = 'address-form';
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

});
