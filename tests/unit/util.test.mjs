// Small helpers every mode shares. What the Results head says at the end of a
// run is one of them, so the site modes and the code modes say it alike.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { runSummary } = await load('src/util.js');

test('a run that passed says how many tests and how long', () => {
  assert.deepEqual(runSummary({ ran: 4, passed: 4, secs: '0.3' }), { text: 'All 4 tests passed in 0.3s', ok: true });
  assert.deepEqual(runSummary({ ran: 1, passed: 1, secs: '0.1' }), { text: 'The test passed in 0.1s', ok: true });
});

test('a run that failed says how many of how many', () => {
  assert.deepEqual(runSummary({ ran: 4, passed: 3, secs: '0.3' }), { text: '1 of 4 tests failed (0.3s)', ok: false });
  assert.deepEqual(runSummary({ ran: 1, passed: 0, secs: '2.0' }), { text: '1 of 1 test failed (2.0s)', ok: false });
});

test('a stopped run says how far it got', () => {
  assert.deepEqual(runSummary({ ran: 3, passed: 2, secs: '1.0', stopped: true }), { text: 'Stopped. 2 of 3 tests passed.', ok: false });
  assert.deepEqual(runSummary({ ran: 1, passed: 0, secs: '1.0', stopped: true }), { text: 'Stopped. 0 of 1 test passed.', ok: false });
});
