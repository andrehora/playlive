// JS/TS mode: Jasmine, or Mocha with Chai, on JavaScript and TypeScript
// modules, run in the browser. The frameworks and the TypeScript compiler come
// from cdnjs, so like js-yaml these need network access.
import { test, expect } from '@playwright/test';
import { LAB_LOAD as LOAD, allPassed, labReady, labRun as run, openApp, setMode } from './app.mjs';

const overflow = page => page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
// Language first, then framework: "JavaScript (Chrome 141) · Jasmine 7.0.2"
const ready = (page, label = /^(JavaScript \(.+\)|TypeScript [\d.]+) · (Jasmine|Mocha) \d/) => labReady(page, label);

test.describe('JS/TS mode', () => {
  test('has the code panels, its own examples, and Jasmine on JavaScript first', async ({ page }) => {
    const { errors } = await openApp(page);
    await setMode(page, 'javascript');
    for (const p of ['.labtests-panel', '.console-panel', '.lab-code-panel']) await expect(page.locator(p)).toBeVisible();
    await expect(page.locator('.browser')).toBeHidden();
    expect(await overflow(page)).toBeLessThanOrEqual(0);

    await expect(page.locator('#siteName')).toHaveText('Calculator');
    await expect(page.locator('#siteCount')).toHaveText('1 of 11');
    await expect(page.locator('#labCodeTitle')).toHaveText('JavaScript code');
    await expect(page.locator('#labCodeFile')).toHaveText('calculator.js');
    await expect(page.locator('#labTestsFile')).toHaveText('calculator.spec.js');
    await expect(page.locator('.lab-fw [data-fw="jasmine"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.lab-lang [data-lang="js"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#labCount')).toHaveText('5 tests');
    await expect(page.locator('#labResults .lab-name').first()).toHaveText('adds');
    expect(new URL(page.url()).hash).toBe('#javascript');

    // The other framework and language, and the files they name
    await page.click('.lab-fw [data-fw="mocha"]');
    await expect(page.locator('#labTestsFile')).toHaveText('calculator.test.js');
    await expect(page.locator('#labTestsEd textarea')).toHaveValue(/require\("chai"\)/);
    await page.click('.lab-lang [data-lang="ts"]');
    await expect(page.locator('#labCodeTitle')).toHaveText('TypeScript code');
    await expect(page.locator('#labCodeFile')).toHaveText('calculator.ts');
    await expect(page.locator('#labTestsEd textarea')).toHaveValue(/import \{ expect \} from "chai"/);

    // Python keeps its own framework, and coming back finds this one as it was
    await setMode(page, 'python');
    await expect(page.locator('#labCodeFile')).toHaveText('calculator.py');
    await expect(page.locator('.lab-lang')).toBeHidden();
    await setMode(page, 'javascript');
    await expect(page.locator('#labCodeFile')).toHaveText('calculator.ts');

    // Changing language keeps the example
    await page.evaluate(() => window.playlive.lab.select('stack'));
    await setMode(page, 'python');
    await expect(page.locator('#labCodeFile')).toHaveText('stack.py');
    await setMode(page, 'javascript');
    await expect(page.locator('#labCodeFile')).toHaveText('stack.ts');
    expect(errors).toEqual([]);
  });

  test('every run measures which lines and branches of the code ran, in JavaScript and through TypeScript', async ({ page }) => {
    test.setTimeout(3 * LOAD);
    const { errors } = await openApp(page, { mode: 'javascript' });
    await page.evaluate(() => window.playlive.lab.select('bank-account'));
    await expect(page.locator('#labCodeFile')).toHaveText('bank-account.js');
    await ready(page);
    const score = page.locator('#labCodeCov');
    const missed = () => page.locator('#labCodeEd .hl .l.cov-miss').evaluateAll(ls => ls.map(l => l.textContent.trim()));
    await page.locator('#labCovShow').check();

    await run(page);
    await expect(score).toHaveText(/^Line: 80%\s*\(8 of 10 lines\)$/);
    expect(await missed()).toEqual(['throw new Error("Deposit must be positive");', 'this.balance -= amount;']);
    await expect(page.locator('#labCodeEd .hl .l.cov-hit')).toHaveCount(8);
    // Each if goes only one way: a deposit is never refused, a withdrawal always is
    await expect(page.locator('#labCodeBranch')).toHaveText(/^Branch: 50%\s*\(2 of 4 branches\)$/);
    await page.click('.cov-seg [data-covby="branches"]');
    await expect(page.locator('#labCodeEd .hl .l.cov-part')).toHaveCount(2);
    // and each method with a branch has a flow, a box taking you to its line
    await page.click('.lab-codeview [data-codeview="flow"]');
    await expect(page.locator('#labFlow .flow-fn h3')).toHaveText(['Account.deposit', 'Account.withdraw']);
    await expect(page.locator('#labFlow .fnode.dec.part')).toHaveCount(2);
    await page.locator('#labFlow .fnode.dec').first().click();
    await expect(page.locator('#labCodeEd')).toBeVisible();
    const code = page.locator('#labCodeEd textarea');
    expect(await code.evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd))).toBe('if (amount <= 0) {');
    await page.click('.cov-seg [data-covby="lines"]');

    // TypeScript runs compiled, and the lines are mapped back to what was written
    await page.click('.lab-lang [data-lang="ts"]');
    await expect(page.locator('#labCodeFile')).toHaveText('bank-account.ts');
    await expect(score).toBeHidden();
    await ready(page, /^TypeScript/);
    await run(page);
    await expect(score).toHaveText(/^Line: 77%\s*\(7 of 9 lines\)$/);
    expect(await missed()).toEqual(['throw new Error("Deposit must be positive");', 'this.balance -= amount;']);
    await expect(page.locator('#labCodeBranch')).toHaveText(/^Branch: 50%\s*\(2 of 4 branches\)$/);

    // Mocha measures the same lines as Jasmine
    await page.click('.lab-fw [data-fw="mocha"]');
    await ready(page, /Mocha/);
    await run(page);
    await expect(score).toHaveText(/^Line: 77%\s*\(7 of 9 lines\)$/);
    expect(errors).toEqual([]);
  });

  test('every example passes as it ships, in both frameworks and both languages', async ({ page }) => {
    test.setTimeout(4 * LOAD);
    const { errors } = await openApp(page, { mode: 'javascript' });
    const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
    expect(ids).toHaveLength(11);
    const failures = [];
    for (const fw of ['jasmine', 'mocha']) for (const lang of ['js', 'ts']){
      await page.evaluate(([fw, lang]) => { window.playlive.lab.framework(fw); window.playlive.lab.lang(lang); }, [fw, lang]);
      await ready(page, lang === 'ts' ? /^TypeScript \d/ : /^JavaScript /);
      for (const id of ids){
        await page.evaluate(id => window.playlive.lab.select(id), id);
        await expect(page.locator('#labCodeFile')).toHaveText(`${id}.${lang}`);
        const said = await run(page);
        // FizzBuzz writes one test that runs once per case, so a run may count more
        const n = Number((await page.locator('#labCount').textContent()).split(' ')[0]);
        if (!(allPassed(said) >= n))
          failures.push(`${fw} ${lang} ${id}: ${said} ${await page.locator('#labResults .lab-detail').first().textContent().catch(() => '')}`);
      }
    }
    expect(failures).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the Mutation tab changes the code in small ways and says which changes the tests caught', async ({ page }) => {
    const { errors } = await openApp(page, { hash: '#javascript#bank-account' });
    await ready(page);
    const panel = page.locator('#labMutation'), runBtn = panel.locator('.mut-run'), score = panel.locator('.mut-score');
    const group = state => panel.locator(`.bug-group[data-state="${state}"]`);
    await page.click('.lab-seg [data-labview="mutation"]');
    await expect(score).toHaveText('6 mutations');
    await expect(group('unchecked').locator('.mut-row')).toHaveCount(6);

    // Inject puts one into the code, and Repair takes it out
    const codeTa = page.locator('#labCodeEd textarea');
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
    const tests = page.locator('#labTestsEd textarea');
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
    await page.click('.lab-seg [data-labview="mutation"]');
    const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
    const runBtn = page.locator('.mut-run'), problems = [];
    for (const lang of ['js', 'ts']) for (const fw of ['jasmine', 'mocha']){
      await page.evaluate(([fw, lang]) => { window.playlive.lab.framework(fw); window.playlive.lab.lang(lang); }, [fw, lang]);
      for (const id of ids){
        await page.evaluate(id => window.playlive.lab.select(id), id);
        await expect(page.locator('#labCodeFile')).toHaveText(`${id}.${lang}`);
        await expect(page.locator('.mut-score')).toHaveText(/ mutations$/, { timeout: LOAD });
        await runBtn.click();
        await expect(runBtn).toHaveText('Run again', { timeout: LOAD });
        const said = await page.locator('.mut-score').textContent();
        if (!/^\d+ of \d+ mutations caught/.test(said)) problems.push(`${lang} ${fw} ${id}: ${await page.locator('#labMutation').innerText()}`);
      }
    }
    expect(problems).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the Smells tab finds the four smells in Jasmine and Mocha tests, as they are typed', async ({ page }) => {
    const { errors } = await openApp(page, { hash: '#javascript#bank-account' });
    const panel = page.locator('#labSmells'), score = panel.locator('.smell-score');
    const group = id => panel.locator(`.smell-group[data-smell="${id}"]`);
    const tests = page.locator('#labTestsEd textarea');
    const edit = (from, to) => tests.evaluate((t, [a, b]) => { t.value = t.value.replace(a, b); t.dispatchEvent(new Event('input')); }, [from, to]);
    await page.click('.lab-seg [data-labview="smells"]');
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

    // All smells: Bank account and Cart repeat their setup, on purpose, in Mocha and TypeScript too
    await page.evaluate(() => { window.playlive.lab.framework('mocha'); window.playlive.lab.lang('ts'); });
    await expect(page.locator('#labTestsFile')).toHaveText('bank-account.test.ts');
    await panel.locator('[data-labsmells="all"]').click();
    await expect(score).toHaveText('2 of 11 examples have one');
    await expect(group('duplication-of-setup').locator('.smell-what')).toHaveText(['Cart', 'Bank account']);
    await expect(panel.locator('.smell-group')).toHaveCount(4);
    expect(errors).toEqual([]);
  });

  test('Create starts from the titles, and Check says what a test misses', async ({ page }) => {
    const { errors } = await openApp(page, { hash: '#javascript-create' });
    await expect(page.locator('.lab-seg [data-labview="create"]')).toHaveAttribute('aria-pressed', 'true');
    const tests = page.locator('#labTestsEd textarea');
    await expect(tests).toHaveValue('const { add, subtract, multiply, divide } = require("./calculator");\n\n// adds\n\n// subtracts\n\n// multiplies\n\n// divides\n\n// refuses to divide by zero\n');
    const group = state => page.locator(`#labCreate .create-group[data-state="${state}"] .create-what`);
    await expect(group('todo')).toHaveCount(5);

    // The describe is yours to name; a weak check is told what it misses
    await tests.fill(`const { add, divide } = require("./calculator");

describe("Mine", () => {
  it("adds", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("divides", () => {
    expect(divide(10, 2)).toBeTruthy();
  });
});
`);
    await expect(group('nocheck')).toHaveText(['adds', 'divides']);
    await ready(page);
    await page.click('.brief-run');
    await expect(page.locator('.brief-run')).toHaveText('Check', { timeout: LOAD });
    await expect(group('done')).toHaveText(['adds']);
    await expect(page.locator('#labCreate .create-group[data-state="nocheck"] .create-m')).toHaveText(/^misses 1 of \d+: line 17, \/ → \*$/);
    await expect(page.locator('.brief-score')).toHaveText('1 of 5 done');

    expect(errors).toEqual([]);
  });

  test('the example\'s own tests are all done in Create, in both frameworks and both languages', async ({ page }) => {
    test.setTimeout(4 * LOAD);
    const { errors } = await openApp(page, { hash: '#javascript-create' });
    const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
    const tests = page.locator('#labTestsEd textarea'), problems = [];
    for (const lang of ['js', 'ts']) for (const fw of ['jasmine', 'mocha']){
      await page.evaluate(([fw, lang]) => { window.playlive.lab.framework(fw); window.playlive.lab.lang(lang); }, [fw, lang]);
      for (const id of ids){
        await page.evaluate(id => window.playlive.lab.select(id), id);
        const file = `${id}.${fw === 'mocha' ? 'test' : 'spec'}.${lang}`;
        await expect(page.locator('#labTestsFile')).toHaveText(file);
        await expect(page.locator('.brief-score')).toHaveText(/ done$/);
        await tests.fill(await page.evaluate(u => fetch(u).then(r => r.text()), `examples/javascript/${id}/${fw}/${file}`));
        await page.click('.brief-run');
        await expect(page.locator('.brief-run')).toHaveText('Check', { timeout: LOAD });
        const said = await page.locator('.brief-score').textContent();
        if (!/^All \d+ tests? written$/.test(said)) problems.push(`${lang} ${fw} ${id}: ${await page.locator('#labCreate').innerText()}`);
      }
    }
    expect(problems).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('autocomplete writes a test, and offers the framework\'s own checks', async ({ page }) => {
    test.setTimeout(2 * LOAD);
    const { errors } = await openApp(page, { mode: 'javascript' });
    const tests = page.locator('#labTestsEd textarea'), pop = page.locator('#labAc');
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
    expect(allPassed(await run(page))).toBe(6);
    // Mocha offers Chai's chains instead
    await page.click('.lab-fw [data-fw="mocha"]');
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
    await page.evaluate(() => window.playlive.lab.select('cart'));
    await expect(page.locator('#labCodeFile')).toHaveText('cart.js');
    const code = page.locator('#labCodeEd textarea'), tests = page.locator('#labTestsEd textarea');
    const failed = page.locator('#labResults .test[data-state="failed"]');
    const selected = () => tests.evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd));
    await ready(page);
    await code.fill((await code.inputValue()).replace('100 - this.discount', '100 + this.discount'));
    expect(await run(page)).toMatch(/^1 of 4 tests failed \([\d.]+s\)$/);
    // One circle per test in the head, in the file's order
    await expect(page.locator('#labDots i')).toHaveCount(4);
    await expect(page.locator('#labDots i.ok')).toHaveCount(3);
    await expect(page.locator('#labDots i').nth(2)).toHaveClass('bad');
    await expect(failed.locator('.err')).toHaveText('Expected 44 to be 36.');
    await failed.locator('.lab-at').click();
    expect(await selected()).toBe('expect(cart.total()).toBe(36);');
    await page.click('.lab-seg [data-labview="console"]');
    await expect(page.locator('#labConsole')).toContainText('4 specs, 1 failure');
    await page.click('.lab-seg [data-labview="results"]');

    // Mocha with Chai: the same bug, in Chai's words
    await page.click('.lab-fw [data-fw="mocha"]');
    await ready(page, /^JavaScript \(\w+ \d+\) · Mocha \d+\.\d+\.\d+ \+ Chai \d+\.\d+\.\d+ \+ Sinon \d+\.\d+\.\d+$/);
    expect(await run(page)).toMatch(/^1 of 4 tests failed \([\d.]+s\)$/);
    await expect(failed.locator('.err')).toHaveText('AssertionError: expected 44 to equal 36');
    await page.click('.lab-seg [data-labview="console"]');
    await expect(page.locator('#labConsole')).toContainText('3 passing');
    await page.click('.lab-seg [data-labview="results"]');

    // TypeScript is compiled, and a line in the code is still the line written
    await page.click('.lab-lang [data-lang="ts"]');
    await ready(page, /^TypeScript \d+\.\d+\.\d+ · Mocha \d+\.\d+\.\d+ \+ Chai \d+\.\d+\.\d+ \+ Sinon \d+\.\d+\.\d+$/);
    const ts = (await code.inputValue()).replace('let subtotal = 0;', 'let subtotal = 0;\n    throw new Error("broken total");');
    await code.fill(ts);
    await run(page);
    const line = ts.split('\n').findIndex(l => l.includes('broken total')) + 1;
    await expect(page.locator('#labResults .lab-at').first()).toHaveText(`cart.ts, line ${line}`);

    // A test that never ends is stopped, and the runner comes back
    await tests.fill('import { expect } from "chai";\n\ndescribe("Forever", () => {\n  it("loops", () => {\n    while (true) {}\n  });\n});\n');
    await page.click('#labRun');
    await page.waitForTimeout(500);
    await page.click('#labStop');
    await expect(page.locator('#labSummary')).toHaveText('Stopped. 0 of 1 test passed.');
    await tests.fill('import { expect } from "chai";\n\ndescribe("Quick", () => {\n  it("passes", () => {\n    expect(1).to.equal(1);\n  });\n});\n');
    await ready(page, /TypeScript/);
    expect(allPassed(await run(page))).toBe(1);
    expect(errors).toEqual([]);
  });
});
