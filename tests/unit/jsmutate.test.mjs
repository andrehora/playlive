// JS/TS mutations, made on tokens: what code/js/worker.js runs each test file on in
// Create's check. That a check really runs them is javascript.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { mutantsOf, MAX_MUTANTS } = await load('src/code/js/mutate.js');
const whats = src => mutantsOf(src).map(([m]) => m.what);

test('comparisons, arithmetic, && and ||, numbers, true and false, ! and returns are changed', () => {
  assert.deepEqual(whats('if (a < b && !c) x = n * 2;\n'), ['< → <=', '&& → ||', '! removed', '* → /', '2 → 3']);
  assert.deepEqual(whats('const on = true;\nreturn a === b;\n'), ['true → false', 'returns undefined', '=== → !==']);
  assert.deepEqual(whats('total += price;\n'), ['+= → -=']);
});

test('each mutant is its line as changed, and the file with only that line changed', () => {
  const src = 'function f(a, b) {\n  return a + b;\n}\n';
  const [[meta, mutated]] = mutantsOf(src).filter(([m]) => m.what === '+ → -');
  assert.deepEqual(meta, { id: 1, line: 1, what: '+ → -', text: 'return a + b;', after: '  return a - b;' });
  assert.equal(mutated, 'function f(a, b) {\n  return a - b;\n}\n');
});

test('a generic, a sign, a template, a string and the imports and exports are left alone', () => {
  assert.deepEqual(whats('const xs: Array<number> = [];\n'), []);
  assert.deepEqual(whats('let n = -x;\n'), []);
  assert.deepEqual(whats('const s = `${a + b} < 2`;\nconst t = "a < b";\n'), []);
  assert.deepEqual(whats('const { add } = require("./calc");\nimport { a } from "./a";\nmodule.exports = { add: 1 };\nexport { a };\n'), []);
});

test('returning undefined is not changed to returning undefined, nor a return with no value or over lines', () => {
  assert.deepEqual(whats('return undefined;\nreturn;\n'), []);
  assert.deepEqual(whats('return (\n  a\n);\n'), []);
});

test('the same change twice is one mutant, and there are at most MAX_MUTANTS', () => {
  assert.equal(mutantsOf('x = 1 + 1;\n').filter(([m]) => m.what === '1 → 2').length, 2, 'two places, two files');
  assert.equal(mutantsOf('x = [' + Array.from({ length: 100 }, (_, i) => i).join(', ') + '];\n').length, MAX_MUTANTS);
});

test('a file that does not tokenize has no mutants', () => {
  assert.deepEqual(mutantsOf(''), []);
});
