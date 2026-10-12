// Compare keeps both sides level: the same test, paired by name, and where a line falls on the other side
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { anchorsOf, mapLine, pairTests, testSpans } = await load('src/code/pair.js');

const PY = `import pytest


@pytest.fixture
def stack():
    return Stack()


@pytest.mark.slow
def test_has_soup(stack):
    assert stack


def test_doesnt_pop(stack):
    assert stack
`;
const JS = `describe("Menu", () => {
  it("has soup", () => {
    expect(1).toBe(1);
  });

  it("doesn't pop", () => expect(1).toBe(1));
});
`;

test('a Python test runs from its decorators to its body\'s end', () => {
  const spans = testSpans(PY, [{ name: 'test_has_soup', line: 9 }, { name: 'test_doesnt_pop', line: 13 }]);
  assert.deepEqual(spans, [{ name: 'test_has_soup', start: 8, end: 11 }, { name: 'test_doesnt_pop', start: 13, end: 15 }]);
});

test('a JS test keeps its closing bracket, and a one-line test is one line', () => {
  const spans = testSpans(JS, [{ name: 'has soup', line: 1 }, { name: "doesn't pop", line: 5 }]);
  assert.deepEqual(spans.map(s => [s.start, s.end]), [[1, 4], [5, 6]]);
});

test('tests named alike in either language are paired, in order', () => {
  const a = [{ name: 'test_has_soup' }, { name: 'test_extra' }, { name: 'test_doesnt_pop' }];
  const b = [{ name: 'has soup' }, { name: "doesn't pop" }];
  assert.deepEqual(pairTests(a, b), [[0, 0], [2, 1]]);
});

test('a line falls as far between the anchors on the other side', () => {
  const a = [{ start: 2, end: 6 }], b = [{ start: 4, end: 6 }];
  const anchors = anchorsOf(a, b, [[0, 0]], 10, 8);
  assert.deepEqual(anchors, [[0, 0], [2, 4], [6, 6], [10, 8]]);
  assert.equal(mapLine(anchors, 2), 4);       // the test's first line is level with its match
  assert.equal(mapLine(anchors, 4), 5);       // halfway through it, halfway through the match
  assert.equal(mapLine(anchors, 1), 2);
  assert.equal(mapLine(anchors, 12), 10);     // past the end, line for line
});
