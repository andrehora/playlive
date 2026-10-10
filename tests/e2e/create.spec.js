// Create: the example's tests, taken away and handed back as titles to write.
// What marks a title done is read in tests/unit/create.test.mjs; what is left
// here is the mode holding a file of its own, and the two files never treading
// on each other.
import { test, expect } from '@playwright/test';
import { openApp, setMode, setTab, selectSite } from './app.mjs';

const SITE = 'address-form';
const spec = page => page.inputValue('#spec');

test.describe('Create', () => {
  test('Results drops the shipped tests, and the Create tab still collapses and opens again', async ({ page }) => {
    await openApp(page, { site: SITE });
    await expect(page.locator('#results .test')).toHaveCount(3);
    // The titles alone do not parse, but the last list was the shipped tests:
    // the answers, step by step. They go rather than stay.
    await setMode(page, 'create');
    await expect(page.locator('#results .test')).toHaveCount(0);
    const results = () => page.locator('#left').getAttribute('data-results');
    const fold = page.locator('#foldAll');

    // There are no steps to fold, so every press goes between open and collapsed
    for (let i = 0; i < 4; i++){
      await expect(fold).toBeEnabled();
      const before = await results();
      await fold.click();
      expect(await results() === 'collapsed').toBe(before !== 'collapsed');
    }
  });

  test('the editor is the titles as comments, and the panel says how many', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE });
    const shipped = await spec(page);
    expect(shipped).toContain('test: Saves a US address');

    await setMode(page, 'create');
    // Create is the Results panel's last tab
    await expect(page.locator('#createTab')).toBeVisible();
    await expect(page.locator('#results')).toBeHidden();

    // The titles, as comments, and nothing else: no steps, no settings.
    await expect(page.locator('#spec')).toHaveValue('# Saves a US address\n\n# The postal field becomes Postcode for the UK\n\n# Rejects a short ZIP code\n');
    await expect(page.locator('#createScore')).toHaveText('0 of 3 done');
    await expect(page.locator('.create-group[data-state="todo"] .list-title')).toHaveText('TODO');
    await expect(page.locator('.create-group[data-state="todo"] .create-row')).toHaveCount(3);
    await expect(page.locator('#create .list-note')).toHaveCount(0);   // the list is the panel
    // Nothing written yet is a start, not a problem: no red count, and the hint in grey
    await expect(page.locator('#fileStatus')).toHaveText('No tests');
    await expect(page.locator('#fileStatus')).not.toHaveClass(/bad/);
    await expect(page.locator('#error')).toHaveClass(/hint/);
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
    await expect(page.locator('#spec')).toHaveValue('# Three clicks count up to 3\n\n# A step of 5 counts to 10 in two clicks\n\n# Cannot go below zero\n');
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
    await expect(page.locator('#spec')).toHaveValue('# Saves a US address\n\n# The postal field becomes Postcode for the UK\n\n# Rejects a short ZIP code\n');
    await expect(page.locator('#createScore')).toHaveText('0 of 3 done');
    expect(await page.evaluate(() => Object.keys(localStorage)
      .filter(k => k.startsWith('live-test-runner') && k !== 'live-test-runner:layout'))).toEqual([]);
  });

  test('any other tab gives the example\'s tests back, and Create gives yours', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'create' });
    await page.locator('#spec').fill('# mine\n');
    await setTab(page, 'smells');
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('explore');
    await expect(page.locator('#spec')).toHaveValue(/test: Saves a US address/);
    await setTab(page, 'create');
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('create');
    await expect(page.locator('#spec')).toHaveValue('# mine\n');
  });

});
