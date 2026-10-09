// Shared helpers: reading the example list out of index.html, booting the app,
// and driving a run the way a person would.
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect } from '@playwright/test';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');

export const RUN_TIMEOUT = 180_000;   // a whole site's example tests, at Fast speed

// The site ids come from the example manifest, so adding an example adds a test.
export async function siteIds(){
  const { SITE_IDS } = await import(pathToFileURL(resolve(ROOT, 'examples/html/examples.js')).href);
  if (!SITE_IDS?.length) throw new Error('No example sites found in examples/html/examples.js.');
  return SITE_IDS;
}

// The manifest itself, for tests that ask what a site is rather than which exist.
export async function manifest(){
  const { SITES } = await import(pathToFileURL(resolve(ROOT, 'examples/html/examples.js')).href);
  return SITES;
}

// The display name of a site, read from the manifest.
export async function siteName(id){
  return (await manifest())[id].name;
}

// Loads the app and starts collecting errors from the page that hosts it.
// The iframe's own errors are collected by the app and surfaced as warnings.
// Home is Python, so the sites are opened in Explore unless a test names a link.
export async function openApp(page, { site, hash = '#html', mode, tab } = {}){
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  await page.goto('/index.html' + hash);
  // js-yaml comes from cdnjs: without it nothing parses, so say so plainly.
  await page.waitForFunction(() => typeof window.jsyaml !== 'undefined', null, { timeout: 30_000 })
    .catch(() => { throw new Error('js-yaml did not load from cdnjs. These tests need network access.'); });
  await page.waitForFunction(() => typeof window.playlive?.selectSite === 'function');
  // Attached rather than visible: a link may open on the Mutation or Smells tab
  await expect(page.locator('#results .test').first()).toBeAttached();
  if (site) await selectSite(page, site);
  // The app opens in Explore on the Results tab: a test that reads another
  // says which mode or tab it is about.
  if (mode) await setMode(page, mode);
  if (tab) await setTab(page, tab);
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
// left column has: Create is the one that brings a panel of its own in. The
// bar asks the language first (Python, JS/TS, HTML), then Explore or Create.
export async function setMode(page, value){
  const area = ['python', 'javascript'].includes(value) ? value : 'html';
  await page.click(`.area-seg [data-area="${area}"]`);
  await expect(page.locator(`.area-seg [data-area="${area}"]`)).toHaveAttribute('aria-pressed', 'true');
  if (area !== 'html') return;
  await page.click(`.mode-seg [data-mode="${value}"]`);
  await expect(page.locator(`.mode-seg [data-mode="${value}"]`)).toHaveAttribute('aria-pressed', 'true');
}

// Mutation and Smells are tabs beside Results.
export async function setTab(page, value){
  await page.click(`.res-seg [data-resview="${value}"]`);
  await expect(page.locator(`.res-seg [data-resview="${value}"]`)).toHaveAttribute('aria-pressed', 'true');
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

// The code modes (Python, JS/TS). Their runtimes download on first use, so
// waits are long.
export const CODE_LOAD = 120_000;
// Until the runtime says it is ready: a label such as "Python 3.14.2"
export const codeReady = (page, label, timeout = CODE_LOAD) => expect(page.locator('#codeState')).toHaveText(label, { timeout });
// Run the tests on screen, and what the summary says when they are done
export async function codeRun(page, timeout = CODE_LOAD){
  await page.click('#codeRun');
  await expect(page.locator('#codeSummary')).not.toHaveText(/Running|^$/, { timeout });
  return page.locator('#codeSummary').textContent();
}
// How many tests a Results head says all passed, or null if it says otherwise
export const allPassed = said => (/^The test passed in [\d.]+s$/.test(said) ? 1 : Number(/^All (\d+) tests passed in [\d.]+s$/.exec(said)?.[1]) || null);
