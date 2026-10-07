// Run history: what makes two runs the same test, which is what the flaky badge
// is counted over. Editing a test has to start a fresh history, or a badge
// would be about a test nobody is looking at any more.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { testKey, recordHistory, runHistory } = await load('src/history.js');
const { validate } = await load('src/parse.js');

const testsOf = text => validate(text).spec.tests;

test('the same title and the same steps are the same test', () => {
  const a = testsOf('test: T\nsteps:\n  - click: A\n')[0];
  const b = testsOf('test: T\nsteps:\n  - click: A\n')[0];
  assert.equal(testKey(a, 'login'), testKey(b, 'login'));
});

test('where a step was written is not part of what the test is', () => {
  // The same test with a comment above it is the same test.
  const a = testsOf('test: T\nsteps:\n  - click: A\n')[0];
  const b = testsOf('# a note\n\ntest: T\nsteps:\n  - click: A\n')[0];
  assert.equal(testKey(a, 'login'), testKey(b, 'login'));
});

test('editing a step starts a fresh history', () => {
  const a = testsOf('test: T\nsteps:\n  - click: A\n')[0];
  const b = testsOf('test: T\nsteps:\n  - click: B\n')[0];
  assert.notEqual(testKey(a, 'login'), testKey(b, 'login'));
});

test('renaming a test starts a fresh history', () => {
  const a = testsOf('test: One\nsteps:\n  - click: A\n')[0];
  const b = testsOf('test: Two\nsteps:\n  - click: A\n')[0];
  assert.notEqual(testKey(a, 'login'), testKey(b, 'login'));
});

test('the same test on two sites is two tests', () => {
  const t = testsOf('test: T\nsteps:\n  - click: A\n')[0];
  assert.notEqual(testKey(t, 'login'), testKey(t, 'signup'));
  assert.match(testKey(t, 'login'), /^login:/, 'the key says which site it is about');
});

test('a run is remembered, and only the last twenty', () => {
  const key = 'fixture:only';
  for (let i = 0; i < 25; i++) recordHistory(key, i % 2 === 0);
  assert.equal(runHistory[key].length, 20);
  assert.deepEqual(runHistory[key].slice(-2), [0, 1], 'the newest runs are the ones kept');
});
