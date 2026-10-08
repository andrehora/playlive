// The editor's line maths and its highlighter. Which line a step was written
// on is what the run follows, what every panel's rows jump to and what the
// error box underlines, so it is worth pinning on its own — and it is a
// function of the text, with no browser in it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { lineForStep, errorLinesFor, hlLine, hlValue, escH, isAction } = await load('src/editor.js');
const { validate } = await load('src/parse.js');

// The line each of a file's steps was written on, in run order.
function linesOf(text){
  const v = validate(text);
  assert.equal(v.error, undefined, v.error);
  return v.spec.tests.map(t => t.steps.map(s => lineForStep(text, s.src)));
}

/* ---------- Which line a step is on ---------- */

test('a step points at the line it was written on', () => {
  const text = ['test: One', 'steps:', '  - click: A', '  - click: B', ''].join('\n');
  assert.deepEqual(linesOf(text), [[2, 3]]);
});

test('each test’s steps are counted from its own "steps:"', () => {
  const text = [
    'test: One', 'steps:', '  - click: A', '',
    'test: Two', 'steps:', '  - click: B', '  - click: C', ''
  ].join('\n');
  assert.deepEqual(linesOf(text), [[2], [6, 7]]);
});

test('a beforeEach step points into beforeEach, in every test', () => {
  const text = [
    'beforeEach:', '  - click: Open', '',
    'test: One', 'steps:', '  - click: A', '',
    'test: Two', 'steps:', '  - click: B', ''
  ].join('\n');
  assert.deepEqual(linesOf(text), [[1, 5], [1, 9]]);
});

test('blank lines and comments between steps do not shift the count', () => {
  const text = [
    'test: One', 'steps:', '  - click: A', '', '  # a note', '  - click: B', ''
  ].join('\n');
  assert.deepEqual(linesOf(text), [[2, 5]]);
});

test('a step written over more than one line points at where it starts', () => {
  const text = ['test: One', 'steps:', '  - expectText: Hi', '    timeout: 8000', '  - click: B', ''].join('\n');
  assert.deepEqual(linesOf(text), [[2, 4]]);
});

test('a title with a comment between it and its steps is still found', () => {
  const text = ['test: One', '# a note', 'steps:', '  - click: A', ''].join('\n');
  assert.deepEqual(linesOf(text), [[3]]);
});

test('a step with no source has no line', () => {
  assert.equal(lineForStep('test: t\n', null), -1);
  assert.equal(lineForStep('test: t\n', { label: 'Test 9', i: 0 }), -1, 'a test that is not there');
});

/* ---------- Which lines an error is about ---------- */

test('a YAML error underlines the line it names', () => {
  const text = 'test: T\nsteps:\n  - click: { role: button\n';
  const v = validate(text);
  const lines = errorLinesFor(v.error, text);
  assert.ok(lines.size > 0, 'something should be marked');
});

test('an unknown setting underlines that setting’s line', () => {
  const text = 'speed: fast\n\ntest: T\nsteps:\n  - click: A\n';
  assert.deepEqual([...errorLinesFor(validate(text).error, text)], [0]);
});

test('a "steps:" with no title above it underlines the "steps:" line', () => {
  const text = 'steps:\n  - click: A\n';
  assert.deepEqual([...errorLinesFor(validate(text).error, text)], [0]);
});

test('a step’s own problem underlines that step', () => {
  const text = 'test: T\nsteps:\n  - click: A\n  - fill: { label: Email }\n';
  assert.deepEqual([...errorLinesFor(validate(text).error, text)], [3]);
});

test('a problem in the second test underlines the second test’s step', () => {
  const text = [
    'test: One', 'steps:', '  - click: A', '',
    'test: Two', 'steps:', '  - fill: { label: Email }', ''
  ].join('\n');
  assert.deepEqual([...errorLinesFor(validate(text).error, text)], [6]);
});

test('a message about nothing in the file marks nothing', () => {
  assert.deepEqual([...errorLinesFor('Something went wrong', 'test: T\nsteps:\n  - click: A\n')], []);
});

/* ---------- Highlighting ---------- */

test('escH makes markup safe to put in the highlighted copy', () => {
  assert.equal(escH('<a & b>'), '&lt;a &amp; b&gt;');
});

test('a title, an action and a step option each get their own class', () => {
  assert.match(hlLine('test: Shows the dashboard'), /class="tt"/);
  assert.match(hlLine('  - click: Send'), /class="act"/);
  assert.match(hlLine('    timeout: 8000'), /class="opt"/);
  assert.match(hlLine('beforeEach:'), /class="top"/);
});

test('an action is one the app actually has', () => {
  assert.equal(isAction('click'), true);
  assert.equal(isAction('expectNumber'), true);
  assert.equal(isAction('use'), false, 'flows are gone, so "use" is not an action');
  assert.equal(isAction('timeout'), false);
});

test('a comment is highlighted as one, and a # inside quotes is not', () => {
  assert.match(hlLine('  # a note'), /class="c"/);
  assert.doesNotMatch(hlLine('  - expectText: "Invoice #4821"'), /class="c"/);
});

test('a value’s strings, numbers, braces and ${unique} are told apart', () => {
  const html = hlValue(' { label: Email, value: "ana-${unique}" }');
  assert.match(html, /class="p"/, 'the braces');
  assert.match(html, /class="s"/, 'the quoted value');
  assert.match(html, /class="v"/, 'the ${unique} inside it');
  assert.match(hlValue(' 8000'), /class="n"/);
});

test('highlighting never loses or invents the line’s own characters', () => {
  for (const line of ['test: T', '  - click: Send', '  - fill: { label: "a, b", value: 3 }', '  # note', '', '   ']){
    const text = hlLine(line).replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    assert.equal(text, line, `highlighting changed: ${JSON.stringify(line)}`);
  }
});
