// Python mode's string work: colouring Python, reading the runners, finding
// the tests in a file, commenting lines, and the examples' files. That the
// tests really run in Pyodide, and the page shows it, is python.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, load } from './env.mjs';

const { hlPython, consoleClass, testsInFile, skeletonOf } = await load('src/python.js');
const { commentLines } = await load('src/editor.js');

/* ---------- Highlighting ---------- */

test('keywords, names after def, strings, numbers and comments are coloured', () => {
  const [line] = hlPython('def total(xs):  # sum 2');
  assert.match(line, /<i class="k">def<\/i> <i class="f">total<\/i>/);
  assert.match(line, /<i class="c"># sum 2<\/i>/);
  assert.match(hlPython('x = "a#b" + 10')[0], /<i class="s">"a#b"<\/i> \+ <i class="n">10<\/i>/,
    'a # inside a string is not a comment');
});

test('a triple-quoted string spanning lines is coloured on every line', () => {
  const lines = hlPython('s = """one\ntwo"""\nx = 1');
  assert.equal(lines.length, 3, 'one entry per line');
  assert.match(lines[0], /<i class="s">"""one<\/i>/);
  assert.match(lines[1], /<i class="s">two"""<\/i>/);
  assert.doesNotMatch(lines[2], /class="s"/);
});

test('markup in the code is escaped', () => {
  assert.equal(hlPython('a < b')[0], 'a &lt; b');
});

/* ---------- Reading the runners ---------- */

test('console lines read as a pass, a failure, or where it failed, in either runner', () => {
  assert.deepEqual([
    'test_cart.py::test_a PASSED                                              [ 50%]',
    'test_cart.py::test_b FAILED                                              [100%]',
    '>       assert total([1]) == 2',
    'E       assert 1 == 2',
  ].map(consoleClass), ['ok', 'bad', 'at', 'bad']);
  assert.deepEqual([
    'test_add (test_calculator.CalculatorTest.test_add) ... ok',
    'test_div (test_calculator.CalculatorTest.test_div) ... FAIL',
    'FAIL: test_div (test_calculator.CalculatorTest.test_div)',
    'OK',
  ].map(consoleClass), ['ok', 'bad', 'bad', 'ok']);
  assert.equal(consoleClass('collecting ... collected 2 items'), '');
});

/* ---------- The tests a file defines ---------- */

test('tests are functions named test*, at the top or in a Test* class', () => {
  const src = 'import pytest\n\ndef helper():\n    pass\n\ndef test_one():\n    pass\n\nclass TestCart:\n    def test_two(self):\n        pass\n    def helper(self):\n        pass\n\ndef test_three():\n    pass\n';
  assert.deepEqual(testsInFile(src, 't.py'), [
    { id: 't.py::test_one', name: 'test_one', line: 5 },
    { id: 't.py::TestCart::test_two', name: 'test_two', line: 9 },
    { id: 't.py::test_three', name: 'test_three', line: 14 },
  ]);
  assert.deepEqual(testsInFile('class Helper:\n    def test_no(self): pass\n'), [], 'not in a class named Test*');
  assert.deepEqual(testsInFile('class CartCase(unittest.TestCase):\n    def test_yes(self): pass\n', 't.py'),
    [{ id: 't.py::CartCase::test_yes', name: 'test_yes', line: 1 }], 'or in any class based on a TestCase');
});

/* ---------- ⌘/Ctrl+/ ---------- */

test('Create starts from the imports and the name of each test, once', () => {
  const src = 'import unittest\nfrom shop import (\n    Cart,\n    Item)\n\n\nclass CartTest(unittest.TestCase):\n    def setUp(self):\n        self.c = Cart()\n\n'
    + '    def test_empty(self):\n        self.assertEqual(self.c.total(), 0)\n\n\nclass MoreTest(unittest.TestCase):\n    def test_empty(self):\n        pass\n\n    def test_adds(self):\n        pass\n';
  assert.equal(skeletonOf(src, 'test_shop.py'),
    'import unittest\nfrom shop import (\n    Cart,\n    Item)\n\n\n# test_empty\n\n# test_adds\n');
  assert.equal(skeletonOf('def test_x():\n    assert 1\n', 't.py'), '# test_x\n', 'no imports, no gap');
});

test('commenting the lines a selection touches, at the block\'s indent, and back', () => {
  const text = 'a\n  b\n\n  c\nd';
  const on = commentLines(text, 2, 9, '#');
  assert.equal(on.text, 'a\n  # b\n\n  # c\nd', 'blank lines are left alone');
  assert.equal(commentLines(on.text, on.start, on.end, '#').text, text);
  assert.equal(commentLines('x = 1\ny = 2\n', 0, 6, '#').text, '# x = 1\ny = 2\n',
    'a line the selection only reaches the start of is not touched');
  assert.equal(commentLines('  <p>x</p>', 0, 0, '<!--', '-->').text, '  <!-- <p>x</p> -->');
  assert.equal(commentLines('  <!-- <p>x</p> -->', 0, 0, '<!--', '-->').text, '  <p>x</p>');
});

/* ---------- The examples ---------- */

const { PY_EXAMPLES, PY_IDS, FRAMEWORKS, moduleOf } = await load('examples/python/examples.js');
const { SITES } = await load('examples/html/examples.js');
const exists = p => access(resolve(ROOT, p)).then(() => true, () => false);

test('every Python example has its code and its tests in both frameworks', async () => {
  for (const id of PY_IDS){
    const m = moduleOf(id);
    assert.ok(await exists(`examples/python/${id}/${m}.py`), `${id}: ${m}.py is missing`);
    for (const fw of FRAMEWORKS)
      assert.ok(await exists(`examples/python/${id}/${fw}/test_${m}.py`), `${id}: ${fw}/test_${m}.py is missing`);
    assert.ok(PY_EXAMPLES[id].name && PY_EXAMPLES[id].teaches, `${id} needs a name and what it teaches`);
  }
});

test('both versions of an example test the same things, under the same names', async () => {
  for (const id of PY_IDS){
    const read = fw => readFile(resolve(ROOT, `examples/python/${id}/${fw}/test_${moduleOf(id)}.py`), 'utf8');
    const names = async fw => testsInFile(await read(fw)).map(t => t.name);
    assert.deepEqual(await names('unittest'), await names('pytest'), id);
    assert.ok((await names('pytest')).length >= 1, `${id} has no tests`);
  }
});

test('Calculator comes first, and no Python example shares an id with a site', () => {
  assert.equal(PY_IDS[0], 'calculator');
  assert.deepEqual(PY_IDS.filter(id => SITES[id]), [], 'a link could not tell which was meant');
});
