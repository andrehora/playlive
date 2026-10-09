// The site catalog: what a step could target on a page, which the editor's
// suggestions offer. Reading the page is all this does, so it is read here; what
// stays in the Playwright suite is the half that needs a real browser — whether
// an element is visible, and that a run reveals screens the first page does not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, site } from './env.mjs';

const { entryFor, harvest, snapshot, clearCatalog, catalogs } = await load('src/html/catalog.js');
const { validate } = await load('src/html/parse.js');
const { query } = await load('src/html/find.js');

const SITE = 'fixture';
async function harvested(markup, id = SITE){
  clearCatalog(id);
  const d = await site(markup);
  return { d, cat: harvest(id) };
}

/* ---------- What a step would do with an element ---------- */

test('each element is listed under what a step would do with it', async () => {
  const { cat } = await harvested(`
    <button>Apply</button>
    <a href="/x">Home</a>
    <div role="button">Fake button</div>
    <label for="e">Email</label><input id="e">
    <textarea id="ta" aria-label="Notes"></textarea>
    <label for="c">Country</label><select id="c"><option>France</option></select>
    <label for="t">Terms</label><input id="t" type="checkbox">
    <label for="r">Post</label><input id="r" type="radio">
    <input type="submit" value="Send">
    <h1>Checkout</h1>
  `);
  assert.deepEqual(cat.click.map(e => e.target), [
    '{ role: button, name: Apply }', '{ role: link, name: Home }',
    '{ role: button, name: Fake button }', '{ role: button, name: Send }'
  ]);
  assert.deepEqual(cat.field.map(e => e.target), ['{ label: Email }', '{ label: Notes }']);
  assert.deepEqual(cat.select.map(e => e.target), ['{ label: Country }']);
  assert.deepEqual(cat.toggle.map(e => e.target), ['{ label: Terms }', '{ label: Post }']);
  assert.deepEqual(cat.other.map(e => e.target), ['{ role: heading, name: Checkout }'],
    'a heading has no interaction: only expectVisible wants it');
});

test('a hidden input and a plain div are offered as nothing', async () => {
  const { cat } = await harvested('<input type="hidden" name="csrf"><div>Just a box</div>');
  for (const kind of ['click', 'field', 'select', 'toggle', 'other'])
    assert.deepEqual(cat[kind], [], `${kind} should be empty`);
});

test('a button with a role over it is still something a test clicks', async () => {
  // The tag counts even when a role overrides it.
  const { cat } = await harvested('<button role="tab">Details</button>');
  assert.deepEqual(cat.click.map(e => e.target), ['{ role: tab, name: Details }']);
});

test('an entry knows its parts, not just its text', async () => {
  const { cat } = await harvested('<label for="e">Email</label><input id="e"><button>Log in</button>');
  const field = cat.field.find(e => e.target === '{ label: Email }');
  assert.deepEqual(field.parts, { label: 'Email' });
  assert.ok(cat.click.some(e => e.parts.role === 'button'));
  assert.deepEqual(cat.roles, ['button', 'textbox']);
  assert.equal(cat.site, SITE);
});

/* ---------- Options ---------- */

test('a select is listed with its own options', async () => {
  const { cat } = await harvested('<label for="c">Country</label><select id="c"><option>France</option><option>Spain</option></select>');
  assert.deepEqual(cat.select[0].options, ['France', 'Spain']);
});

test('an option with no text falls back to its value', async () => {
  const { cat } = await harvested('<label for="c">C</label><select id="c"><option value="fr"></option><option>Spain</option></select>');
  assert.deepEqual(cat.select[0].options, ['fr', 'Spain']);
});

/* ---------- The key an entry is kept under ---------- */

test('an entry is kept under what a step would do with it and its target', async () => {
  const { d } = await harvested('<button>Apply</button>');
  assert.equal(entryFor(d.querySelector('button')).key, 'click { role: button, name: Apply }');
});

test('an element there is nothing to say about has no entry', async () => {
  const { d } = await harvested('<div id="x"></div>');
  assert.equal(entryFor(d.getElementById('x')), null);
});

/* ---------- Harvesting ---------- */

test('a harvest only ever adds, so a screen a run walked through stays known', async () => {
  const { d } = await harvested('<button>Step one</button>');
  d.body.innerHTML = '<button>Step two</button>';
  const cat = harvest(SITE);
  assert.deepEqual(cat.click.map(e => e.target).sort(),
    ['{ role: button, name: Step one }', '{ role: button, name: Step two }']);
});

test('harvesting the same page twice counts the second look rather than duplicating it', async () => {
  const { cat: first } = await harvested('<button>Apply</button>');
  assert.equal(first.click[0].hits, 1);
  const again = harvest(SITE);
  assert.equal(again.click.length, 1);
  assert.equal(again.click[0].hits, 2, 'hits is how many harvests saw it');
});

test('a select refilled as the page runs accumulates its options', async () => {
  const { d } = await harvested('<label for="c">C</label><select id="c"><option>France</option></select>');
  d.getElementById('c').innerHTML = '<option>France</option><option>Spain</option>';
  assert.deepEqual(harvest(SITE).select[0].options, ['France', 'Spain']);
});

test('Reset forgets a site, since its data shapes the page', async () => {
  await harvested('<button>Apply</button>');
  assert.equal(snapshot(SITE).click.length, 1);
  clearCatalog(SITE);
  assert.equal(catalogs[SITE], undefined, 'the site is gone, not emptied');
  assert.equal(snapshot(SITE).click.length, 0, 'and reading it again finds nothing');
});

test('each site keeps its own catalog', async () => {
  await harvested('<button>One</button>', 'a');
  await harvested('<button>Two</button>', 'b');
  assert.deepEqual(snapshot('a').click.map(e => e.target), ['{ role: button, name: One }']);
  assert.deepEqual(snapshot('b').click.map(e => e.target), ['{ role: button, name: Two }']);
});

/* ---------- Text ---------- */

test('text is offered leaves only, so it is offered once', async () => {
  const { cat } = await harvested('<div><p>Welcome back</p></div>');
  assert.deepEqual(cat.texts.map(e => e.text), ['Welcome back']);
});

test('a paragraph nobody would type into expectText is left out', async () => {
  const { cat } = await harvested(`<p>${'word '.repeat(60)}</p>`);
  assert.deepEqual(cat.texts, []);
});

test('script and style are not text on the page', async () => {
  const { cat } = await harvested('<p>Real text</p><script>var x = 1;</script><style>p{color:red}</style>');
  assert.deepEqual(cat.texts.map(e => e.text), ['Real text']);
});

/* ---------- Everything offered has to work ---------- */

test('every entry is on the page and parses as a step', async () => {
  const { cat } = await harvested(`
    <button>Apply</button><a href="/x">Home</a>
    <label for="e">E-mail: work</label><input id="e">
    <label for="c">Country</label><select id="c"><option>France</option></select>
    <label for="t">Terms &amp; conditions</label><input id="t" type="checkbox">
    <h1>Invoice #4821</h1><p>Welcome back</p>
  `);
  const withValue = (t, v) => t.replace(/\s*\}$/, `, value: ${JSON.stringify(v)} }`);
  const STEP = { click: 'click', toggle: 'check', other: 'expectVisible' };
  const parses = (yaml, what) => {
    const { error } = validate(`test: t\nsteps:\n  - ${yaml}\n`);
    assert.equal(error, undefined, `${what} does not parse: ${yaml} -> ${error}`);
  };
  for (const kind of ['click', 'field', 'select', 'toggle', 'other']){
    for (const e of cat[kind]){
      assert.ok(query(e.parts, true).length, `${kind} ${e.target} is not on the page`);
      if (kind === 'field') parses(`fill: ${withValue(e.target, 'x')}`, kind);
      else if (kind === 'select') parses(`select: ${withValue(e.target, e.options[0] ?? 'x')}`, kind);
      else parses(`${STEP[kind]}: ${e.target}`, kind);
    }
  }
  for (const e of cat.texts){
    assert.ok(query({ text: e.text }, true).length, `text “${e.text}” is not on the page`);
    parses(`expectText: ${JSON.stringify(e.text)}`, 'text');
  }
});
