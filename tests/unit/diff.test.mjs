// Compare's Diff: which lines of two test files differ, and where
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { diffLines, markHtml } = await load('src/code/diff.js');

test('lines both files have are not marked, whatever their indentation', () => {
  const [a, b] = diffLines('x = 1\nstack.pop()', 'x = 1\n    stack.pop()');
  assert.deepEqual([a, b], [[null, null], [null, null]]);
});

test('a check written another way marks only the tokens that differ', () => {
  const [[a], [b]] = diffLines('    assert len(stack) == 1', '        self.assertEqual(len(self.stack), 1)');
  const said = (line, ranges) => ranges.map(([s, e]) => line.slice(s, e));
  assert.deepEqual(said('    assert len(stack) == 1', a), ['assert', '==']);
  assert.deepEqual(said('        self.assertEqual(len(self.stack), 1)', b), ['self.assertEqual(', 'self.', ',', ')']);
});

test('a line with nothing like it on the other side is marked whole', () => {
  const [a, b] = diffLines('import pytest\nx = 1', 'x = 1\nif __name__ == "__main__":\n    unittest.main()');
  assert.deepEqual(a, [true, null]);
  assert.deepEqual(b, [null, true, true]);
});

test('comments and blank lines are never marked', () => {
  const [a, b] = diffLines('# a fixture\n\nx = 1', '// setUp runs first\n * more\nx = 1');
  assert.deepEqual([a, b], [[null, null, null], [null, null, null]]);
});

test('marks nest around the highlighter\'s own tags and count an entity as one character', () => {
  assert.equal(markHtml('<i class="k">assert</i> a &lt; b', [[0, 3], [9, 10]]), '<i class="k"><mark>ass</mark>ert</i> a <mark>&lt;</mark> b');
  assert.equal(markHtml('<i class="k">def</i> f', [[0, 5]]), '<i class="k"><mark>def</mark></i><mark> f</mark>');
});
