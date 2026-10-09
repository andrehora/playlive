// JS/TS coverage's instrumenter: where the probes go, that the code still
// parses and means the same, and which lines run. That a run reports it, and
// the Coverage tab shows it, is javascript.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, load } from './env.mjs';

const { BRANCH, PROBE, instrument } = await load('src/jscover.js');
const { tokenize } = await load('src/jstokens.js');

// The lines (from 1, as the editor numbers them) that have a probe
const probed = src => instrument(src).lines.map(l => l + 1).sort((a, b) => a - b);
// Run the code with its probes: what it exports, and the lines (from 1) that ran
function run(src){
  const r = instrument(src), hits = {}, module = { exports: {} };
  new Function('module', 'exports', PROBE, r.code)(module, module.exports, hits);
  return { exports: module.exports, ran: () => Object.keys(hits).map(l => +l + 1).sort((a, b) => a - b) };
}

test('a probe goes before each statement in a block, and nowhere else', () => {
  assert.deepEqual(probed([
    'function f(a) {',        // 1
    '  const o = {',          // 2
    '    x: 1,',              // 3: inside an object
    '    m() { return 2; },',  // 4: a method's body is a block
    '  };',
    '  if (a) {',             // 6
    '    return o.x;',        // 7
    '  } else {',             // 8: only its body
    '    return o.m();',      // 9
    '  }',
    '}'
  ].join('\n')), [1, 2, 4, 6, 7, 9]);
});

test('a class body has no statements, but its methods do', () => {
  assert.deepEqual(probed('class A extends B {\n  x = { a: 1 };\n  static {\n    init();\n  }\n  get y() {\n    return 1;\n  }\n}'), [1, 4, 7]);
});

test('statements end at a line break where the code relies on it', () => {
  assert.deepEqual(probed('let a = 1\nlet b = a\n  + 1\nfoo(a)\nbar()\nconst c = cond\n  ? 1\n  : 2'), [1, 2, 4, 5, 6]);
  // a body without braces is not a statement of its own
  assert.deepEqual(probed('if (a)\n  go()\nelse\n  stop()\nwhile (x)\n  x--\ndone()'), [1, 5, 7]);
});

test('switch cases, do-while and try', () => {
  assert.deepEqual(probed([
    'switch (x) {',    // 1
    '  case 1:',
    '    a();',        // 3
    '    break;',      // 4
    '  case 2: {',     // 5: a block is a statement too
    '    b();',        // 6
    '  }',
    '  default:',
    '    c();',        // 9
    '}',
    'do {',            // 11
    '  d();',          // 12
    '} while (x);',
    'try {',           // 14
    '  e();',          // 15
    '} catch (err) {',
    '  f(err);',       // 17
    '} finally {',
    '  g();',          // 19
    '}'
  ].join('\n')), [1, 3, 4, 5, 6, 9, 11, 12, 14, 15, 17, 19]);
});

test('braces in strings, templates, regular expressions and comments are not code', () => {
  assert.deepEqual(probed('const s = "{";\nconst t = `${ {a: "}"}.a } {`;\nconst r = /[{}]/g; // }\n/* { */\ngo();'), [1, 2, 3, 5]);
  const toks = tokenize('x = `a\n${b}\nc` / 2; y = /=}/.test(z)');
  assert.deepEqual(toks.map(t => t.type), ['name', 'punct', 'tmpl', 'punct', 'num', 'punct', 'name', 'punct', 'regex', 'punct', 'name', 'punct', 'name', 'punct']);
  assert.equal(toks[2].end, 2, 'a template ends on the line it closes');
});

test('"use strict" stays first, so it is still a directive', () => {
  const r = instrument('"use strict";\nfunction f() {\n  "use strict";\n  return this;\n}\nmodule.exports = f();');
  assert.match(r.code, /^"use strict";/);
  assert.match(r.code, /\{\n {2}"use strict";/);
  assert.equal(run('"use strict";\nfunction f() {\n  return this;\n}\nmodule.exports = f();').exports, undefined, 'still strict');
});

test('the code means the same with its probes, and they say which lines ran', () => {
  const { exports, ran } = run([
    'function grade(n) {',
    '  if (n >= 90) return "A";',
    '  if (n >= 80) {',
    '    return "B";',
    '  }',
    '  return "F";',
    '}',
    'module.exports = { grade };'
  ].join('\n'));
  assert.deepEqual(ran(), [1, 8], 'loading runs the declarations');
  assert.equal(exports.grade(95), 'A');
  assert.deepEqual(ran(), [1, 2, 8]);
  assert.equal(exports.grade(50), 'F');
  assert.deepEqual(ran(), [1, 2, 3, 6, 8], 'the B branch never ran');
});

test('every JS example still parses, and loads, with its probes', async () => {
  const dir = resolve(ROOT, 'examples/javascript');
  for (const id of (await readdir(dir)).filter(d => !d.includes('.'))){
    const src = await readFile(resolve(dir, id, `${id}.js`), 'utf8');
    const r = instrument(src), module = { exports: {} };
    new Function('module', 'exports', 'require', PROBE, r.code)(module, module.exports, () => ({}), {});
    assert.ok(Object.keys(module.exports).length, `${id} exports what it did`);
    assert.ok(r.lines.length, `${id} has probes`);
  }
});

/* ---------- Branches ---------- */

// Run the code with its branches wrapped: what it exports, and each branch's ways taken as "id:1" / "id:0"
function runBranches(src){
  const r = instrument(src, PROBE, { branches: true }), taken = new Set(), module = { exports: {} };
  const br = { b: (id, v) => { taken.add(`${id}:${v ? 1 : 0}`); return v; }, *i(id, xs){ for (const x of xs){ taken.add(`${id}:1`); yield x; } taken.add(`${id}:0`); } };
  new Function('module', 'exports', PROBE, BRANCH, r.code)(module, module.exports, {}, br);
  return { r, exports: module.exports, taken };
}

test('the condition of an if, a while and a for, and a for…of\'s iterable, are wrapped on their own lines', () => {
  const src = 'function f(xs, n) {\n  let s = 0;\n  for (const x of xs) s += x;\n  for (let i = 0; i < n; i++) {\n    if (i % 2 === 0) s++;\n  }\n  while (s > 10) s -= 1;\n  return s;\n}\nmodule.exports = f;\n';
  const { r, exports, taken } = runBranches(src);
  assert.deepEqual(r.branches, [{ id: 0, line: 2 }, { id: 1, line: 3 }, { id: 2, line: 4 }, { id: 3, line: 6 }]);
  assert.equal(r.code.split('\n').length, src.split('\n').length, 'nothing is put across lines');
  assert.equal(exports([1, 2], 3), 5, 'the code means what it meant');
  assert.deepEqual([...taken].sort(), ['0:0', '0:1', '1:0', '1:1', '2:0', '2:1', '3:0']);
});

test('a for with no condition, a for…in, a ternary and a method named if are left alone', () => {
  const src = 'for (;;) break;\nfor (const k in o) {}\nconst t = a ? 1 : 2;\nx.if(1);\n';
  assert.deepEqual(instrument(src, PROBE, { branches: true }).branches, []);
});

test('without branches asked for, the code is as before', () => {
  assert.doesNotMatch(instrument('if (a) b();\n').code, /\$brc/);
});
