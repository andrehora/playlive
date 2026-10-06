// Test smells: what is wrong with the tests themselves, read from the file
// rather than from a run. Most example tests are clean, which is the point of
// the empty state; seven of them carry a deliberate smell, named in a comment
// above it, so that every rule in the panel has something to point at.
import { test, expect } from '@playwright/test';
import { openApp, setMode } from './app.mjs';

const SITE = 'contact-form';
const report = page => page.evaluate(() => window.playlive.smells.report());
// The file settles 400ms after the last keystroke, so read the panel, not the clock.
const score = page => page.locator('#smellScore');

test.describe('Test smells', () => {
  test('the example tests are clean, and the panel says so', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE, mode: 'smells' });
    await expect(score(page)).toHaveText('No smells in 3 tests');
    await expect(page.locator('.smells-panel')).toHaveAttribute('data-band', 'ok');
    await expect(page.locator('#smells .cov-note')).toHaveText('Nothing to report.');
    await expect(page.locator('.smell-group')).toHaveCount(0);

    // Its three tests open three different ways, so there is no opening to share.
    const r = await report(page);
    expect(r.parsed).toBe(true);
    expect(r.items).toEqual([]);
    expect(errors).toEqual([]);
  });

  // Pinned over the whole corpus, so a change to a rule has to say which
  // examples it changed its mind about. Thirteen of these are findings about
  // tests written to be good ones: three examples open every test the same way
  // and ten type the same value out twice. The other seven are deliberate, one
  // comment above each saying so — two Unknown Tests, three Eager Tests and two
  // Assertion Roulettes — because a panel that names five smells and can show
  // you two of them teaches half of what it knows. Nothing else trips a rule:
  // the busiest test written to be good stops to check three times and makes
  // four checks, which is where four phases and six checks were put.
  test('what the smells make of all 100 examples', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'smells' });
    const found = await page.evaluate(async () => {
      const out = [];
      for (const id of window.playlive.SITE_IDS){
        const text = await (await fetch(`examples/${id}/tests.yaml`)).text();
        const r = window.playlive.smells.report(text);
        if (!r.parsed){ out.push(`${id}: does not parse`); continue; }
        for (const i of r.items) out.push(`${id}: ${i.smell}: ${i.what}`);
      }
      return out;
    });
    expect(found).toEqual([
      'address-form: magic-value: “1 Main Street”',
      'quantity-stepper: duplication-of-setup: Click button “Increase quantity”',
      'retry-on-error: duplication-of-setup: Click button “Load orders”',
      'shopping-cart: eager-test: Fills the cart one product at a time',
      'status-page: assertion-roulette: Reads the whole page in one go',
      'two-factor: magic-value: “111111”',
      'flight-search: magic-value: “2026-04-18”',
      'store-locator: magic-value: “10 km”',
      'table-booking: magic-value: “19:30”',
      'expense-splitter: magic-value: “30”',
      'paged-list: duplication-of-setup: Click button “Next”',
      'like-button: unknown-test: Likes and unlikes the post',
      'click-counter: unknown-test: Clicks the button a few times',
      'todo-list: eager-test: Works through a list of two tasks',
      'video-quality: magic-value: “1080p”',
      'symptom-form: magic-value: “2 days”',
      'kpi-goals: magic-value: “Q2”',
      'metric-tiles: assertion-roulette: Checks every tile before and after comparing',
      'number-guess: magic-value: “10”',
      'score-board: eager-test: Plays a match from the first score to the reset'
    ]);
  });

  test('a test that checks nothing is an Unknown Test, and the row goes to it', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'smells' });
    await page.fill('#spec', [
      'test: Sends a message',
      'steps:',
      '  - fill: { label: Message, value: hello }',
      '  - click: { role: button, name: Send }',
      '  - expectText: "Thanks for your message, friend!"',
      '',
      'test: Fills the form',
      'steps:',
      '  - fill: { label: Message, value: hi }',
      '  - click: { role: button, name: Send }'
    ].join('\n'));
    await expect(score(page)).toHaveText('1 smell in 2 tests');
    await expect(page.locator('.smells-panel')).toHaveAttribute('data-band', 'warn');

    const group = page.locator('.smell-group[data-smell="unknown-test"]');
    await expect(group.locator('.cov-title')).toHaveText('Unknown Test');
    await expect(group.locator('.cov-n')).toHaveText('1');
    await expect(group.locator('.smell-row')).toHaveCount(1);
    await expect(group.locator('.smell-what')).toHaveText('Fills the form');
    await expect(group.locator('.smell-m')).toHaveText('runs its steps and checks nothing');
    // The name is what a student looks up, so the sentence is on screen, not
    // only in a tooltip.
    await expect(group.locator('.smell-why')).toHaveText('Checks nothing. Add an expectText, expectNoText or expectVisible.');

    // A smell you cannot find is a complaint, not a lesson: the row selects it.
    await group.locator('.smell-line').click();
    expect(await page.evaluate(() => {
      const t = document.getElementById('spec');
      return t.value.slice(t.selectionStart, t.selectionEnd);
    })).toBe('test: Fills the form');
  });

  test('a test that acts and checks four times over is an Eager Test', async ({ page }) => {
    await openApp(page, { site: 'click-counter', mode: 'smells' });
    const steps = n => Array.from({ length: n }, (_, i) =>
      `  - click: { role: button, name: Increment }\n  - expectText: "Count: ${i + 1}"`).join('\n');

    // Three rounds is a long test. Four is four tests wearing one title, and
    // the Results row can only name the first of them that broke.
    await page.fill('#spec', `test: Counts up\nsteps:\n${steps(3)}\n`);
    await expect(score(page)).toHaveText('No smells in 1 test');

    await page.fill('#spec', `test: Counts up\nsteps:\n${steps(4)}\n`);
    await expect(score(page)).toHaveText('1 smell in 1 test');
    const group = page.locator('.smell-group[data-smell="eager-test"]');
    await expect(group.locator('.cov-title')).toHaveText('Eager Test');
    await expect(group.locator('.smell-what')).toHaveText('Counts up');
    await expect(group.locator('.smell-m')).toHaveText('acts and checks 4 times over');
    await expect(group.locator('.smell-why')).toHaveText('Acts and checks over and over. Split it into one test per thing it proves.');

    // The row goes to the test it names.
    await group.locator('.smell-line').click();
    expect(await page.evaluate(() => {
      const t = document.getElementById('spec');
      return t.value.slice(t.selectionStart, t.selectionEnd);
    })).toBe('test: Counts up');
  });

  test('a phase is a run of checks, however many checks are in it', async ({ page }) => {
    await openApp(page, { site: 'click-counter', mode: 'smells' });
    // Four checks, but the test stops to check twice: two phases, not four.
    await page.fill('#spec', [
      'test: Counts up',
      'steps:',
      '  - click: { role: button, name: Increment }',
      ...Array.from({ length: 2 }, () => '  - expectText: "Count: 1"'),
      '  - click: { role: button, name: Increment }',
      ...Array.from({ length: 2 }, () => '  - expectText: "Count: 2"')
    ].join('\n'));
    await expect(score(page)).toHaveText('No smells in 1 test');
    expect(await page.evaluate(() => window.playlive.smells.report().items)).toEqual([]);
  });

  // Assertion Roulette counts the checks where Eager Test counts the phases, so
  // a long row of checks that never acts in between is one and not the other.
  test('more than five checks in one test is Assertion Roulette', async ({ page }) => {
    await openApp(page, { site: 'click-counter', mode: 'smells' });
    const checks = n => ['test: Counts up', 'steps:', '  - click: { role: button, name: Increment }',
      ...Array.from({ length: n }, () => '  - expectText: "Count: 1"')].join('\n');

    // Five is a thorough test. Six is a row of claims with nothing to say which
    // one was the point, and a step here carries no message of its own.
    await page.fill('#spec', checks(5));
    await expect(score(page)).toHaveText('No smells in 1 test');

    await page.fill('#spec', checks(6));
    await expect(score(page)).toHaveText('1 smell in 1 test');
    const group = page.locator('.smell-group[data-smell="assertion-roulette"]');
    await expect(group.locator('.cov-title')).toHaveText('Assertion Roulette');
    await expect(group.locator('.smell-what')).toHaveText('Counts up');
    await expect(group.locator('.smell-m')).toHaveText('6 checks under one title');
    await expect(group.locator('.smell-why'))
      .toHaveText('So many checks that a red one says little. Keep the checks that say what the test is for.');
    // One phase, so it is not also an Eager Test.
    await expect(page.locator('.smell-group[data-smell="eager-test"]')).toHaveCount(0);

    // The row goes to the test it names.
    await group.locator('.smell-line').click();
    expect(await page.evaluate(() => {
      const t = document.getElementById('spec');
      return t.value.slice(t.selectionStart, t.selectionEnd);
    })).toBe('test: Counts up');
  });

  // beforeEach runs inside every test, but it is not what this test claims, so
  // its checks are not counted here either.
  test('a beforeEach full of checks is not the test\u2019s roulette', async ({ page }) => {
    await openApp(page, { site: 'click-counter', mode: 'smells' });
    await page.fill('#spec', [
      'beforeEach:',
      ...Array.from({ length: 6 }, () => '  - expectText: "Count: 0"'),
      '',
      'test: Counts up',
      'steps:',
      '  - click: { role: button, name: Increment }',
      '  - expectText: "Count: 1"'
    ].join('\n'));
    await expect(score(page)).toHaveText('No smells in 1 test');
  });

  test('a value typed out twice is a Magic Value, and a named one is not', async ({ page }) => {
    await openApp(page, { site: 'address-form', mode: 'smells' });
    // The two tests open differently on purpose, so the only thing to find is
    // the street typed out twice.
    const street = named => (named ? '"${street}"' : '1 Main Street');
    const file = named => [
      ...(named ? ['vars:', '  street: 1 Main Street', ''] : []),
      'test: Saves a US address',
      'steps:',
      `  - fill: { label: Street, value: ${street(named)} }`,
      '  - fill: { label: ZIP code, value: 94105 }',
      '  - click: { role: button, name: Save address }',
      '  - expectText: Address saved for United States.', '',
      'test: Rejects a short ZIP code',
      'steps:',
      '  - fill: { label: ZIP code, value: 941 }',
      `  - fill: { label: Street, value: ${street(named)} }`,
      '  - click: { role: button, name: Save address }',
      '  - expectText: Enter a valid ZIP code.'
    ].join('\n');

    await page.fill('#spec', file(false));
    await expect(score(page)).toHaveText('1 smell in 2 tests');
    const group = page.locator('.smell-group[data-smell="magic-value"]');
    await expect(group.locator('.cov-title')).toHaveText('Magic Value');
    await expect(group.locator('.smell-what')).toHaveText('“1 Main Street”');
    await expect(group.locator('.smell-m')).toHaveText('written out in 2 places');
    // The two ZIP codes differ, so neither of them is one.
    await expect(group.locator('.smell-row')).toHaveCount(1);
    await group.locator('.smell-line').click();
    expect(await page.evaluate(() => {
      const t = document.getElementById('spec');
      return t.value.slice(t.selectionStart, t.selectionEnd);
    })).toBe('- fill: { label: Street, value: 1 Main Street }');

    // Named under vars: and used as ${street}, it is written out once.
    await page.fill('#spec', file(true));
    await expect(score(page)).toHaveText('No smells in 2 tests');
  });

  test('a number in what a check looks for is not a value', async ({ page }) => {
    await openApp(page, { site: 'click-counter', mode: 'smells' });
    // "Count: 3" twice is a message, not a constant somebody supplied, and
    // reading those as values would name a smell in nearly every example.
    await page.fill('#spec', [
      'test: Counts up',
      'steps:',
      '  - click: { role: button, name: Increment }',
      '  - expectText: "Count: 3"', '',
      'test: Counts up again',
      'steps:',
      '  - click: { role: button, name: Increment }',
      '  - expectText: "Count: 3"'
    ].join('\n'));
    expect((await report(page)).items.filter(i => i.smell === 'magic-value')).toEqual([]);
  });

  test('every test opening the same way is Duplication of Setup', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'smells' });
    await page.fill('#spec', [
      'test: Sends a message',
      'steps:',
      '  - click: { role: button, name: Open form }',
      '  - fill: { label: Message, value: hello }',
      '  - click: { role: button, name: Send }',
      '  - expectText: "Thanks for your message, friend!"', '',
      'test: Empty message shows an error',
      'steps:',
      '  - click: { role: button, name: Open form }',
      '  - click: { role: button, name: Send }',
      '  - expectText: Please write a message.'
    ].join('\n'));

    const r = await report(page);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].smell).toBe('duplication-of-setup');
    expect(r.items[0].what).toBe('Click button “Open form”');
    expect(r.items[0].detail).toBe('at the start of all 2 tests');

    const group = page.locator('.smell-group[data-smell="duplication-of-setup"]');
    await expect(group.locator('.cov-title')).toHaveText('Duplication of Setup');
    await expect(group.locator('.smell-row')).toHaveCount(1);
    await group.locator('.smell-line').click();
    expect(await page.evaluate(() => {
      const t = document.getElementById('spec');
      return t.value.slice(t.selectionStart, t.selectionEnd);
    })).toBe('- click: { role: button, name: Open form }');
  });

  test('an opening that is not shared, or is already in beforeEach, is not one', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'smells' });
    // One test opens the form, the other does something else first.
    await page.fill('#spec', [
      'test: Sends a message',
      'steps:',
      '  - click: { role: button, name: Open form }',
      '  - click: { role: button, name: Send }',
      '  - expectText: Please write a message.', '',
      'test: The page says what it is for',
      'steps:',
      '  - expectText: Questions about your order?'
    ].join('\n'));
    await expect(score(page)).toHaveText('No smells in 2 tests');

    // And what beforeEach already provides is not written out per test, so it
    // is not a repetition to find.
    await page.fill('#spec', [
      'beforeEach:',
      '  - click: { role: button, name: Open form }', '',
      'test: Empty message shows an error',
      'steps:',
      '  - click: { role: button, name: Send }',
      '  - expectText: Please write a message.', '',
      'test: Sends a message',
      'steps:',
      '  - fill: { label: Message, value: hello }',
      '  - click: { role: button, name: Send }',
      '  - expectText: "Thanks for your message, friend!"'
    ].join('\n'));
    await expect(score(page)).toHaveText('No smells in 2 tests');

    // One test on its own cannot share an opening with anybody.
    await page.fill('#spec', 'test: Alone\nsteps:\n  - click: { role: button, name: Open form }\n  - expectText: Your name\n');
    await expect(score(page)).toHaveText('No smells in 1 test');
  });

  // The mode leaves the example list alone. It once narrowed it to the
  // examples that have a smell, which hid the clean ones you would compare them
  // with and made the list change length under you; the All smells tab is where
  // "which examples have one" is answered now.
  test('the mode leaves every example in the list', async ({ page }) => {
    await openApp(page, { site: SITE });
    const listed = () => page.$$eval('#tabs .tab:not([hidden])', t => t.map(x => x.dataset.site));
    await page.click('#siteBtn');
    expect(await listed()).toHaveLength(100);
    await expect(page.locator('#siteCount')).toHaveText('8 of 100');
    await page.keyboard.press('Escape');

    await setMode(page, 'smells');
    await expect.poll(async () => (await page.evaluate(() => window.playlive.smells.sites())).length).toBe(20);
    await page.click('#siteBtn');
    const all = await listed();
    expect(all).toHaveLength(100);
    expect(all).toContain('click-counter');          // has one
    expect(all).toContain('coupon-code');            // has none, and is still listed
    await page.keyboard.press('Escape');
    await expect(page.locator('#siteCount')).toHaveText('8 of 100');

    // And the stepper walks all of them, in manifest order.
    await page.click('#nextSite');
    await expect(page.locator('#siteName')).toHaveText('FAQ accordion');
    await expect(page.locator('#siteCount')).toHaveText('9 of 100');
  });

  // The catalogue is read from the files, and the file on screen is the one
  // being typed into, so it follows the editor the way the panel's other tab
  // does — a smell you have just written names your example straight away.
  test('the All smells tab follows a smell typed into the editor', async ({ page }) => {
    await openApp(page, { site: SITE, mode: 'smells' });
    await page.click('.smell-seg [data-smellview="all"]');
    await expect(score(page)).toHaveText('20 of 100 examples have one');
    const unknown = page.locator('.smell-group[data-smell="unknown-test"]');
    await expect(unknown.locator('.cov-n')).toHaveText('2');
    await expect(unknown.locator('.smell-what')).toHaveText(['Like button', 'Counter']);

    // This example checks nothing now, and the catalogue says so.
    await page.fill('#spec', 'test: Does a thing\nsteps:\n  - click: { role: button, name: Send }\n');
    await expect(unknown.locator('.cov-n')).toHaveText('3');
    await expect(unknown.locator('.smell-what')).toHaveText(['Contact form', 'Like button', 'Counter']);
    await expect(score(page)).toHaveText('21 of 100 examples have one');
  });

  test('the panel folds to its one row and Results takes the room back', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openApp(page, { site: SITE, mode: 'smells' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const wasPanel = await h('.smells-panel'), wasResults = await h('.results-panel');

    await page.click('#foldSmells');
    await expect(page.locator('#smells')).toBeHidden();
    await expect(page.locator('#foldSmells')).toHaveAttribute('aria-expanded', 'false');
    await expect(score(page)).toBeVisible();                 // the count stays
    expect(await h('.smells-panel')).toBeLessThanOrEqual(await h('.smells-panel .panel-head') + 2);
    expect(await h('.results-panel')).toBeGreaterThan(wasResults);
    // Its handle has no height left to set, so it stops taking the pointer.
    await expect(page.locator('#smellResizer')).toBeHidden();

    await page.click('#foldSmells');
    await expect(page.locator('#smells')).toBeVisible();
    expect(await h('.smells-panel')).toBe(wasPanel);
  });

  test('a file that does not parse is left to the error box', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE, mode: 'smells' });
    await page.fill('#spec', 'test: Broken\nsteps:\n  - click:\n');
    await expect(page.locator('#error')).not.toHaveText('');
    await expect(score(page)).toHaveText('');
    await expect(page.locator('.smells-panel')).toHaveAttribute('data-band', '');
    await expect(page.locator('#smells .cov-note')).toContainText('Fix the problems in the file first');
    expect((await report(page)).parsed).toBe(false);
    expect(errors).toEqual([]);
  });

  // The panel answers two questions and they are not the same one: what the
  // file on screen smells of, and what the app looks for at all. The second is
  // the catalogue, and it is a way into the examples rather than a glossary.
  test('the All smells tab lists every smell and the examples that have one', async ({ page }) => {
    const { errors } = await openApp(page, { site: SITE, mode: 'smells' });
    await expect(page.locator('#smells .cov-note')).toHaveText('Nothing to report.');

    await page.click('.smell-seg [data-smellview="all"]');
    await expect(page.locator('.smell-seg [data-smellview="all"]')).toHaveAttribute('aria-pressed', 'true');
    // Every smell is named and explained, in the order the panel keeps them.
    const names = await page.$$eval('.smell-group .cov-title', t => t.map(x => x.textContent));
    expect(names).toEqual(['Unknown Test', 'Eager Test', 'Assertion Roulette', 'Magic Value', 'Duplication of Setup']);
    await expect(score(page)).toHaveText('20 of 100 examples have one');

    // Each group counts the examples that have it, and names them.
    const group = page.locator('.smell-group[data-smell="assertion-roulette"]');
    await expect(group.locator('.cov-n')).toHaveText('2');
    await expect(group.locator('.smell-what').first()).toHaveText('Status page');
    await expect(group.locator('.smell-line')).toHaveCount(2);

    // A row opens that example, in the file tab, at the line it is about.
    await group.locator('.smell-line').first().click();
    await expect(page.locator('#siteName')).toHaveText('Status page');
    await expect(page.locator('.smell-seg [data-smellview="file"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => {
      const t = document.getElementById('spec');
      return t.value.slice(t.selectionStart, t.selectionEnd);
    })).toBe('test: Reads the whole page in one go');
    expect(errors).toEqual([]);
  });

  // Switching tabs changes what the list holds, not how much room the column
  // gives it: the catalogue is longer than any one file's findings.
  test('switching tabs leaves the panels the size they were', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, { site: SITE, mode: 'smells' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const was = [await h('.results-panel'), await h('.smells-panel')];

    await page.click('.smell-seg [data-smellview="all"]');
    await expect(page.locator('.smell-group').first()).toBeVisible();
    expect([await h('.results-panel'), await h('.smells-panel')]).toEqual(was);
    expect(await page.evaluate(() =>
      document.documentElement.scrollHeight - document.documentElement.clientHeight)).toBeLessThanOrEqual(1);
  });

  // The catalogue is long enough to want the whole column, and the folds hand
  // it the room other panels give up. A panel folded to its one row has none to
  // give: it must still be that row, head and all, whatever the list wants.
  test('the catalogue never squeezes a folded panel out of its own head', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, { site: SITE, mode: 'smells' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const state = k => page.evaluate(k => document.getElementById('left').dataset[k] || 'open', k);

    // Results all the way down to its one row, and the code folded with it.
    for (let i = 0; i < 4 && await state('results') !== 'collapsed'; i++) await page.click('#foldAll');
    await page.click('#foldSpec');
    expect(await state('spec')).toBe('collapsed');

    for (const view of ['all', 'file', 'all']){
      await page.click(`.smell-seg [data-smellview="${view}"]`);
      await expect(page.locator(`.smell-seg [data-smellview="${view}"]`)).toHaveAttribute('aria-pressed', 'true');
      const head = await h('.results-panel .panel-head');
      expect(await h('.results-panel'), `Results is squeezed below its head in the ${view} tab`)
        .toBeGreaterThanOrEqual(head);
      expect(await page.evaluate(() =>
        document.documentElement.scrollHeight - document.documentElement.clientHeight)).toBeLessThanOrEqual(1);
    }
  });
});
