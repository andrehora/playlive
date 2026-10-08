// The code modes' autocomplete: which snippets fit at a caret, and what one
// writes. That the list opens and a snippet lands in the editor is codecomplete
// in python.spec and javascript.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { match, expand, quiet, wordAt } = await load('src/snippets.js');
const py = (await load('src/python.js')).snippetsFor;
const js = (await load('src/javascript.js')).snippetsFor;
const labels = (snips, text, opts) => match(snips, text, text.length, opts)?.items.map(s => s.label) ?? [];

/* ---------- Finding ---------- */

test('the word at the caret runs back over letters, dots and @', () => {
  assert.equal(wordAt('    self.assertEq', 17), 'self.assertEq');
  assert.equal(wordAt('expect(x).to.eq', 15), '.to.eq');
  assert.equal(wordAt('@pytest.ma', 10), '@pytest.ma');
});

test('a test is offered at the start of a line, and not in the middle of one', () => {
  assert.deepEqual(labels(py('pytest'), 'def x():\n    te').slice(0, 1), ['test']);
  assert.deepEqual(labels(py('pytest'), 'x = te'), [], 'not after other code');
  assert.deepEqual(labels(js('jasmine'), '  it'), [], 'two letters open it, but "it" is already typed in full');
  assert.ok(labels(js('jasmine'), '  des').includes('describe'));
  assert.deepEqual(labels(js('jasmine'), '  te'), ['it'], '"test" finds it, as it does in Python');
  assert.deepEqual(labels(js('mocha'), '  test'), ['it'], 'typed in full too');
});

test('half an assert finds it, with or without what goes before it', () => {
  assert.equal(labels(py('unittest'), '        self.assertEq')[0], 'self.assertEqual');
  assert.equal(labels(py('unittest'), '        assertEq')[0], 'self.assertEqual');
  assert.equal(labels(py('pytest'), '    with pytest.rai')[0], 'pytest.raises');
});

test('after expect(…) only matchers are offered, and the framework\'s own', () => {
  const jasmine = labels(js('jasmine'), 'expect(x).');
  assert.ok(jasmine.length > 5 && jasmine.every(l => l.startsWith('.')));
  assert.ok(jasmine.includes('.toBe') && !jasmine.includes('.to.equal'));
  assert.deepEqual(labels(js('mocha'), 'expect(x).to.eq').slice(0, 2), ['.to.equal', '.to.deep.equal']);
  assert.deepEqual(labels(js('jasmine'), 'expect(x).toBe').slice(0, 2), ['.toBe', '.toBeTrue']);
});

test('nothing is offered inside a string or a comment, or before two letters', () => {
  assert.deepEqual(labels(js('jasmine'), 'it("des'), []);
  assert.deepEqual(labels(py('pytest'), '# te', { comment: '#' }), []);
  assert.deepEqual(labels(js('jasmine'), '// des', { comment: '//' }), []);
  assert.deepEqual(labels(py('pytest'), '    t'), []);
  assert.ok(labels(py('pytest'), '    ', { forced: true }).includes('test'), 'Ctrl+Space offers all that fit');
  assert.equal(quiet('x = "a # b', '#'), true);
  assert.equal(quiet('x = "a" ', '#'), false);
});

test('each framework and language offers its own', () => {
  assert.ok(labels(py('unittest'), 'se').includes('setUp'));
  assert.ok(!labels(py('pytest'), 'se').includes('setUp'));
  assert.ok(labels(py('pytest'), '@py').includes('@pytest.fixture'));
  const body = (snips, label) => snips.find(s => s.label === label).body;
  assert.equal(body(js('mocha', 'js', 'cart'), 'chai'), 'const { expect } = require("chai");\n$0');
  assert.equal(body(js('mocha', 'ts', 'cart'), 'chai'), 'import { expect } from "chai";\n$0');
  assert.equal(body(js('jasmine', 'ts', 'cart'), 'import'), 'import { ${1:name} } from "./cart";\n$0', 'the example\'s own module');
  assert.equal(body(py('pytest', null, 'bank-account'), 'from bank_account import'), 'from bank_account import ${1:name}\n$0');
});

/* ---------- Writing ---------- */

test('a snippet is indented to its line, with its first placeholder selected', () => {
  const { text, select, next } = expand('def test_${1:name}(self):\n    $0', '    ');
  assert.equal(text, 'def test_name(self):\n        ');
  assert.deepEqual(select, [9, 13]);
  assert.equal(text.slice(...select), 'name');
  assert.equal(next, text.length, 'and Tab takes the caret on to the body');
});

test('with no placeholder the caret goes to $0, or the end', () => {
  assert.deepEqual(expand('beforeEach(() => {\n  $0\n});', ''), { text: 'beforeEach(() => {\n  \n});', select: [21, 21], next: null });
  assert.deepEqual(expand('.toBeTrue()', ''), { text: '.toBeTrue()', select: [11, 11], next: null });
});
