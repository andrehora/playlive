// Shared helpers: reading the example list out of index.html, booting the app,
// and driving a run the way a person would.
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect } from '@playwright/test';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');

export const RUN_TIMEOUT = 180_000;   // a whole site's example tests, at Fast speed

// The site ids come from the example manifest, so adding an example adds a test.
export async function siteIds(){
  const { SITE_IDS } = await import(pathToFileURL(resolve(ROOT, 'examples/examples.js')).href);
  if (!SITE_IDS?.length) throw new Error('No example sites found in examples/examples.js.');
  return SITE_IDS;
}

// Loads the app and starts collecting errors from the page that hosts it.
// The iframe's own errors are collected by the app and surfaced as warnings.
export async function openApp(page, { site } = {}){
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  await page.goto('/index.html');
  // js-yaml comes from cdnjs: without it nothing parses, so say so plainly.
  await page.waitForFunction(() => typeof window.jsyaml !== 'undefined', null, { timeout: 30_000 })
    .catch(() => { throw new Error('js-yaml did not load from cdnjs. These tests need network access.'); });
  await page.waitForFunction(() => typeof window.playlive?.selectSite === 'function');
  await expect(page.locator('#results .test').first()).toBeVisible();
  if (site) await selectSite(page, site);
  return { errors };
}

export async function selectSite(page, id){
  await page.evaluate(id => window.playlive.selectSite(id), id);
  await expect(page.locator(`#tabs .tab[data-site="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  // The site's tests are fetched, so wait for the editor to hold them
  await expect(page.locator('#spec')).not.toHaveValue('');
  await expect(page.locator('#results .test').first()).toBeVisible();
}

export async function setSpeed(page, value){
  await page.selectOption('#speed', value);
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
