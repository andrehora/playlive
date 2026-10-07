// Create: the titles are the brief, and a title is done when the file holds a
// test by that exact name making every check the example's own test makes.
// That rule is the whole mode, and it reads two files — the one on screen and
// the one the example ships — so it has nothing to ask a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpus, load } from './env.mjs';

const { titlesOf, checksOf, report, createSkeleton } = await load('src/create.js');
const { exampleCache } = await load('src/sites.js');
const { validate } = await load('src/parse.js');

// report() reads the shipped file out of the cache the first render fills, so a
// test says which file it is marking against.
function against(shipped, written, site = 'fixture'){
  exampleCache[site] = shipped;
  return report(written, site);
}
const states = r => r.items.map(i => `${i.title}: ${i.state}`);

/* ---------- The briefs ---------- */

test('the titles are the briefs, in file order', () => {
  const text = 'test: One\nsteps:\n  - expectText: A\n\ntest: Two\nsteps:\n  - expectText: B\n';
  assert.deepEqual(titlesOf(text), ['One', 'Two']);
});

test('a test that checks nothing is not offered as a brief', () => {
  // A brief is "prove this", and there is nothing there to prove or mark done.
  const text = 'test: Proves something\nsteps:\n  - expectText: A\n\ntest: Checks nothing\nsteps:\n  - click: B\n';
  assert.deepEqual(titlesOf(text), ['Proves something']);
});

test('a file that does not parse still gives up its titles', () => {
  assert.deepEqual(titlesOf('test: Still a title\nsteps:\n  - nonsense: {\n'), ['Still a title']);
  assert.deepEqual(titlesOf('test: "Quoted"\nsteps:\n  - nonsense: {\n'), ['Quoted']);
});

test('the skeleton is the titles as comments and nothing else', async () => {
  exampleCache.fixture = 'test: One\nsteps:\n  - expectText: A\n\ntest: Two\nsteps:\n  - expectText: B\n';
  assert.equal(await createSkeleton('fixture'), '# One\n\n# Two\n');
});

/* ---------- What a check claims ---------- */

test('checksOf reads a test’s own checks, by what they claim', () => {
  const v = validate('test: T\nsteps:\n  - expectText: Hi\n  - expectVisible: { role: button, name: Go }\n  - click: A\n');
  assert.deepEqual(checksOf(v.spec.tests[0]), ['expectText Hi', 'expectVisible [["name","Go"],["role","button"]]']);
  assert.deepEqual(checksOf(undefined), []);
});

test('a check inherited from beforeEach counts on neither side', () => {
  const v = validate('beforeEach:\n  - expectText: Ready\n\ntest: T\nsteps:\n  - expectText: Mine\n');
  assert.deepEqual(checksOf(v.spec.tests[0]), ['expectText Mine']);
});

/* ---------- Marking ---------- */

const SHIPPED = [
  'test: Shows the dashboard', 'steps:',
  '  - click: { role: button, name: Log in }',
  '  - expectText: Welcome back', ''
].join('\n');

test('nothing written is todo', () => {
  const r = against(SHIPPED, '# Shows the dashboard\n');
  assert.deepEqual(states(r), ['Shows the dashboard: todo']);
  assert.equal(r.score, 0);
  assert.equal(r.todo, 1);
  assert.equal(r.items[0].line, 0, 'the row goes to the comment');
});

test('the right title with the right check is done, by whatever steps', () => {
  // The steps are yours; there is usually more than one way.
  const r = against(SHIPPED, 'test: Shows the dashboard\nsteps:\n  - click: Log in\n  - expectText: Welcome back\n');
  assert.deepEqual(states(r), ['Shows the dashboard: done']);
  assert.equal(r.score, 1);
  assert.equal(r.items[0].line, 0, 'the row goes to the test');
  assert.equal(r.items[0].steps, 2);
});

test('the right title without the example’s check is doing, not done', () => {
  const r = against(SHIPPED, 'test: Shows the dashboard\nsteps:\n  - click: Log in\n  - expectText: Something else\n');
  assert.deepEqual(states(r), ['Shows the dashboard: nocheck']);
  assert.equal(r.nocheck, 1);
});

test('a title has to match exactly', () => {
  assert.deepEqual(states(against(SHIPPED, 'test: shows the dashboard\nsteps:\n  - expectText: Welcome back\n')),
    ['Shows the dashboard: todo']);
  assert.deepEqual(states(against(SHIPPED, 'test: Shows the dashboard!\nsteps:\n  - expectText: Welcome back\n')),
    ['Shows the dashboard: todo']);
});

test('extra checks beyond the example’s are fine; missing ones are not', () => {
  const shipped = 'test: T\nsteps:\n  - expectText: A\n  - expectText: B\n';
  assert.deepEqual(states(against(shipped, 'test: T\nsteps:\n  - expectText: A\n  - expectText: B\n  - expectText: C\n')), ['T: done']);
  assert.deepEqual(states(against(shipped, 'test: T\nsteps:\n  - expectText: A\n')), ['T: nocheck']);
});

test('a check inherited from beforeEach does not count as the test’s own', () => {
  const r = against(SHIPPED, 'beforeEach:\n  - expectText: Welcome back\n\ntest: Shows the dashboard\nsteps:\n  - click: Log in\n');
  // It runs inside the test, but it is not what the test claims.
  assert.deepEqual(states(r), ['Shows the dashboard: nocheck']);
});

test('the score is the done count out of the briefs', () => {
  const shipped = 'test: One\nsteps:\n  - expectText: A\n\ntest: Two\nsteps:\n  - expectText: B\n';
  const r = against(shipped, 'test: One\nsteps:\n  - expectText: A\n');
  assert.equal(r.total, 2);
  assert.equal(r.done, 1);
  assert.equal(r.score, 0.5);
});

test('an example whose own test checks nothing asks only for a check', () => {
  // It could not ask for a particular one, so any check answers it.
  const r = against('test: T\nsteps:\n  - click: A\n', 'test: T\nsteps:\n  - expectText: Anything\n');
  // The brief is not offered at all, since the shipped test proves nothing.
  assert.deepEqual(r.items, []);
  assert.equal(r.total, 0);
});

test('a file that does not parse scores nothing rather than throwing', () => {
  const r = against(SHIPPED, 'test: Shows the dashboard\nsteps:\n  - nonsense: {\n');
  assert.deepEqual(states(r), ['Shows the dashboard: todo']);
});

test('an example whose file has not landed yet reports nothing', () => {
  delete exampleCache['not-fetched'];
  const r = report('test: Anything\nsteps:\n  - expectText: A\n', 'not-fetched');
  assert.equal(r.total, 0);
});

/* ---------- The answer key has to be a valid answer ---------- */

test('every example’s own tests are a full answer to its own briefs', async () => {
  const short = [];
  for (const { id, yaml } of await corpus()){
    exampleCache[id] = yaml;
    const r = report(yaml, id);
    if (!r.total) short.push(`${id}: no titles`);
    else if (r.done !== r.total) short.push(`${id}: ${r.done} of ${r.total}`);
  }
  assert.deepEqual(short, [], 'the answer key has to score full marks, or the brief asks for something unreachable');
});

test('every example offers at least one brief', async () => {
  for (const { id, yaml } of await corpus()){
    assert.ok(titlesOf(yaml).length > 0, `${id} offers nothing to write`);
  }
});
