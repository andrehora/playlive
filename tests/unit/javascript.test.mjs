// JS/TS mode's string work: colouring JavaScript, reading the runners, finding
// the tests in a file, reading a source map, and the examples' files. That the
// tests really run, in both frameworks and both languages, is javascript.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, load } from './env.mjs';

const { hlJs, consoleClass, testsInJs, filesFor, skeletonOf } = await load('src/code/js/javascript.js');
const { lineMap } = await load('src/code/js/sourcemap.js');
const { JS_EXAMPLES, JS_IDS } = await load('examples/javascript/examples.js');
const { PY_IDS } = await load('examples/python/examples.js');

/* ---------- Highlighting ---------- */

test('keywords, names after function, strings, numbers and comments are coloured', () => {
  const [line] = hlJs('function add(a, b) { // sum 2');
  assert.match(line, /<i class="k">function<\/i> <i class="f">add<\/i>/);
  assert.match(line, /<i class="c">\/\/ sum 2<\/i>/);
  assert.match(hlJs('const x = "a//b" + 10;')[0], /<i class="s">"a\/\/b"<\/i> \+ <i class="n">10<\/i>/,
    'a // inside a string is not a comment');
  assert.match(hlJs('let n: number = 1;')[0], /<i class="k">let<\/i> n: number/, 'TypeScript reads too');
});

test('a template string and a block comment spanning lines are coloured on every line', () => {
  const lines = hlJs('const s = `one\ntwo`;\n/* a\nb */ x');
  assert.equal(lines.length, 4);
  assert.match(lines[1], /<i class="s">two`<\/i>/);
  assert.match(lines[3], /<i class="c">b \*\/<\/i> x/);
});

/* ---------- Reading the runners ---------- */

test('console lines read as a pass or a failure, in either runner', () => {
  assert.deepEqual(['  ✓ adds', '  ✗ divides', '5 specs, 0 failures', '5 specs, 1 failure'].map(consoleClass),
    ['ok', 'bad', 'ok', 'bad']);
  assert.deepEqual(['    ✔ adds', '    1) divides', '  4 passing (3ms)', '  1 failing', 'AssertionError: expected 1 to equal 2'].map(consoleClass),
    ['ok', 'bad', 'ok', 'bad', 'bad']);
  assert.equal(consoleClass('Calculator'), '');
});

/* ---------- The tests a file defines ---------- */

test('tests are the it(...) calls, named by the describe(...) blocks around them', () => {
  const src = [
    'describe("Cart", () => {',
    '  it("starts empty", () => {});',
    '  describe("with a coupon", () => {',
    "    it('takes ten percent off', () => {});",
    '  });',
    '  it("refuses an unknown coupon", () => {});',
    '});',
    'it(`stands alone ${n}`, () => {});',
  ].join('\n');
  assert.deepEqual(testsInJs(src, 'cart.spec.js'), [
    { id: 'cart.spec.js::Cart > starts empty', name: 'starts empty', line: 1 },
    { id: 'cart.spec.js::Cart > with a coupon > takes ten percent off', name: 'takes ten percent off', line: 3 },
    { id: 'cart.spec.js::Cart > refuses an unknown coupon', name: 'refuses an unknown coupon', line: 5 },
    { id: 'cart.spec.js::stands alone ${n}', name: 'stands alone ${n}', line: 7 },
  ]);
});

/* ---------- Source maps ---------- */

test('Create starts from the lines that bring the code in and the title of each test, once', () => {
  const src = 'const { add } = require("./calc");\nconst { expect } = require("chai");\n\ndescribe("Calc", () => {\n  beforeEach(() => {});\n'
    + '  it("adds", () => {\n    expect(add(1, 2)).to.equal(3);\n  });\n  describe("more", () => {\n    it("adds", () => {});\n    it(`turns ${n} into ${m}`, () => {});\n  });\n});\n';
  assert.equal(skeletonOf(src, 'calc.test.js'), 'const { add } = require("./calc");\nconst { expect } = require("chai");\n\n// adds\n\n// turns ${n} into ${m}\n');
  assert.equal(skeletonOf('import { a } from "./a";\nit("x", () => {});\n', 'a.spec.ts'), 'import { a } from "./a";\n\n// x\n');
});

test('a source map gives each compiled line the line it was compiled from', () => {
  // AAAA: line 0; AACA: one on; AAEA: two on; AAHA: three back
  assert.deepEqual(Array.from(lineMap('AAAA;AACA;;AAEA;AAHA')), [0, 1, undefined, 3, 0], 'a line with no mapping has no line');
  assert.deepEqual(Array.from(lineMap(';;AAgBA')), [undefined, undefined, 16], 'a delta longer than one digit');
});

/* ---------- The examples ---------- */

const exists = p => access(resolve(ROOT, p)).then(() => true, () => false);
const read = p => readFile(resolve(ROOT, p), 'utf8');

test('every JS/TS example has its code and its tests, in both frameworks and both languages', async () => {
  for (const id of JS_IDS){
    for (const lang of ['js', 'ts']){
      const f = filesFor(id, 'jasmine', lang);
      assert.ok(await exists(`examples/javascript/${id}/${f.code}`), `${id}: ${f.code} is missing`);
      for (const fw of ['jasmine', 'mocha']){
        const t = filesFor(id, fw, lang).tests;
        assert.ok(await exists(`examples/javascript/${id}/${fw}/${t}`), `${id}: ${fw}/${t} is missing`);
      }
    }
    assert.ok(JS_EXAMPLES[id].name && JS_EXAMPLES[id].teaches, `${id} needs a name and what it teaches`);
  }
});

test('every version of an example tests the same things, under the same names', async () => {
  for (const id of JS_IDS){
    const names = async (fw, lang) => {
      const t = filesFor(id, fw, lang).tests;
      return testsInJs(await read(`examples/javascript/${id}/${fw}/${t}`), 'x').map(x => x.id);
    };
    const first = await names('jasmine', 'js');
    assert.ok(first.length >= 1, `${id} has no tests`);
    for (const [fw, lang] of [['mocha', 'js'], ['jasmine', 'ts'], ['mocha', 'ts']])
      assert.deepEqual(await names(fw, lang), first, `${id} ${fw} ${lang}`);
  }
});

test('the examples are Python mode\'s, in the same order', () => {
  assert.deepEqual(JS_IDS, PY_IDS);
});
