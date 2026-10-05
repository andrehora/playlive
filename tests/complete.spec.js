// Autocomplete in the editor: what it offers, and that everything it offers is
// something this site can really do.
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
// suggest() at the end of the given text, as a plain object
function at(page, text, caret){
  return page.evaluate(([t, c]) => {
    const r = window.playlive.complete.suggest(t, c ?? t.length);
    return r && { what: r.what, word: r.word, from: r.from, to: r.to, items: r.items };
  }, [text, caret]);
}
const head = 'test: t\nsteps:\n';
const inserts = r => (r ? r.items.map(i => i.insert) : []);

test.describe('What autocomplete offers', () => {
  test('the actions, and then only the targets that action can use', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await ready(page, 'login');

    const acts = await at(page, `${head}  - `);
    expect(acts.what).toBe('action');
    expect(inserts(acts)).toContain('click: ');
    expect(inserts(acts)).toContain('use: ');

    // Login has two buttons and two fields: click sees the buttons, fill the fields
    expect(inserts(await at(page, `${head}  - click: `)))
      .toEqual(['{ role: button, name: Log in }', '{ role: button, name: Log out }']);
    expect(inserts(await at(page, `${head}  - fill: `)))
      .toEqual(['{ label: Email, value: "" }', '{ label: Password, value: "" }']);
    // Nothing on this page can be checked or chosen from, so nothing is offered
    expect(await at(page, `${head}  - check: `)).toBeNull();
    expect(await at(page, `${head}  - select: `)).toBeNull();
  });

  test('a filled field lands valid, with the caret inside the quotes', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await ready(page, 'login');
    const r = await at(page, `${head}  - fill: `);
    const it = r.items[0];
    expect(it.insert).toBe('{ label: Email, value: "" }');
    expect(it.insert[it.caret - 1]).toBe('"');
    expect(it.insert[it.caret]).toBe('"');
    const { error } = await page.evaluate(y => window.playlive.validate(y), `${head}  - fill: ${it.insert}\n`);
    expect(error).toBeUndefined();
  });

  test('one slot at a time, narrowed by what the braces already say', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await ready(page, 'login');
    expect(inserts(await at(page, `${head}  - click: { role: `))).toEqual(['button']);
    expect(inserts(await at(page, `${head}  - click: { role: button, name: `))).toEqual(['Log in', 'Log out']);
    // A field is described by its label here, so "role:" is not worth offering
    expect(inserts(await at(page, `${head}  - fill: { `))).toEqual(['label: ', 'value: ', 'timeout: ']);
  });

  test('a select offers its own options, and only its own', async ({ page }) => {
    await openApp(page, { site: 'address-form' });
    await ready(page, 'address-form');
    const whole = inserts(await at(page, `${head}  - select: `));
    expect(whole.length).toBeGreaterThan(1);
    expect(whole.every(s => s.includes('value:'))).toBe(true);
    const cat = await page.evaluate(() => window.playlive.catalog.snapshot());
    const first = cat.select[0];
    const values = inserts(await at(page, `${head}  - select: { ${first.target.slice(2, -2)}, value: `));
    expect(values.map(v => v.replace(/^"|"$/g, ''))).toEqual(first.options);
  });

  test('the text on the page, the file’s variables and its flows', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await ready(page, 'login');
    const texts = inserts(await at(page, `${head}  - expectText: `));
    expect(texts).toContain('Customer portal');

    expect(inserts(await at(page, 'vars:\n  email: a@b.c\n' + head + '  - fill: { label: Email, value: "${')))
      .toEqual(['email}', 'unique}']);
    expect(inserts(await at(page, 'flows:\n  signIn:\n    - click: Log in\n' + head + '  - use: ')))
      .toEqual(['signIn']);
    expect(inserts(await at(page, 'fa'))[0]).toBe('failOnPageErrors: ');   // a loose match may follow it
  });

  test('says nothing where nothing can be suggested', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await ready(page, 'login');
    expect(await at(page, 'test: ')).toBeNull();                      // a title is the writer's own words
    expect(await at(page, `${head}  - click: { role: button, name: Nothing like this`)).toBeNull();
    expect(await at(page, '# a comment')).toBeNull();
  });
});

test.describe('Every site', () => {
  test('only ever suggests steps that parse and resolve', async ({ page }) => {
    test.setTimeout(240_000);
    const { errors } = await openApp(page);
    for (const id of ids){
      await selectSite(page, id);
      await ready(page, id);
      const problems = await page.evaluate(() => {
        const bad = [];
        const site = window.playlive.SITE_IDS.find(i => document.getElementById('app').src.includes(`examples/${i}/`));
        for (const action of ['click', 'fill', 'select', 'check', 'uncheck', 'expectVisible', 'expectText']){
          const yaml = `site: ${site}\ntest: t\nsteps:\n  - ${action}: `;
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
