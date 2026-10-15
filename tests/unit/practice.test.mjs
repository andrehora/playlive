// Practice's lessons: each ships its code, the tests you start from and the
// answer, and practises an example that exists. That the answer opens once the
// goals are met, in a browser, is practice.spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, load } from './env.mjs';

const { PRACTICE, PRACTICE_IDS } = await load('examples/practice.js');
const { CODE_EXAMPLES } = await load('examples/code.js');
const { SITES } = await load('examples/html/examples.js');
const { moduleOf, testsInFile } = await load('src/code/python/python.js');
const exists = p => access(resolve(ROOT, p)).then(() => true, () => false);
const read = p => readFile(resolve(ROOT, p), 'utf8');

test('every lesson ships its code, the tests to start from, and the answer', async () => {
  assert.ok(PRACTICE_IDS.length);
  for (const id of PRACTICE_IDS){
    const dir = `examples/practice/python/${id}`, m = moduleOf(id);
    const answer = PRACTICE[id].answer === 'code' ? 'answer.py' : 'pytest/answer.py';
    for (const f of [`${m}.py`, `pytest/test_${m}.py`, answer]) assert.ok(await exists(`${dir}/${f}`), `${id}: ${f} is missing`);
  }
});

test('every lesson practises an example, and is named apart from every example and site', () => {
  for (const id of PRACTICE_IDS){
    const l = PRACTICE[id];
    assert.ok(CODE_EXAMPLES[l.from], `${id}: no example ${l.from}`);
    assert.equal(l.teaches, CODE_EXAMPLES[l.from].teaches);
    assert.ok(!CODE_EXAMPLES[id] && !SITES[id], `${id}: a link could not tell which was meant`);
  }
});

// A lesson about parameterized tests starts with the cases as tests of their
// own, which its answer folds into one
test('the tests you start from import the code, and the answer has each of them', async () => {
  for (const id of PRACTICE_IDS){
    const dir = `examples/practice/python/${id}`, m = moduleOf(id);
    const names = async f => testsInFile(await read(`${dir}/${f}`)).map(t => t.name);
    assert.match(await read(`${dir}/pytest/test_${m}.py`), new RegExp(`^from ${m} import `, 'm'), `${id}: the start imports nothing`);
    if (PRACTICE[id].goals.includes('parametrized') || PRACTICE[id].answer === 'code') continue;
    const start = await names(`pytest/test_${m}.py`), answer = await names('pytest/answer.py');
    for (const n of start) assert.ok(answer.includes(n), `${id}: the answer has no ${n}`);
  }
});

test('a lesson names only tools the panels know, each one an element or a check in the code', async () => {
  const { TOOLS } = await load('examples/practice.js');
  const html = await read('index.html');
  const src = (await Promise.all(['src/code/code.js', 'src/code/coverage.js'].map(read))).join('\n');
  for (const tool of TOOLS)
    assert.ok(html.includes(`data-tool="${tool}"`) || src.includes(`shows('${tool}')`), `${tool} is neither an element nor checked`);
  for (const id of PRACTICE_IDS)
    for (const tool of PRACTICE[id].tools) assert.ok(TOOLS.includes(tool), `${id}: no tool ${tool}`);
});

test('every lesson has the goals every lesson has, and only goals the Lesson tab checks', async () => {
  // Only a lesson about a real service leaves out line coverage: its answer never calls it
  const NO_LINES = ['stock'];
  const { GOALS } = await load('examples/practice.js');
  const src = await read('src/code/practice.js');
  for (const g of GOALS) assert.match(src, new RegExp(`^  ${g}: \\{ text: '`, 'm'), `no check for ${g}`);
  for (const id of PRACTICE_IDS){
    const always = NO_LINES.includes(id) ? ['pass'] : ['pass', 'lines'];
    assert.deepEqual(PRACTICE[id].goals.slice(0, always.length), always, id);
    assert.equal(PRACTICE[id].goals.includes('lines'), !NO_LINES.includes(id), id);
    for (const g of PRACTICE[id].goals) assert.ok(GOALS.includes(g), `${id}: no goal ${g}`);
  }
});

test('a lesson about what a test does starts with no such test, and its answer has one', async () => {
  const py = await load('src/code/python/python.js');
  // Both kinds, for checking true and false: the start has no false one
  const truths = (text, file, fw) => { const t = py.truthsIn(text, file, fw); return t.truthy.length && t.falsy.length ? t.falsy : []; };
  for (const [goal, find] of [['parametrized', py.parametrizedIn], ['truefalse', truths], ['raises', py.raisesIn], ['setup', py.setupIn]])
    for (const id of PRACTICE_IDS.filter(id => PRACTICE[id].goals.includes(goal))){
      const dir = `examples/practice/python/${id}`, file = `test_${moduleOf(id)}.py`;
      assert.equal(find(await read(`${dir}/pytest/${file}`), file, 'pytest').length, 0, `${id}: the start meets ${goal}`);
      assert.ok(find(await read(`${dir}/pytest/answer.py`), file, 'pytest').length > 0, `${id}: the answer misses ${goal}`);
    }
});

// A lesson about a bug in the code has its tests right from the start, and its
// answer is the code, fixed: the same functions, written so the tests hold
test('an answer that is the code defines what the code does, and nothing else', async () => {
  const defs = text => [...text.matchAll(/^(?:def|class) (\w+)/gm)].map(m => m[1]);
  const code = PRACTICE_IDS.filter(id => PRACTICE[id].answer === 'code');
  assert.ok(code.length);
  for (const id of PRACTICE_IDS){
    assert.ok(['tests', 'code'].includes(PRACTICE[id].answer), `${id}: answer is "tests" or "code"`);
    if (PRACTICE[id].answer !== 'code') continue;
    const dir = `examples/practice/python/${id}`;
    assert.ok(!(await exists(`${dir}/pytest/answer.py`)), `${id}: its answer is the code, so pytest/answer.py would never show`);
    assert.deepEqual(defs(await read(`${dir}/answer.py`)), defs(await read(`${dir}/${moduleOf(id)}.py`)), id);
  }
});
