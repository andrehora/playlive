// Practice: a lesson's code, tests to finish, and the answer once every test
// passes and covers every line. These run Python in Pyodide, from jsDelivr,
// so like python.spec they need network access.
import { test, expect } from '@playwright/test';
import { CODE_LOAD, allPassed, codeReady, codeRun, openApp } from './app.mjs';

test.describe('Practice', () => {
  test('opens the answer once every test passes and covers every line', async ({ page }) => {
    test.setTimeout(2 * CODE_LOAD);
    const { errors } = await openApp(page);
    await page.click('.area-seg [data-area="practice"]');
    await expect(page.locator('.area-seg [data-area="practice"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.playlive.modes.get())).toBe('python-practice');
    expect(new URL(page.url()).hash).toBe('#python-practice');

    // The lesson, under what its example teaches, with pytest alone and no other grader
    await expect(page.locator('#siteName')).toHaveText('Username');
    await expect(page.locator('#siteGoal')).toHaveText('A first example');
    await expect(page.locator('#codeFile')).toHaveText('username.py');
    await expect(page.locator('#codeTestsFile')).toHaveText('test_username.py');
    await expect(page.locator('#newCode')).toBeHidden();
    await expect(page.locator('.code-lang')).toBeHidden();
    await expect(page.locator('.code-fw button')).toHaveCount(1);
    for (const tab of ['coverage', 'mutation', 'smells', 'create'])
      await expect(page.locator(`.code-seg [data-codetab="${tab}"]`)).toBeHidden();
    // Username names no tools, so it has no Repeat either: its tests are not flaky
    await expect(page.locator('.code-tests-panel .repeat-field')).toBeHidden();
    await expect(page.locator('#codeTestsOpen')).toBeHidden();
    await expect(page.locator('.code-seg [data-codetab="lesson"]')).toHaveAttribute('aria-pressed', 'true');
    const lesson = page.locator('#codeLesson'), answerBtn = lesson.locator('.lesson-answer');
    await expect(lesson.locator('.lesson-from a')).toHaveText('Calculator: A first example');
    await expect(answerBtn).toBeDisabled();

    // The tests it starts with pass, but leave lines unrun: still locked
    await codeReady(page, /^Python 3\.\d+\.\d+ · pytest/);
    expect(allPassed(await codeRun(page))).toBe(1);
    await expect(lesson.locator('.lesson-goals li').nth(0)).toHaveAttribute('data-done', 'true');
    await expect(lesson.locator('.lesson-goals li').nth(1)).toHaveAttribute('data-done', 'false');
    await expect(answerBtn).toBeDisabled();
    // Coverage on top of the code is by line alone, the lesson's goal
    await expect(page.locator('#codeLineCov')).toHaveText(/^Line coverage: 38%/);
    await expect(page.locator('.cov-seg')).toBeHidden();
    await expect(page.locator('.code-flowseg')).toBeHidden();

    // The functions the tests import are offered, and write their call
    const tests = page.locator('#codeTestsEd textarea'), pop = page.locator('#codeAc');
    await tests.evaluate(t => { t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
    await page.keyboard.type('    x = sugg');
    await expect(pop.locator('.ac-item').first()).toContainText('suggest');
    await page.keyboard.press('Enter');
    await expect(tests).toHaveValue(/x = suggest\(username, existing\)$/);
    await tests.fill(await tests.evaluate(t => t.value.replace(/\n {4}x = .*$/, '\n')));

    // Tests that run every line open it
    await tests.fill(`${await tests.inputValue()}
def test_removes_spaces():
    assert make_username("Ana", "da Silva") == "adasilva"


def test_refuses_a_missing_name():
    with pytest.raises(ValueError):
        make_username("", "Souza")


def test_suggests_the_next_free_username():
    assert suggest("asouza", ["asouza", "asouza2"]) == "asouza3"
`);
    expect(allPassed(await codeRun(page))).toBe(4);
    await expect(lesson.locator('.lesson-goals li[data-done="true"]')).toHaveCount(2);
    await expect(answerBtn).toBeEnabled();
    // It opens large, in a dialog, as the tests do
    await answerBtn.click();
    const dlg = page.locator('#answer');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('#answerTheirs .code-file')).toHaveText('test_username.py');
    await expect(dlg.locator('#answerTheirs .cmp-code')).toContainText('def test_counts_up_until_a_username_is_free');
    // Compare puts your tests beside it, to read side by side
    await expect(dlg.locator('#answerMine')).toBeHidden();
    await dlg.locator('#answerCompare').click();
    await expect(dlg.locator('#answerCompare')).toHaveAttribute('aria-pressed', 'true');
    await expect(dlg.locator('#answerMine .cmp-code')).toContainText('def test_suggests_the_next_free_username');
    await expect(dlg.locator('#answer .l.diff')).toHaveCount(0);
    await dlg.locator('#answerCompare').click();
    await expect(dlg.locator('#answerMine')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();

    // The example it practises is a link away
    await lesson.locator('.lesson-from a').click();
    await expect.poll(() => page.evaluate(() => window.playlive.modes.get())).toBe('python');
    await expect(page.locator('#siteName')).toHaveText('Calculator');
    // and Unit has every tool back
    await expect(page.locator('.code-tests-panel .repeat-field')).toBeVisible();
    for (const tab of ['coverage', 'mutation', 'smells', 'create'])
      await expect(page.locator(`.code-seg [data-codetab="${tab}"]`)).toBeVisible();
    await expect(page.locator('.code-seg [data-codetab="lesson"]')).toBeHidden();
    expect(errors).toEqual([]);
  });

  // What every lesson shows, and a lesson naming no tools shows nothing beyond
  async function expectPracticeDefault(page){
    for (const tab of ['lesson', 'results', 'console']) await expect(page.locator(`.code-seg [data-codetab="${tab}"]`)).toBeVisible();
    for (const tab of ['coverage', 'mutation', 'smells', 'create']) await expect(page.locator(`.code-seg [data-codetab="${tab}"]`)).toBeHidden();
    for (const el of ['.code-tests-panel .repeat-field', '#codeTestsOpen', '.code-lang', '#newCode']) await expect(page.locator(el)).toBeHidden();
    await expect(page.locator('.code-fw button')).toHaveCount(1);
  }
  // A lesson's goals, by whether each is met: [text, done]
  const goals = page => page.locator('#codeLesson .lesson-goals li').evaluateAll(lis =>
    lis.map(li => [li.querySelector('.lesson-goal').textContent, li.dataset.done === 'true']));
  // The lesson's own answer, written in as your tests, and run
  async function writeAnswer(page, id){
    const answer = await (await page.request.get(`/examples/practice/python/${id}/pytest/answer.py`)).text();
    await page.locator('#codeTestsEd textarea').fill(answer);
    return codeRun(page);
  }

  test('a lesson about parameterized tests waits for one, in words for any framework', async ({ page }) => {
    test.setTimeout(2 * CODE_LOAD);
    const { errors } = await openApp(page, { hash: '#python-practice#anagram' });
    await expect(page.locator('#siteName')).toHaveText('Anagram');
    await expect(page.locator('#codeLesson .lesson-from a')).toHaveText('Palindrome: Parametrized tests');
    // A lesson that names no tools looks as Username does: Practice's own panels and nothing more
    await expectPracticeDefault(page);
    await codeReady(page, /^Python 3\.\d+\.\d+ · pytest/);
    // The tests it starts with pass and run every line, but each is one case
    expect(allPassed(await codeRun(page))).toBe(5);
    expect(await goals(page)).toEqual([['Every test passes', true], ['100% line coverage', true], ['Uses parameterized tests', false]]);
    await expect(page.locator('#codeLesson .lesson-answer')).toBeDisabled();
    expect(allPassed(await writeAnswer(page, 'anagram'))).toBe(5);
    expect((await goals(page)).every(([, done]) => done)).toBe(true);
    await expect(page.locator('#codeLesson .lesson-m').nth(2)).toHaveText('1 test');
    await expect(page.locator('#codeLesson .lesson-answer')).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test('a lesson about true and false waits for a check of each', async ({ page }) => {
    test.setTimeout(2 * CODE_LOAD);
    const { errors } = await openApp(page, { hash: '#python-practice#pin-code' });
    await expect(page.locator('#codeLesson .lesson-from a')).toHaveText('Password check: Checking true or false');
    await expectPracticeDefault(page);
    await codeReady(page, /^Python 3\.\d+\.\d+ · pytest/);
    // It starts with the import alone: no test, so no goal is met
    await expect(page.locator('#codeTestsEd textarea')).toHaveValue('from pin_code import is_valid_pin\n');
    expect(await codeRun(page)).toBe('No tests found');
    expect(await goals(page)).toEqual([['Every test passes', false], ['100% line coverage', false], ['Checks both true and false', false]]);
    expect(allPassed(await writeAnswer(page, 'pin-code'))).toBe(4);
    expect((await goals(page)).every(([, done]) => done)).toBe(true);
    await expect(page.locator('#codeLesson .lesson-m').nth(2)).toHaveText('1 true, 3 false');
    await expect(page.locator('#codeLesson .lesson-answer')).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test('a lesson about exceptions waits for a test that expects one', async ({ page }) => {
    test.setTimeout(2 * CODE_LOAD);
    const { errors } = await openApp(page, { hash: '#python-practice#elevator' });
    await expect(page.locator('#siteName')).toHaveText('Elevator');
    await expect(page.locator('#codeLesson .lesson-from a')).toHaveText('Bank account: Testing exceptions');
    await expectPracticeDefault(page);
    await codeReady(page, /^Python 3\.\d+\.\d+ · pytest/);
    expect(allPassed(await codeRun(page))).toBe(1);
    expect(await goals(page)).toEqual([['Every test passes', true], ['100% line coverage', false], ['Checks for exceptions', false]]);
    await expect(page.locator('#codeLesson .lesson-answer')).toBeDisabled();
    expect(allPassed(await writeAnswer(page, 'elevator'))).toBe(4);
    expect((await goals(page)).every(([, done]) => done)).toBe(true);
    await expect(page.locator('#codeLesson .lesson-m').nth(2)).toHaveText('3 tests');
    await expect(page.locator('#codeLesson .lesson-answer')).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test('a lesson about setup waits for tests that share it', async ({ page }) => {
    test.setTimeout(2 * CODE_LOAD);
    const { errors } = await openApp(page, { hash: '#python-practice#jukebox' });
    await expect(page.locator('#codeLesson .lesson-from a')).toHaveText('Stack: Setup 1');
    await expectPracticeDefault(page);
    await codeReady(page, /^Python 3\.\d+\.\d+ · pytest/);
    // Each test builds its own jukebox: they pass and run every line, but share nothing
    expect(allPassed(await codeRun(page))).toBe(3);
    expect(await goals(page)).toEqual([['Every test passes', true], ['100% line coverage', true], ['Uses shared setup', false]]);
    expect(allPassed(await writeAnswer(page, 'jukebox'))).toBe(3);
    expect((await goals(page)).every(([, done]) => done)).toBe(true);
    await expect(page.locator('#codeLesson .lesson-m').nth(2)).toHaveText('3 tests');
    await expect(page.locator('#codeLesson .lesson-answer')).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test('a lesson about branches shows them, and waits for every one', async ({ page }) => {
    test.setTimeout(2 * CODE_LOAD);
    const { errors } = await openApp(page, { hash: '#python-practice#museum' });
    await expect(page.locator('#siteName')).toHaveText('Museum');
    await codeReady(page, /^Python 3\.\d+\.\d+ · pytest/);
    // Every line runs, but each "if" has a way no test takes
    expect(allPassed(await codeRun(page))).toBe(1);
    expect(await goals(page)).toEqual([['Every test passes', true], ['100% line coverage', true], ['100% branch coverage', false]]);
    await expect(page.locator('#codeLesson .lesson-m').nth(2)).toHaveText('50% (2 of 4 branches)');
    // The tool it names: branch coverage, and the flow, on top of the code
    await expect(page.locator('#codeBranch')).toBeVisible();
    await expect(page.locator('.code-flowseg')).toBeVisible();
    await expect(page.locator('#codeLineCov')).toBeHidden();
    // and the code shaded by branch, where the lesson is
    await expect(page.locator('#codeBranch')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#codeEd .hl .l.cov-part').first()).toBeAttached();
    await expect(page.locator('#codeLesson .lesson-answer')).toBeDisabled();
    expect(allPassed(await writeAnswer(page, 'museum'))).toBe(4);
    expect((await goals(page)).every(([, done]) => done)).toBe(true);
    await expect(page.locator('#codeLesson .lesson-answer')).toBeEnabled();
    expect(errors).toEqual([]);
  });
});
