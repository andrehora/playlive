// Test smells: the one score that reads the file rather than a run, so the one
// with nothing to ask a browser. Each rule is checked for what it catches and
// for what it must not — a smell that cries wolf teaches people to ignore the
// panel — and the corpus pin says what the rules make of all hundred examples,
// so a new example with an accidental smell in it fails the suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpus, load, spec } from './env.mjs';

const { report, SMELLS, EAGER, ROULETTE, phasesOf, checksIn } = await load('src/smells.js');

const smells = text => report(text).items.map(i => i.smell);
const of = (text, id) => report(text).items.filter(i => i.smell === id);
// Four acts and checks over: an Eager Test by the shipped threshold.
const eagerBody = n => Array.from({ length: n }, (_, i) => `  - click: Step${i}\n  - expectText: Saw${i}`).join('\n');

/* ---------- The catalogue itself ---------- */

test('every smell has a name and a sentence saying what to do', () => {
  assert.ok(SMELLS.length >= 5);
  for (const s of SMELLS){
    assert.match(s.id, /^[a-z-]+$/);
    assert.ok(s.name && s.name[0] === s.name[0].toUpperCase(), `${s.id} needs a name`);
    assert.ok(s.why && s.why.endsWith('.'), `${s.id} needs a sentence`);
  }
  assert.equal(new Set(SMELLS.map(s => s.id)).size, SMELLS.length, 'ids are unique');
});

test('a file that does not parse is left to the error box', () => {
  const r = report('test: T\nsteps:\n  - nonsense\n');
  assert.equal(r.parsed, false);
  assert.deepEqual(r.items, []);
  assert.equal(r.total, 0);
});

test('every row goes to a line, so none is offered without one', () => {
  const text = 'test: Checks nothing\nsteps:\n  - click: A\n';
  for (const i of report(text).items) assert.ok(i.line >= 0, `${i.smell} has no line`);
});

/* ---------- Unknown Test ---------- */

test('a test with no check of its own is an Unknown Test', () => {
  const r = of('test: Clicks about\nsteps:\n  - click: A\n  - click: B\n', 'unknown-test');
  assert.equal(r.length, 1);
  assert.equal(r[0].what, 'Clicks about');
  assert.equal(r[0].line, 0, 'the row goes to the "test:" line');
});

test('any one of the four checks answers it, expectTextInRange included', () => {
  for (const check of ['expectText: Hi', 'expectNoText: Oops', 'expectVisible: { role: button, name: Go }',
    'expectTextInRange: { text: n, min: 1, max: 9 }']){
    assert.deepEqual(smells(`test: T\nsteps:\n  - click: A\n  - ${check}\n`), [], check);
  }
});

test('a check inherited from beforeEach is not the test’s own claim', () => {
  const text = 'beforeEach:\n  - expectText: Ready\n\ntest: Clicks about\nsteps:\n  - click: A\n';
  assert.deepEqual(smells(text), ['unknown-test']);
});

/* ---------- Eager Test ---------- */

test('a test that acts and checks four times over is an Eager Test', () => {
  const r = of(`test: Does it all\nsteps:\n${eagerBody(EAGER)}\n`, 'eager-test');
  assert.equal(r.length, 1);
  assert.match(r[0].detail, new RegExp(`acts and checks ${EAGER} times over`));
});

test('one act and check short of the threshold is not one', () => {
  assert.deepEqual(of(`test: T\nsteps:\n${eagerBody(EAGER - 1)}\n`, 'eager-test'), []);
});

test('a phase is a run of checks, however many checks are in it', () => {
  // Three checks in a row prove one thing; they are one phase, not three.
  const text = 'test: T\nsteps:\n  - click: A\n  - expectText: One\n  - expectText: Two\n  - expectText: Three\n';
  assert.deepEqual(of(text, 'eager-test'), []);
  assert.equal(report(text).items.filter(i => i.smell === 'eager-test').length, 0);
});

test('phasesOf counts the runs of checks and checksIn counts the checks', () => {
  const steps = [{ action: 'click' }, { action: 'expectText' }, { action: 'expectText' },
    { action: 'click' }, { action: 'expectVisible' }];
  assert.equal(phasesOf(steps), 2);
  assert.equal(checksIn(steps), 3);
  assert.equal(phasesOf([]), 0);
  assert.equal(phasesOf([{ action: 'click' }]), 0);
});

/* ---------- Assertion Roulette ---------- */

test('more than five checks under one title is Assertion Roulette', () => {
  const checks = n => Array.from({ length: n }, (_, i) => `  - expectText: Line${i}`).join('\n');
  const r = of(`test: Reads the lot\nsteps:\n  - click: A\n${checks(ROULETTE + 1)}\n`, 'assertion-roulette');
  assert.equal(r.length, 1);
  assert.match(r[0].detail, new RegExp(`${ROULETTE + 1} checks under one title`));
  assert.deepEqual(of(`test: T\nsteps:\n  - click: A\n${checks(ROULETTE)}\n`, 'assertion-roulette'), []);
});

test('a beforeEach full of checks is not the test’s roulette', () => {
  const before = Array.from({ length: ROULETTE + 2 }, (_, i) => `  - expectText: Pre${i}`).join('\n');
  const text = `beforeEach:\n${before}\n\ntest: T\nsteps:\n  - click: A\n  - expectText: Mine\n`;
  assert.deepEqual(smells(text), []);
});

test('a test can be both Eager and Roulette, because they are different diagnoses', () => {
  const body = Array.from({ length: EAGER }, (_, i) =>
    `  - click: Step${i}\n  - expectText: A${i}\n  - expectText: B${i}`).join('\n');
  const found = smells(`test: T\nsteps:\n${body}\n`);
  assert.ok(found.includes('eager-test'), 'it proves several things');
  assert.ok(found.includes('assertion-roulette'), 'and nothing says which claim was the point');
});

/* ---------- Magic Value ---------- */

test('a value typed out twice is a Magic Value', () => {
  const text = [
    'test: One', 'steps:', '  - fill: { label: Postcode, value: SW1A 1AA }', '  - expectText: Saved', '',
    'test: Two', 'steps:', '  - fill: { label: Postcode, value: SW1A 1AA }', '  - expectText: Saved', ''
  ].join('\n');
  const r = of(text, 'magic-value');
  assert.equal(r.length, 1);
  assert.equal(r[0].what, '“SW1A 1AA”');
  assert.match(r[0].detail, /written out in 2 places/);
});

test('a value named under vars: has nothing to answer for', () => {
  const text = [
    'vars:', '  postcode: SW1A 1AA', '',
    'test: One', 'steps:', '  - fill: { label: Postcode, value: "${postcode}" }', '  - expectText: Saved', '',
    'test: Two', 'steps:', '  - fill: { label: Postcode, value: "${postcode}" }', '  - expectText: Saved', ''
  ].join('\n');
  assert.deepEqual(of(text, 'magic-value'), [], 'the step line says ${postcode}, not the value');
});

test('once is a value, not a value with no name', () => {
  const text = 'test: One\nsteps:\n  - fill: { label: Postcode, value: SW1A 1AA }\n  - expectText: Saved\n';
  assert.deepEqual(of(text, 'magic-value'), []);
});

test('a number in what a check looks for is not a value', () => {
  // "Count: 3" is the words of a message, not a constant somebody supplied.
  const text = [
    'test: One', 'steps:', '  - click: Add', '  - expectText: "Count: 3"', '',
    'test: Two', 'steps:', '  - click: Add', '  - expectText: "Count: 3"', ''
  ].join('\n');
  assert.deepEqual(of(text, 'magic-value'), []);
});

test('a value with no digits in it is not counted', () => {
  const text = [
    'test: One', 'steps:', '  - fill: { label: Name, value: Ana }', '  - expectText: Saved', '',
    'test: Two', 'steps:', '  - fill: { label: Name, value: Ana }', '  - expectText: Saved', ''
  ].join('\n');
  assert.deepEqual(of(text, 'magic-value'), []);
});

test('the same value twice on one line is one place', () => {
  const text = [
    'test: One', 'steps:',
    '  - fill: { label: A, value: 4000, timeout: 4000 }', '  - expectText: Saved', ''
  ].join('\n');
  assert.deepEqual(of(text, 'magic-value'), []);
});

/* ---------- Duplication of Setup ---------- */

test('every test opening the same way is Duplication of Setup, step by step', () => {
  const text = [
    'test: One', 'steps:', '  - click: Open', '  - fill: { label: Email, value: a@b.test }', '  - expectText: Hi', '',
    'test: Two', 'steps:', '  - click: Open', '  - fill: { label: Email, value: a@b.test }', '  - expectText: Bye', ''
  ].join('\n');
  const r = of(text, 'duplication-of-setup');
  assert.equal(r.length, 2, 'both shared steps are reported');
  assert.match(r[0].what, /Click/);
  assert.match(r[1].what, /Email/);
  for (const i of r) assert.match(i.detail, /at the start of all 2 tests/);
  assert.deepEqual(r.map(i => i.line), [2, 3], 'each row goes to the line that would move');
});

test('an opening that is not shared is not one', () => {
  const text = [
    'test: One', 'steps:', '  - click: Open', '  - expectText: Hi', '',
    'test: Two', 'steps:', '  - click: Other', '  - expectText: Bye', ''
  ].join('\n');
  assert.deepEqual(of(text, 'duplication-of-setup'), []);
});

test('an opening already in beforeEach is not repetition', () => {
  const text = [
    'beforeEach:', '  - click: Open', '',
    'test: One', 'steps:', '  - expectText: Hi', '',
    'test: Two', 'steps:', '  - expectText: Bye', ''
  ].join('\n');
  assert.deepEqual(of(text, 'duplication-of-setup'), []);
});

test('one test cannot share an opening with itself', () => {
  assert.deepEqual(of('test: One\nsteps:\n  - click: Open\n  - expectText: Hi\n', 'duplication-of-setup'), []);
});

/* ---------- The editor's own file ---------- */

test('with no argument it reads what the editor holds', async () => {
  await spec('test: Clicks about\nsteps:\n  - click: A\n');
  assert.deepEqual(report().items.map(i => i.smell), ['unknown-test']);
});

/* ---------- The corpus ----------
   Almost every example ships clean, and the seven deliberate ones are there
   because a panel that names five smells and can only show you two of them
   teaches half of what it knows. This pins what the rules make of all hundred,
   so an accidental smell in a new example fails the suite rather than quietly
   joining the list.                                                          */

test('what the smells make of all 100 examples', async () => {
  const found = [];
  for (const { id, yaml } of await corpus()){
    const r = report(yaml);
    if (!r.parsed){ found.push(`${id}: does not parse`); continue; }
    for (const i of r.items) found.push(`${id}: ${i.smell}: ${i.what}`);
  }
  assert.deepEqual(found, [
    'address-form: magic-value: “1 Main Street”',
    'quantity-stepper: duplication-of-setup: Click button “Increase quantity”',
    'retry-on-error: duplication-of-setup: Click button “Load orders”',
    'shopping-cart: eager-test: Fills the cart one product at a time',
    'status-page: assertion-roulette: Reads the whole page in one go',
    'two-factor: magic-value: “111111”',
    'flight-search: magic-value: “2026-04-18”',
    'store-locator: magic-value: “10 km”',
    'table-booking: magic-value: “19:30”',
    'expense-splitter: magic-value: “30”',
    'paged-list: duplication-of-setup: Click button “Next”',
    'like-button: unknown-test: Likes and unlikes the post',
    'click-counter: unknown-test: Clicks the button a few times',
    'todo-list: eager-test: Works through a list of two tasks',
    'video-quality: magic-value: “1080p”',
    'symptom-form: magic-value: “2 days”',
    'kpi-goals: magic-value: “Q2”',
    'metric-tiles: assertion-roulette: Checks every tile before and after comparing',
    'number-guess: magic-value: “10”',
    'score-board: eager-test: Plays a match from the first score to the reset'
  ]);
});

// The seven written to be found. The magic values and repeated openings in the
// pin above are incidental — real, and worth the panel naming, but not put
// there on purpose — so only these three kinds carry a comment.
const DELIBERATE = ['unknown-test', 'eager-test', 'assertion-roulette'];

test('the seven deliberate smells are seven, and each says so in its file', async () => {
  const deliberate = [];
  for (const { id, yaml } of await corpus()){
    const mine = report(yaml).items.filter(i => DELIBERATE.includes(i.smell));
    if (!mine.length) continue;
    deliberate.push(...mine.map(i => `${id}: ${i.smell}`));
    // The comment sits above the test it is about, so the line before it.
    const lines = yaml.split('\n');
    for (const i of mine){
      const above = lines.slice(Math.max(0, i.line - 3), i.line).join(' ');
      assert.match(above, /#/, `${id}: the deliberate ${i.smell} should have a comment above it saying so`);
    }
  }
  assert.deepEqual(deliberate, [
    'shopping-cart: eager-test',
    'status-page: assertion-roulette',
    'like-button: unknown-test',
    'click-counter: unknown-test',
    'todo-list: eager-test',
    'metric-tiles: assertion-roulette',
    'score-board: eager-test'
  ]);
  assert.equal(deliberate.length, 7, 'two Unknown Tests, three Eager Tests and two Assertion Roulettes');
});

test('every smell the panel names is one some example has', async () => {
  const seen = new Set();
  for (const { yaml } of await corpus()) for (const i of report(yaml).items) seen.add(i.smell);
  for (const s of SMELLS) assert.ok(seen.has(s.id), `nothing in the corpus has ${s.id}, so the catalogue cannot show it`);
});
