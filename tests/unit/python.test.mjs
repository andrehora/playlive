// Python mode's string work: colouring Python, reading the runners, finding
// the tests in a file, commenting lines, and the examples' files. That the
// tests really run in Pyodide, and the page shows it, is python.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, load } from './env.mjs';

const { hlPython, consoleClass, testsInFile, skeletonOf, moduleOf, PYTHON } = await load('src/code/python/python.js');
const { commentLines } = await load('src/editkeys.js');

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

const { examples: PY_EXAMPLES, ids: PY_IDS } = PYTHON;
const FRAMEWORKS = PYTHON.frameworks.map(f => f.id);
const { SITES } = await load('examples/html/examples.js');
const exists = p => access(resolve(ROOT, p)).then(() => true, () => false);

const { CODE_IDS, hasFramework } = await load('examples/code.js');
const { JAVASCRIPT } = await load('src/code/js/javascript.js');
const inBoth = id => FRAMEWORKS.every(fw => hasFramework(id, fw));

test('every Python example has its code and its tests in each framework it is written for', async () => {
  for (const id of PY_IDS){
    const m = moduleOf(id);
    assert.ok(await exists(`examples/python/${id}/${m}.py`), `${id}: ${m}.py is missing`);
    for (const fw of FRAMEWORKS)
      assert.equal(await exists(`examples/python/${id}/${fw}/test_${m}.py`), hasFramework(id, fw), `${id}: ${fw}/test_${m}.py`);
    assert.ok(PY_EXAMPLES[id].name && PY_EXAMPLES[id].teaches, `${id} needs a name and what it teaches`);
  }
});

test('both versions of an example test the same things, under the same names', async () => {
  for (const id of PY_IDS.filter(inBoth)){
    const read = fw => readFile(resolve(ROOT, `examples/python/${id}/${fw}/test_${moduleOf(id)}.py`), 'utf8');
    const names = async fw => testsInFile(await read(fw)).map(t => t.name);
    assert.deepEqual(await names('unittest'), await names('pytest'), id);
    assert.ok((await names('pytest')).length >= 1, `${id} has no tests`);
  }
});

test('the Integration examples are written for pytest alone, so they are in Python alone', () => {
  const integration = PY_IDS.filter(id => PY_EXAMPLES[id].group === 'Integration');
  assert.ok(integration.length);
  assert.deepEqual(CODE_IDS.filter(id => !inBoth(id) && PY_EXAMPLES[id].group !== 'Flaky tests'), integration);
  for (const id of CODE_IDS.filter(id => !inBoth(id))){
    assert.ok(hasFramework(id, 'pytest') && !hasFramework(id, 'unittest'), id);
    assert.ok(!JAVASCRIPT.ids.includes(id) && !JAVASCRIPT.examples[id], id);
  }
});

test('Calculator comes first, and no Python example shares an id with a site', () => {
  assert.equal(PY_IDS[0], 'calculator');
  assert.deepEqual(PY_IDS.filter(id => SITES[id]), [], 'a link could not tell which was meant');
});

/* ---------- Calls: the imported functions, offered with their parameters ---------- */

test('the functions the tests import are offered, each writing its call', async () => {
  const { callsOf } = await load('src/code/python/python.js');
  const code = 'def make_username(first, last):\n    pass\n\n\ndef used(name, existing=None):\n    pass\n\n\ndef helper():\n    pass\n';
  const calls = callsOf(code, 'import pytest\nfrom username import make_username, used as taken, missing\n', 'username');
  assert.deepEqual(calls.map(c => c.label), ['make_username', 'taken'], 'only what is imported and defined, by the name it is imported as');
  assert.equal(calls[0].body, 'make_username(${1:first}, last)$0');
  assert.equal(calls[1].detail, '(name, existing)', 'defaults left out');
  assert.deepEqual(callsOf(code, 'from username import (\n    helper,\n)\n', 'username').map(c => c.body), ['helper()$0'], 'bracketed imports too');
  assert.ok(callsOf(code, 'import username\n', 'username').some(c => c.label === 'username.make_username'), 'the module imported whole');
  assert.deepEqual(callsOf(code, 'from other import make_username\n', 'username'), [], 'another module is not the code');
});

test('a parameterized test is found in either framework, and a plain one is not', async () => {
  const { parametrizedIn } = await load('src/code/python/python.js');
  const pytest = 'import pytest\n\n\n@pytest.mark.parametrize("n", [\n    1,\n    2,\n])\ndef test_cases(n):\n    assert n\n\n\ndef test_plain():\n    assert True\n';
  assert.deepEqual(parametrizedIn(pytest, 'test_x.py', 'pytest').map(t => t.name), ['test_cases']);
  const unittest = 'class T(unittest.TestCase):\n    def test_cases(self):\n        for n in [1, 2]:\n            with self.subTest(n=n):\n                self.assertTrue(n)\n\n    def test_plain(self):\n        self.assertTrue(True)\n';
  assert.deepEqual(parametrizedIn(unittest, 'test_x.py', 'unittest').map(t => t.name), ['test_cases']);
});

test('a test that expects an exception is found in either framework', async () => {
  const { raisesIn } = await load('src/code/python/python.js');
  const pytest = 'import pytest\n\n\ndef test_refused():\n    with pytest.raises(ValueError):\n        f(0)\n\n\ndef test_fine():\n    assert f(1)\n';
  assert.deepEqual(raisesIn(pytest, 'test_x.py', 'pytest').map(t => t.name), ['test_refused']);
  assert.deepEqual(raisesIn('from pytest import raises\n\n\ndef test_refused():\n    with raises(ValueError):\n        f(0)\n', 'test_x.py', 'pytest').map(t => t.name), ['test_refused']);
  const unittest = 'class T(unittest.TestCase):\n    def test_refused(self):\n        with self.assertRaisesRegex(ValueError, "no"):\n            f(0)\n\n    def test_fine(self):\n        self.assertTrue(f(1))\n';
  assert.deepEqual(raisesIn(unittest, 'test_x.py', 'unittest').map(t => t.name), ['test_refused']);
});

test('a test that starts from shared setup is found in either framework', async () => {
  const { setupIn } = await load('src/code/python/python.js');
  const pytest = 'import pytest\n\n\n@pytest.fixture\ndef stack():\n    return Stack()\n\n\ndef test_uses(stack):\n    assert stack\n\n\ndef test_own(tmp_path):\n    s = Stack()\n';
  assert.deepEqual(setupIn(pytest, 'test_x.py', 'pytest').map(t => t.name), ['test_uses']);
  const unittest = 'class A(unittest.TestCase):\n    def setUp(self):\n        self.s = Stack()\n\n    def test_uses(self):\n        pass\n\n\nclass B(unittest.TestCase):\n    def test_own(self):\n        pass\n';
  assert.deepEqual(setupIn(unittest, 'test_x.py', 'unittest').map(t => t.name), ['test_uses']);
});

test('a test that checks a result is true, or false, is found in either framework', async () => {
  const { truthsIn } = await load('src/code/python/python.js');
  const pytest = 'def test_yes():\n    assert ok("a")\n\n\ndef test_no():\n    assert not ok("b")\n\n\ndef test_equal():\n    assert ok("c") == 3\n\n\ndef test_is():\n    assert ok("d") is False\n';
  const p = truthsIn(pytest, 'test_x.py', 'pytest');
  assert.deepEqual(p.truthy.map(t => t.name), ['test_yes'], 'a comparison checks a value, not a truth');
  assert.deepEqual(p.falsy.map(t => t.name), ['test_no', 'test_is']);
  const u = truthsIn('class T(unittest.TestCase):\n    def test_yes(self):\n        self.assertTrue(ok("a"))\n\n    def test_no(self):\n        self.assertFalse(ok("b"))\n', 'test_x.py', 'unittest');
  assert.deepEqual([u.truthy.map(t => t.name), u.falsy.map(t => t.name)], [['test_yes'], ['test_no']]);
});
