// Compare's line of what differs: the framework's names each side writes and the other does not
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { codeOnly, differs, termsIn } = await load('src/code/terms.js');
const { snippetsFor: py } = await load('src/code/python/python.js');
const { snippetsFor: js } = await load('src/code/js/javascript.js');

const PYTEST = `import pytest

@pytest.fixture
def stack():
    return Stack()

def test_pop(stack):
    assert stack.pop() == 2
    with pytest.raises(IndexError):
        stack.pop()
`;
const UNITTEST = `import unittest

class StackTest(unittest.TestCase):
    # not every check is assertEqual: assertIn, assertIsNone
    def setUp(self):
        self.stack = Stack()

    def test_pop(self):
        self.assertEqual(self.stack.pop(), 2)
        with self.assertRaises(IndexError):
            self.stack.pop()
`;

test('names in strings and comments are not use', () => {
  assert.equal(codeOnly('x = "assertIn"  # assertIsNone\ny // .to.equal'), 'x = ""  \ny \n');
  assert.deepEqual(termsIn(UNITTEST, py('unittest')).Check, ['assertEqual']);
});

test('pytest and unittest differ in setup, checks and errors, told in that order', () => {
  const rows = differs(termsIn(PYTEST, py('pytest')), termsIn(UNITTEST, py('unittest')));
  assert.deepEqual(rows, [
    { role: 'Setup', a: ['@pytest.fixture'], b: ['setUp'] },
    { role: 'Check', a: ['assert'], b: ['assertEqual'] },
    { role: 'Errors', a: ['pytest.raises'], b: ['assertRaises'] },
  ]);
});

test('what both write alike is left out, and a side with nothing of its own shows what it shares', () => {
  const jasmine = 'describe("s", () => {\n  it("a", () => {\n    expect(f()).toBe(1);\n    expect(g()).toEqual([]);\n  });\n});';
  const mocha = 'describe("s", () => {\n  it("a", () => {\n    expect(f()).to.equal(1);\n    expect(g()).toEqual([]);\n  });\n});';
  assert.deepEqual(differs(termsIn(jasmine, js('jasmine')), termsIn(mocha, js('mocha'))), [
    { role: 'Check', a: ['.toBe', '.toEqual'], b: ['.to.equal'] },
  ]);
  assert.deepEqual(differs(termsIn(jasmine, js('jasmine')), termsIn(jasmine, js('jasmine'))), []);
});
