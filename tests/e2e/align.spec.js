// Python and JS/TS teach the same examples, so each example's tests should
// say the same things in both: the same branches taken, the same mutations
// caught, escaped and never run, and the same smells. Lines are not compared,
// since the two languages spend them differently, and a flaky example is left
// out. These download Python and the frameworks, so like the other code-mode
// specs they need network access.
import { test, expect } from '@playwright/test';
import { CODE_LOAD, codeReady, codeRun, openApp, steadyCodeIds } from './app.mjs';

// What one example's tests say in the code mode on screen
async function measure(page, id){
  await page.evaluate(id => window.playlive.code.select(id), id);
  await expect.poll(() => page.evaluate(() => window.playlive.code.state().example)).toBe(id);
  await codeReady(page, / · /);
  await page.click('.code-seg [data-codetab="results"]');
  await codeRun(page);
  const branch = (await page.locator('#codeBranch').textContent()).replace(/\s+/g, ' ').replace('Branch: ', '');
  await page.click('.code-seg [data-codetab="smells"]');
  await expect(page.locator('.smell-score')).toHaveText(/tests?$/);
  const smells = await page.locator('#codeSmells .smell-group').evaluateAll(gs => gs.map(g => g.dataset.smell));
  await page.click('.code-seg [data-codetab="mutation"]');
  const run = page.locator('.mut-run');
  await expect(page.locator('.mut-score')).toHaveText(/ mutations$/, { timeout: CODE_LOAD });
  await run.click();
  await expect(run).toHaveText('Run again', { timeout: CODE_LOAD });
  const mutations = Object.fromEntries(await page.locator('#codeMutation .bug-group')
    .evaluateAll(gs => gs.map(g => [g.dataset.state, g.querySelectorAll('.mut-row').length])));
  return { branch, mutations, smells };
}

test('every example says the same in Python and in JS/TS', async ({ page }) => {
  test.setTimeout(6 * CODE_LOAD);
  const { errors } = await openApp(page, { hash: '#python' });
  await page.locator('#codeCovShow').check();
  const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
  const python = {};
  for (const id of await steadyCodeIds(ids)) python[id] = await measure(page, id);

  await page.click('.code-lang [data-lang="js"]');
  await expect(page.locator('#codeFile')).toHaveText(/\.js$/);
  await page.locator('#codeCovShow').check();
  const differ = [];
  for (const id of await steadyCodeIds(ids)){
    const js = await measure(page, id);
    if (JSON.stringify(js) !== JSON.stringify(python[id])) differ.push(`${id}: Python ${JSON.stringify(python[id])}, JS ${JSON.stringify(js)}`);
  }
  expect(differ).toEqual([]);
  expect(errors).toEqual([]);
});
