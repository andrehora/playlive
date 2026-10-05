// The site catalog: what autocomplete is allowed to suggest. Every entry has to
// be something the site really has, and something the YAML format accepts.
import { test, expect } from '@playwright/test';
import { openApp, runAll, selectSite, setSpeed, siteIds } from './app.mjs';

const ids = await siteIds();

// Wait for that site's page, not the one before it, to have rendered in the iframe.
async function frameReady(page, id){
  await page.waitForFunction(id => {
    const f = document.getElementById('app');
    if (!f.src.includes(`examples/${id}/`)) return false;
    const d = f.contentDocument;
    return !!d && !!d.body && d.body.children.length > 0;
  }, id);
}

// Harvest and check in one go, so the page can't change between the two.
function audit(page){
  return page.evaluate(() => {
    const cat = window.playlive.catalog.harvest();
    const problems = [];
    const withValue = (t, v) => t.replace(/\s*\}$/, `, value: ${JSON.stringify(v)} }`);
    const STEP = { click: 'click', toggle: 'check', other: 'expectVisible' };
    const check = (yaml, what) => {
      const { error } = window.playlive.validate(`test: t\nsteps:\n  - ${yaml}\n`);
      if (error) problems.push(`${what} does not parse: ${yaml} -> ${error}`);
    };
    for (const kind of ['click', 'field', 'select', 'toggle', 'other']){
      for (const e of cat[kind]){
        if (!window.playlive.query(e.parts, true).length) problems.push(`${kind} ${e.target} is not on the page`);
        if (kind === 'field') check(`fill: ${withValue(e.target, 'x')}`, kind);
        else if (kind === 'select') check(`select: ${withValue(e.target, e.options[0] ?? 'x')}`, kind);
        else check(`${STEP[kind]}: ${e.target}`, kind);
      }
    }
    for (const e of cat.texts.slice(0, 25)){
      if (!window.playlive.query({ text: e.text }, true).length) problems.push(`text “${e.text}” is not on the page`);
    }
    const counts = Object.fromEntries(['click', 'field', 'select', 'toggle', 'other', 'texts'].map(k => [k, cat[k].length]));
    return { problems, counts, roles: cat.roles };
  });
}

test.describe('Site catalog', () => {
  test('every site offers targets that exist and parse', async ({ page }) => {
    test.setTimeout(240_000);
    const { errors } = await openApp(page);
    for (const id of ids){
      await selectSite(page, id);
      await frameReady(page, id);
      const { problems, counts } = await audit(page);
      expect(problems, `${id}: catalog entries that are wrong`).toEqual([]);
      const actionable = counts.click + counts.field + counts.select + counts.toggle;
      expect(actionable, `${id}: nothing to act on was found`).toBeGreaterThan(0);
      expect(counts.texts, `${id}: no text to assert on was found`).toBeGreaterThan(0);
    }
    expect(errors).toEqual([]);
  });

  test('knows the parts of a target, not just its text', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await frameReady(page, 'login');
    const cat = await page.evaluate(() => window.playlive.catalog.harvest());
    expect(cat.site).toBe('login');
    expect(cat.field.map(e => e.target)).toContain('{ label: Email }');
    expect(cat.field.find(e => e.target === '{ label: Email }').parts).toEqual({ label: 'Email' });
    expect(cat.click.some(e => e.parts.role === 'button')).toBe(true);
    expect(cat.roles).toContain('button');
    expect(cat.roles).toContain('textbox');
  });

  test('a run reveals screens the first page does not show', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await frameReady(page, 'login');
    const before = await page.evaluate(() => window.playlive.catalog.harvest().texts.map(e => e.text));
    await setSpeed(page, 'fast');
    await runAll(page);
    const after = await page.evaluate(() => window.playlive.catalog.snapshot().texts.map(e => e.text));
    // Nothing is ever forgotten, and the run has been through the logged-in screen
    expect(after).toEqual(expect.arrayContaining(before));
    expect(after.length).toBeGreaterThan(before.length);
  });

  test('Reset forgets the site, since its data shapes the page', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await frameReady(page, 'login');
    const targets = () => page.evaluate(() => window.playlive.catalog.snapshot('login').click.map(e => e.target));
    const fresh = await page.evaluate(() => window.playlive.catalog.harvest().click.map(e => e.target));

    await setSpeed(page, 'fast');
    await runAll(page);
    // The run went through states the plain page never shows, and they are kept
    expect((await targets()).length).toBeGreaterThan(fresh.length);

    await page.click('#reset');
    await expect(page.locator('#summary')).toHaveText('');
    await frameReady(page, 'login');
    // Back to what the reloaded page offers, with the run's leftovers gone
    await expect.poll(targets).toEqual(fresh);
  });
});
