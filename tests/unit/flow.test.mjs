// The flow view's layout: which boxes a function's flow has, how they are
// coloured, and where the ways between them go. That Python sends the flows,
// and the page shows them, is python.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { flowSvg } = await load('src/code/flow.js');

const block = (lines, texts, end = false) => ({ t: 'block', lines, texts, end });
const fn = body => ({ name: 'Account.deposit', line: 0, text: 'def deposit(self, amount)', body });
// The boxes of an SVG, as [kind, class, line]
const boxes = svg => [...svg.matchAll(/<g class="fnode (\w+) ?(\w*)"(?: data-line="(\d+)")?/g)].map(m => [m[1], m[2], m[3] == null ? null : +m[3]]);
const edges = svg => (svg.match(/class="fedge"/g) || []).length;

test('an if has a box for its test and one for each arm, and a raise ends its path', () => {
  const svg = flowSvg(fn([
    { t: 'if', line: 1, text: 'if amount <= 0', then: [block([2], ['raise ValueError("no")'], true)], else: [] },
    block([3], ['self.balance += amount'])
  ]), (lines, decision) => (decision ? 'part' : lines[0] === 2 ? 'miss' : 'hit'));
  assert.deepEqual(boxes(svg), [['start', '', 0], ['dec', 'part', 1], ['block', 'miss', 2], ['block', 'hit', 3], ['end', '', null]]);
  // start→if, True→raise, False lane, lane→next, next→end; nothing leaves the raise
  assert.equal(edges(svg), 5);
  assert.match(svg, />True</);
  assert.match(svg, />False</);
});

test('a loop goes back to its test from its body, and out past it', () => {
  const svg = flowSvg(fn([{ t: 'loop', line: 1, text: 'for x in xs', body: [block([2], ['total += x'])] }, block([3], ['return total'], true)]));
  assert.deepEqual(boxes(svg).map(b => b[0]), ['start', 'dec', 'block', 'block']);
  assert.match(svg, />each</);
  assert.match(svg, />done</);
  // start→for, for→body, body→back, for→out, out→return; the end is never reached, so not drawn
  assert.equal(edges(svg), 5);
  assert.doesNotMatch(svg, />end</);
});

test('a long block shows its first lines, and text is escaped', () => {
  const svg = flowSvg(fn([block([1, 2, 3, 4], ['a = 1', 'b = 2', 'c = 3', 'd = "<b>"'])]));
  assert.match(svg, />a = 1</);
  assert.match(svg, />… 2 more</);
  assert.doesNotMatch(svg, /<b>/);
});

test('a loop that tests rather than runs out says True and False', () => {
  const svg = flowSvg(fn([{ t: 'loop', line: 1, text: 'for (let i = 0; i < n; i++)', each: false, body: [block([2], ['s++;'])] }]));
  assert.match(svg, />True</);
  assert.doesNotMatch(svg, />each</);
});
