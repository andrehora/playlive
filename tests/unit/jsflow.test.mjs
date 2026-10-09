// JS/TS flows, read on tokens: which functions have one, and the items
// code/flow.js draws. That a run sends them and the page shows them is javascript.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { flowsOf } = await load('src/code/js/flow.js');

test('a function, a method of a class or an object, and an arrow are found when they branch', () => {
  const src = 'function a(x) {\n  if (x) return 1;\n  return 2;\n}\nfunction plain() {\n  return 1;\n}\nclass Account {\n  deposit(n: number): void {\n    if (n <= 0) {\n      throw new Error("no");\n    }\n  }\n}\n'
    + 'const clock = {\n  hour() {\n    while (true) break;\n  },\n};\nexport const f = (xs) => {\n  for (const x of xs) {}\n};\n';
  assert.deepEqual(flowsOf(src).map(f => [f.name, f.line, f.text]), [
    ['a', 0, 'function a(x)'], ['Account.deposit', 8, 'deposit(n: number)'], ['clock.hour', 15, 'hour()'], ['f', 19, 'export const f = (xs) =>']
  ]);
});

test('an if has its two arms, an else if is an if in the else, and a return ends a block', () => {
  const [fn] = flowsOf('function g(x) {\n  if (x) {\n    a();\n    return 1;\n  } else if (y) b();\n  else c();\n  d();\n}\n');
  const [iff, after] = fn.body;
  assert.equal(iff.text, 'if (x)');
  assert.deepEqual(iff.then, [{ t: 'block', lines: [2, 3], texts: ['a();', 'return 1;'], end: true }]);
  assert.equal(iff.else[0].text, 'else if (y)');
  assert.deepEqual(iff.else[0].else, [{ t: 'block', lines: [5], texts: ['else c();'], end: false }]);
  assert.deepEqual(after, { t: 'block', lines: [6], texts: ['d();'], end: false });
});

test('loops say whether they run out or test, and try, switch and do have their parts', () => {
  const src = 'function g(x) {\n  for (const k of ks) {}\n  for (let i = 0; i < 3; i++) {}\n  do {\n    x--;\n  } while (x > 0);\n'
    + '  try {\n    r();\n  } catch (e) {\n    q();\n  } finally {\n    z();\n  }\n  switch (x) {\n    case 1:\n      a();\n      break;\n    default:\n      b();\n  }\n}\n';
  const items = flowsOf(src)[0].body;
  assert.deepEqual(items.map(i => [i.t, i.text, i.each]), [
    ['loop', 'for (const k of ks)', true], ['loop', 'for (let i = 0; i < 3; i++)', false], ['loop', 'do … while (x > 0)', false],
    ['try', 'try', undefined], ['block', undefined, undefined], ['match', 'switch (x)', undefined]
  ]);
  assert.equal(items[2].line, 5, 'a do is at its while, where its branch is');
  assert.deepEqual(items[3].handlers.map(h => h.text), ['catch (e)']);
  assert.deepEqual(items[4].texts, ['z();'], 'finally runs after');
  assert.deepEqual(items[5].cases.map(c => [c.text, c.body[0].texts]), [['case 1:', ['a();', 'break;']], ['default:', ['b();']]]);
});

test('a file that does not tokenize, or whose brackets do not close, has no flows', () => {
  assert.deepEqual(flowsOf('function f() {\n  if (x) {\n'), []);
});
