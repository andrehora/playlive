// Shared helpers: reading the example list out of index.html, booting the app,
// and driving a run the way a person would.
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect } from '@playwright/test';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');

export const RUN_TIMEOUT = 180_000;   // a whole site's example tests, at Fast speed

// The site ids come from the example manifest, so adding an example adds a test.
export async function siteIds(){
  const { SITE_IDS } = await import(pathToFileURL(resolve(ROOT, 'examples/examples.js')).href);
  if (!SITE_IDS?.length) throw new Error('No example sites found in examples/examples.js.');
  return SITE_IDS;
}

// The manifest itself, for tests that ask what a site is rather than which exist.
export async function manifest(){
  const { SITES } = await import(pathToFileURL(resolve(ROOT, 'examples/examples.js')).href);
  return SITES;
}

// The display name of a site, read from the manifest.
export async function siteName(id){
  return (await manifest())[id].name;
}

// Loads the app and starts collecting errors from the page that hosts it.
// The iframe's own errors are collected by the app and surfaced as warnings.
export async function openApp(page, { site, hash = '', mode } = {}){
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  await page.goto('/index.html' + hash);
  // js-yaml comes from cdnjs: without it nothing parses, so say so plainly.
  await page.waitForFunction(() => typeof window.jsyaml !== 'undefined', null, { timeout: 30_000 })
    .catch(() => { throw new Error('js-yaml did not load from cdnjs. These tests need network access.'); });
  await page.waitForFunction(() => typeof window.playlive?.selectSite === 'function');
  await expect(page.locator('#results .test').first()).toBeVisible();
  if (site) await selectSite(page, site);
  // The app opens in Explore, which has no Coverage or Bugs panel: a test that
  // reads one says which mode it is about.
  if (mode) await setMode(page, mode);
  return { errors };
}

export async function selectSite(page, id){
  await page.evaluate(id => window.playlive.selectSite(id), id);
  await expect(page.locator(`#tabs .tab[data-site="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  // The site's tests are fetched, so wait for the editor to hold them
  await expect(page.locator('#spec')).not.toHaveValue('');
  // and Results to draw them, unless the file is Create's titles with no tests yet
  await expect.poll(() => page.evaluate(() => !!document.querySelector('#results .test')
    || !/^test\s*:/m.test(document.getElementById('spec').value))).toBe(true);
}

export async function setSpeed(page, value){
  await page.selectOption('#speed', value);
}

// The mode is chosen in the app bar, and it is what decides which panels the
// left column has: Bug mode is the one that brings the Bugs panel in.
export async function setMode(page, value){
  await page.click(`.mode-seg [data-mode="${value}"]`);
  await expect(page.locator(`.mode-seg [data-mode="${value}"]`)).toHaveAttribute('aria-pressed', 'true');
}

// Presses Run and waits for the run to finish (the button comes back).
export async function runAll(page, { timeout = RUN_TIMEOUT } = {}){
  await page.click('#run');
  await expect(page.locator('#run')).toBeDisabled();
  await expect(page.locator('#run')).toBeEnabled({ timeout });
  return readResults(page);
}

// The run's outcome, shaped for assertions and for readable failure messages.
export async function readResults(page){
  return page.evaluate(() => {
    const summary = document.getElementById('summary');
    return {
      summary: summary.textContent,
      state: summary.className,          // 'ok' when everything passed, 'bad' otherwise
      site: document.querySelector('#siteName').textContent,
      tests: [...document.querySelectorAll('#results .test')].map(sec => ({
        title: sec.dataset.title,
        state: sec.dataset.state,
        error: sec.querySelector('li.failed .err')?.textContent || '',
        failedStep: sec.querySelector('li.failed .desc')?.textContent || '',
        warnings: [...sec.querySelectorAll('.warn')].map(w => w.textContent)
      }))
    };
  });
}

// A failure message that names the test and the step, not just a count.
export function describeFailures(res){
  const bad = res.tests.filter(t => t.state !== 'passed');
  if (!bad.length) return res.summary;
  return [`${res.site}: ${res.summary}`, ...bad.map(t => `  ✕ ${t.title}\n    ${t.failedStep || t.state}\n    ${t.error}`)].join('\n');
}
