// Test smells: the one score that reads the file rather than a run, so the one
// with nothing to ask a browser. Each rule is checked for what it catches and
// for what it must not — a smell that cries wolf teaches people to ignore the
// panel — and the corpus pin says what the rules make of all hundred examples,
// so a new example with an accidental smell in it fails the suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpus, load, spec } from './env.mjs';

const { report, SMELLS, ROULETTE, checksIn } = await load('src/html/smells.js');

const smells = text => report(text).items.map(i => i.smell);
const of = (text, id) => report(text).items.filter(i => i.smell === id);

/* ---------- The catalogue itself ---------- */

test('every smell has a name and a sentence saying what to do', () => {
  assert.ok(SMELLS.length >= 4);
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

test('any one of the four checks answers it, expectNumber included', () => {
  for (const check of ['expectText: Hi', 'expectNoText: Oops', 'expectVisible: { role: button, name: Go }',
    'expectNumber: { text: n, min: 1, max: 9 }']){
    assert.deepEqual(smells(`test: T\nsteps:\n  - click: A\n  - ${check}\n`), [], check);
  }
});

test('a check inherited from beforeEach is not the test’s own claim', () => {
  const text = 'beforeEach:\n  - expectText: Ready\n\ntest: Clicks about\nsteps:\n  - click: A\n';
  assert.deepEqual(smells(text), ['unknown-test']);
});

test('checksIn counts the checks', () => {
  const steps = [{ action: 'click' }, { action: 'expectText' }, { action: 'expectText' },
    { action: 'click' }, { action: 'expectVisible' }];
  assert.equal(checksIn(steps), 3);
  assert.equal(checksIn([]), 0);
  assert.equal(checksIn([{ action: 'click' }]), 0);
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

/* ---------- General Fixture ---------- */

const login = (first = '  - fill: { label: Password, value: wrong }', before = '') => [
  'beforeEach:', '  - fill: { label: Email, value: a@b.test }', '  - fill: { label: Password, value: right }', before, '',
  'test: Wrong password', 'steps:', first, '  - click: Log in', '  - expectText: Wrong', '',
  'test: Right password', 'steps:', '  - click: Log in', '  - expectText: Welcome', ''
].filter(l => l !== null).join('\n');

test('a beforeEach fill a test replaces first thing is a General Fixture', () => {
  const r = of(login(), 'general-fixture');
  assert.equal(r.length, 1);
  assert.match(r[0].what, /Password/);
  assert.match(r[0].detail, /replaced by 1 of 2 tests/);
  assert.equal(r[0].line, 2, 'the row goes to the beforeEach line, where the fix is');
});

test('so is a beforeEach select, and one every test replaces says so', () => {
  const text = [
    'beforeEach:', '  - select: { label: Country, value: Spain }', '',
    'test: A', 'steps:', '  - select: { label: Country, value: France }', '  - expectText: Paris', '',
    'test: B', 'steps:', '  - select: { label: Country, value: Italy }', '  - expectText: Rome', ''
  ].join('\n');
  const r = of(text, 'general-fixture');
  assert.equal(r.length, 1);
  assert.match(r[0].detail, /replaced by every test/);
});

test('a test that fills the same value, or another field, replaces nothing', () => {
  assert.deepEqual(of(login('  - fill: { label: Password, value: right }'), 'general-fixture'), []);
  assert.deepEqual(of(login('  - fill: { label: Name, value: wrong }'), 'general-fixture'), []);
  assert.deepEqual(of(login('  - fill: { placeholder: Password, value: wrong }'), 'general-fixture'), [],
    'the same box spelled another way might not be the same box');
});

test('a replacement that is not the test’s first step may come after the value was used', () => {
  const text = login('  - click: Show password\n  - fill: { label: Password, value: wrong }');
  assert.deepEqual(of(text, 'general-fixture'), []);
});

test('a beforeEach that goes on to use the value is not one', () => {
  assert.deepEqual(of(login(undefined, '  - click: Log in'), 'general-fixture'), []);
  assert.deepEqual(of(login(undefined, '  - expectText: Ready'), 'general-fixture'), []);
  // Setting another field after it uses nothing.
  assert.equal(of(login(undefined, '  - fill: { label: Code, value: 1 }'), 'general-fixture').length, 1);
});

test('fill and select do not replace each other, and clicks and checks are never the fixture', () => {
  assert.deepEqual(of(login('  - select: { label: Password, value: wrong }'), 'general-fixture'), []);
  const text = 'beforeEach:\n  - click: Open\n\ntest: T\nsteps:\n  - click: Open\n  - expectText: Hi\n';
  assert.deepEqual(of(text, 'general-fixture'), []);
});

/* ---------- The editor's own file ---------- */

test('with no argument it reads what the editor holds', async () => {
  await spec('test: Clicks about\nsteps:\n  - click: A\n');
  assert.deepEqual(report().items.map(i => i.smell), ['unknown-test']);
});

/* ---------- The corpus ----------
   Almost every example ships clean, and the five deliberate ones are there
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
    'quantity-stepper: duplication-of-setup: Click button “Increase quantity”',
    'retry-on-error: duplication-of-setup: Click button “Load orders”',
    'status-page: assertion-roulette: Reads the whole page in one go',
    'login: general-fixture: Type “secret123” into field “Password”',
    'paged-list: duplication-of-setup: Click button “Next”',
    'like-button: unknown-test: Likes and unlikes the post',
    'click-counter: unknown-test: Clicks the button a few times',
    'metric-tiles: assertion-roulette: Checks every tile before and after comparing',
  ]);
});

// The five written to be found. The repeated openings in the pin above are
// incidental — real, and worth the panel naming, but not put there on purpose.
// Finding these is the exercise, so no file says which they are: no comment
// names a smell, or says a test is smelly.
const DELIBERATE = ['unknown-test', 'assertion-roulette', 'general-fixture'];

test('the five deliberate smells are five, and no file gives one away', async () => {
  const deliberate = [];
  const names = new RegExp(['smell', ...SMELLS.map(s => s.name)].join('|'), 'i');
  for (const { id, yaml } of await corpus()){
    const comments = yaml.split('\n').filter(l => /^\s*#/.test(l)).join('\n');
    assert.doesNotMatch(comments, names, `${id}: a comment names a smell; let the panel find it`);
    const mine = report(yaml).items.filter(i => DELIBERATE.includes(i.smell));
    deliberate.push(...mine.map(i => `${id}: ${i.smell}`));
  }
  assert.deepEqual(deliberate, [
    'status-page: assertion-roulette',
    'login: general-fixture',
    'like-button: unknown-test',
    'click-counter: unknown-test',
    'metric-tiles: assertion-roulette',
  ]);
  assert.equal(deliberate.length, 5, 'two Unknown Tests, two Assertion Roulettes and a General Fixture');
});

test('every smell the panel names is one some example has', async () => {
  const seen = new Set();
  for (const { yaml } of await corpus()) for (const i of report(yaml).items) seen.add(i.smell);
  for (const s of SMELLS) assert.ok(seen.has(s.id), `nothing in the corpus has ${s.id}, so the catalogue cannot show it`);
});
