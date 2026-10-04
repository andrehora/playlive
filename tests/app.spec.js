// End-to-end tests of the app itself: picker, editor, running, stopping,
// step by step, time travel, the HTML view, recorder, export, reset, persistence, layout.
import { test, expect } from '@playwright/test';
import { describeFailures, openApp, readResults, runAll, selectSite, setSpeed, siteIds } from './app.mjs';

const ids = await siteIds();

test.describe('Boot', () => {
  test('loads with the first example, its tests and its site', async ({ page }) => {
    const { errors } = await openApp(page);
    await expect(page.locator('#siteName')).toHaveText('Contact form');
    await expect(page.locator('#siteCount')).toHaveText(`1 of ${ids.length}`);
    expect(await page.inputValue('#spec')).toContain('site: contact-form');
    await expect(page.locator('#error')).toHaveText('');
    await expect(page.locator('#summary')).toHaveText('');

    // Results preview the tests before anything has run, with no state yet.
    const states = await page.$$eval('#results .test', els => els.map(e => e.dataset.state));
    expect(states.length).toBeGreaterThan(0);
    expect(states.every(s => !s)).toBe(true);

    // The site is live inside the iframe.
    await expect(page.frameLocator('#app').locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('Site picker', () => {
  test('searches, picks a site and keeps each site its own tests', async ({ page }) => {
    await openApp(page);
    await page.click('#siteBtn');
    await expect(page.locator('#siteBtn')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#siteSearch')).toHaveAttribute('placeholder', `Search ${ids.length} examples`);

    await page.fill('#siteSearch', 'coupon');
    await expect(page.locator('#tabs .tab:visible')).toHaveCount(1);
    await expect(page.locator('#popEmpty')).toBeHidden();

    await page.fill('#siteSearch', 'nothing matches this');
    await expect(page.locator('#tabs .tab:visible')).toHaveCount(0);
    await expect(page.locator('#popEmpty')).toBeVisible();

    await page.fill('#siteSearch', 'coupon');
    await page.click('#tabs .tab[data-site="coupon-code"]');
    await expect(page.locator('#sitePop')).toBeHidden();
    await expect(page.locator('#siteName')).toHaveText('Coupon code');
    // A site's tests are fetched, so the editor fills a moment after its name.
    await expect(page.locator('#spec')).toHaveValue(/site: coupon-code/);
    await expect(page.locator('#tabs .tab[data-site="coupon-code"]')).toHaveAttribute('aria-pressed', 'true');

    // An edit on one site stays with that site when you come back to it.
    await page.fill('#spec', 'site: coupon-code\n\ntest: Edited\nsteps:\n  - expectText: Coupon\n');
    await selectSite(page, 'contact-form');
    await expect(page.locator('#spec')).not.toHaveValue(/test: Edited/);
    await selectSite(page, 'coupon-code');
    await expect(page.locator('#spec')).toHaveValue(/test: Edited/);
  });

  test('Escape closes the picker and the stepper walks the list', async ({ page }) => {
    await openApp(page);
    await page.click('#siteBtn');
    await page.locator('#siteSearch').press('Escape');
    await expect(page.locator('#sitePop')).toBeHidden();
    await expect(page.locator('#siteBtn')).toHaveAttribute('aria-expanded', 'false');

    await page.click('#nextSite');
    await expect(page.locator('#siteCount')).toHaveText(`2 of ${ids.length}`);
    await page.click('#prevSite');
    await expect(page.locator('#siteCount')).toHaveText(`1 of ${ids.length}`);
    // The list wraps, so going back from the first lands on the last.
    await page.click('#prevSite');
    await expect(page.locator('#siteCount')).toHaveText(`${ids.length} of ${ids.length}`);
  });
});

test.describe('Running', () => {
  test('a passing run marks every step and reports a green summary', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    const res = await runAll(page);

    expect(res.state, describeFailures(res)).toBe('ok');
    expect(res.summary).toMatch(/passed in [\d.]+s$/);
    await expect(page.locator('#results .test[data-state="passed"]')).toHaveCount(res.tests.length);
    await expect(page.locator('#results .steps li.failed')).toHaveCount(0);
    // Each step shows how long it took.
    await expect(page.locator('#results .steps li.passed .ms').first()).toHaveText(/\d+ ms/);
    // The picker remembers the result for this site.
    expect(await page.evaluate(() => localStorage.getItem('live-test-runner:status:v1'))).toContain('contact-form');
  });

  test('a step carries its value inside the target', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    await page.fill('#spec', [
      'site: contact-form',
      'beforeEach:',
      '  - click: { role: button, name: Open form }',
      '',
      'test: Value inside the target',
      'steps:',
      '  - fill: { label: Your name, value: Ana }',
      '  - fill: { label: Message, value: hello }',
      '  - select: { label: Topic, value: Billing }',
      '  - click: { role: button, name: Send }',
      '  - expectText: "Thanks for your message, Ana!"',
      '    timeout: 8000',
      ''
    ].join('\n'));
    await expect(page.locator('#error')).toHaveText('');

    const res = await runAll(page);
    expect(res.state, describeFailures(res)).toBe('ok');

    // The value reaches the exports as the thing typed, not as part of the target.
    const code = await page.evaluate(() => {
      const { validate, toPlaywright } = window.playlive;
      return toPlaywright(validate(document.getElementById('spec').value).spec);
    });
    expect(code).toContain(`await page.getByLabel("Your name", { exact: true }).fill("Ana");`);
  });

  test('a value on its own line says where it belongs', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await page.fill('#spec', [
      'site: contact-form',
      '',
      'test: Value on its own line',
      'steps:',
      '  - fill: { label: Message }',
      '    value: hello',
      ''
    ].join('\n'));
    await expect(page.locator('#error')).toContainText('put the value inside the target');
    await page.click('#run');
    await expect(page.locator('#summary')).toHaveText('');
  });

  test('fill without a value is reported', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await page.fill('#spec', [
      'site: contact-form',
      '',
      'test: No value',
      'steps:',
      '  - fill: { label: Message }',
      ''
    ].join('\n'));
    await expect(page.locator('#error')).toContainText('needs a value');
  });

  test('a failing step is explained, later steps are skipped, and the summary is red', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    await page.fill('#spec', [
      'site: contact-form',
      '',
      'test: Looks for text that is not there',
      'steps:',
      '  - expectText: Definitely not on this page',
      '    timeout: 500',
      '  - expectText: Contact',
      ''
    ].join('\n'));

    const res = await runAll(page);
    expect(res.state).toBe('bad');
    expect(res.summary).toMatch(/^1 of 1 test failed/);
    expect(res.tests[0].error).toBeTruthy();
    await expect(page.locator('#results .steps li.failed')).toHaveCount(1);
    await expect(page.locator('#results .steps li.skipped')).toHaveCount(1);
  });

  test('a mistyped target suggests the closest text on the page', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    const label = await page.frameLocator('#app').locator('label').first().innerText();
    await page.fill('#spec', [
      'site: contact-form',
      '',
      'test: Mistyped label',
      'steps:',
      `  - fill: { label: ${label}XYZ, value: hello }`,
      '    timeout: 500',
      ''
    ].join('\n'));

    const res = await runAll(page);
    expect(res.state).toBe('bad');
    expect(res.tests[0].error).toContain(label);   // the "Did you mean…?" hint
  });

  test('invalid YAML is rejected with a message instead of running', async ({ page }) => {
    await openApp(page);
    await page.fill('#spec', 'test: No steps key\nsteps: not-a-list\n');
    await expect(page.locator('#error')).not.toHaveText('');
    await page.click('#run');
    await expect(page.locator('#summary')).toHaveText('');
    await expect(page.locator('#run')).toBeEnabled();
  });

  test('Run on a single test runs only that test', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    const count = await page.locator('#results .test').count();
    test.skip(count < 2, 'needs a site with more than one example test');

    await page.locator('#results .test .run-one').nth(1).click();
    await expect(page.locator('#run')).toBeEnabled({ timeout: 60_000 });
    const res = await readResults(page);
    const ran = res.tests.filter(t => t.state === 'passed' || t.state === 'failed');
    expect(ran.map(t => t.title)).toEqual([res.tests[1].title]);
    expect(res.tests[1].state).toBe('passed');
    expect(res.tests.filter(t => t.state === 'idle').length).toBe(count - 1);
    expect(res.summary).toMatch(/^The test passed/);
  });

  test('Stop ends the run and says so', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'slow');
    await page.click('#run');
    await expect(page.locator('#stop')).toBeEnabled();
    await page.click('#stop');
    await expect(page.locator('#run')).toBeEnabled({ timeout: 60_000 });
    await expect(page.locator('#summary')).toHaveText(/^Stopped\./);
    await expect(page.locator('#summary')).toHaveClass('bad');
  });

  test('Step by step turns Run all into Next step and advances one step at a time', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'step');
    await page.click('#run');
    await expect(page.locator('#run .lbl')).toHaveText('Next step');

    const steps = page.locator('#results .test').first().locator('.steps li');
    await expect(steps.first()).toHaveClass(/running/);
    await page.click('#run');
    await expect(steps.first()).toHaveClass(/passed/);

    await page.click('#stop');
    await expect(page.locator('#run')).toBeEnabled({ timeout: 60_000 });
    await expect(page.locator('#run .lbl')).toHaveText('Run all');
  });

  test('Repeat runs the tests several times and reports every run', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    await page.selectOption('#repeat', '3');
    const res = await runAll(page);
    expect(res.summary).toMatch(/runs passed over 3 repetitions/);
    expect(res.state, describeFailures(res)).toBe('ok');
  });
});

test.describe('Time travel', () => {
  test('clicking a finished step shows the page as it was', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    await runAll(page);

    // Tests are folded by default, so open the first one to reach its steps.
    await page.locator('#results .test .chev').first().click();
    const snap = page.locator('#results .steps li.has-snap').first();
    await expect(snap).toBeVisible();
    await snap.click();
    await expect(page.locator('#snapbar')).toBeVisible();
    await expect(page.locator('#snapText')).not.toHaveText('');

    await page.click('#snapBack');
    await expect(page.locator('#snapbar')).toBeHidden();
    await expect(page.frameLocator('#app').locator('h1')).toBeVisible();
  });
});

test.describe('HTML view', () => {
  test('shows the live markup and follows the running step', async ({ page }) => {
    const { errors } = await openApp(page, { site: 'contact-form' });
    await page.click('.view-seg [data-view="html"]');
    await expect(page.locator('#htmlPane')).toBeVisible();
    await expect(page.locator('#htmlCode')).toContainText('<button id="openBtn"');
    // The site keeps its size underneath, or steps could not see its elements.
    expect(await page.locator('#app').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(0);

    await setSpeed(page, 'fast');
    const res = await runAll(page);
    expect(res.state, describeFailures(res)).toBe('ok');
    // The line of the element the last step found is marked, and so is its number.
    await expect(page.locator('#htmlCode .l.ok')).toHaveCount(1);
    await expect(page.locator('#htmlGutter div.ok')).toHaveCount(1);
    // What the user typed is in the markup, not only in the page.
    await expect(page.locator('#htmlCode')).toContainText('Where is my order?');
    expect(errors).toEqual([]);
  });

  test('remembers the view, and going back shows the site again', async ({ page }) => {
    await openApp(page);
    await page.click('.view-seg [data-view="html"]');
    await page.reload();
    await expect(page.locator('#htmlPane')).toBeVisible();
    await expect(page.locator('.view-seg [data-view="html"]')).toHaveAttribute('aria-pressed', 'true');

    await page.click('.view-seg [data-view="site"]');
    await expect(page.locator('#htmlPane')).toBeHidden();
    await expect(page.frameLocator('#app').locator('h1')).toBeVisible();
  });
});

test.describe('Recorder', () => {
  test('turns clicks and typing in the site into steps', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    const before = await page.inputValue('#spec');

    await page.click('#record');
    await expect(page.locator('#record .lbl')).toHaveText('Stop recording');
    await expect(page.locator('#recbar')).toBeVisible();
    expect(await page.getAttribute('#spec', 'readonly')).not.toBeNull();

    const site = page.frameLocator('#app');
    await site.locator('input, textarea').first().fill('Ana');
    await site.locator('button:visible').first().click();

    await page.click('#record');
    await expect(page.locator('#record .lbl')).toHaveText('Record');
    const after = await page.inputValue('#spec');
    expect(after.length).toBeGreaterThan(before.length);
    expect(after).toMatch(/- (click|fill):/);
    await expect(page.locator('#error')).toHaveText('');   // what it writes still parses
  });
});

test.describe('Export', () => {
  test('offers Playwright and Cypress, and remembers the tab', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await page.click('#export');
    await expect(page.locator('#dlg')).toBeVisible();
    await expect(page.locator('#dlgTabs button')).toHaveText(['Playwright', 'Cypress']);
    await expect(page.locator('#dlgText')).toContainText(`import { test, expect } from '@playwright/test'`);

    await page.locator('#dlgTabs button', { hasText: 'Cypress' }).click();
    await expect(page.locator('#dlgText')).toContainText('@testing-library/cypress/add-commands');
    // Exported code carries no comments.
    expect(await page.locator('#dlgText').innerText()).not.toMatch(/^\s*\/\//m);

    await page.click('#dlgClose');
    await expect(page.locator('#dlg')).toBeHidden();
    await page.click('#export');
    await expect(page.locator('#dlgTabs button[aria-selected="true"]')).toHaveText('Cypress');
    await page.click('#dlgClose');
  });

  // Selenium used to be the third tab, so a saved tab index can point past the end.
  test('a saved tab index from the removed third tab still opens', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('live-test-runner:layout:v1', JSON.stringify({ exportTab: 2 })); } catch {}
    });
    const { errors } = await openApp(page);
    await page.click('#export');
    await expect(page.locator('#dlg')).toBeVisible();
    await expect(page.locator('#dlgTabs button[aria-selected="true"]')).toHaveText('Cypress');
    await expect(page.locator('#dlgText')).not.toHaveText('');
    await page.click('#dlgClose');
    expect(errors).toEqual([]);
  });

  test('refuses to export tests that do not parse', async ({ page }) => {
    await openApp(page);
    await page.fill('#spec', 'test: Broken\nsteps:\n  - nonsense: true\n');
    await page.click('#export');
    await expect(page.locator('#dlg')).toBeHidden();
    await expect(page.locator('#error')).toContainText('before exporting');
  });
});

test.describe('Reset', () => {
  test('brings the example tests back in one click', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    const example = await page.inputValue('#spec');
    await page.fill('#spec', 'site: contact-form\n\ntest: Mine\nsteps:\n  - expectText: Contact\n');

    await page.click('#reset');
    expect(await page.inputValue('#spec')).toBe(example);
    await expect(page.locator('#toast')).toContainText('reset');
  });
});

test.describe('Persistence', () => {
  test('edits, the chosen site and layout settings survive a reload', async ({ page }) => {
    await openApp(page, { site: 'coupon-code' });
    await page.fill('#spec', 'site: coupon-code\n\ntest: Kept\nsteps:\n  - expectText: Coupon\n');
    await setSpeed(page, 'fast');
    await page.uncheck('#trackLine');
    // The editor saves shortly after the last keystroke.
    await page.waitForFunction(() =>
      (localStorage.getItem('live-test-runner:v4') || '').includes('test: Kept'));

    await page.reload();
    await page.waitForFunction(() => typeof window.playlive?.selectSite === 'function');
    await expect(page.locator('#siteName')).toHaveText('Coupon code');
    expect(await page.inputValue('#spec')).toContain('test: Kept');
    await expect(page.locator('#trackLine')).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('live-test-runner:v4'))).toContain('test: Kept');
  });

  test('a broken layout value does not stop the app from loading', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('live-test-runner:layout:v1', '{not json'); } catch {}
    });
    const { errors } = await openApp(page);
    await expect(page.locator('#results .test').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('Layout and theming', () => {
  test('the desktop page fits the window and panels scroll inside', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      body: document.body.scrollHeight - document.body.clientHeight
    }));
    expect(overflow.page).toBeLessThanOrEqual(1);
    expect(overflow.body).toBeLessThanOrEqual(1);
    // The results list is the thing that scrolls.
    const scrolls = await page.evaluate(() => {
      const el = document.getElementById('results');
      return getComputedStyle(el).overflowY;
    });
    expect(['auto', 'scroll']).toContain(scrolls);
  });

  test('the app bar links to the repository', async ({ page }) => {
    await openApp(page);
    const link = page.locator('.repo-link');
    await expect(link).toHaveAttribute('href', 'https://github.com/andrehora/playlive');
    await expect(link).toHaveAttribute('rel', /noopener/);
    // The published page allows no remote images, so the mark has to be inline.
    await expect(link.locator('svg')).toHaveCount(1);
    await expect(link).toBeVisible();
    // It stays visible, and tappable, on a phone.
    await page.setViewportSize({ width: 360, height: 740 });
    await expect(link).toBeVisible();
    expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(34);
  });

  test('the screen size buttons resize the site panel', async ({ page }) => {
    await openApp(page);
    for (const vp of ['mobile', 'tablet', 'desktop']){
      await page.click(`[data-vp="${vp}"]`);
      await expect(page.locator('#device')).toHaveAttribute('data-vp', vp);
    }
  });

  test('runs a site in dark mode without page errors', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    const { errors } = await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    const res = await runAll(page);
    expect(res.state, describeFailures(res)).toBe('ok');
    expect(errors).toEqual([]);
  });

  test('runs a site on a 390px phone viewport without page errors', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { errors } = await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    const res = await runAll(page);
    expect(res.state, describeFailures(res)).toBe('ok');
    expect(errors).toEqual([]);
    await expect(page.locator('#run')).toBeVisible();
  });

  // The controls are sized mobile first: comfortable to tap, and compacted only
  // once there is a wide screen to compact them for.
  for (const width of [360, 390, 768]){
    test(`every control is big enough to tap at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await openApp(page);
      await page.click('#siteBtn');          // so the example list is measured too
      await expect(page.locator('#sitePop')).toBeVisible();

      const small = await page.$$eval(
        'button:not([hidden]), select, #siteSearch, .pop-list .tab',
        els => els
          .filter(e => e.offsetParent !== null && !e.closest('[hidden]'))
          .map(e => ({ what: e.id || e.className || e.tagName, h: e.getBoundingClientRect().height }))
          .filter(e => e.h < 34)
      );
      expect(small, `too small to tap: ${JSON.stringify(small)}`).toEqual([]);
    });
  }

  test('a phone gets one column, no sideways scrolling, and the example list on screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openApp(page);
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sideways).toBeLessThanOrEqual(1);

    // The example list opens as a sheet, so it is on screen wherever the page sits.
    await page.click('#siteBtn');
    const pop = await page.locator('#sitePop').boundingBox();
    expect(pop.y).toBeGreaterThanOrEqual(0);
    expect(pop.y + pop.height).toBeLessThanOrEqual(740 + 1);
    await page.click('#tabs .tab[data-site="login"]');
    await expect(page.locator('#siteName')).toHaveText('Login');
  });

  test('the editor gutter lines up with the code at any size', async ({ page }) => {
    for (const width of [390, 1440]){
      await page.setViewportSize({ width, height: 900 });
      await openApp(page);
      const { line, gutter } = await page.evaluate(() => ({
        line: parseFloat(getComputedStyle(document.getElementById('spec')).lineHeight),
        gutter: document.querySelector('#gutter div').getBoundingClientRect().height
      }));
      expect(Math.abs(line - gutter), `gutter and code disagree at ${width}px`).toBeLessThan(0.5);
    }
  });
});

test.describe('Folding the editor', () => {
  test('Collapse all hides the code and leaves the panel working', async ({ page }) => {
    await openApp(page, { site: 'login' });
    const status = await page.locator('#fileStatus').textContent();

    await page.click('#foldSpec');
    await expect(page.locator('#editor')).toBeHidden();
    await expect(page.locator('#foldSpec')).toHaveAttribute('aria-label', 'Expand all');
    await expect(page.locator('#foldSpec')).toHaveAttribute('aria-expanded', 'false');
    // Folding only hides the code: the file itself, and so the run, is untouched
    await expect(page.locator('#fileStatus')).toHaveText(status);
    await expect(page.locator('#run')).toBeEnabled();

    await setSpeed(page, 'fast');
    const res = await runAll(page);
    expect(res.state, describeFailures(res)).toBe('ok');

    await page.click('#foldSpec');
    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('#foldSpec')).toHaveAttribute('aria-label', 'Collapse all');
    await expect(page.locator('#hl .l')).not.toHaveCount(0);
  });

  test('an edit made while folded is still there when the code comes back', async ({ page }) => {
    await openApp(page);
    await page.click('#foldSpec');
    await page.evaluate(() => {
      const el = document.getElementById('spec');
      el.value += '\ntest: Added while folded\nsteps:\n  - expectText: Contact\n';
      el.dispatchEvent(new Event('input'));
    });
    await page.click('#foldSpec');
    await expect(page.locator('#hl')).toContainText('Added while folded');
  });
});

test.describe('Accessibility basics', () => {
  test('controls carry the state they claim', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#siteBtn')).toHaveAttribute('aria-haspopup', 'true');
    await expect(page.locator('#summary')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#error')).toHaveAttribute('role', 'alert');
    await expect(page.locator('#app')).toHaveAttribute('title', 'Site under test');

    // Tests start folded, and the chevron says which way it goes.
    const chev = page.locator('#results .test .chev').first();
    await expect(chev).toHaveAttribute('aria-expanded', 'false');
    await expect(chev).toHaveAttribute('aria-label', 'Expand steps');
    await chev.click();
    await expect(chev).toHaveAttribute('aria-expanded', 'true');
    await expect(chev).toHaveAttribute('aria-label', 'Collapse steps');

    // Collapse all / Expand all follows the folds.
    await page.click('#foldAll');
    await expect(page.locator('#foldAll')).toHaveAttribute('aria-label', 'Expand all');
    await page.click('#foldAll');
    await expect(page.locator('#foldAll')).toHaveAttribute('aria-label', 'Collapse all');
  });

  test('every toolbar button has an accessible name', async ({ page }) => {
    await openApp(page);
    const unnamed = await page.$$eval('header button, .toolbar button, .head-actions button, .site-head button',
      els => els.filter(e => !(e.innerText.trim() || e.getAttribute('aria-label') || e.title)).length);
    expect(unnamed).toBe(0);
  });
});
