// JS/TS mode: Jasmine, or Mocha with Chai, on JavaScript and TypeScript
// modules, run in the browser. The frameworks and the TypeScript compiler come
// from cdnjs, so like js-yaml these need network access.
import { test, expect } from '@playwright/test';
import { CODE_LOAD as LOAD, allPassed, codeReady, codeRun as run, openApp, setMode, steadyCodeIds } from './app.mjs';

const overflow = page => page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
// Language first, then framework: "JavaScript (Chrome 141) · Jasmine 7.0.2"
const ready = (page, label = /^(JavaScript \(.+\)|TypeScript [\d.]+) · (Jasmine|Mocha) \d/) => codeReady(page, label);

test.describe('JS/TS mode', () => {
  test('has the code panels, its own examples, and Jasmine on JavaScript first', async ({ page }) => {
    const { errors } = await openApp(page);
    await setMode(page, 'javascript');
    for (const p of ['.code-tests-panel', '.console-panel', '.code-module-panel']) await expect(page.locator(p)).toBeVisible();
    await expect(page.locator('.browser')).toBeHidden();
    expect(await overflow(page)).toBeLessThanOrEqual(0);

    await expect(page.locator('#siteName')).toHaveText('Calculator');
    await expect(page.locator('#siteCount')).toHaveText('1 of 63');
    await expect(page.locator('#codeTitle')).toHaveText('JavaScript code');
    await expect(page.locator('#codeFile')).toHaveText('calculator.js');
    await expect(page.locator('#codeTestsFile')).toHaveText('calculator.spec.js');
    await expect(page.locator('.code-fw [data-fw="jasmine"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.code-lang [data-lang="js"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#codeCount')).toHaveText('12 tests');
    await expect(page.locator('#codeResults .code-name').first()).toHaveText('works');
    expect(new URL(page.url()).hash).toBe('#javascript');

    // The other framework and language, and the files they name
    await page.click('.code-fw [data-fw="mocha"]');
    await expect(page.locator('#codeTestsFile')).toHaveText('calculator.test.js');
    await expect(page.locator('#codeTestsEd textarea')).toHaveValue(/require\("chai"\)/);
    await page.click('.code-lang [data-lang="ts"]');
    await expect(page.locator('#codeTitle')).toHaveText('TypeScript code');
    await expect(page.locator('#codeFile')).toHaveText('calculator.ts');
    await expect(page.locator('#codeTestsEd textarea')).toHaveValue(/import \{ expect \} from "chai"/);

    // Python keeps its own framework, and coming back finds this one as it was
    await setMode(page, 'python');
    await expect(page.locator('#codeFile')).toHaveText('calculator.py');
    await expect(page.locator('.code-lang')).toBeHidden();
    await setMode(page, 'javascript');
    await expect(page.locator('#codeFile')).toHaveText('calculator.ts');

    // Changing language keeps the example
    await page.evaluate(() => window.playlive.code.select('stack'));
    await setMode(page, 'python');
    await expect(page.locator('#codeFile')).toHaveText('stack.py');
    await setMode(page, 'javascript');
    await expect(page.locator('#codeFile')).toHaveText('stack.ts');
    expect(errors).toEqual([]);
  });

  test('every run measures which lines and branches of the code ran, in JavaScript and through TypeScript', async ({ page }) => {
    test.setTimeout(3 * LOAD);
    const { errors } = await openApp(page, { mode: 'javascript' });
    await page.evaluate(() => window.playlive.code.select('bank-account'));
    await expect(page.locator('#codeFile')).toHaveText('bank-account.js');
    await ready(page);
    const score = page.locator('#codeCov');
    const missed = () => page.locator('#codeEd .hl .l.cov-miss').evaluateAll(ls => ls.map(l => l.textContent.trim()));
    await page.locator('#codeCovShow').check();

    await run(page);
    await expect(score).toHaveText(/^Line: 80%\s*\(8 of 10 lines\)$/);
    expect(await missed()).toEqual(['throw new Error("Deposit must be positive");', 'this.balance -= amount;']);
    await expect(page.locator('#codeEd .hl .l.cov-hit')).toHaveCount(8);
    // Each if goes only one way: a deposit is never refused, a withdrawal always is
    await expect(page.locator('#codeBranch')).toHaveText(/^Branch: 50%\s*\(2 of 4 branches\)$/);
    await page.click('.cov-seg [data-covby="branches"]');
    await expect(page.locator('#codeEd .hl .l.cov-part')).toHaveCount(2);
    // and each method with a branch has a flow, a box taking you to its line
    await page.click('.code-flowseg [data-codeview="flow"]');
    await expect(page.locator('#codeFlow .flow-fn h3')).toHaveText(['Account.deposit', 'Account.withdraw']);
    await expect(page.locator('#codeFlow .fnode.dec.part')).toHaveCount(2);
    await page.locator('#codeFlow .fnode.dec').first().click();
    await expect(page.locator('#codeEd')).toBeVisible();
    const code = page.locator('#codeEd textarea');
    expect(await code.evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd))).toBe('if (amount <= 0) {');
    await page.click('.cov-seg [data-covby="lines"]');

    // TypeScript runs compiled, and the lines are mapped back to what was written
    await page.click('.code-lang [data-lang="ts"]');
    await expect(page.locator('#codeFile')).toHaveText('bank-account.ts');
    await expect(score).toBeHidden();
    await ready(page, /^TypeScript/);
    await run(page);
    await expect(score).toHaveText(/^Line: 77%\s*\(7 of 9 lines\)$/);
    expect(await missed()).toEqual(['throw new Error("Deposit must be positive");', 'this.balance -= amount;']);
    await expect(page.locator('#codeBranch')).toHaveText(/^Branch: 50%\s*\(2 of 4 branches\)$/);

    // Mocha measures the same lines as Jasmine
    await page.click('.code-fw [data-fw="mocha"]');
    await ready(page, /Mocha/);
    await run(page);
    await expect(score).toHaveText(/^Line: 77%\s*\(7 of 9 lines\)$/);
    expect(errors).toEqual([]);
  });

  test('Repeat runs the tests several times, each on a fresh runner', async ({ page }) => {
    test.setTimeout(2 * LOAD);
    const { errors } = await openApp(page, { mode: 'javascript' });
    await ready(page);
    await page.selectOption('#codeRepeat', '5');
    expect(await run(page)).toMatch(/^60 of 60 runs passed over 5 repetitions \([\d.]+s\)$/);
    await expect(page.locator('#codeSummary')).toHaveClass('ok');
    await expect(page.locator('#codeResults .hist i.h-pass')).toHaveCount(60);
    await expect(page.locator('#codeResults .flaky:visible')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('every example passes as it ships, in both frameworks and both languages', async ({ page }) => {
    test.setTimeout(4 * LOAD);
    const { errors } = await openApp(page, { mode: 'javascript' });
    const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
    expect(ids).toHaveLength(63);
    const failures = [];
    for (const fw of ['jasmine', 'mocha']) for (const lang of ['js', 'ts']){
      await page.evaluate(([fw, lang]) => { window.playlive.code.framework(fw); window.playlive.code.lang(lang); }, [fw, lang]);
      await ready(page, lang === 'ts' ? /^TypeScript \d/ : /^JavaScript /);
      for (const id of await steadyCodeIds(ids)){
        await page.evaluate(id => window.playlive.code.select(id), id);
        await expect(page.locator('#codeFile')).toHaveText(`${id}.${lang}`);
        const said = await run(page);
        // Palindrome writes one test that runs once per case, so a run may count more
        const n = Number((await page.locator('#codeCount').textContent()).split(' ')[0]);
        // A skipped test did not run, so it is not counted
        const skipped = await page.locator('#codeResults .test[data-state="skipped"]').count();
        if (!(allPassed(said) >= n - skipped))
          failures.push(`${fw} ${lang} ${id}: ${said} ${await page.locator('#codeResults .code-detail').first().textContent().catch(() => '')}`);
      }
    }
    expect(failures).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the Mutation tab changes the code in small ways and says which changes the tests caught', async ({ page }) => {
    const { errors } = await openApp(page, { hash: '#javascript#bank-account' });
    await ready(page);
    const panel = page.locator('#codeMutation'), runBtn = panel.locator('.mut-run'), score = panel.locator('.mut-score');
    const group = state => panel.locator(`.bug-group[data-state="${state}"]`);
    await page.click('.code-seg [data-codetab="mutation"]');
    await expect(score).toHaveText('6 mutations');
    await expect(group('unchecked').locator('.mut-row')).toHaveCount(6);

    // Inject puts one into the code, and Repair takes it out
    const codeTa = page.locator('#codeEd textarea');
    const plus = group('unchecked').locator('.bug-row', { hasText: '+= → -=' });
    await plus.locator('.mut-inject').click();
    await expect(codeTa).toHaveValue(/this\.balance -= amount;\n {2}\}\n\n {2}withdraw/);
    await expect(plus).toContainText('in the code now');
    await plus.locator('.mut-inject').click();
    await expect(codeTa).toHaveValue(/this\.balance \+= amount;\n {2}\}\n\n {2}withdraw/);

    await runBtn.click();
    await expect(runBtn).toHaveText('Run again', { timeout: LOAD });
    await expect(score).toHaveText('1 of 6 mutations caught (16%)');
    await expect(group('caught').locator('.mut-what')).toHaveText(['+= → -=']);
    await expect(group('escaped').locator('.mut-row')).toHaveCount(4);
    // No test withdraws successfully, so nothing could catch a change there
    await expect(group('unrun').locator('.mut-text')).toHaveText(['this.balance -= amount;']);

    // A test for the boundary catches the < mutation
    const tests = page.locator('#codeTestsEd textarea');
    await tests.evaluate(t => {
      t.value = t.value.replace('describe("Account", () => {\n', 'describe("Account", () => {\n  it("refuses a zero deposit", () => {\n    expect(() => new Account(100).deposit(0)).toThrowError();\n  });\n\n');
      t.dispatchEvent(new Event('input'));
    });
    await expect(panel).toContainText('changed after this run');
    await runBtn.click();
    await expect(runBtn).toHaveText('Run again', { timeout: LOAD });
    await expect(group('caught').locator('.mut-what')).toHaveText(['<= → <', '+= → -=']);

    // A failing test leaves nothing to judge by, so the run refuses
    await tests.evaluate(t => { t.value = t.value.replace('toBe(150)', 'toBe(151)'); t.dispatchEvent(new Event('input')); });
    await runBtn.click();
    await expect(panel).toContainText('The tests must all pass first', { timeout: LOAD });
    expect(errors).toEqual([]);
  });

  test('mutations run on every example, in both frameworks and both languages', async ({ page }) => {
    test.setTimeout(4 * LOAD);
    const { errors } = await openApp(page, { mode: 'javascript' });
    await page.click('.code-seg [data-codetab="mutation"]');
    const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
    const runBtn = page.locator('.mut-run'), problems = [];
    for (const lang of ['js', 'ts']) for (const fw of ['jasmine', 'mocha']){
      await page.evaluate(([fw, lang]) => { window.playlive.code.framework(fw); window.playlive.code.lang(lang); }, [fw, lang]);
      for (const id of await steadyCodeIds(ids)){
        await page.evaluate(id => window.playlive.code.select(id), id);
        await expect(page.locator('#codeFile')).toHaveText(`${id}.${lang}`);
        await expect(page.locator('.mut-score')).toHaveText(/ mutations$/, { timeout: LOAD });
        await runBtn.click();
        await expect(runBtn).toHaveText('Run again', { timeout: LOAD });
        const said = await page.locator('.mut-score').textContent();
        if (!/^\d+ of \d+ mutations caught/.test(said)) problems.push(`${lang} ${fw} ${id}: ${await page.locator('#codeMutation').innerText()}`);
      }
    }
    expect(problems).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the Smells tab finds the four smells in Jasmine and Mocha tests, as they are typed', async ({ page }) => {
    const { errors } = await openApp(page, { hash: '#javascript#bank-account' });
    const panel = page.locator('#codeSmells'), score = panel.locator('.smell-score');
    const group = id => panel.locator(`.smell-group[data-smell="${id}"]`);
    const tests = page.locator('#codeTestsEd textarea');
    const edit = (from, to) => tests.evaluate((t, [a, b]) => { t.value = t.value.replace(a, b); t.dispatchEvent(new Event('input')); }, [from, to]);
    await page.click('.code-seg [data-codetab="smells"]');
    // Every test opens by making the same account, and no runtime is needed to say so
    await expect(score).toHaveText('1 smell in 3 tests');
    await expect(group('duplication-of-setup').locator('.smell-what')).toHaveText(['const account = new Account(100);']);
    await expect(group('duplication-of-setup').locator('.smell-why')).toContainText('Move those lines to beforeEach.');

    // A test that checks nothing, and one that checks too much
    await edit('describe("Account", () => {\n', ['describe("Account", () => {',
      '  it("does nothing", () => {', '    new Account(100).deposit(1);', '  });', '',
      '  it("checks everything", () => {', '    const account = new Account(100);',
      ...Array.from({ length: 6 }, () => '    expect(account.balance).toBe(100);'), '  });', ''].join('\n'));
    await expect(group('unknown-test').locator('.smell-what')).toHaveText(['does nothing']);
    await expect(group('assertion-roulette').locator('.smell-m')).toHaveText(['6 checks in one test']);
    await group('unknown-test').locator('.smell-line').click();
    expect(await tests.evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd))).toBe('it("does nothing", () => {');

    // beforeEach making something no test uses
    await edit('describe("Account", () => {\n', 'describe("Account", () => {\n  let x;\n  beforeEach(() => {\n    x = 1;\n  });\n');
    await expect(group('general-fixture').locator('.smell-what')).toHaveText(['x = 1;']);
    await expect(group('general-fixture').locator('.smell-m')).toHaveText(['used by no test']);

    // A file whose brackets do not close has nothing to say
    await edit('  it("does nothing", () => {', '  it("does nothing", () => {{');
    await expect(panel).toContainText('Fix the tests first');

    // All smells: Bank account and Cart repeat their setup, and Calculator's very bad test
    // checks everything, on purpose, in Mocha and TypeScript too
    await page.evaluate(() => { window.playlive.code.framework('mocha'); window.playlive.code.lang('ts'); });
    await expect(page.locator('#codeTestsFile')).toHaveText('bank-account.test.ts');
    await panel.locator('[data-codesmells="all"]').click();
    await expect(score).toHaveText('3 of 63 examples have one');
    await expect(group('duplication-of-setup').locator('.smell-what')).toHaveText(['Cart', 'Bank account']);
    await expect(panel.locator('.smell-group')).toHaveCount(4);
    expect(errors).toEqual([]);
  });

  test('Create starts from the titles, and Check says what a test misses', async ({ page }) => {
    const { errors } = await openApp(page, { hash: '#javascript-create' });
    await expect(page.locator('.code-seg [data-codetab="create"]')).toHaveAttribute('aria-pressed', 'true');
    const tests = page.locator('#codeTestsEd textarea');
    await expect(tests).toHaveValue('const { add, subtract, multiply, divide } = require("./calculator");\n\n'
      + ['// works', '// add', '// subtract', '// multiply', '// divide', '// adds two numbers', '// adds negative numbers', '// subtracts two numbers', '// multiplies two numbers', '// divides into a decimal', '// divides into an integer', '// refuses to divide by zero'].join('\n\n') + '\n');
    const group = state => page.locator(`#codeCreate .create-group[data-state="${state}"] .create-what`);
    await expect(group('todo')).toHaveCount(12);

    // The describe is yours to name; a weak check is told what it misses
    await tests.fill(`const { add, divide } = require("./calculator");

describe("Mine", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("divides into a decimal", () => {
    expect(divide(10, 2)).toBeTruthy();
  });
});
`);
    await expect(group('nocheck')).toHaveText(['adds two numbers', 'divides into a decimal']);
    await ready(page);
    await page.click('.brief-run');
    await expect(page.locator('.brief-run')).toHaveText('Check', { timeout: LOAD });
    await expect(group('done')).toHaveText(['adds two numbers']);
    await expect(page.locator('#codeCreate .create-group[data-state="nocheck"] .create-m')).toHaveText(/^misses 1 of \d+: line 17, \/ → \*$/);
    await expect(page.locator('.brief-score')).toHaveText('1 of 12 done');

    expect(errors).toEqual([]);
  });

  test('the example\'s own tests are all done in Create, in both frameworks and both languages', async ({ page }) => {
    test.setTimeout(4 * LOAD);
    const { errors } = await openApp(page, { hash: '#javascript-create' });
    const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
    const tests = page.locator('#codeTestsEd textarea'), problems = [];
    for (const lang of ['js', 'ts']) for (const fw of ['jasmine', 'mocha']){
      await page.evaluate(([fw, lang]) => { window.playlive.code.framework(fw); window.playlive.code.lang(lang); }, [fw, lang]);
      for (const id of await steadyCodeIds(ids)){
        await page.evaluate(id => window.playlive.code.select(id), id);
        const file = `${id}.${fw === 'mocha' ? 'test' : 'spec'}.${lang}`;
        await expect(page.locator('#codeTestsFile')).toHaveText(file);
        await expect(page.locator('.brief-score')).toHaveText(/ done$/);
        await tests.fill(await page.evaluate(u => fetch(u).then(r => r.text()), `examples/javascript/${id}/${fw}/${file}`));
        await page.click('.brief-run');
        await expect(page.locator('.brief-run')).toHaveText('Check', { timeout: LOAD });
        const said = await page.locator('.brief-score').textContent();
        if (!/^All \d+ tests? written$/.test(said)) problems.push(`${lang} ${fw} ${id}: ${await page.locator('#codeCreate').innerText()}`);
      }
    }
    expect(problems).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('autocomplete writes a test, and offers the framework\'s own checks', async ({ page }) => {
    test.setTimeout(2 * LOAD);
    const { errors } = await openApp(page, { mode: 'javascript' });
    const tests = page.locator('#codeTestsEd textarea'), pop = page.locator('#codeAc');
    await expect(tests).toHaveValue(/describe\("Calculator"/);
    // A new test inside the describe, before its closing line
    await tests.evaluate(t => { t.focus(); const at = t.value.lastIndexOf('});'); t.setSelectionRange(at, at); });
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    // "test" writes an it(...), as it writes a def test_ in Python
    await page.keyboard.type('  test');
    await expect(pop.locator('.ac-label')).toHaveText(['it']);
    await page.keyboard.press('Enter');
    await page.keyboard.type('adds negatives');
    await page.keyboard.press('Tab');
    await page.keyboard.type('expe');
    await page.keyboard.press('Enter');
    await page.keyboard.type('add(-2, -3)');
    expect(await tests.inputValue()).toContain('  it("adds negatives", () => {\n    expect(add(-2, -3)).toBe(expected);');
    // after expect(…). only Jasmine's matchers
    await tests.evaluate(t => { const at = t.value.indexOf('.toBe(expected)'); t.setRangeText('', at, at + '.toBe(expected)'.length, 'end'); });
    await page.keyboard.type('.toEq');
    await expect(pop.locator('.ac-label')).toHaveText(['.toEqual']);
    await page.keyboard.press('Tab');
    await page.keyboard.type('-5');
    await ready(page);
    expect(allPassed(await run(page))).toBe(13);
    // Mocha offers Chai's chains instead
    await page.click('.code-fw [data-fw="mocha"]');
    await expect(tests).toHaveValue(/require\("chai"\)/);
    await tests.evaluate(t => { t.focus(); const at = t.value.indexOf('.to.equal(5)'); t.setSelectionRange(at, at + '.to.equal(5)'.length); });
    await page.keyboard.press('Backspace');
    await page.keyboard.type('.to.de');
    await expect(pop.locator('.ac-label')).toHaveText(['.to.deep.equal']);
    expect(errors).toEqual([]);
  });

  test('a failure says why and where, in each runner\'s words, and Stop ends a test that never does', async ({ page }) => {
    test.setTimeout(4 * LOAD);
    const { errors } = await openApp(page, { mode: 'javascript' });
    await page.evaluate(() => window.playlive.code.select('cart'));
    await expect(page.locator('#codeFile')).toHaveText('cart.js');
    const code = page.locator('#codeEd textarea'), tests = page.locator('#codeTestsEd textarea');
    const failed = page.locator('#codeResults .test[data-state="failed"]');
    const selected = () => tests.evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd));
    await ready(page);
    await code.fill((await code.inputValue()).replace('100 - this.discount', '100 + this.discount'));
    expect(await run(page)).toMatch(/^1 of 4 tests failed \([\d.]+s\)$/);
    // One circle per test in the head, in the file's order
    await expect(page.locator('#codeDots i')).toHaveCount(4);
    await expect(page.locator('#codeDots i.ok')).toHaveCount(3);
    await expect(page.locator('#codeDots i').nth(2)).toHaveClass('bad');
    await expect(failed.locator('.err')).toHaveText('Expected 44 to be 36.');
    await failed.locator('.code-at').click();
    expect(await selected()).toBe('expect(cart.total()).toBe(36);');
    await page.click('.code-seg [data-codetab="console"]');
    await expect(page.locator('#codeConsole')).toContainText('4 specs, 1 failure');
    await page.click('.code-seg [data-codetab="results"]');

    // Mocha with Chai: the same bug, in Chai's words
    await page.click('.code-fw [data-fw="mocha"]');
    await ready(page, /^JavaScript \(\w+ \d+\) · Mocha \d+\.\d+\.\d+ \+ Chai \d+\.\d+\.\d+ \+ Sinon \d+\.\d+\.\d+$/);
    expect(await run(page)).toMatch(/^1 of 4 tests failed \([\d.]+s\)$/);
    await expect(failed.locator('.err')).toHaveText('AssertionError: expected 44 to equal 36');
    await page.click('.code-seg [data-codetab="console"]');
    await expect(page.locator('#codeConsole')).toContainText('3 passing');
    await page.click('.code-seg [data-codetab="results"]');

    // TypeScript is compiled, and a line in the code is still the line written
    await page.click('.code-lang [data-lang="ts"]');
    await ready(page, /^TypeScript \d+\.\d+\.\d+ · Mocha \d+\.\d+\.\d+ \+ Chai \d+\.\d+\.\d+ \+ Sinon \d+\.\d+\.\d+$/);
    const ts = (await code.inputValue()).replace('let subtotal = 0;', 'let subtotal = 0;\n    throw new Error("broken total");');
    await code.fill(ts);
    await run(page);
    const line = ts.split('\n').findIndex(l => l.includes('broken total')) + 1;
    await expect(page.locator('#codeResults .code-at').first()).toHaveText(`cart.ts, line ${line}`);

    // A test that never ends is stopped, and the runner comes back
    await tests.fill('import { expect } from "chai";\n\ndescribe("Forever", () => {\n  it("loops", () => {\n    while (true) {}\n  });\n});\n');
    await page.click('#codeRun');
    await page.waitForTimeout(500);
    await page.click('#codeStop');
    await expect(page.locator('#codeSummary')).toHaveText('Stopped. 0 of 1 test passed.');
    await tests.fill('import { expect } from "chai";\n\ndescribe("Quick", () => {\n  it("passes", () => {\n    expect(1).to.equal(1);\n  });\n});\n');
    await ready(page, /TypeScript/);
    expect(allPassed(await run(page))).toBe(1);
    expect(errors).toEqual([]);
  });
});
