// End-to-end tests of the app itself: picker, editor, running, stopping,
// step by step, time travel, the HTML view, recorder, export, reset, persistence, layout.
import { test, expect } from '@playwright/test';
import { describeFailures, openApp, runAll, selectSite, setMode, setSpeed, siteIds, siteName } from './app.mjs';

const ids = await siteIds();
// Home is whatever the manifest lists first, so reordering the examples cannot stale these tests.
const HOME = ids[0];
const homeName = await siteName(HOME);

test.describe('Boot', () => {
  test('loads with the first example, its tests and its site', async ({ page }) => {
    const { errors } = await openApp(page);
    await expect(page.locator('#siteName')).toHaveText(homeName);
    await expect(page.locator('#siteCount')).toHaveText(`1 of ${ids.length}`);
    expect(await page.inputValue('#spec')).toContain('test:');
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
    await expect(page.locator('#siteSearch')).toHaveAttribute('placeholder', 'Search examples');

    await page.fill('#siteSearch', 'coupon');
    await expect(page.locator('#tabs .tab:visible')).toHaveCount(1);
    await expect(page.locator('#popEmpty')).toBeHidden();

    await page.fill('#siteSearch', 'nothing matches this');
    await expect(page.locator('#tabs .tab:visible')).toHaveCount(0);
    await expect(page.locator('#popEmpty')).toBeVisible();

    // Each category heads a band in its own accent, so the groups are told apart
    // by more than a gap.
    await page.fill('#siteSearch', '');
    const bands = await page.$$eval('#tabs .pop-cat', hs => hs.map(h => getComputedStyle(h).backgroundColor));
    expect(bands.every(c => c !== 'rgba(0, 0, 0, 0)')).toBe(true);
    expect(new Set(bands).size).toBeGreaterThan(1);

    await page.fill('#siteSearch', 'coupon');
    await page.click('#tabs .tab[data-site="coupon-code"]');
    await expect(page.locator('#sitePop')).toBeHidden();
    await expect(page.locator('#siteName')).toHaveText('Coupon code');
    // A site's tests are fetched, so the editor fills a moment after its name.
    await expect(page.locator('#spec')).toHaveValue(/test:/);
    await expect(page.locator('#tabs .tab[data-site="coupon-code"]')).toHaveAttribute('aria-pressed', 'true');

    // An edit on one site stays with that site when you come back to it.
    await page.fill('#spec', 'test: Edited\nsteps:\n  - expectText: Coupon\n');
    await selectSite(page, 'contact-form');
    await expect(page.locator('#spec')).not.toHaveValue(/test: Edited/);
    await selectSite(page, 'coupon-code');
    await expect(page.locator('#spec')).toHaveValue(/test: Edited/);
  });

  test('Escape closes the picker and the arrows walk the list without opening it', async ({ page }) => {
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
    await expect(page.locator('#sitePop')).toBeHidden();
  });
});

test.describe('Shareable links', () => {
  test('a link with an example in the hash opens that example', async ({ page }) => {
    const { errors } = await openApp(page, { hash: '#html#coupon-code' });
    await expect(page.locator('#siteName')).toHaveText('Coupon code');
    await expect(page.locator('#tabs .tab[data-site="coupon-code"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.inputValue('#spec')).toContain('test:');
    await expect(page.frameLocator('#app').locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('an example that does not exist opens home', async ({ page }) => {
    const { errors } = await openApp(page, { hash: '#no-such-example' });
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('python');
    await expect(page.locator('#siteName')).toHaveText('Calculator');
    expect(new URL(page.url()).hash).toBe('#python');
    expect(errors).toEqual([]);
  });

  test('home is Python on its first example, and the first site is "#html"', async ({ page }) => {
    // "/" is Python on its first example and stays "/".
    const { errors } = await openApp(page, { hash: '' });
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('python');
    await expect(page.locator('.area-seg [data-area="code"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.code-lang [data-lang="python"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#siteName')).toHaveText('Calculator');
    expect(new URL(page.url()).pathname).toBe('/');
    expect(new URL(page.url()).hash).toBe('');

    // "#python" and "#python#calculator" are home spelled out, and stay as typed
    for (const hash of ['#python', '#python#calculator']){
      await openApp(page, { hash });
      expect(await page.evaluate(() => window.playlive.modes.get())).toBe('python');
      await expect(page.locator('#siteName')).toHaveText('Calculator');
      expect(new URL(page.url()).hash).toBe(hash);
    }

    // The first site is "#html", and naming it is the same place, kept as typed
    await openApp(page, { hash: '#html#' + HOME });
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('explore');
    await expect(page.locator('#siteName')).toHaveText(homeName);
    expect(new URL(page.url()).pathname).toBe('/');
    expect(new URL(page.url()).hash).toBe('#html#' + HOME);
    expect(await page.evaluate(() => window.playlive.share.url())).toMatch(/\/#html$/);
    await expect(page.frameLocator('#app').locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('walking back to the first example leaves only the mode in the hash', async ({ page }) => {
    await openApp(page, { site: 'newsletter-signup' });
    expect(new URL(page.url()).hash).toBe('#html#newsletter-signup');
    await selectSite(page, HOME);
    expect(new URL(page.url()).hash).toBe('#html');
  });

  test('opening the page again starts at the first example, not the last one visited', async ({ page }) => {
    await openApp(page, { site: 'coupon-code' });
    await openApp(page);
    await expect(page.locator('#siteName')).toHaveText(homeName);
    expect(new URL(page.url()).hash).toBe('#html');
  });

  test('the name and icon link home', async ({ page }) => {
    await openApp(page, { hash: '#html#coupon-code' });
    await page.click('.brand');
    await expect.poll(() => page.evaluate(() => window.playlive?.modes.get())).toBe('python');
    await expect(page.locator('#siteName')).toHaveText('Calculator');
    expect(new URL(page.url()).pathname).toBe('/');
    expect(new URL(page.url()).hash).toBe('');
  });

  test('the URL drops index.html, so a link reads ".../#html#newsletter-signup"', async ({ page }) => {
    const { errors } = await openApp(page);
    await selectSite(page, 'newsletter-signup');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/');
    expect(url.hash).toBe('#html#newsletter-signup');
    expect(await page.evaluate(() => window.playlive.share.url('newsletter-signup')))
      .toBe(`${url.origin}/#html#newsletter-signup`);
    // The page is still the page: relative paths resolve from the same folder.
    await expect(page.frameLocator('#app').locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('choosing an example writes it to the URL without filling the back button', async ({ page }) => {
    await openApp(page);
    expect(new URL(page.url()).hash).toBe('#html');
    await selectSite(page, 'coupon-code');
    expect(new URL(page.url()).hash).toBe('#html#coupon-code');

  });

  test('walking the examples replaces the URL rather than pushing it', async ({ page }) => {
    await openApp(page);
    // Stepping through 50 examples would otherwise fill the back button with
    // steps nobody took on purpose.
    await page.evaluate(() => {
      window.__pushed = [];
      const push = history.pushState;
      history.pushState = function(...args){ window.__pushed.push(args[2]); return push.apply(this, args); };
    });
    await page.click('#nextSite');
    await expect(page.locator('#siteName')).not.toHaveText(homeName);
    expect(new URL(page.url()).hash).not.toBe('#' + HOME);
    expect(await page.evaluate(() => window.__pushed)).toEqual([]);
  });

  test('editing the hash switches the example, and Share copies the link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page);
    await page.evaluate(() => { location.hash = '#html#coupon-code'; });
    await expect(page.locator('#siteName')).toHaveText('Coupon code');
    await expect(page.locator('#spec')).not.toHaveValue('');

    await page.click('#share');
    await expect(page.locator('#toast')).toHaveText('Link copied!');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(page.url());
    expect(copied.endsWith('/#html#coupon-code')).toBe(true);
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
    expect(await page.evaluate(() => localStorage.getItem('live-test-runner:status'))).toContain('contact-form');
  });

  test('a step carries its value inside the target', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    await page.fill('#spec', [
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

  // A number that moves is not a reason to leave it unchecked: expectNumber
  // says the range it should stay inside, which is how a flaky "7 hours left"
  // becomes a test that is true at every hour.
  test('expectNumber checks the number beside the text', async ({ page }) => {
    await openApp(page, { site: 'click-counter' });
    await setSpeed(page, 'fast');
    await page.fill('#spec', [
      'test: Counts into the range',
      'steps:',
      '  - click: { role: button, name: Increment }',
      '  - click: { role: button, name: Increment }',
      '  - expectNumber: { text: "Count:", min: 1, max: 5 }',
      ''
    ].join('\n'));
    const res = await runAll(page);
    expect(res.state, describeFailures(res)).toBe('ok');
    // The step says what it is checking, in the words the file used.
    await expect(page.locator('#results .steps li .desc').last())
      .toHaveText('Expect a number between 1 and 5 beside “Count:”');
  });

  test('a number outside the range fails, and the message says what the page says', async ({ page }) => {
    await openApp(page, { site: 'click-counter' });
    await setSpeed(page, 'fast');
    await page.fill('#spec', [
      'test: Counts past the range',
      'steps:',
      '  - click: { role: button, name: Increment }',
      '  - expectNumber: { text: "Count:", min: 5, max: 9, timeout: 500 }',
      ''
    ].join('\n'));
    const res = await runAll(page);
    expect(res.state).toBe('bad');
    expect(res.tests[0].error).toContain('The page says 1, which is outside 5 to 9');
  });

  test('a failing step is explained, later steps are skipped, and the summary is red', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    await page.fill('#spec', [
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

    const res = await runAll(page, { click: '#results .test >> nth=1 >> .run-one', timeout: 60_000 });
    const ran = res.tests.filter(t => t.state === 'passed' || t.state === 'failed');
    expect(ran.map(t => t.title)).toEqual([res.tests[1].title]);
    expect(res.tests[1].state).toBe('passed');
    expect(res.tests.filter(t => t.state === 'idle').length).toBe(count - 1);
    expect(res.summary).toMatch(/^The test passed/);
  });

  test('Run tests is Stop while they run, and stopping says so', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await expect(page.locator('#stop')).toHaveCount(0);
    await expect(page.locator('#run .lbl')).toHaveText('Run tests');
    await setSpeed(page, 'slow');
    await page.click('#run');
    await expect(page.locator('#run .lbl')).toHaveText('Stop');
    await page.click('#run');
    await expect(page.locator('#run .lbl')).toHaveText('Run tests', { timeout: 60_000 });
    await expect(page.locator('#summary')).toHaveText(/^Stopped\./);
    await expect(page.locator('#summary')).toHaveClass('bad');
  });

  test('Step by step turns Run into Next step and advances one step at a time', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'step');
    await page.click('#run');
    await expect(page.locator('#run .lbl')).toHaveText('Next step');

    const steps = page.locator('#results .test').first().locator('.steps li');
    await expect(steps.first()).toHaveClass(/running/);
    await page.click('#run');
    await expect(steps.first()).toHaveClass(/passed/);

    // Esc stops a run going step by step
    await page.keyboard.press('Escape');
    await expect(page.locator('#run')).toBeEnabled({ timeout: 60_000 });
    await expect(page.locator('#run .lbl')).toHaveText('Run tests');
  });

  test('the head says how the run went in words alone, and an edit clears it', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    await page.click('#foldAll');                     // folded -> collapsed
    await expect(page.locator('#results')).toBeHidden();
    const res = await runAll(page);
    expect(res.state, describeFailures(res)).toBe('ok');
    // No circles in the head: the summary is all it says, and names no test
    await expect(page.locator('.results-panel .panel-head .sdots')).toHaveCount(0);
    expect(res.summary).not.toContain('“');
    await page.fill('#spec', await page.inputValue('#spec') + '\n');
    await expect(page.locator('#summary')).toHaveText('');
  });

  test('Repeat runs the tests several times and reports every run', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await setSpeed(page, 'fast');
    await page.selectOption('#repeat', '5');
    const res = await runAll(page);
    expect(res.summary).toMatch(/runs passed over 5 repetitions/);
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

  test('edits the markup, puts it on the page on ⌘/Ctrl+Enter, and Reset brings the original back', async ({ page }) => {
    const { errors } = await openApp(page, { site: 'login' });
    await page.click('.view-seg [data-view="html"]');
    const markup = await page.inputValue('#htmlEdit');
    expect(markup).toContain('<button id="loginBtn"');
    await expect(page.locator('#htmlBar')).toBeHidden();      // nothing to say until a mutation is on

    await page.fill('#htmlEdit', markup.replace('>Log in</button>', '>Sign in</button>'));
    // Typing alone leaves the page as it was
    await expect(page.frameLocator('#app').locator('#loginBtn')).toHaveText('Log in');
    expect(await page.evaluate(() => window.playlive.html.edited())).toBe(true);
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect.poll(() => page.evaluate(() => window.playlive.html.edited())).toBe(false);
    await expect(page.frameLocator('#app').locator('#loginBtn')).toHaveText('Sign in');
    expect(await page.inputValue('#htmlEdit')).toContain('>Sign in</button>');

    // The page was parsed again, so its own script still answers the button.
    await page.click('.view-seg [data-view="site"]');
    await page.frameLocator('#app').locator('#loginBtn').click();
    await expect(page.frameLocator('#app').locator('#err')).toHaveText(/Wrong email or password/);

    await page.click('.view-seg [data-view="html"]');
    await page.click('#reset');
    await expect(page.frameLocator('#app').locator('#loginBtn')).toHaveText('Log in');
    expect(await page.inputValue('#htmlEdit')).toContain('>Log in</button>');
    expect(errors).toEqual([]);
  });

  test('saved markup is the page a run starts from, until Reset', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await page.click('.view-seg [data-view="html"]');
    const markup = await page.inputValue('#htmlEdit');
    await page.fill('#htmlEdit', markup.replace('<p id="err"', '<p id="note">Edited page</p><p id="err"'));
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.frameLocator('#app').locator('#note')).toHaveText('Edited page');

    // Every test starts from a fresh page, and the fresh page is this one.
    await setSpeed(page, 'fast');
    const res = await runAll(page);
    expect(res.state, describeFailures(res)).toBe('ok');
    await expect(page.frameLocator('#app').locator('#note')).toHaveText('Edited page');
    expect(await page.inputValue('#htmlEdit')).toContain('Edited page');

    await page.click('#reset');
    await expect(page.frameLocator('#app').locator('#note')).toHaveCount(0);
    expect(await page.inputValue('#htmlEdit')).not.toContain('Edited page');
  });

  test('what is put on the page is offered by autocomplete', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await page.click('.view-seg [data-view="html"]');
    const markup = await page.inputValue('#htmlEdit');
    await page.fill('#htmlEdit', markup.replace('<p id="err"', '<button id="sp" type="button">Sparkle</button><p id="err"'));
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.frameLocator('#app').locator('#sp')).toBeVisible();

    // Applying harvests the page again, so the new button is a target like any other.
    const items = await page.evaluate(() => {
      const text = 'test: t\nsteps:\n  - click: { role: button, name: ';
      return window.playlive.complete.suggest(text, text.length).items.map(i => i.insert);
    });
    expect(items).toContain('Sparkle');
  });

  test('leaving the markup puts it on the page, with no buttons to press', async ({ page }) => {
    await openApp(page, { site: 'login' });
    await page.click('.view-seg [data-view="html"]');
    await expect(page.locator('#htmlApply, #htmlRevert')).toHaveCount(0);
    const markup = await page.inputValue('#htmlEdit');

    await page.fill('#htmlEdit', markup.replace('>Log in</button>', '>Sign in</button>'));
    await page.click('.view-seg [data-view="site"]');
    await expect(page.frameLocator('#app').locator('#loginBtn')).toHaveText('Sign in');
    expect(await page.evaluate(() => window.playlive.html.edited())).toBe(false);
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

// Writing the step is the exercise, so nothing can be pasted in from somewhere
// else. Taking the tests out is fine.
test.describe('Caret line', () => {
  // The band behind an editor's caret sits on the caret's line, and only while it has focus
  async function expectBandOn(page, ta, line){
    const at = await page.evaluate(([sel, line]) => {
      const ta = document.querySelector(sel), band = ta.parentElement.querySelector('.caret-line');
      const l = ta.parentElement.querySelector('pre').children[line];
      return { hidden: band.hidden, band: band.getBoundingClientRect().top, line: l.getBoundingClientRect().top };
    }, [ta, line]);
    expect(at.hidden).toBe(false);
    expect(Math.abs(at.band - at.line)).toBeLessThan(1);
  }
  const caretTo = (page, ta, line) => page.evaluate(([sel, line]) => {
    const ta = document.querySelector(sel), at = ta.value.split('\n').slice(0, line).join('\n').length + (line ? 1 : 0);
    ta.focus(); ta.setSelectionRange(at, at);
  }, [ta, line]);
  const bandHidden = (page, ta) => page.evaluate(sel => document.querySelector(sel).parentElement.querySelector('.caret-line').hidden, ta);

  test('every editor shades the line the caret is on while it has focus', async ({ page }) => {
    await openApp(page);
    await page.click('.view-seg [data-view="html"]');
    for (const ta of ['#spec', '#htmlEdit']){
      expect(await bandHidden(page, ta)).toBe(true);
      await caretTo(page, ta, 2);
      await expect.poll(() => bandHidden(page, ta)).toBe(false);
      await expectBandOn(page, ta, 2);
      await page.keyboard.press('ArrowDown');
      await expect.poll(async () => { try { await expectBandOn(page, ta, 3); return true; } catch { return false; } }).toBe(true);
    }
    await setMode(page, 'python');
    for (const ta of ['#codeTestsEd textarea', '#codeEd textarea']){
      await expect(page.locator(ta)).not.toHaveValue('');
      await caretTo(page, ta, 4);
      await expect.poll(() => bandHidden(page, ta)).toBe(false);
      await expectBandOn(page, ta, 4);
    }
    await page.locator('#codeEd textarea').blur();
    await expect.poll(() => bandHidden(page, '#codeEd textarea')).toBe(true);
  });

  test('a bracket beside the caret and its partner are boxed', async ({ page }) => {
    await openApp(page);
    const line = await page.evaluate(() => document.querySelector('#spec').value.split('\n').findIndex(l => l.includes('{')));
    await page.evaluate(line => {
      const ta = document.querySelector('#spec'), lines = ta.value.split('\n');
      const at = lines.slice(0, line).join('\n').length + 1 + lines[line].indexOf('{') + 1;
      ta.focus(); ta.setSelectionRange(at, at);
    }, line);
    const marks = page.locator('.editor .bracket-mark');
    await expect(marks.nth(0)).toBeVisible();
    await expect(marks.nth(1)).toBeVisible();
    const [a, b] = [await marks.nth(0).boundingBox(), await marks.nth(1).boundingBox()];
    expect(Math.abs(a.y - b.y)).toBeLessThan(1);
    expect(b.x).toBeGreaterThan(a.x);
    // Two to the left, the caret is beside no bracket
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(marks.nth(0)).toBeHidden();
  });
});

test.describe('Editor keys', () => {
  test('Tab indents the selected lines, and Enter starts the next step', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      const ta = document.querySelector('#spec');
      ta.value = 'test: One\nsteps:'; ta.dispatchEvent(new Event('input'));
      ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    });
    await page.keyboard.press('Enter');
    await expect(page.locator('#spec')).toHaveValue('test: One\nsteps:\n  - ');
    await page.keyboard.type('click: A');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    await expect(page.locator('#spec')).toHaveValue('test: One\nsteps:\n  - click: A\n  - ');
    // Only the dash: no suggestion is open to take the next Enter
    await expect(page.locator('#spec')).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(page.locator('#spec')).toHaveValue('test: One\nsteps:\n  - click: A\n', 'an empty step ends the list');
    await page.evaluate(() => document.querySelector('#spec').setSelectionRange(0, 16));
    await page.keyboard.press('Tab');
    await expect(page.locator('#spec')).toHaveValue('  test: One\n  steps:\n  - click: A\n');
  });

  test('clicking a line number selects that line, in every editor', async ({ page }) => {
    await openApp(page);
    const selected = sel => page.evaluate(sel => { const t = document.querySelector(sel); return t.value.slice(t.selectionStart, t.selectionEnd); }, sel);
    const lineOf = (sel, i) => page.evaluate(([sel, i]) => document.querySelector(sel).value.split('\n')[i] + '\n', [sel, i]);
    await page.locator('#gutter > div').nth(1).click();
    expect(await selected('#spec')).toBe(await lineOf('#spec', 1));
    await page.locator('#gutter > div').nth(3).click({ modifiers: ['Shift'] });
    expect((await selected('#spec')).split('\n').length).toBe(4);
    // Dragging up the numbers takes in each line passed over, and the band
    // behind the caret's line stays out of a selection
    const [from, to] = [await page.locator('#gutter > div').nth(4).boundingBox(), await page.locator('#gutter > div').nth(2).boundingBox()];
    await page.mouse.move(from.x + 8, from.y + 4); await page.mouse.down();
    await page.mouse.move(to.x + 8, to.y + 4, { steps: 4 }); await page.mouse.up();
    expect(await selected('#spec')).toBe((await lineOf('#spec', 2)) + (await lineOf('#spec', 3)) + (await lineOf('#spec', 4)));
    await expect(page.locator('#editor .caret-line')).toBeHidden();
    await setMode(page, 'python');
    const ta = '#codeEd textarea';
    await expect(page.locator(ta)).not.toHaveValue('');
    await page.locator('#codeEd .gutter > div').nth(0).click();
    expect(await selected(ta)).toBe(await lineOf(ta, 0));
    await page.keyboard.press('Tab');
    await expect.poll(() => lineOf(ta, 0)).toMatch(/^ {4}/);
  });
});

test.describe('Copy and paste', () => {
  test('the editor allows copy and cut but refuses paste and a dropped selection', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    const before = await page.inputValue('#spec');

    for (const type of ['copy', 'cut']){
      const prevented = await page.evaluate(type => {
        const e = new ClipboardEvent(type, { bubbles: true, cancelable: true });
        document.getElementById('spec').dispatchEvent(e);
        return e.defaultPrevented;
      }, type);
      expect(prevented, `${type} should be allowed`).toBe(false);
    }

    for (const [type, says] of [['paste', 'Pasting into the tests is off'], ['drop', 'Dropping text into the tests is off']]){
      const prevented = await page.evaluate(type => {
        const e = type === 'drop'
          ? new DragEvent('drop', { bubbles: true, cancelable: true })
          : new ClipboardEvent(type, { bubbles: true, cancelable: true });
        document.getElementById('spec').dispatchEvent(e);
        return e.defaultPrevented;
      }, type);
      expect(prevented, `${type} should be refused`).toBe(true);
      // A line saying why, rather than a control that quietly does nothing.
      await expect(page.locator('#toast')).toContainText(says);
    }
    expect(await page.inputValue('#spec')).toBe(before);

    await page.click('#export');
    await expect(page.locator('#dlgCopy')).toBeVisible();
    await page.keyboard.press('Escape');
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
      try { localStorage.setItem('live-test-runner:layout', JSON.stringify({ exportTab: 2 })); } catch {}
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
  test('the Tests panel resets its tests, which undo takes back, and in Create back to the names', async ({ page }) => {
    const { errors } = await openApp(page, { site: 'contact-form' });
    const spec = page.locator('#spec'), shipped = await spec.inputValue();
    const write = text => spec.evaluate((el, t) => { el.value = t; el.dispatchEvent(new Event('input')); }, text);
    await write('test: Mine\nsteps:\n  - expectText: Mine\n');
    await page.click('#resetSpec');
    await expect(spec).toHaveValue(shipped);
    await expect(page.locator('#toast')).toHaveText('Tests reset');
    await spec.focus();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(spec).toHaveValue(/test: Mine/);

    await page.click('.res-seg [data-resview="create"]');
    const skeleton = await spec.inputValue();
    expect(skeleton).toMatch(/^# /m);
    await write('# mine\n');
    await page.click('#resetSpec');
    await expect(spec).toHaveValue(skeleton);
    expect(errors).toEqual([]);
  });

  test('brings the example tests back in one click', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    const example = await page.inputValue('#spec');
    await page.fill('#spec', 'test: Mine\nsteps:\n  - expectText: Contact\n');

    await page.click('#reset');
    expect(await page.inputValue('#spec')).toBe(example);
    await expect(page.locator('#toast')).toHaveText('Code reset and cache cleared');
  });

  test('clears every example, not only the one showing', async ({ page }) => {
    await openApp(page, { site: 'login' });
    const loginExample = await page.inputValue('#spec');
    await page.fill('#spec', 'test: Mine\nsteps:\n  - expectText: Log in\n');

    await selectSite(page, 'contact-form');
    const formExample = await page.inputValue('#spec');
    await page.fill('#spec', 'test: Also mine\nsteps:\n  - expectText: Contact\n');
    await setSpeed(page, 'fast');
    await runAll(page);
    // A run leaves a status dot and a history behind for this site
    await expect(page.locator('#tabs .tab[data-site="contact-form"]')).toHaveAttribute('data-status', /pass|fail/);

    await page.click('#reset');
    expect(await page.inputValue('#spec')).toBe(formExample);
    await expect(page.locator('#tabs .tab[data-site="contact-form"]')).not.toHaveAttribute('data-status', /.*/);
    // Nothing of ours is left in storage, bar the layout, which is about this browser
    expect(await page.evaluate(() => Object.keys(localStorage)
      .filter(k => k.startsWith('live-test-runner') && k !== 'live-test-runner:layout'))).toEqual([]);
    // and the other example's edits are gone too
    await selectSite(page, 'login');
    expect(await page.inputValue('#spec')).toBe(loginExample);
  });
});

test.describe('Reload', () => {
  test('starts the page over and keeps the tests', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    const frame = page.frameLocator('#app');
    await frame.locator('#openBtn').click();
    await frame.locator('#nameInput').fill('Ana');
    await page.fill('#spec', 'test: Mine\nsteps:\n  - expectText: Contact\n');

    await page.click('#reload');
    // The page starts over: the form is closed again and what was typed is gone.
    await expect(frame.locator('#openBtn')).toBeVisible();
    await expect(frame.locator('#nameInput')).toHaveValue('');
    expect(await page.inputValue('#spec')).toContain('test: Mine');
  });
});

test.describe('Persistence', () => {
  test('edits, the chosen site and layout settings survive a reload', async ({ page }) => {
    await openApp(page, { site: 'coupon-code' });
    await page.fill('#spec', 'test: Kept\nsteps:\n  - expectText: Coupon\n');
    await setSpeed(page, 'fast');
    await page.click('.seg [data-vp="tablet"]');
    // The editor saves shortly after the last keystroke.
    await page.waitForFunction(() =>
      (localStorage.getItem('live-test-runner') || '').includes('test: Kept'));

    await page.reload();
    await page.waitForFunction(() => typeof window.playlive?.selectSite === 'function');
    await expect(page.locator('#siteName')).toHaveText('Coupon code');
    expect(await page.inputValue('#spec')).toContain('test: Kept');
    await expect(page.locator('.seg [data-vp="tablet"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('live-test-runner'))).toContain('test: Kept');
  });

  test('a broken layout value does not stop the app from loading', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('live-test-runner:layout', '{not json'); } catch {}
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
    // A phone has no Speed: it runs at Normal
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

  test('a phone leaves out Record, Export, Speed, Repeat and Expand, and runs once at Normal speed', async ({ page }) => {
    await openApp(page);
    await page.selectOption('#repeat', '5');
    await page.selectOption('#speed', 'fast');
    await page.setViewportSize({ width: 390, height: 844 });
    for (const sel of ['#record', '#export', '#speed', '#repeat']) await expect(page.locator(sel)).toBeHidden();
    await expect(page.locator('#run')).toBeVisible();
    await expect(page.locator('#repeat')).toHaveValue('1');
    await expect(page.locator('#speed')).toHaveValue('normal');
    await setMode(page, 'python');
    await expect(page.locator('#codeRepeat')).toBeHidden();
    await expect(page.locator('#codeTestsOpen')).toBeHidden();
    await expect(page.locator('#codeRun')).toBeVisible();
  });

  test('a phone brings the site into view while the tests run, then Results', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page, { site: 'contact-form' });
    const top = sel => page.locator(sel).evaluate(el => Math.round(el.getBoundingClientRect().top));
    await page.click('#run');
    await expect(page.locator('#run .lbl')).toHaveText('Stop');
    // The site is last on the page, so it shows whole rather than at the top
    const inView = () => page.locator('.browser').evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.top >= -1 && (r.bottom <= innerHeight + 1 || r.top <= 1);
    });
    await expect.poll(inView).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await expect(page.locator('#run .lbl')).toHaveText('Run tests', { timeout: 60_000 });
    await expect.poll(() => top('.results-panel')).toBeLessThanOrEqual(1);
    expect(await top('.results-panel')).toBeGreaterThanOrEqual(-1);
  });

  // Long lines wrap on a phone: nothing runs off the side, the text and its
  // highlight wrap alike, and each number sits beside its own line
  for (const [mode, ed, ta] of [['html', '.editor', '#spec'], ['python', '#codeTestsEd', '#codeTestsEd textarea']]){
    test(`a phone wraps long lines in the ${mode} tests`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openApp(page, mode === 'html' ? { site: 'contact-form' } : { mode });
      const m = await page.evaluate(([ed, ta]) => {
        const root = document.querySelector(ed), t = document.querySelector(ta);
        const hl = root.querySelector('.hl'), lines = [...hl.children], nums = [...root.querySelector('.gutter').children];
        const lh = parseFloat(getComputedStyle(t).lineHeight);
        return {
          sideways: t.scrollWidth - t.clientWidth,
          tall: lines.filter(l => l.offsetHeight > lh * 1.5).length,
          off: lines.map((l, i) => Math.abs(l.offsetTop - lines[0].offsetTop - (nums[i].offsetTop - nums[0].offsetTop))).filter(d => d > 1).length,
          heights: Math.abs(t.scrollHeight - hl.scrollHeight)
        };
      }, [ed, ta]);
      expect(m.sideways).toBeLessThanOrEqual(1);
      expect(m.tall).toBeGreaterThan(0);
      expect(m.off).toBe(0);
      expect(m.heights).toBeLessThanOrEqual(2);
    });
  }

  test('a phone leaves out Create, in both modes, and leaves Create for Results', async ({ page }) => {
    await openApp(page);
    await page.click('.res-seg [data-resview="create"]');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'create');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'explore');
    await expect(page.locator('.res-seg [data-resview="results"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.res-seg [data-resview="create"]')).toBeHidden();
    await setMode(page, 'python');
    await expect(page.locator('.code-seg [data-codetab="create"]')).toBeHidden();
    // A link into Create opens on Results
    await page.goto('/index.html#python-create');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'python');
    await expect(page.locator('.code-seg [data-codetab="results"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a phone leaves out the New button', async ({ page }) => {
    await openApp(page, { mode: 'python' });
    await expect(page.locator('#newCode')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#newCode')).toBeHidden();
  });

  test('a phone gets one column, no sideways scrolling, and the example list on screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openApp(page);
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sideways).toBeLessThanOrEqual(1);

    // The example list opens right below the picker, and stays on screen
    await page.click('#siteBtn');
    const pop = await page.locator('#sitePop').boundingBox(), picker = await page.locator('.appbar .picker').boundingBox();
    expect(pop.y - (picker.y + picker.height), 'a gap between the picker and its list').toBeLessThanOrEqual(6);
    expect(pop.y).toBeGreaterThanOrEqual(picker.y + picker.height - 1);
    expect(Math.abs(pop.width - picker.width)).toBeLessThanOrEqual(1);
    expect(pop.y + pop.height).toBeLessThanOrEqual(740 + 1);
    await page.click('#tabs .tab[data-site="login"]');
    await expect(page.locator('#siteName')).toHaveText('Login');
  });

  test('the editor gutter lines up with the code at any size', async ({ page }) => {
    for (const width of [390, 1440]){
      await page.setViewportSize({ width, height: 900 });
      await openApp(page);
      // On a phone the code starts folded, so ask for it back before measuring.
      if (await page.locator('#editor').isHidden()) await page.click('#foldSpec');
      const { line, gutter } = await page.evaluate(() => ({
        line: parseFloat(getComputedStyle(document.getElementById('spec')).lineHeight),
        gutter: document.querySelector('#gutter div').getBoundingClientRect().height
      }));
      expect(Math.abs(line - gutter), `gutter and code disagree at ${width}px`).toBeLessThan(0.5);
    }
  });

  test('a phone opens with the code showing, and the button folds it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);
    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('#foldSpec')).toHaveAttribute('aria-expanded', 'true');
    // Folding only hides the code: the tests are still there to run.
    await page.click('#foldSpec');
    await expect(page.locator('#editor')).toBeHidden();
    await expect(page.locator('#run')).toBeEnabled();
    await expect(page.locator('#results .test').first()).toBeVisible();
  });

  test('a phone shows the site last, below the tests and their results', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);
    const y = async sel => (await page.locator(sel).boundingBox()).y;
    const [tests, results, site] = [await y('.tests-panel'), await y('.results-panel'), await y('.browser')];
    expect(results).toBeGreaterThan(tests);
    expect(site).toBeGreaterThan(results);
  });

  test('a wide screen opens with the code showing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);
    await expect(page.locator('#editor')).toBeVisible();
  });

  test('the app bar keeps Reset, Share and the repository named on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openApp(page);
    for (const [sel, label] of [['#reset', 'Reset'], ['#share', 'Share'], ['.repo-link', 'GitHub']]){
      const el = page.locator(sel);
      await expect(el).toBeVisible();
      await expect(el).toContainText(label);
      // The published page allows no remote images, so each mark is inline.
      await expect(el.locator('svg')).toHaveCount(1);
      expect((await el.boundingBox()).height, `${sel} is too small to tap`).toBeGreaterThanOrEqual(34);
    }
    // Reset comes before Share, and the repository last.
    const order = await page.$$eval('.appbar #reset, .appbar #share, .appbar .repo-link',
      els => els.map(e => e.id || e.className));
    expect(order).toEqual(['reset', 'share', 'repo-link']);
  });

  test('the app bar is two rows on a phone: the name with the icons, then the example', async ({ page }) => {
    for (const width of [360, 390]){
      await page.setViewportSize({ width, height: 844 });
      await openApp(page);
      const box = async sel => page.locator(sel).boundingBox();
      const [brand, share, reset, repo, picker] =
        await Promise.all(['.brand', '#share', '#reset', '.repo-link', '.picker'].map(box));
      // First row: the name and the three icons.
      for (const [what, b] of [['Share', share], ['Reset', reset], ['the repository', repo]])
        expect(Math.abs(b.y - brand.y), `${what} is not on the brand's row at ${width}px`).toBeLessThan(20);
      // Second row: the example.
      expect(picker.y, `the example is not on its own row at ${width}px`).toBeGreaterThan(brand.y + brand.height);

      // Both rows use the whole bar: the names spread across the first, and the
      // example takes the second.
      const bar = await box('.appbar');
      for (const [what, row] of [['the names', [brand, repo]], ['the example', [picker, picker]]]){
        expect(row[0].x, `${what} does not start at the edge at ${width}px`).toBeLessThan(bar.x + 14);
        expect(row[1].x + row[1].width, `${what} does not reach the edge at ${width}px`)
          .toBeGreaterThan(bar.x + bar.width - 14);
      }
    }
  });

  for (const width of [390, 700]) test(`the site panel head fills two rows at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openApp(page);
    const head = await page.locator('.site-head').boundingBox();
    const title = await page.locator('.site-head h2').boundingBox();
    const reload = await page.locator('.site-head #reload').boundingBox();
    const seg = await page.locator('.site-head .view-seg').boundingBox();
    // The reload ends the first row, beside the name rather than below it.
    expect(reload.y).toBeLessThan(title.y + title.height);
    expect(reload.x).toBeGreaterThanOrEqual(title.x + title.width - 1);
    expect(head.x + head.width - (reload.x + reload.width), 'the reload is not at the end of its row')
      .toBeLessThan(12);
    // Site/HTML has the whole second row.
    expect(seg.y).toBeGreaterThanOrEqual(reload.y + reload.height - 1);
    expect(seg.width / head.width, 'Site/HTML does not fill its row').toBeGreaterThan(0.9);
  });
});

test.describe('Panel heads on small screens', () => {
  // Every head keeps its parts inside it, whatever the mode and the tab
  for (const width of [320, 390, 700]) test(`no panel head spills over at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const mode of ['html', 'python']){
      await openApp(page, mode === 'html' ? {} : { mode });
      const tabs = mode === 'html' ? '.res-seg button:visible' : '.code-seg button:visible';
      for (const tab of await page.locator(tabs).all()){
        await tab.click();
        const spill = await page.$$eval('.appbar, .panel-head, .site-head, .mut-head', heads => heads
          .filter(h => h.offsetParent)
          .flatMap(h => { const r = h.getBoundingClientRect();
            return [...h.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect();
              return q.width && (q.right > r.right + 1 || q.left < r.left - 1); }).map(e => e.id || e.className); }));
        expect(spill, `${mode}, ${await tab.textContent()}: spills over at ${width}px`).toEqual([]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
  });

  test('a tablet gives the Results tabs and the fold one row, and the summary the next', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await openApp(page);
    await page.click('#run');
    await expect(page.locator('#summary')).toHaveText(/passed/, { timeout: 20000 });
    const box = sel => page.locator(sel).boundingBox();
    const [head, seg, fold, said] = await Promise.all(['.results-panel .panel-head', '.res-seg', '#foldAll', '.results-panel .run-said'].map(box));
    expect(Math.abs(fold.y + fold.height / 2 - (seg.y + seg.height / 2))).toBeLessThan(8);
    expect(seg.width / head.width, 'the tabs do not fill their row').toBeGreaterThan(0.8);
    expect(said.y).toBeGreaterThanOrEqual(seg.y + seg.height - 1);
    expect(await page.locator('#summary').evaluate(e => e.scrollWidth <= e.clientWidth), 'the summary is cut short').toBe(true);
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

    // One button, three stops: the steps, then no steps, then no panel. It
    // always says what the next press does.
    await expect(page.locator('#foldAll')).toHaveAttribute('aria-label', 'Collapse all');
    await page.click('#foldAll');
    await expect(page.locator('#foldAll')).toHaveAttribute('aria-label', 'Collapse the panel');
    await page.click('#foldAll');
    await expect(page.locator('#foldAll')).toHaveAttribute('aria-label', 'Expand all');
    await expect(page.locator('#results')).toBeHidden();
    await page.click('#foldAll');
    await expect(page.locator('#foldAll')).toHaveAttribute('aria-label', 'Collapse all');
    await expect(page.locator('#results')).toBeVisible();
  });

  test('every toolbar button has an accessible name', async ({ page }) => {
    await openApp(page);
    const unnamed = await page.$$eval('header button, .toolbar button, .head-actions button, .site-head button',
      els => els.filter(e => !(e.innerText.trim() || e.getAttribute('aria-label') || e.title)).length);
    expect(unnamed).toBe(0);
  });
});
