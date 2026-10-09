// Python mode: unittest and pytest on Python modules, run in the browser by
// Pyodide. These download Python from jsDelivr, so like js-yaml they need
// network access.
import { test, expect } from '@playwright/test';
import { CODE_LOAD as PYTHON, allPassed, codeReady, codeRun, openApp, setMode, steadyCodeIds } from './app.mjs';

const overflow = page => page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
// Language first, then framework: "Python 3.14.2 · unittest"
const ready = page => codeReady(page, /^Python 3\.\d+\.\d+ · (unittest|pytest)/);
const choose = async (page, name) => {
  await page.click('#siteBtn');
  await page.locator('#tabs .tab').filter({ has: page.locator('.tname', { hasText: new RegExp(`^${name}$`) }) }).click();
  await expect(page.locator('#siteName')).toHaveText(name);
};

test.describe('Python mode', () => {
  test('has its own panels, its own examples, and pytest first', async ({ page }) => {
    const { errors } = await openApp(page);
    await setMode(page, 'python');
    // Choosing the mode is what starts the download, and Results says so
    await expect(page.locator('#codeResults .code-note')).toContainText('Downloading Python');
    for (const p of ['.code-tests-panel', '.console-panel', '.code-module-panel']) await expect(page.locator(p)).toBeVisible();
    for (const p of ['.tests-panel', '.results-panel', '.browser']) await expect(page.locator(p)).toBeHidden();
    expect(await overflow(page)).toBeLessThanOrEqual(0);

    // The picker lists the Python examples, Calculator first
    await expect(page.locator('#siteName')).toHaveText('Calculator');
    await expect(page.locator('#siteCount')).toHaveText('1 of 63');
    await expect(page.locator('#codeFile')).toHaveText('calculator.py');
    await expect(page.locator('#codeTestsFile')).toHaveText('test_calculator.py');
    await expect(page.locator('.code-fw [data-fw="pytest"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.code-fw button').first()).toHaveAttribute('data-fw', 'pytest');
    await expect(page.locator('#codeTestsEd textarea')).toHaveValue(/^def test_adds_two_numbers\(\)/m);
    await expect(page.locator('#codeCount')).toHaveText('12 tests');
    await expect(page.locator('#codeResults .code-name').first()).toHaveText('test_calculator');
    expect(new URL(page.url()).hash).toBe('#python');
    // What the example teaches sits beside its name in the picker's button
    await expect(page.locator('#siteGoal')).toHaveText('A first example');

    // Another example, and the link follows
    await choose(page, 'Stack');
    await expect(page.locator('#codeFile')).toHaveText('stack.py');
    expect(new URL(page.url()).hash).toBe('#python#stack');
    await page.click('#nextSite');
    await expect(page.locator('#siteName')).toHaveText('Notes file');

    // The same tests in unittest, and edits survive the switch back
    const tests = page.locator('#codeTestsEd textarea');
    await expect(tests).toHaveValue(/def test_saved_notes_load_back\(tmp_path\)/);
    await tests.fill((await tests.inputValue()) + '\n# mine\n');
    await page.click('.code-fw [data-fw="unittest"]');
    await expect(tests).toHaveValue(/class NotesFileTest/);
    await page.click('.code-fw [data-fw="pytest"]');
    await expect(tests).toHaveValue(/# mine/);

    // Leaving the mode brings the sites back to the picker
    await setMode(page, 'explore');
    await expect(page.locator('.browser')).toBeVisible();
    await expect(page.locator('#siteCount')).toHaveText(/ of 100$/);
    expect(errors).toEqual([]);
  });

  test('the tests resize, and Results and Console collapse to their head', async ({ page }) => {
    const { errors } = await openApp(page, { mode: 'python' });
    const h = sel => page.locator(sel).boundingBox().then(b => Math.round(b.height));
    const was = await h('#codeTestsEd');
    const handle = await page.locator('#codeResizer').boundingBox();
    const y = handle.y + handle.height / 2;
    // Dragged down, the code grows by as much, and the page still does not scroll
    await page.mouse.move(handle.x + handle.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2, y + 60, { steps: 4 });
    await page.mouse.up();
    expect(Math.abs(await h('#codeTestsEd') - (was + 60))).toBeLessThanOrEqual(2);
    // and however far it is dragged, Results keeps its floor
    await page.mouse.move(handle.x + handle.width / 2, y + 60);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2, y + 2000, { steps: 4 });
    await page.mouse.up();
    expect(await overflow(page)).toBeLessThanOrEqual(1);
    expect(await h('.console-panel')).toBeGreaterThanOrEqual(129);
    // Double-click puts it back
    await page.locator('#codeResizer').dblclick();
    expect(Math.abs(await h('#codeTestsEd') - was)).toBeLessThanOrEqual(2);

    // Collapsed, the panel is its head, the code takes the room, nothing scrolls
    await page.click('#foldCode');
    await expect(page.locator('#foldCode')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#codeResults')).toBeHidden();
    await expect(page.locator('#codeSummary')).toBeAttached();
    expect(await h('#codeTestsEd')).toBeGreaterThan(was + 100);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
    await page.click('#foldCode');
    await expect(page.locator('#codeResults')).toBeVisible();
    expect(Math.abs(await h('#codeTestsEd') - was)).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });

  test('each panel\'s Reset puts its own file back as it ships, and undo takes it back', async ({ page }) => {
    const { errors } = await openApp(page, { mode: 'python' });
    const tests = page.locator('#codeTestsEd textarea'), code = page.locator('#codeEd textarea');
    await expect(tests).toHaveValue(/^def test_adds_two_numbers\(\)/m);
    const shippedTests = await tests.inputValue(), shippedCode = await code.inputValue();
    await tests.fill('# mine\n');
    await code.fill('# mine too\n');

    await page.click('#codeTestsReset');
    await expect(tests).toHaveValue(shippedTests);
    await expect(code).toHaveValue('# mine too\n');
    await tests.focus();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(tests).toHaveValue('# mine\n');
    await page.click('#codeReset');
    await expect(code).toHaveValue(shippedCode);

    // In Create, the tests go back to the names
    await page.click('.mode-seg [data-mode="create"]');
    await expect(tests).toHaveValue(/^# test_adds_two_numbers$/m);
    const skeleton = await tests.inputValue();
    await tests.fill('# mine\n');
    await page.click('#codeTestsReset');
    await expect(tests).toHaveValue(skeleton);
    expect(errors).toEqual([]);
  });

  test('runs the selected framework, says where a test failed, and can be stopped', async ({ page }) => {
    test.setTimeout(4 * PYTHON);
    const { errors } = await openApp(page, { mode: 'python' });
    await choose(page, 'Cart');
    await page.click('.code-fw [data-fw="unittest"]');
    await ready(page);
    const summary = page.locator('#codeSummary'), rows = page.locator('#codeResults .test');

    await page.click('#codeRun');
    await expect(summary).toHaveText(/^All 4 tests passed in [\d.]+s$/, { timeout: PYTHON });
    await expect(summary).toHaveClass('ok');
    await expect(rows.and(page.locator('[data-state="passed"]'))).toHaveCount(4);
    // unittest's own runner, not pytest's
    await page.click('.code-seg [data-codetab="console"]');
    await expect(page.locator('#codeConsole')).toContainText('Ran 4 tests');
    await page.click('.code-seg [data-codetab="results"]');

    // A bug in the code: the coupon test fails, and its row takes you to the line
    const code = page.locator('#codeEd textarea');
    await code.fill((await code.inputValue()).replace('100 - self.discount', '100 + self.discount'));
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(summary).toHaveText(/^1 of 4 tests failed \([\d.]+s\)$/, { timeout: PYTHON });
    const failed = rows.and(page.locator('[data-state="failed"]'));
    await expect(failed.locator('.err')).toContainText('AssertionError: 44.0 != 36');
    await expect(page.locator('#codeTestsEd .hl .l.bad')).toHaveCount(1);
    await failed.locator('.code-at').click();
    const at = await page.locator('#codeTestsEd textarea').evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd));
    expect(at).toBe('self.assertEqual(cart.total(), 36)');

    await expect(page.locator('#codeState')).toHaveText(/^Python 3\.\d+\.\d+ · unittest$/);
    // pytest says the same thing in its own words, and the label names its version
    await page.click('.code-fw [data-fw="pytest"]');
    await expect(page.locator('#codeState')).toHaveText(/^Python 3\.\d+\.\d+ · pytest \d+\.\d+\.\d+$/);
    await page.click('#codeRun');
    await expect(summary).toHaveText(/^1 of 4 tests failed \([\d.]+s\)$/, { timeout: PYTHON });
    await expect(failed.locator('.err')).toContainText('assert 44.0 == 36');
    await page.click('.code-seg [data-codetab="console"]');
    await expect(page.locator('#codeConsole')).toContainText('test session starts');
    await page.click('.code-seg [data-codetab="results"]');

    await expect(page.locator('#codeDots i')).toHaveCount(4);
    await expect(page.locator('#codeDots i.bad')).toHaveCount(1);
    // One test runs on its own, and the others keep what they had; the head
    // counts that run, so it has one circle
    await rows.first().locator('.run-one').click();
    await expect(summary).toHaveText(/^The test passed in [\d.]+s$/, { timeout: PYTHON });
    await expect(page.locator('#codeDots i')).toHaveCount(1);
    await expect(page.locator('#codeDots i.ok')).toHaveCount(1);
    await expect(failed).toHaveCount(1);

    // A test that never ends is stopped, and Python comes back for the next run
    const tests = page.locator('#codeTestsEd textarea');
    await tests.fill('def test_forever():\n    while True:\n        pass\n');
    await expect(page.locator('#codeCount')).toHaveText('1 test');
    await page.click('#codeRun');
    await expect(page.locator('#codeStop')).toBeEnabled();
    await page.waitForTimeout(500);
    await page.click('#codeStop');
    await expect(summary).toHaveText('Stopped. 0 of 1 test passed.');
    await tests.fill('def test_quick():\n    assert True\n');
    await page.click('#codeRun');
    await expect(summary).toHaveText(/^The test passed in [\d.]+s$/, { timeout: PYTHON });
    expect(errors).toEqual([]);
  });

  test('Repeat runs the tests several times, and a test that went both ways says so', async ({ page }) => {
    test.setTimeout(2 * PYTHON);
    const { errors } = await openApp(page, { mode: 'python' });
    await ready(page);
    // Python's files outlive a run, so this test passes and fails by turns
    await page.locator('#codeTestsEd textarea').fill([
      'import os', '', 'def test_steady():', '    assert True', '',
      'def test_flips():', "    there = os.path.exists('/tmp/flip')",
      "    if there: os.remove('/tmp/flip')", "    else: open('/tmp/flip', 'w').close()", '    assert not there', ''
    ].join('\n'));
    await page.selectOption('#codeRepeat', '5');
    expect(await codeRun(page)).toMatch(/^8 of 10 runs passed over 5 repetitions \([\d.]+s\)$/);
    await expect(page.locator('#codeSummary')).toHaveClass('bad');
    const rows = page.locator('#codeResults .test');
    await expect(rows.nth(0).locator('.hist i.h-pass')).toHaveCount(5);
    await expect(rows.nth(0).locator('.flaky')).toBeHidden();
    await expect(rows.nth(1).locator('.hist i')).toHaveCount(5);
    await expect(rows.nth(1).locator('.hist i.h-fail')).toHaveCount(2);
    await expect(rows.nth(1).locator('.flaky')).toBeVisible();
    await page.click('.code-seg [data-codetab="console"]');
    await expect(page.locator('#codeConsole')).toContainText('Repetition 5 of 5');

    // Once, the head says it the usual way and the bars go
    await page.selectOption('#codeRepeat', '1');
    expect(await codeRun(page)).toMatch(/^1 of 2 tests failed/);
    await expect(page.locator('#codeResults .hist i')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('every run measures which lines of the code ran, and a check shades them in the code', async ({ page }) => {
    test.setTimeout(3 * PYTHON);
    const { errors } = await openApp(page, { mode: 'python' });
    await choose(page, 'Bank account');
    await page.click('.code-fw [data-fw="unittest"]');
    await ready(page);
    const show = page.locator('#codeCovShow'), score = page.locator('#codeCov'), branch = page.locator('#codeBranch');
    const note = page.locator('#codeCovNote');
    const lines = cls => page.locator(`#codeEd .hl .l.${cls}`);
    const texts = cls => lines(cls).evaluateAll(ls => ls.map(l => l.textContent.trim()));
    const code = page.locator('#codeEd textarea');
    await expect(page.locator('#codeConsole')).toHaveText('Press Run to run the tests.');
    // The Results head has the check alone, never a number
    await expect(page.locator('.cov-toggle')).toHaveText('Coverage');

    // Measured on every run, and the code stays plain until the check is on
    await codeRun(page);
    await expect(score).toBeHidden();
    await expect(lines('cov-hit')).toHaveCount(0);
    await show.check();
    await expect(score).toHaveText(/^Line: 84%\s*\(11 of 13 lines\)$/);
    await expect(score).toHaveAttribute('data-band', 'warn');
    await expect(branch).toHaveText(/^Branch: 50%\s*\(2 of 4 branches\)$/);
    await expect(branch).toHaveAttribute('data-band', 'bad');
    // By lines: each ran or did not
    await expect(score).toHaveAttribute('aria-pressed', 'true');
    await expect(lines('cov-hit')).toHaveCount(11);
    await expect(lines('cov-part')).toHaveCount(0);
    expect(await texts('cov-miss')).toEqual(['raise ValueError("Deposit must be positive")', 'self.balance -= amount']);
    // By branches: only the lines with one, and each if ran but only ever one way
    await branch.click();
    await expect(branch).toHaveAttribute('aria-pressed', 'true');
    expect(await texts('cov-part')).toEqual(['if amount <= 0:', 'if amount > self.balance:']);
    await expect(lines('cov-hit')).toHaveCount(0);
    await expect(lines('cov-miss')).toHaveCount(0);

    // The flow of each method with a branch, coloured the same way; a box takes you to its line
    const flow = page.locator('#codeFlow');
    await page.click('[data-codeview="flow"]');
    await expect(page.locator('#codeEd')).toBeHidden();
    await expect(flow.locator('.flow-fn h3')).toHaveText(['Account.deposit', 'Account.withdraw']);
    const box = line => flow.locator(`.fnode[data-line="${line}"]`);
    await expect(box(9)).toHaveClass(/\bdec part\b/);
    await expect(box(10)).toHaveClass(/\bmiss\b/);
    await score.click();
    await expect(box(9)).toHaveClass(/\bdec hit\b/);
    await box(10).click();
    await expect(page.locator('#codeEd')).toBeVisible();
    expect(await code.evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd))).toBe('raise ValueError("Deposit must be positive")');
    await page.click('[data-codeview="flow"]');
    await expect(page.locator('.cov-toggle')).toHaveText('Coverage');
    // Unchecked, the code is plain, and the flow goes with the scores
    await show.uncheck();
    await expect(page.locator('#codeEd')).toBeVisible();
    await expect(flow).toBeHidden();
    await expect(page.locator('.code-flowseg')).toBeHidden();
    await expect(lines('cov-miss')).toHaveCount(0);
    await expect(score).toBeHidden();
    await expect(branch).toBeHidden();

    // An edit moves the lines, so the measure waits for the next run, and says so
    await show.check();
    await code.fill((await code.inputValue()) + '\n');
    await expect(note).toHaveText('bank_account.py changed after the run. Run the tests again to measure it.');
    await expect(lines('cov-miss')).toHaveCount(0);
    await expect(score).toBeHidden();

    // One test on its own measures only what it ran
    await page.locator('#codeResults .test').first().locator('.run-one').click();
    await expect(page.locator('#codeSummary')).toHaveText(/^The test passed/, { timeout: PYTHON });
    await expect(lines('cov-miss')).not.toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('the Mutation tab changes the code in small ways and says which changes the tests caught', async ({ page }) => {
    test.setTimeout(3 * PYTHON);
    const { errors } = await openApp(page, { mode: 'python' });
    await choose(page, 'Bank account');
    await page.click('.code-fw [data-fw="unittest"]');
    await ready(page);
    const panel = page.locator('#codeMutation'), runBtn = panel.locator('.mut-run'), score = panel.locator('.mut-score');
    const group = state => panel.locator(`.bug-group[data-state="${state}"]`);
    await page.click('.code-seg [data-codetab="mutation"]');
    await expect(panel).not.toContainText('Run mutations to change the code');
    // Before a run, what a run would try, none of it checked yet
    await expect(score).toHaveText('6 mutations');
    await expect(group('unchecked').locator('.mut-row')).toHaveCount(6);
    await expect(runBtn).toHaveText('Run mutations');
    // and the list follows the code
    const codeTa = page.locator('#codeEd textarea');
    await codeTa.evaluate(t => { t.value = t.value.replace('self.balance += amount', 'self.balance += amount * 1'); t.dispatchEvent(new Event('input')); });
    await expect(score).toHaveText(/^[7-9] mutations$/);
    await codeTa.evaluate(t => { t.value = t.value.replace('self.balance += amount * 1', 'self.balance += amount'); t.dispatchEvent(new Event('input')); });
    await expect(score).toHaveText('6 mutations');

    // Inject puts one into the code, to run by hand, and Repair takes it out
    const plus = group('unchecked').locator('.bug-row', { hasText: '+= → -=' });
    await plus.locator('.mut-inject').click();
    await expect(codeTa).toHaveValue(/self\.balance -= amount\n\n {4}def withdraw/);
    await expect(plus).toContainText('in the code now');
    await expect(page.locator('#codeEd .hl .l.bad')).toHaveCount(1);
    await page.click('#codeRun');
    await expect(page.locator('#codeSummary')).toHaveText(/^1 of 3 tests failed/, { timeout: PYTHON });
    await expect(score).toHaveText('6 mutations');
    await plus.locator('.mut-inject').click();
    await expect(codeTa).toHaveValue(/self\.balance \+= amount\n\n {4}def withdraw/);
    await expect(plus).not.toContainText('in the code now');
    // and ⌘/Ctrl+Z takes one out as well
    await plus.locator('.mut-inject').click();
    await codeTa.focus();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(codeTa).toHaveValue(/self\.balance \+= amount\n\n {4}def withdraw/);
    await expect(plus.locator('.mut-inject')).toHaveText('Inject');

    await runBtn.click();
    await expect(runBtn).toHaveText('Run again', { timeout: PYTHON });
    await expect(score).toHaveText('1 of 6 mutations caught (16%)');
    await expect(score).toHaveAttribute('data-band', 'bad');
    await expect(group('escaped').locator('.mut-row')).toHaveCount(4);
    await expect(group('caught').locator('.mut-what')).toHaveText(['+= → -=']);
    // No test withdraws successfully, so nothing could catch a change there
    await expect(group('unrun').locator('.mut-text')).toHaveText(['self.balance -= amount']);
    // One mutation can be run alone, and the others keep what they said
    const boundary = group('escaped').locator('.bug-row', { hasText: '> → >=' });
    await boundary.locator('.mut-one').click();
    await expect(runBtn).toHaveText('Run again', { timeout: PYTHON });
    await expect(group('escaped').locator('.mut-row')).toHaveCount(4);
    await expect(score).toHaveText('1 of 6 mutations caught (16%)');
    // A row takes you to the line it changed
    await group('escaped').locator('.mut-row', { hasText: '<= → <' }).click();
    const code = page.locator('#codeEd textarea');
    expect(await code.evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd))).toBe('if amount <= 0:');

    // A test for the boundary catches the < mutation, and an edit makes the last run stale
    const tests = page.locator('#codeTestsEd textarea');
    await tests.evaluate(t => {
      t.value = t.value.replace('class AccountTest(unittest.TestCase):\n', 'class AccountTest(unittest.TestCase):\n    def test_zero_is_refused(self):\n        with self.assertRaises(ValueError):\n            Account(100).deposit(0)\n\n');
      t.dispatchEvent(new Event('input'));
    });
    await expect(panel).toContainText('changed after this run');
    await runBtn.click();
    await expect(runBtn).toHaveText('Run again', { timeout: PYTHON });
    await expect(group('caught').locator('.mut-what')).toHaveText(['<= → <', '+= → -=']);

    // A failing test leaves nothing to judge by, so the run refuses
    await tests.evaluate(t => { t.value = t.value.replace('150)', '151)'); t.dispatchEvent(new Event('input')); });
    await runBtn.click();
    await expect(panel).toContainText('The tests must all pass first', { timeout: PYTHON });
    await expect(runBtn).toBeEnabled();

    expect(errors).toEqual([]);
  });

  test('the Smells tab finds the site modes\' four smells in Python tests, as they are typed', async ({ page }) => {
    test.setTimeout(3 * PYTHON);
    const { errors } = await openApp(page, { mode: 'python' });
    await choose(page, 'Bank account');
    await page.click('.code-fw [data-fw="unittest"]');
    await ready(page);
    const panel = page.locator('#codeSmells'), score = panel.locator('.smell-score');
    const group = id => panel.locator(`.smell-group[data-smell="${id}"]`);
    const tests = page.locator('#codeTestsEd textarea');
    const edit = (from, to) => tests.evaluate((t, [a, b]) => { t.value = t.value.replace(a, b); t.dispatchEvent(new Event('input')); }, [from, to]);
    await page.click('.code-seg [data-codetab="smells"]');
    // Every test opens by making the same account
    await expect(score).toHaveText('1 smell in 3 tests');
    await expect(group('duplication-of-setup').locator('.smell-what')).toHaveText(['account = Account(100)']);
    await expect(group('duplication-of-setup').locator('.smell-why')).toContainText('Move those lines to setUp.');

    // A test that checks nothing, and one that checks too much
    await edit('    def test_deposit_adds_to_the_balance(self):\n', [
      '    def test_nothing(self):', '        account = Account(100)', '        account.deposit(1)', '',
      '    def test_everything(self):', '        account = Account(100)',
      ...Array.from({ length: 6 }, (_, i) => `        self.assertEqual(account.balance, ${100 + i * 0})`), '',
      '    def test_deposit_adds_to_the_balance(self):', ''].join('\n'));
    await expect(group('unknown-test').locator('.smell-what')).toHaveText(['test_nothing']);
    await expect(group('assertion-roulette').locator('.smell-m')).toHaveText(['6 checks in one test']);
    await group('unknown-test').locator('.smell-line').click();
    expect(await tests.evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd))).toBe('def test_nothing(self):');

    // setUp making something no test uses
    await edit('class AccountTest(unittest.TestCase):\n', 'class AccountTest(unittest.TestCase):\n    def setUp(self):\n        self.x = 1\n\n');
    await expect(group('general-fixture').locator('.smell-what')).toHaveText(['self.x = 1']);
    await expect(group('general-fixture').locator('.smell-m')).toHaveText(['used by no test']);

    // A file that does not parse has nothing to say
    await edit('def test_nothing(self):', 'def test_nothing(self:');
    await expect(panel).toContainText('Fix the tests first');

    // pytest: a fixture a test replaces at once
    await page.click('.code-fw [data-fw="pytest"]');
    await expect(score).toHaveText('1 smell in 3 tests');
    await edit('def test_deposit_adds_to_the_balance', [
      '@pytest.fixture', 'def account():', '    return Account(100)', '', '', 'def test_given(account):', '    account = Account(5)',
      '    assert account.balance == 5', '', '', 'def test_deposit_adds_to_the_balance'].join('\n'));
    await expect(group('general-fixture').locator('.smell-what')).toHaveText(['def account():']);
    await expect(group('general-fixture').locator('.smell-why')).toHaveText('Give a test only the fixtures it uses.');

    expect(errors).toEqual([]);
  });

  test('the All smells tab lists every smell and the Python examples that have one', async ({ page }) => {
    test.setTimeout(3 * PYTHON);
    const { errors } = await openApp(page, { mode: 'python' });
    await ready(page);
    const panel = page.locator('#codeSmells'), score = panel.locator('.smell-score');
    const group = id => panel.locator(`.smell-group[data-smell="${id}"]`);
    await page.click('.code-seg [data-codetab="smells"]');
    await panel.locator('[data-codesmells="all"]').click();
    await expect(panel.locator('[data-codesmells="all"]')).toHaveAttribute('aria-pressed', 'true');
    // Bank account and Cart repeat their setup, on purpose
    await expect(score).toHaveText(/^\d+ of 63 examples have one$/);
    await expect(group('duplication-of-setup').locator('.smell-what')).toContainText(['Cart', 'Bank account']);
    // Every smell is named, whether or not an example has it
    await expect(panel.locator('.smell-group')).toHaveCount(4);

    // A row opens the example at its line, on This file
    await group('duplication-of-setup').locator('.smell-line', { hasText: 'Bank account' }).click();
    await expect(page.locator('#codeTestsFile')).toHaveText('test_bank_account.py');
    await expect(panel.locator('[data-codesmells="file"]')).toHaveAttribute('aria-pressed', 'true');
    const tests = page.locator('#codeTestsEd textarea');
    expect(await tests.evaluate(t => t.value.slice(t.selectionStart, t.selectionEnd))).toBe('account = Account(100)');

    // pytest has its own list
    await page.click('.code-fw [data-fw="pytest"]');
    await panel.locator('[data-codesmells="all"]').click();
    await expect(group('duplication-of-setup').locator('.smell-why')).toContainText('a fixture');
    await expect(group('duplication-of-setup').locator('.smell-what')).toContainText(['Cart', 'Bank account']);
    expect(errors).toEqual([]);
  });

  test('mutations run on every example, in both frameworks', async ({ page }) => {
    test.setTimeout(4 * PYTHON);
    const { errors } = await openApp(page, { mode: 'python' });
    await ready(page);
    await page.click('.code-seg [data-codetab="mutation"]');
    const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
    const runBtn = page.locator('.mut-run'), problems = [];
    for (const fw of ['unittest', 'pytest']){
      await page.evaluate(fw => window.playlive.code.framework(fw), fw);
      for (const id of await steadyCodeIds(ids)){
        await page.evaluate(id => window.playlive.code.select(id), id);
        await expect(page.locator('#codeFile')).toHaveText(`${id.replace(/-/g, '_')}.py`);
        await runBtn.click();
        await expect(runBtn).toHaveText('Run again', { timeout: PYTHON });
        const said = await page.locator('.mut-score').textContent();
        if (!/^\d+ of \d+ mutations caught/.test(said)) problems.push(`${fw} ${id}: ${await page.locator('#codeMutation').innerText()}`);
      }
    }
    expect(problems).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('every example passes as it ships, in both frameworks', async ({ page }) => {
    test.setTimeout(4 * PYTHON);
    const { errors } = await openApp(page, { mode: 'python' });
    await ready(page);
    const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
    expect(ids).toHaveLength(63);
    const failures = [];
    for (const fw of ['unittest', 'pytest']){
      await page.evaluate(fw => window.playlive.code.framework(fw), fw);
      for (const id of await steadyCodeIds(ids)){
        await page.evaluate(id => window.playlive.code.select(id), id);
        await expect(page.locator('#codeFile')).toHaveText(`${id.replace(/-/g, '_')}.py`);
        const n = Number((await page.locator('#codeCount').textContent()).split(' ')[0]);
        const said = await codeRun(page);
        // a parametrized test runs once per case, so pytest may count more;
        // a skipped test did not run, so it is not counted
        const skipped = await page.locator('#codeResults .test[data-state="skipped"]').count();
        if (!(allPassed(said) >= n - skipped)) failures.push(`${fw} ${id}: ${said}`);
      }
    }
    expect(failures).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('Create starts from the names, sorts them as you write, and Check says what a test misses', async ({ page }) => {
    test.setTimeout(2 * PYTHON);
    const { errors } = await openApp(page, { hash: '#python-create' });
    await expect(page.locator('.mode-seg [data-mode="create"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.area-seg [data-area="python"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.code-seg [data-codetab="create"]')).toHaveAttribute('aria-pressed', 'true');
    const tests = page.locator('#codeTestsEd textarea');
    await page.click('.code-fw [data-fw="unittest"]');
    await expect(tests).toHaveValue(/^import unittest\nfrom calculator import add, subtract, multiply, divide\n\n\n# test_calculator\n/);
    const group = state => page.locator(`#codeCreate .create-group[data-state="${state}"] .create-what`);
    await expect(group('todo')).toHaveText([
      'test_calculator', 'test_add', 'test_subtract', 'test_multiply', 'test_divide', 'test_adds_two_numbers', 'test_adds_negative_numbers', 'test_subtracts_two_numbers', 'test_multiplies_two_numbers', 'test_divides_into_a_decimal', 'test_divides_into_an_integer', 'test_refuses_to_divide_by_zero']);
    await expect(page.locator('.brief-score')).toHaveText('0 of 12 done');

    // Written is DOING until checked; a weak check is told what it misses
    await tests.fill(`import unittest
from calculator import add, divide


class MyTest(unittest.TestCase):
    def test_adds_two_numbers(self):
        self.assertEqual(add(2, 3), 5)

    def test_divides_into_a_decimal(self):
        self.assertTrue(divide(10, 2))
`);
    await expect(group('nocheck')).toHaveText(['test_adds_two_numbers', 'test_divides_into_a_decimal']);
    await expect(page.locator('#codeCreate .create-group[data-state="nocheck"] .create-m').first()).toHaveText('not checked yet');
    await ready(page);
    await page.click('.brief-run');
    await expect(page.locator('.brief-run')).toHaveText('Check', { timeout: PYTHON });
    await expect(group('done')).toHaveText(['test_adds_two_numbers']);
    await expect(group('nocheck')).toHaveText(['test_divides_into_a_decimal']);
    await expect(page.locator('#codeCreate .create-group[data-state="nocheck"] .create-m')).toHaveText(/^misses 1 of \d+: line 16, \/ → \*$/);
    await expect(page.locator('.brief-score')).toHaveText('1 of 12 done');
    expect(new URL(page.url()).hash).toBe('#python-create');

    // An edit to a test makes only that one unchecked
    await tests.fill((await tests.inputValue()).replace('add(2, 3), 5', 'add(2, 2), 4'));
    await expect(group('nocheck')).toHaveText(['test_adds_two_numbers', 'test_divides_into_a_decimal']);

    // Explore keeps the example's tests, and Create gives yours back
    await page.click('.mode-seg [data-mode="explore"]');
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('python');
    await expect(tests).toHaveValue(/class CalculatorTest/);
    await expect(page.locator('.code-seg [data-codetab="create"]')).toBeHidden();
    await page.click('.mode-seg [data-mode="create"]');
    await expect(tests).toHaveValue(/class MyTest/);
    expect(errors).toEqual([]);
  });

  test('the example\'s own tests are all done in Create, in both frameworks', async ({ page }) => {
    test.setTimeout(4 * PYTHON);
    const { errors } = await openApp(page, { hash: '#python-create' });
    await ready(page);
    const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
    const tests = page.locator('#codeTestsEd textarea'), problems = [];
    for (const fw of ['unittest', 'pytest']){
      await page.evaluate(fw => window.playlive.code.framework(fw), fw);
      for (const id of await steadyCodeIds(ids)){
        await page.evaluate(id => window.playlive.code.select(id), id);
        const file = `test_${id.replace(/-/g, '_')}.py`;
        await expect(page.locator('#codeTestsFile')).toHaveText(file);
        await expect(page.locator('.brief-score')).toHaveText(/ done$/);
        await tests.fill(await page.evaluate(u => fetch(u).then(r => r.text()), `examples/python/${id}/${fw}/${file}`));
        await page.click('.brief-run');
        await expect(page.locator('.brief-run')).toHaveText('Check', { timeout: PYTHON });
        const said = await page.locator('.brief-score').textContent();
        if (!/^All \d+ tests? written$/.test(said)) problems.push(`${fw} ${id}: ${await page.locator('#codeCreate').innerText()}`);
      }
    }
    expect(problems).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('autocomplete writes a test, and the checks the framework has', async ({ page }) => {
    test.setTimeout(2 * PYTHON);
    const { errors } = await openApp(page, { mode: 'python' });
    const tests = page.locator('#codeTestsEd textarea'), pop = page.locator('#codeAc');
    await expect(tests).toHaveValue(/import pytest/);
    // At the end of the file, on a line of its own
    await tests.evaluate(t => { t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
    await page.keyboard.press('Enter');
    await page.keyboard.type('te');
    await expect(pop).toBeVisible();
    await expect(pop.locator('.ac-item').first()).toContainText('test');
    await page.keyboard.press('Enter');
    await expect(pop).toBeHidden();
    // The name is selected, so typing replaces it; the body is indented
    await page.keyboard.type('doubles');
    // Tab goes on to the body
    await page.keyboard.press('Tab');
    await page.keyboard.type('asser');
    await expect(pop.locator('.ac-item').first()).toContainText('assert');
    await page.keyboard.press('Enter');
    await page.keyboard.type('multiply(2, 3)');
    expect(await tests.inputValue()).toContain('def test_doubles():\n    assert multiply(2, 3) == expected');
    // unittest offers its own asserts, not pytest's
    await page.click('.code-fw [data-fw="unittest"]');
    await expect(tests).toHaveValue(/import unittest/);
    await tests.evaluate(t => { t.focus(); const at = t.value.indexOf('self.assertEqual(add(2, 3), 5)'); t.setSelectionRange(at, at); });
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('        self.assertIsN');
    await expect(pop.locator('.ac-label')).toHaveText(['self.assertIsNone', 'self.assertIsNotNone']);
    await page.keyboard.press('Escape');
    await expect(pop).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('⌘/Ctrl+/ comments the selected lines, again uncomments them, and ⌘/Ctrl+Z undoes', async ({ page }) => {
    await openApp(page, { mode: 'python' });
    const tests = page.locator('#codeTestsEd textarea');
    await page.click('.code-fw [data-fw="unittest"]');
    await expect(tests).toHaveValue(/import unittest/);
    await tests.evaluate(t => { t.focus(); t.setSelectionRange(0, 0); });
    await page.keyboard.press('ControlOrMeta+/');
    await expect(tests).toHaveValue(/^# import unittest\n/);
    await page.keyboard.press('ControlOrMeta+/');
    await expect(tests).toHaveValue(/^import unittest\n/);
    // Pasting into the tests is allowed, unlike in the YAML editor: nothing cancels it
    const pasteRefused = sel => page.evaluate(sel => {
      const data = new DataTransfer();
      data.setData('text/plain', '# pasted');
      const e = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
      document.querySelector(sel).dispatchEvent(e);
      return e.defaultPrevented;
    }, sel);
    expect(await pasteRefused('#codeTestsEd textarea')).toBe(false);
    // ⌘/Ctrl+Z takes back each, typing too, and ⇧ puts them back
    await page.keyboard.press('ControlOrMeta+z');
    await expect(tests).toHaveValue(/^# import unittest\n/);
    await page.keyboard.press('ControlOrMeta+z');
    await expect(tests).toHaveValue(/^import unittest\n/);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(tests).toHaveValue(/^# import unittest\n/);
    await page.keyboard.press('ControlOrMeta+z');
    const before = await tests.inputValue();
    await tests.evaluate(t => t.setSelectionRange(t.value.length, t.value.length));
    await page.keyboard.press('Enter');
    await page.keyboard.type('x = 1');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ControlOrMeta+z');
    await expect(tests).toHaveValue(before);
    // and the YAML editor, in the other modes
    await setMode(page, 'explore');
    const spec = page.locator('#spec');
    await spec.evaluate(t => { t.focus(); t.setSelectionRange(0, 0); });
    const first = (await spec.inputValue()).split('\n')[0];
    await page.keyboard.press('ControlOrMeta+/');
    expect((await spec.inputValue()).split('\n')[0]).toBe(first.startsWith('#') ? first.replace(/^#\s?/, '') : '# ' + first);
    await page.keyboard.press('ControlOrMeta+z');
    expect((await spec.inputValue()).split('\n')[0]).toBe(first);
  });
});
