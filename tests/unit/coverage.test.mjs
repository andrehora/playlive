// UI coverage: the catalog joined to the run. What a step credits, how the
// score bands, and the test an untested control gets — all of it reads two
// plain structures, so none of it needs a browser. What does need one is the
// run that fills them, and the panel that draws them: coverage.spec covers
// that a watched run moves the score.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, site } from './env.mjs';

const { markTested, report, percent, band, titleFor, stepFor, uniqueTitle, clearCoverage, touched, INTERACTIONS, KINDS }
  = await load('src/coverage.js');
const { harvest, clearCatalog, keyFor } = await load('src/catalog.js');
const { validate } = await load('src/parse.js');

const SITE = 'fixture';
const PAGE = `
  <button>Apply</button>
  <button>Clear</button>
  <label for="e">Email</label><input id="e">
  <label for="c">Country</label><select id="c"><option>France</option><option>Spain</option></select>
  <label for="t">Terms</label><input id="t" type="checkbox">
  <h1>Checkout</h1>
`;

// A freshly harvested page with nothing credited yet.
async function fresh(){
  clearCatalog(SITE); clearCoverage(SITE);
  const d = await site(PAGE);
  harvest(SITE);
  return d;
}
const stateOf = (r, target) => r.items.find(i => i.target === target)?.state;

/* ---------- What counts ---------- */

test('only controls are counted, never headings or text', async () => {
  await fresh();
  const r = report(SITE);
  assert.deepEqual([...new Set(r.items.map(i => i.kind))].sort(), ['click', 'field', 'select', 'toggle']);
  assert.equal(r.total, 5, 'two buttons, a field, a select and a box');
  assert.ok(!r.items.some(i => i.target.includes('Checkout')), 'the heading is not a control');
});

test('the kinds a score counts are the interactive ones', () => {
  assert.deepEqual(KINDS, ['click', 'field', 'select', 'toggle']);
  assert.deepEqual([...INTERACTIONS].sort(), ['check', 'click', 'fill', 'select', 'uncheck']);
});

test('with nothing run, every control is untested and the score is zero', async () => {
  await fresh();
  const r = report(SITE);
  assert.equal(r.untested, 5);
  assert.equal(r.used, 0);
  assert.equal(r.score, 0);
});

/* ---------- What a step credits ---------- */

test('a step credits the element it landed on, under the catalog’s own key', async () => {
  const d = await fresh();
  const btn = [...d.querySelectorAll('button')].find(b => b.textContent === 'Apply');
  markTested(SITE, btn, 'click');
  const r = report(SITE);
  assert.equal(stateOf(r, '{ role: button, name: Apply }'), 'used');
  assert.equal(r.used, 1);
  // One key, so there is no second matching rule to keep in step with find.js.
  assert.equal(keyFor(btn), 'click { role: button, name: Apply }');
});

test('using a control and merely looking at it are different things', async () => {
  const d = await fresh();
  markTested(SITE, d.getElementById('e'), 'expectVisible');
  let r = report(SITE);
  assert.equal(stateOf(r, '{ label: Email }'), 'checked');
  assert.equal(r.used, 0);
  assert.equal(r.checked, 1);
  // A fill on the same control moves it on.
  markTested(SITE, d.getElementById('e'), 'fill');
  r = report(SITE);
  assert.equal(stateOf(r, '{ label: Email }'), 'used');
  assert.equal(r.checked, 0);
});

test('a select says how many of its options a test has picked', async () => {
  const d = await fresh();
  markTested(SITE, d.getElementById('c'), 'select', 'France');
  const row = report(SITE).items.find(i => i.kind === 'select');
  assert.deepEqual(row.options, ['France', 'Spain']);
  assert.deepEqual(row.picked, ['France']);
  markTested(SITE, d.getElementById('c'), 'select', 'Spain');
  assert.deepEqual(report(SITE).items.find(i => i.kind === 'select').picked, ['France', 'Spain']);
});

test('a select counts as one control however many options it has', async () => {
  await fresh();
  assert.equal(report(SITE).items.filter(i => i.kind === 'select').length, 1);
});

test('crediting nothing credits nothing', async () => {
  await fresh();
  markTested(SITE, null, 'click');
  assert.equal(report(SITE).used, 0);
});

test('clearCoverage forgets the run, so a full one describes itself', async () => {
  const d = await fresh();
  markTested(SITE, d.querySelector('button'), 'click');
  assert.equal(report(SITE).used, 1);
  clearCoverage(SITE);
  assert.equal(report(SITE).used, 0);
  assert.equal(touched[SITE], undefined);
});

test('a site nothing has been read for scores nothing rather than throwing', () => {
  const r = report('never-visited');
  assert.equal(r.total, 0);
  assert.equal(r.score, 0);
});

/* ---------- The score ---------- */

test('the score never rounds to the wrong story', () => {
  assert.equal(percent({ score: 1, used: 5, total: 5 }), 100);
  assert.equal(percent({ score: 0.999, used: 999, total: 1000 }), 99, 'not 100% until every control is used');
  assert.equal(percent({ score: 0.001, used: 1, total: 1000 }), 1, 'not 0% once one is');
  assert.equal(percent({ score: 0, used: 0, total: 5 }), 0);
});

test('the score reads in the app’s own three bands', () => {
  assert.equal(band(100), 'ok');
  assert.equal(band(99), 'warn');
  assert.equal(band(60), 'warn');
  assert.equal(band(59), 'bad');
  assert.equal(band(0), 'bad');
});

/* ---------- The test an untested control gets ---------- */

test('the title says what the test does, in the list’s own words', () => {
  assert.equal(titleFor({ kind: 'click', parts: { role: 'button', name: 'Apply' } }), 'Clicks Apply');
  assert.equal(titleFor({ kind: 'field', parts: { label: 'Coupon code' } }), 'Fills Coupon code');
  assert.equal(titleFor({ kind: 'select', parts: { label: 'Country' } }), 'Chooses Country');
  assert.equal(titleFor({ kind: 'toggle', parts: { label: 'Terms' } }), 'Checks Terms');
  assert.equal(titleFor({ kind: 'click', parts: { placeholder: 'Search' } }), 'Clicks Search');
  assert.equal(titleFor({ kind: 'click', parts: {}, role: 'combobox' }), 'Clicks select');
});

test('a title the file already holds is numbered', () => {
  const spec = validate('test: Clicks Apply\nsteps:\n  - click: Apply\n').spec;
  assert.equal(uniqueTitle('Clicks Apply', spec), 'Clicks Apply 2');
  assert.equal(uniqueTitle('Clicks Other', spec), 'Clicks Other');
  assert.equal(uniqueTitle('Clicks Apply', null), 'Clicks Apply', 'an empty file is fair game');
});

test('the step written is one the control can actually take', () => {
  assert.equal(stepFor({ kind: 'click', target: '{ role: button, name: Apply }' }), '- click: { role: button, name: Apply }');
  assert.equal(stepFor({ kind: 'field', target: '{ label: Email }' }), '- fill: { label: Email, value: text }');
  assert.equal(stepFor({ kind: 'toggle', target: '{ label: Terms }' }), '- check: { label: Terms }');
  assert.equal(stepFor({ kind: 'select', target: '{ label: Country }', options: ['France'] }),
    '- select: { label: Country, value: France }');
  assert.equal(stepFor({ kind: 'select', target: '{ label: Country }' }),
    '- select: { label: Country, value: value }', 'a select with no options read yet still writes a step');
});

test('every step it writes parses', async () => {
  await fresh();
  for (const e of report(SITE).items){
    const v = validate(`test: ${titleFor(e)}\nsteps:\n  ${stepFor(e)}\n`);
    assert.equal(v.error, undefined, `${e.target}: ${v.error}`);
  }
});
