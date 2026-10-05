// The exporters must produce valid code for every example, and must keep the
// runner's meaning: a fresh page per test, per-step timeouts and ${unique}.
import { test, expect } from '@playwright/test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { openApp, selectSite, siteIds } from './app.mjs';

const run = promisify(execFile);
const ids = await siteIds();

// Both exports use import, so they are checked as modules.
const FRAMEWORKS = [
  { key: 'playwright', ext: 'mjs' },
  { key: 'cypress', ext: 'mjs' }
];

async function exportAll(page){
  return page.evaluate(() => {
    const { validate, toPlaywright, toCypress } = window.playlive;
    const { spec, error } = validate(document.getElementById('spec').value);
    if (error) return { error };
    return { playwright: toPlaywright(spec), cypress: toCypress(spec) };
  });
}

async function checkSyntax(code, ext, label){
  const dir = await mkdtemp(join(tmpdir(), 'playlive-export-'));
  const file = join(dir, `export.${ext}`);
  await writeFile(file, code);
  try { await run(process.execPath, ['--check', file]); }
  catch (e) { throw new Error(`${label} export is not valid JavaScript:\n${e.stderr || e.message}`); }
}

test.describe('Exports', () => {
  test('every example exports valid JavaScript for both frameworks', async ({ page }) => {
    test.setTimeout(300_000);
    const { errors } = await openApp(page);

    for (const id of ids){
      await selectSite(page, id);
      const out = await exportAll(page);
      expect(out.error, `${id} should parse before it can be exported`).toBeUndefined();

      for (const { key, ext } of FRAMEWORKS){
        const code = out[key];
        expect(code, `${id}: empty ${key} export`).toBeTruthy();
        await checkSyntax(code, ext, `${id} ${key}`);
        // Exported code carries no comments.
        expect(code, `${id}: ${key} export should have no comments`).not.toMatch(/^\s*(\/\/|\/\*)/m);
      }
    }
    expect(errors).toEqual([]);
  });

  test('the exports keep what the runner means', async ({ page }) => {
    await openApp(page, { site: 'contact-form' });
    await page.fill('#spec', [
      'vars:',
      '  email: ana+${unique}@example.test',
      '',
      'test: Keeps the runner meaning',
      'steps:',
      '  - fill: { label: Email, value: "${email}" }',
      '  - click: { role: button, name: Send }',
      '  - expectText: Thanks',
      '    timeout: 8000',
      '  - expectNoText: Something went wrong',
      ''
    ].join('\n'));
    await expect(page.locator('#error')).toHaveText('');

    const out = await exportAll(page);
    expect(out.error).toBeUndefined();

    // Fresh page per test.
    expect(out.playwright).toContain(`await page.goto('/')`);
    expect(out.cypress).toContain(`cy.visit(BASE + '/')`);

    // A per-step timeout survives into both.
    expect(out.playwright).toContain('8000');
    expect(out.cypress).toContain('8000');

    // ${unique} becomes a value computed at run time, not a literal.
    for (const code of Object.values(out)) expect(code).toContain('unique');

    // User-visible queries, not CSS selectors.
    expect(out.playwright).toContain('getByLabel');
    expect(out.playwright).toContain('getByRole');
    expect(out.cypress).toContain('findByLabelText');

    for (const { key, ext } of FRAMEWORKS) await checkSyntax(out[key], ext, key);
  });
});
