// The example manifest, against the rules AGENTS.md sets out for it: one theme
// per category in one word, one accent and one icon per theme, ports running
// down the list, names sorted inside a category, and a folder on disk to match
// every line. All of it is data, and getting it wrong is the easiest mistake to
// make when adding an example — so it is checked here rather than by eye.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, load } from './env.mjs';

const { SITES, SITE_IDS } = await load('examples/examples.js');
const { catIconSvg } = await load('src/icons.js');

// The categories in manifest order, which is the order they are drawn in.
const CATEGORIES = [...new Set(SITE_IDS.map(id => SITES[id].category))];
const ACCENTS = {
  Shopping: '#b45309', Support: '#0f766e', Accounts: '#1d4ed8', Admin: '#475569',
  Travel: '#0e7490', Banking: '#a16207', Search: '#0369a1', Social: '#be185d',
  Inbox: '#4338ca', Productivity: '#7c3aed', Media: '#a21caf', Health: '#4d7c0f',
  Dashboards: '#5b21b6', Learning: '#78350f', Games: '#9f1239', Flaky: '#b91c1c'
};
const exists = async p => access(resolve(ROOT, p)).then(() => true, () => false);

/* ---------- The list ---------- */

test('every example is defined exactly once', () => {
  assert.equal(new Set(SITE_IDS).size, SITE_IDS.length);
  assert.equal(SITE_IDS.length, 100, 'a hundred examples, which is a ceiling rather than a target');
});

test('an id is kebab-case, and is the folder it lives in', async () => {
  for (const id of SITE_IDS){
    assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${id} should be kebab-case`);
    assert.ok(await exists(`examples/${id}/index.html`), `examples/${id}/index.html is missing`);
    assert.ok(await exists(`examples/${id}/tests.yaml`), `examples/${id}/tests.yaml is missing`);
  }
});

test('no folder in examples/ is missing from the manifest', async () => {
  const dirs = (await readdir(resolve(ROOT, 'examples'), { withFileTypes: true }))
    .filter(e => e.isDirectory()).map(e => e.name);
  assert.deepEqual(dirs.filter(d => !SITES[d]), [], 'a folder the app would never show');
});

test('every example has a name', () => {
  for (const id of SITE_IDS) assert.ok(SITES[id].name?.trim(), `${id} has no name`);
});

/* ---------- Order ---------- */

test('ports run from 3001 down the list', () => {
  SITE_IDS.forEach((id, i) => assert.equal(SITES[id].host, `localhost:${3001 + i}`, `${id} is out of order`));
});

test('categories run in manifest order, each in one block', () => {
  const seen = [];
  let last = null;
  for (const id of SITE_IDS){
    const c = SITES[id].category;
    if (c === last) continue;
    assert.ok(!seen.includes(c), `${c} appears twice: a category is one block`);
    seen.push(c); last = c;
  }
  assert.deepEqual(seen, CATEGORIES);
});

test('Shopping leads, so the first example is home', () => {
  assert.equal(CATEGORIES[0], 'Shopping');
  assert.equal(SITE_IDS[0], 'address-form', '"/" and "#address-form" are the same page');
});

test('Flaky stays last: it is the one category named after a mechanism', () => {
  assert.equal(CATEGORIES.at(-1), 'Flaky');
});

test('within a category the examples are sorted by name', () => {
  for (const c of CATEGORIES){
    const names = SITE_IDS.filter(id => SITES[id].category === c).map(id => SITES[id].name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), `${c} is not in name order`);
  }
});

/* ---------- Themes ---------- */

test('a category is one recognisable word', () => {
  for (const c of CATEGORIES) assert.match(c, /^[A-Z][a-z]+$/, `${c} should be one word`);
});

test('there is no catch-all category', () => {
  // A catch-all is where an example goes when nobody has decided what it is.
  for (const banned of ['Misc', 'Other', 'Forms', 'Various']) assert.ok(!CATEGORIES.includes(banned), `${banned} is a catch-all`);
});

test('the sixteen themes are the sixteen, in order', () => {
  assert.deepEqual(CATEGORIES, Object.keys(ACCENTS));
});

test('every example carries its theme’s accent', () => {
  for (const id of SITE_IDS)
    assert.equal(SITES[id].accent, ACCENTS[SITES[id].category], `${id} disagrees with its theme`);
});

test('no two themes share an accent', () => {
  assert.equal(new Set(Object.values(ACCENTS)).size, Object.keys(ACCENTS).length);
});

test('the picker reads a dot from a category’s first example, so that one must agree', () => {
  // A page that disagreed with the manifest would make the dot lie rather than fail.
  for (const c of CATEGORIES){
    const first = SITE_IDS.find(id => SITES[id].category === c);
    assert.equal(SITES[first].accent, ACCENTS[c], `${c}'s first example sets its dot`);
  }
});

test('every theme has an icon of its own', () => {
  const fallback = catIconSvg('no-such-theme');
  for (const c of CATEGORIES)
    assert.notEqual(catIconSvg(c), fallback, `${c} is drawn with the fallback icon`);
});

test('an icon is 24x24, stroke-only inline SVG, so it sizes and tints itself', () => {
  for (const c of [...CATEGORIES, 'no-such-theme']){
    const svg = catIconSvg(c);
    assert.match(svg, /viewBox="0 0 24 24"/, `${c}`);
    assert.match(svg, /class="i"/, `${c}`);
    assert.match(svg, /aria-hidden="true"/, `${c}`);
    assert.doesNotMatch(svg, /fill="(?!none)/, `${c} should be stroke-only`);
    assert.doesNotMatch(svg, /<image|href=/, `${c} must not load a remote image`);
  }
});

/* ---------- The page agrees with the manifest ---------- */

test('every example page sets its theme’s --accent', async () => {
  for (const id of SITE_IDS){
    const html = await readFile(resolve(ROOT, `examples/${id}/index.html`), 'utf8');
    const m = /--accent:\s*(#[0-9a-fA-F]{3,8})/.exec(html);
    assert.ok(m, `${id} sets no --accent`);
    assert.equal(m[1].toLowerCase(), SITES[id].accent.toLowerCase(), `${id}'s page disagrees with the manifest`);
  }
});

test('every example page loads the shared hooks and stylesheet', async () => {
  for (const id of SITE_IDS){
    const html = await readFile(resolve(ROOT, `examples/${id}/index.html`), 'utf8');
    assert.match(html, /src="\.\.\/hooks\.js"/, `${id} should load hooks.js, which gives it $(id) and the error hooks`);
    assert.match(html, /href="\.\.\/site\.css"/, `${id} should load the shared stylesheet`);
    assert.match(html, /<html lang="/, `${id} should say what language it is in`);
  }
});

test('nothing is loaded from the network, since the published page allows no remote images', async () => {
  for (const id of SITE_IDS){
    const html = await readFile(resolve(ROOT, `examples/${id}/index.html`), 'utf8');
    assert.doesNotMatch(html, /(src|href)="https?:\/\//, `${id} reaches off the page`);
  }
});

/* ---------- bugs.js ---------- */

test('an example claiming bugs has a bugs.js, and one with a bugs.js claims them', async () => {
  for (const id of SITE_IDS){
    const has = await exists(`examples/${id}/bugs.js`);
    assert.equal(!!SITES[id].bugs, has,
      has ? `${id} ships bugs.js but does not say "bugs: true"` : `${id} says "bugs: true" but ships no bugs.js`);
  }
});

test('a storageKeys entry is a list of strings', () => {
  for (const id of SITE_IDS){
    const keys = SITES[id].storageKeys;
    if (keys === undefined) continue;
    assert.ok(Array.isArray(keys) && keys.every(k => typeof k === 'string'), `${id}: storageKeys`);
  }
});

test('a manifest line says nothing the app does not read', () => {
  const known = new Set(['name', 'category', 'host', 'accent', 'bugs', 'storageKeys']);
  for (const id of SITE_IDS){
    const extra = Object.keys(SITES[id]).filter(k => !known.has(k));
    assert.deepEqual(extra, [], `${id} carries ${extra[0]}, which nothing reads`);
  }
});

/* ---------- Tests per example ---------- */

test('every example ships two to five tests, covering the main path and its errors', async () => {
  // score-board ships six and is the only one that does. It is named here
  // rather than quietly widening the rule: either it loses a test or AGENTS.md
  // changes, and until one of those happens the suite says which it is.
  const OVER = { 'score-board': 6 };
  const counts = [];
  for (const id of SITE_IDS){
    const yaml = await readFile(resolve(ROOT, `examples/${id}/tests.yaml`), 'utf8');
    const n = yaml.split('\n').filter(l => /^test\s*:/.test(l)).length;
    assert.ok(n >= 2, `${id} ships ${n} tests, and an example wants at least 2`);
    if (n > 5) counts.push([id, n]);
  }
  assert.deepEqual(Object.fromEntries(counts), OVER, 'these ship more than the five AGENTS.md asks for');
});

test('a file never names the site it belongs to', async () => {
  // A file belongs to whichever example is selected.
  for (const id of SITE_IDS){
    const yaml = await readFile(resolve(ROOT, `examples/${id}/tests.yaml`), 'utf8');
    assert.doesNotMatch(yaml, /^site\s*:/m, `${id} names a site`);
    assert.doesNotMatch(yaml, /^tests\s*:/m, `${id} uses the removed "tests:" list`);
    assert.doesNotMatch(yaml, /^flows\s*:/m, `${id} uses the removed "flows:" block`);
  }
});
