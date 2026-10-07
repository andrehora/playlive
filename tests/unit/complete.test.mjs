// Autocomplete is two halves: context() reads the caret and says what may go
// there, itemsFor() fills that slot from the site catalog. Both are functions
// of a string and a catalog, so both are read here. What stays in the
// Playwright suite is the list on screen — where it opens, which keys it owns,
// and that every one of the hundred real pages offers only steps that resolve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, site } from './env.mjs';

const { context, suggest, fileInfo } = await load('src/complete.js');
const { harvest, clearCatalog } = await load('src/catalog.js');
const { validate } = await load('src/parse.js');
const { query } = await load('src/find.js');
const { ACTIONS } = await load('src/actions.js');

const SITE = 'fixture';
const PAGE = `
  <button>Log in</button>
  <button>Log out</button>
  <label for="e">Email</label><input id="e">
  <input id="s" placeholder="Search">
  <label for="c">Country</label><select id="c"><option>France</option><option>Spain</option></select>
  <label for="t">Terms</label><input id="t" type="checkbox">
  <h1>Welcome back</h1>
`;
clearCatalog(SITE);
await site(PAGE);
const cat = harvest(SITE);

const head = 'test: t\nsteps:\n';
// suggest() with the caret at the end of the text, against the fixture page.
const at = text => suggest(text, text.length, cat);
const inserts = text => (at(text) || { items: [] }).items.map(i => i.insert);
const labels = text => (at(text) || { items: [] }).items.map(i => i.label);

/* ---------- Reading the caret ---------- */

test('an action is what goes after a dash', () => {
  assert.equal(context(`${head}  - cl`, `${head}  - cl`.length).what, 'action');
  assert.equal(context(`${head}  cl`, `${head}  cl`.length).what, 'action', 'a bare indented word, inside steps');
  assert.equal(context(`${head}  cl`, `${head}  cl`.length).dash, true, 'so the dash comes with it');
});

test('a bare indented word is an action only where steps live', () => {
  const noSteps = 'vars:\n  em';
  assert.notEqual(context(noSteps, noSteps.length)?.what, 'action');
});

test('inside braces it is a key, then that key’s slot', () => {
  const k = `${head}  - click: { `;
  assert.equal(context(k, k.length).what, 'key');
  const v = `${head}  - click: { role: `;
  const ctx = context(v, v.length);
  assert.equal(ctx.what, 'slot');
  assert.equal(ctx.key, 'role');
  assert.equal(ctx.action, 'click');
});

test('a slot is narrowed by what the braces already say', () => {
  const t = `${head}  - click: { role: button, name: `;
  const ctx = context(t, t.length);
  assert.equal(ctx.key, 'name');
  assert.deepEqual(ctx.parts, { role: 'button' });
});

test('a comma inside quotes does not start a new part', () => {
  const t = `${head}  - fill: { label: "a, b", value: `;
  const ctx = context(t, t.length);
  assert.equal(ctx.key, 'value');
  assert.deepEqual(ctx.parts, { label: 'a, b' });
});

test('${…} is read before anything it sits inside', () => {
  const t = `${head}  - fill: { label: Email, value: "\${em`;
  assert.equal(context(t, t.length).what, 'var');
});

test('a "timeout:" line of its own is a slot', () => {
  const t = `${head}  - expectText: Hi\n    timeout: `;
  const ctx = context(t, t.length);
  assert.equal(ctx.what, 'slot');
  assert.equal(ctx.key, 'timeout');
});

test('a word at column 0 is a setting or a test', () => {
  assert.equal(context('va', 2).what, 'top');
});

test('the whole argument after "- click: " is one slot', () => {
  const t = `${head}  - click: `;
  const ctx = context(t, t.length);
  assert.equal(ctx.what, 'arg');
  assert.equal(ctx.action, 'click');
});

test('nowhere to suggest anything reads as nothing', () => {
  assert.equal(context('', 0)?.what, 'top', 'an empty file is where a setting or a test goes');
  // Half way through a var's value: not a slot the catalog has anything to say about.
  const t = 'vars:\n  email: a@b';
  assert.equal(context(t, t.length), null);
});

/* ---------- The vars a file has named ---------- */

test('fileInfo reads the names under "vars:"', () => {
  assert.deepEqual(fileInfo('vars:\n  email: a\n  tag: b\n\ntest: t\n').vars, ['email', 'tag']);
  assert.deepEqual(fileInfo('vars:\n  email: a\n  # a comment\n  tag: b\n').vars, ['email', 'tag']);
  assert.deepEqual(fileInfo('test: t\nsteps:\n  - click: A\n').vars, [], 'a step is not a var');
});

/* ---------- What each action may act on ---------- */

test('every action is offered, and only the actions', () => {
  const found = labels(`${head}  - `);
  assert.deepEqual(found.sort(), Object.keys(ACTIONS).sort());
});

test('an action only ever offers what it could act on', () => {
  // This is the whole point: after "- select:" only the page's selects.
  assert.deepEqual(inserts(`${head}  - click: `),
    ['{ role: button, name: Log in }', '{ role: button, name: Log out }', '{ label: Terms }'],
    'the clickables and the boxes, which are clickable too');
  assert.deepEqual(inserts(`${head}  - fill: `),
    ['{ label: Email, value: "" }', '{ placeholder: Search, value: "" }']);
  assert.deepEqual(inserts(`${head}  - check: `), ['{ label: Terms }']);
  assert.deepEqual(inserts(`${head}  - uncheck: `), ['{ label: Terms }']);
});

test('a select offers its own options, and only its own', () => {
  assert.deepEqual(inserts(`${head}  - select: `),
    ['{ label: Country, value: France }', '{ label: Country, value: Spain }']);
  assert.deepEqual(labels(`${head}  - select: `), ['France', 'Spain']);
});

test('a filled field lands valid, with the caret inside the quotes', () => {
  const r = at(`${head}  - fill: `);
  const item = r.items[0];
  assert.equal(item.insert, '{ label: Email, value: "" }');
  assert.equal(item.insert[item.caret], '"', 'the caret waits between the quotes');
  assert.equal(validate(`${head}  - fill: ${item.insert}\n`).error, undefined);
});

test('expectVisible may look at anything on the page, a heading included', () => {
  const found = inserts(`${head}  - expectVisible: `);
  assert.ok(found.includes('{ role: heading, name: Welcome back }'));
  assert.ok(found.includes('{ role: button, name: Log in }'));
});

test('expectText offers the page’s own text', () => {
  const found = labels(`${head}  - expectText: `);
  assert.ok(found.includes('Welcome back'));
  assert.ok(found.includes('Email'));
});

/* ---------- One slot at a time ---------- */

test('a role slot offers the roles this page has', () => {
  const found = inserts(`${head}  - click: { role: `);
  assert.deepEqual(found, ['button', 'checkbox']);
});

test('a name slot is narrowed by the role already written', () => {
  assert.deepEqual(inserts(`${head}  - click: { role: button, name: `), ['Log in', 'Log out']);
});

test('a key is only offered where this page’s elements use it', () => {
  // A field that has a label is not worth offering a "role:" for.
  assert.deepEqual(labels(`${head}  - fill: { `), ['label', 'placeholder', 'value', 'timeout']);
  assert.deepEqual(labels(`${head}  - check: { `), ['label', 'timeout']);
});

test('a key already written is not offered again', () => {
  assert.ok(!labels(`${head}  - click: { role: button, `).includes('role'));
});

test('the range check has keys of its own rather than a target’s', () => {
  assert.deepEqual(labels(`${head}  - expectTextInRange: { `), ['text', 'min', 'max', 'timeout']);
  assert.deepEqual(labels(`${head}  - expectTextInRange: { text: n, `), ['min', 'max', 'timeout']);
});

test('a value slot on a select offers that select’s options', () => {
  assert.deepEqual(labels(`${head}  - select: { label: Country, value: `), ['France', 'Spain']);
  assert.deepEqual(labels(`${head}  - fill: { label: Email, value: `), [], 'a field has no list of right answers');
});

test('a timeout slot offers waits, in ms', () => {
  assert.deepEqual(inserts(`${head}  - expectText: Hi\n    timeout: `), ['4000', '8000', '12000']);
});

test('wait offers a number of ms', () => {
  assert.deepEqual(inserts(`${head}  - wait: `), ['500', '1000', '2000']);
});

test('a variable slot offers the file’s names and ${unique}', () => {
  const t = `vars:\n  email: a\n\n${head}  - fill: { label: Email, value: "\${`;
  assert.deepEqual(labels(t), ['email', 'unique']);
});

test('it says nothing where nothing can be suggested', () => {
  assert.equal(at(`${head}  - click: { role: button, name: Nothing like this`), null);
  assert.equal(at(`${head}  - select: { label: Email, value: `), null, 'Email is not a select');
});

/* ---------- Everything it offers has to work ---------- */

test('every suggestion parses, and resolves on the page', () => {
  for (const action of ['click', 'fill', 'select', 'check', 'uncheck', 'expectVisible', 'expectText']){
    const yaml = `${head}  - ${action}: `;
    for (const it of (at(yaml) || { items: [] }).items){
      const full = yaml + it.insert + '\n';
      const { error, spec } = validate(full);
      assert.equal(error, undefined, `${action} ${it.insert}: ${error}`);
      const step = spec.tests[0].steps[0];
      if (step.target) assert.ok(query(step.target, true).length, `${action} ${it.insert}: not on the page`);
    }
  }
});

test('a suggestion knows the span it replaces', () => {
  const t = `${head}  - cl`;
  const r = suggest(t, t.length, cat);
  assert.equal(r.word, 'cl');
  assert.equal(t.slice(r.from, r.to), 'cl');
});
