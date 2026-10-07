// Autocomplete in the editor. What it offers for a given caret is read in
// tests/unit/complete.test.mjs, against a page built for the purpose; what is
// left here is the half that needs a browser — the hundred real pages, and the
// list on screen owning its keys.
import { test, expect } from '@playwright/test';
import { openApp, selectSite, siteIds } from './app.mjs';

const ids = await siteIds();

async function ready(page, id){
  await page.waitForFunction(id => {
    const f = document.getElementById('app');
    if (!f.src.includes(`examples/${id}/`)) return false;
    const d = f.contentDocument;
    return !!d && !!d.body && d.body.children.length > 0;
  }, id);
  await page.evaluate(() => window.playlive.catalog.harvest());
}

test.describe('Every site', () => {
  test('only ever suggests steps that parse and resolve', async ({ page }) => {
    test.setTimeout(240_000);
    const { errors } = await openApp(page);
    for (const id of ids){
      await selectSite(page, id);
      await ready(page, id);
      const problems = await page.evaluate(() => {
        const bad = [];
        for (const action of ['click', 'fill', 'select', 'check', 'uncheck', 'expectVisible', 'expectText']){
          const yaml = `test: t\nsteps:\n  - ${action}: `;
          const r = window.playlive.complete.suggest(yaml, yaml.length);
          for (const it of (r ? r.items : [])){
            const full = yaml + it.insert + '\n';
            const { error, spec } = window.playlive.validate(full);
            if (error){ bad.push(`${action} ${it.insert}: ${error}`); continue; }
            const step = spec.tests[0].steps[0];
            if (step.target && !window.playlive.query(step.target, true).length)
              bad.push(`${action} ${it.insert}: not on the page`);
          }
        }
        return bad;
      });
      expect(problems, `${id}: suggestions that would not work`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
});

test.describe('In the editor', () => {
  const pop = page => page.locator('#acPop');
  const first = page => page.locator('#acPop .ac-item').first();

  async function start(page, text = 'test: t\nsteps:\n'){
    await openApp(page, { site: 'login' });
    await ready(page, 'login');
    // On a phone the code starts folded, and these tests are about typing in it.
    if (await page.locator('#editor').isHidden()) await page.click('#foldSpec');
    await page.fill('#spec', text);
    await expect(pop(page)).toBeHidden();
    return page.locator('#spec');
  }

  test('opens as you type, and one choice leads to the next', async ({ page }) => {
    const spec = await start(page);
    await spec.pressSequentially('  - cl');
    await expect(pop(page)).toBeVisible();
    await expect(first(page).locator('.ac-label')).toHaveText('click');
    await expect(page.locator('#spec')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#spec')).toHaveAttribute('aria-activedescendant', 'acOpt0');

    await page.keyboard.press('Enter');            // the action, which then asks for its target
    await expect(pop(page)).toBeVisible();
    await expect(first(page).locator('.ac-label')).toHaveText('{ role: button, name: Log in }');
    await page.keyboard.press('Enter');
    await expect(pop(page)).toBeHidden();

    expect(await page.inputValue('#spec')).toContain('  - click: { role: button, name: Log in }');
    await expect(page.locator('#error')).toHaveText('');
    await expect(page.locator('#fileStatus')).toHaveText('1 test · 1 step');
  });

  test('arrow keys choose, and Escape gives Tab back to the editor', async ({ page }) => {
    const spec = await start(page);
    await spec.pressSequentially('  - fill: ');
    await expect(pop(page)).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#spec')).toHaveAttribute('aria-activedescendant', 'acOpt1');
    await page.keyboard.press('Tab');              // Tab accepts while the list is open
    expect(await page.inputValue('#spec')).toContain('- fill: { label: Password, value: "" }');

    // the caret waits between the quotes, so typing fills the value in
    await page.keyboard.type('hunter2');
    expect(await page.inputValue('#spec')).toContain('value: "hunter2"');
    await expect(page.locator('#error')).toHaveText('');

    await page.keyboard.press('Escape');
    await expect(pop(page)).toBeHidden();
    await page.keyboard.press('Tab');              // and now Tab indents at the caret again
    expect(await page.inputValue('#spec')).toContain('value: "hunter2  "');
  });

  test('Ctrl+Space asks for the list where typing would not', async ({ page }) => {
    const spec = await start(page);
    await spec.pressSequentially('  - expectText: Customer portal');
    await expect(pop(page)).toBeHidden();          // a finished value is left alone
    await page.keyboard.press('Control+ ');
    await expect(pop(page)).toBeVisible();
    await expect(first(page).locator('.ac-label')).toHaveText('Customer portal');
  });

  test('a test written only with suggestions runs and passes', async ({ page }) => {
    const spec = await start(page, 'test: Written by autocomplete\nsteps:\n');
    await spec.pressSequentially('  - ex');
    await page.keyboard.press('Enter');
    await spec.pressSequentially('Customer');
    await expect(first(page).locator('.ac-label')).toHaveText('Customer portal');
    await page.keyboard.press('Enter');

    await page.selectOption('#speed', 'fast');
    await page.click('#run');
    await expect(page.locator('#run')).toBeEnabled({ timeout: 60_000 });
    await expect(page.locator('#summary')).toHaveClass('ok');
  });

  test('stays out of the way while recording', async ({ page }) => {
    await start(page, 'test: t\nsteps:\n  - expectText: Customer portal\n');
    await page.click('#record');
    await expect(page.locator('#recbar')).toBeVisible();
    await page.frameLocator('#app').getByRole('button', { name: 'Log in' }).click();
    await expect(pop(page)).toBeHidden();
    await page.click('#record');
  });

  test('on a phone it sits against the editor, inside the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    const spec = await start(page);
    await spec.pressSequentially('  - cl');
    await expect(pop(page)).toBeVisible();
    const box = await pop(page).boundingBox(), editor = await page.locator('#editor').boundingBox();
    expect(Math.round(box.x)).toBe(Math.round(editor.x));
    expect(Math.round(box.width)).toBe(Math.round(editor.width));
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(780);
  });
});
