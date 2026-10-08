// Python and JS/TS teach the same examples, so each example's tests should
// say the same things in both: the same branches taken, the same mutations
// caught, escaped and never run, and the same smells. Lines are not compared,
// since the two languages spend them differently. These download Python and
// the frameworks, so like the other code-mode specs they need network access.
import { test, expect } from '@playwright/test';
import { LAB_LOAD, labReady, labRun, openApp } from './app.mjs';

// What one example's tests say in the code mode on screen
async function measure(page, id){
  await page.evaluate(id => window.playlive.lab.select(id), id);
  await expect.poll(() => page.evaluate(() => window.playlive.lab.state().example)).toBe(id);
  await labReady(page, / · /);
  await page.click('.lab-seg [data-labview="results"]');
  await labRun(page);
  const branch = (await page.locator('#labCodeBranch').textContent()).replace(/\s+/g, ' ').replace('Branch: ', '');
  await page.click('.lab-seg [data-labview="smells"]');
  await expect(page.locator('.smell-score')).toHaveText(/tests?$/);
  const smells = await page.locator('#labSmells .smell-group').evaluateAll(gs => gs.map(g => g.dataset.smell));
  await page.click('.lab-seg [data-labview="mutation"]');
  const run = page.locator('.mut-run');
  await expect(page.locator('.mut-score')).toHaveText(/ mutations$/, { timeout: LAB_LOAD });
  await run.click();
  await expect(run).toHaveText('Run again', { timeout: LAB_LOAD });
  const mutations = Object.fromEntries(await page.locator('#labMutation .bug-group')
    .evaluateAll(gs => gs.map(g => [g.dataset.state, g.querySelectorAll('.mut-row').length])));
  return { branch, mutations, smells };
}

test('every example says the same in Python and in JS/TS', async ({ page }) => {
  test.setTimeout(6 * LAB_LOAD);
  const { errors } = await openApp(page, { hash: '#python' });
  await page.locator('#labCovShow').check();
  const ids = await page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.site));
  const python = {};
  for (const id of ids) python[id] = await measure(page, id);

  await page.click('.area-seg [data-area="javascript"]');
  await expect(page.locator('#labCodeFile')).toHaveText(/\.js$/);
  await page.locator('#labCovShow').check();
  const differ = [];
  for (const id of ids){
    const js = await measure(page, id);
    if (JSON.stringify(js) !== JSON.stringify(python[id])) differ.push(`${id}: Python ${JSON.stringify(python[id])}, JS ${JSON.stringify(js)}`);
  }
  expect(differ).toEqual([]);
  expect(errors).toEqual([]);
});
