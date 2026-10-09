// JS/TS tokens: a bracket's partner, what is at its own depth, and a block's
// statements. The tokenizer itself is read in jscover.test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { tokenize, close, atTop, statements } = await load('src/jstokens.js');
const values = (toks, ids) => ids.map(i => toks[i].value);

test('a bracket\'s partner is found by counting, and one that never closes has none', () => {
  const toks = tokenize('f(a, [b, { c }]) + g(');
  assert.equal(toks[close(toks, 1)].value, ')');
  assert.equal(close(toks, 1), 11);
  assert.equal(close(toks, toks.length - 1), -1);
});

test('what is at its own depth steps over a bracket and all it holds', () => {
  const toks = tokenize('a; f(b; c); d');
  assert.deepEqual(values(toks, atTop(toks)), ['a', ';', 'f', '(', ';', 'd']);
  assert.deepEqual(values(toks, atTop(toks, 2, 4)), ['f', '(']);
});

test('statements are cut at ; and at a line that ends one, and an else stays with its if', () => {
  const text = st => st.map(t => t.value).join(' ');
  assert.deepEqual(statements(tokenize('a = 1;\nb = f(\n  2)\nif (x) y();\nelse z();\n')).map(text),
    ['a = 1 ;', 'b = f ( 2 )', 'if ( x ) y ( ) ; else z ( ) ;']);
  assert.equal(statements(tokenize('f(')), null);
});
