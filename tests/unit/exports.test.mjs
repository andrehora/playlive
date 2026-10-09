// The exporters. They carry no comments and must keep the runner's meaning: a
// fresh page per test, partial matching for expectText, visible text only for
// expectNoText, per-step timeouts and ${unique}.
//
// Every example is exported and syntax-checked here rather than through the
// app: the export dialog is the only part of this that needs a browser, and
// app.spec covers that it opens, remembers its tab and refuses a file that
// does not parse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { corpus, load } from './env.mjs';

const { validate } = await load('src/html/parse.js');
const { toPlaywright, toCypress } = await load('src/html/exports.js');
const { setEditorSite } = await load('src/state.js');

// Both exports use import, so both are checked as modules — all of them in one
// child process, since spawning a checker per file costs more than every other
// unit test put together.
const CHECKER = resolve(fileURLToPath(import.meta.url), '../check-syntax.mjs');
function checkSyntax(...pairs){
  const batch = pairs.flat().map(p => (Array.isArray(p) ? { label: p[0], code: p[1] } : p));
  const out = execFileSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', CHECKER],
    { input: JSON.stringify(batch), encoding: 'utf8' });
  const bad = JSON.parse(out);
  if (bad.length) assert.fail(bad.map(b => `${b.label} is not valid JavaScript: ${b.message}`).join('\n'));
}

function exportsOf(yaml, site = 'login'){
  setEditorSite(site);
  const v = validate(yaml);
  assert.equal(v.error, undefined, v.error);
  return { playwright: toPlaywright(v.spec), cypress: toCypress(v.spec) };
}

/* ---------- The whole corpus ---------- */

test('every example exports valid JavaScript for both frameworks', async () => {
  const batch = [];
  for (const { id, yaml } of await corpus()){
    const v = validate(yaml);
    assert.equal(v.error, undefined, `${id} should parse before it can be exported: ${v.error}`);
    setEditorSite(id);
    for (const [key, code] of [['playwright', toPlaywright(v.spec)], ['cypress', toCypress(v.spec)]]){
      assert.ok(code, `${id}: empty ${key} export`);
      // Exported code carries no comments.
      assert.doesNotMatch(code, /^\s*(\/\/|\/\*)/m, `${id}: ${key} export should have no comments`);
      batch.push({ label: `${id} ${key}`, code });
    }
  }
  assert.equal(batch.length, 200, 'both exports of all hundred examples');
  checkSyntax(batch);
});

test('every example names its own site and host in both exports', async () => {
  for (const { id, site, yaml } of await corpus()){
    const out = exportsOf(yaml, id);
    assert.match(out.playwright, new RegExp(JSON.stringify(site.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(out.playwright.includes(`http://${site.host}`), `${id}: playwright export should use its host`);
    assert.ok(out.cypress.includes(`http://${site.host}`), `${id}: cypress export should use its host`);
  }
});

/* ---------- What the runner means ---------- */

test('every test starts from a fresh page', () => {
  const out = exportsOf('test: One\nsteps:\n  - click: A\n\ntest: Two\nsteps:\n  - click: B\n');
  assert.equal(out.playwright.match(/await page\.goto\('\/'\)/g).length, 2);
  assert.equal(out.cypress.match(/cy\.visit\(BASE \+ '\/'\)/g).length, 2);
});

test('targets become user-visible queries, never CSS selectors', () => {
  const out = exportsOf([
    'test: T', 'steps:',
    '  - click: { role: button, name: Log in }',
    '  - fill: { label: Email, value: a@b.test }',
    '  - fill: { placeholder: Search, value: shoes }',
    '  - click: Send'
  ].join('\n'));
  assert.match(out.playwright, /page\.getByRole\("button", \{ name: "Log in", exact: true \}\)/);
  assert.match(out.playwright, /page\.getByLabel\("Email", \{ exact: true \}\)/);
  assert.match(out.playwright, /page\.getByPlaceholder\("Search", \{ exact: true \}\)/);
  assert.match(out.playwright, /page\.getByText\("Send"\)\.first\(\)/);
  assert.match(out.cypress, /cy\.findByRole\("button", \{ name: "Log in" \}\)/);
  assert.match(out.cypress, /cy\.findByLabelText\("Email"\)/);
  assert.match(out.cypress, /cy\.findByPlaceholderText\("Search"\)/);
  assert.match(out.cypress, /cy\.contains\("Send"\)/);
  for (const code of Object.values(out)) assert.doesNotMatch(code, /querySelector|\$\(['"]#/);
});

test('every action has a line in both exports', () => {
  const out = exportsOf([
    'test: T', 'steps:',
    '  - click: { role: button, name: Go }',
    '  - fill: { label: Email, value: a@b.test }',
    '  - select: { label: Country, value: United Kingdom }',
    '  - check: { label: Terms }',
    '  - uncheck: { label: Terms }',
    '  - wait: 300',
    '  - expectText: Welcome back',
    '  - expectNoText: Something went wrong',
    '  - expectVisible: { role: heading, name: Dashboard }',
    '  - expectNumber: { text: Ends in, min: 1, max: 24 }'
  ].join('\n'));
  for (const [key, code] of Object.entries(out)){
    for (const want of ['Go', 'Email', 'United Kingdom', 'Terms', 'Welcome back', 'Something went wrong', 'Dashboard', 'Ends in'])
      assert.ok(code.includes(want), `${key} export lost "${want}"`);
  }
  checkSyntax(Object.entries(out));
  assert.match(out.playwright, /\.selectOption\(\{ label: "United Kingdom" \}\)/);
  assert.match(out.playwright, /waitForTimeout\(300\)/);
  assert.match(out.cypress, /\.select\("United Kingdom"\)/);
  assert.match(out.cypress, /cy\.wait\(300\)/);
});

test('expectText matches part of the page, and expectNoText only visible text', () => {
  const out = exportsOf('test: T\nsteps:\n  - expectText: Welcome\n  - expectNoText: Error\n');
  // Partial: getByText / cy.contains both match a substring.
  assert.match(out.playwright, /expect\(page\.getByText\("Welcome"\)\.first\(\)\)\.toBeVisible\(\)/);
  assert.match(out.playwright, /expect\(page\.getByText\("Error"\)\)\.toHaveCount\(0\)/);
  assert.match(out.cypress, /cy\.contains\("Welcome"\)\.should\('be\.visible'\)/);
  // innerText ignores hidden elements, like the runner does.
  assert.match(out.cypress, /invoke\('prop', 'innerText'\)\.should\('not\.include', "Error"\)/);
});

test('a per-step timeout survives into both', () => {
  const out = exportsOf('test: T\nsteps:\n  - click: { text: Go, timeout: 8000 }\n  - expectText: Hi\n    timeout: 9000\n');
  for (const code of Object.values(out)){
    assert.ok(code.includes('8000'), 'the click timeout');
    assert.ok(code.includes('9000'), 'the check timeout');
  }
});

test('${unique} becomes a value computed at run time, not a literal', () => {
  const out = exportsOf('test: T\nsteps:\n  - fill: { label: Email, value: "ana+${unique}@example.test" }\n');
  for (const [key, code] of Object.entries(out)){
    assert.match(code, /const unique = Date\.now\(\)\.toString\(36\);/, `${key} should compute unique`);
    assert.ok(code.includes('${unique}'), `${key} should interpolate it`);
    assert.doesNotMatch(code, /"ana\+\$\{unique\}@example\.test"/, `${key} should not quote it as a literal`);
  }
  checkSyntax(Object.entries(out));
});

test('a test with no ${unique} does not declare it', () => {
  const out = exportsOf('test: T\nsteps:\n  - click: A\n');
  for (const code of Object.values(out)) assert.doesNotMatch(code, /const unique/);
});

test('expectNumber reads the page rather than a locator, in both', () => {
  const out = exportsOf('test: T\nsteps:\n  - expectNumber: { text: Ends in, min: 1, max: 24 }\n');
  // The runner reads the first number on the page's first visible line holding
  // the text, commas taken out. Both exports have to read it the same way.
  for (const [key, code] of Object.entries(out)){
    assert.ok(code.includes('innerText'), `${key} should read the page's text`);
    assert.ok(code.includes("replace(/,/g, '')"), `${key} should take the commas out`);
    assert.ok(code.includes('1') && code.includes('24'), `${key} should carry both ends`);
  }
  checkSyntax(Object.entries(out));
  assert.match(out.playwright, /expect\.poll/, 'it has to retry while the number moves');
  assert.match(out.cypress, /\.should\(text =>/, 'should(fn) is what retries in Cypress');
});

test('a value with braces in it is typed literally by Cypress', () => {
  // "{enter}" is a key sequence to Cypress unless it is told otherwise.
  const out = exportsOf('test: T\nsteps:\n  - fill: { label: Email, value: "a{b}c" }\n');
  assert.match(out.cypress, /parseSpecialCharSequences: false/);
  checkSyntax([['cypress', out.cypress]]);
});

test('an empty fill clears the field rather than typing nothing', () => {
  const out = exportsOf('test: T\nsteps:\n  - fill: { label: Email, value: "" }\n');
  assert.match(out.cypress, /\.clear\(\);/);
  assert.doesNotMatch(out.cypress, /\.type\(""\)/);
});

test('quotes and backslashes in a value survive the trip', () => {
  const out = exportsOf('test: T\nsteps:\n  - fill: { label: Note, value: "say \\"hi\\" \\\\ there" }\n');
  checkSyntax(Object.entries(out));
});

test('a title with a quote in it still produces valid code', () => {
  const out = exportsOf('test: It says "no"\nsteps:\n  - click: A\n');
  checkSyntax(Object.entries(out));
});
