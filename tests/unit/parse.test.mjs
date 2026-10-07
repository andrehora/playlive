// The YAML format: what a step may say, and what a file that gets it wrong is
// told. These used to be driven through the editor, but a parser's answer does
// not depend on a browser having drawn anything, so they are read here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './env.mjs';

const { validate, normalizeStep, substitute, ASSERTIONS, STEP_OPTS, stripFences } = await load('src/parse.js');

// One test's steps, or the error the file was rejected with.
const one = steps => validate(`test: T\nsteps:\n${steps.map(s => '  ' + s).join('\n')}\n`);
const stepsOf = steps => { const v = one(steps); assert.equal(v.error, undefined, v.error); return v.spec.tests[0].steps; };
const errorOf = steps => { const v = one(steps); assert.ok(v.error, 'expected this to be rejected'); return v.error; };

test('a test is a "test:" block with steps under it', () => {
  const v = validate('test: Shows the dashboard\nsteps:\n  - click: Log in\n');
  assert.equal(v.error, undefined);
  assert.equal(v.spec.tests.length, 1);
  assert.equal(v.spec.tests[0].title, 'Shows the dashboard');
  assert.deepEqual(v.spec.tests[0].steps[0], { action: 'click', target: { text: 'Log in' }, src: { label: 'Test 1', i: 0 } });
});

test('every "test:" at column 0 starts a new one', () => {
  const v = validate('test: One\nsteps:\n  - click: A\n\ntest: Two\nsteps:\n  - click: B\n');
  assert.deepEqual(v.spec.tests.map(t => t.title), ['One', 'Two']);
});

/* ---------- Targets ---------- */

test('a target is described the way a user sees it', () => {
  assert.deepEqual(stepsOf(['- click: { role: button, name: Log in }'])[0].target, { role: 'button', name: 'Log in' });
  assert.deepEqual(stepsOf(['- fill: { label: Email, value: a@b.test }'])[0].target, { label: 'Email' });
  assert.deepEqual(stepsOf(['- fill: { placeholder: Search, value: shoes }'])[0].target, { placeholder: 'Search' });
  assert.deepEqual(stepsOf(['- click: { text: Send }'])[0].target, { text: 'Send' });
});

test('a bare string means { text: … }', () => {
  assert.deepEqual(stepsOf(['- click: Send'])[0].target, { text: 'Send' });
  assert.deepEqual(stepsOf(['- click: 2024'])[0].target, { text: '2024' }, 'a number reads as text too');
});

test('an empty target says what to write instead', () => {
  assert.match(errorOf(['- click: {}']), /needs something to find the element by/);
});

/* ---------- The value goes inside the target ---------- */

test('the value is part of the target, so a step is one line', () => {
  const [s] = stepsOf(['- select: { label: Country, value: United Kingdom }']);
  assert.equal(s.value, 'United Kingdom');
  assert.deepEqual(s.target, { label: 'Country' });
});

test('a value on its own line is an error that says where it belongs', () => {
  const v = validate('test: T\nsteps:\n  - fill: { label: Email }\n    value: a@b.test\n');
  assert.match(v.error, /put the value inside the target/);
});

test('fill and select without a value are reported', () => {
  assert.match(errorOf(['- fill: { label: Email }']), /"fill" needs a value/);
  assert.match(errorOf(['- select: { label: Country }']), /"select" needs a value/);
});

test('a value set twice is reported rather than silently won', () => {
  const v = validate('test: T\nsteps:\n  - fill: { label: Email, value: a }\n    value: b\n');
  assert.ok(v.error);
});

/* ---------- Timeouts ---------- */

test('timeout goes inside the target, or on its own line where there is none', () => {
  assert.equal(stepsOf(['- click: { role: button, name: Go, timeout: 8000 }'])[0].timeout, 8000);
  const v = validate('test: T\nsteps:\n  - expectText: Welcome back\n    timeout: 8000\n');
  assert.equal(v.spec.tests[0].steps[0].timeout, 8000);
});

test('a timeout that is not a positive number of ms is rejected', () => {
  assert.match(errorOf(['- click: { text: Go, timeout: nope }']), /milliseconds/);
  assert.match(errorOf(['- click: { text: Go, timeout: 0 }']), /milliseconds/);
  assert.match(errorOf(['- click: { text: Go, timeout: -1 }']), /milliseconds/);
});

test('a timeout set twice is reported', () => {
  const v = validate('test: T\nsteps:\n  - click: { text: Go, timeout: 1000 }\n    timeout: 2000\n');
  assert.match(v.error, /set twice/);
});

/* ---------- Actions ---------- */

test('wait takes a number of ms, and defaults to 500', () => {
  assert.equal(stepsOf(['- wait: 1200'])[0].ms, 1200);
  assert.equal(stepsOf(['- wait: 0'])[0].ms, 500);
});

test('the text checks need the text to look for', () => {
  assert.equal(stepsOf(['- expectText: Welcome back'])[0].text, 'Welcome back');
  assert.equal(stepsOf(['- expectNoText: Something went wrong'])[0].text, 'Something went wrong');
  assert.match(errorOf(['- expectText: { text: Hi }']), /needs the text to look for/);
  assert.match(errorOf(['- expectText:']), /needs the text to look for/);
});

test('an unknown action is named, with the allowed ones beside it', () => {
  const e = errorOf(['- hover: Send']);
  assert.match(e, /unknown action "hover"/);
  assert.match(e, /click/);
});

test('exactly one action per step', () => {
  assert.match(errorOf(['- click: A\n    fill: B']), /exactly one action per step/);
  assert.match(errorOf(['- {}']), /exactly one action per step/);
  assert.match(errorOf(['- just a string']), /each step must be/);
});

/* ---------- expectTextInRange ---------- */

test('expectTextInRange takes the text and the two ends', () => {
  const [s] = stepsOf(['- expectTextInRange: { text: Ends in, min: 1, max: 24 }']);
  assert.equal(s.action, 'expectTextInRange');
  assert.equal(s.text, 'Ends in');
  assert.equal(s.min, 1);
  assert.equal(s.max, 24);
  assert.equal(s.target, undefined, 'it is the one check with no target');
});

test('its timeout may sit in the braces with the range', () => {
  assert.equal(stepsOf(['- expectTextInRange: { text: n, min: 1, max: 2, timeout: 9000 }'])[0].timeout, 9000);
  const v = validate('test: T\nsteps:\n  - expectTextInRange: { text: n, min: 1, max: 2 }\n    timeout: 9000\n');
  assert.equal(v.spec.tests[0].steps[0].timeout, 9000);
});

test('it explains a range it cannot use', () => {
  assert.match(errorOf(['- expectTextInRange: Ends in']), /needs text and a range/);
  assert.match(errorOf(['- expectTextInRange: { min: 1, max: 2 }']), /needs the text to find the number by/);
  assert.match(errorOf(['- expectTextInRange: { text: n, min: 1 }']), /must be numbers/);
  assert.match(errorOf(['- expectTextInRange: { text: n, min: 9, max: 2 }']), /"min" is more than "max"/);
  assert.match(errorOf(['- expectTextInRange: { text: n, min: 1, max: 2, role: button }']), /not "role"/);
});

/* ---------- Variables ---------- */

test('${name} is replaced from vars, and ${unique} is left for the run', () => {
  const v = validate('vars:\n  email: ana@example.test\n\ntest: T\nsteps:\n  - fill: { label: Email, value: "${email}" }\n  - fill: { label: Tag, value: "x-${unique}" }\n');
  assert.equal(v.spec.tests[0].steps[0].value, 'ana@example.test');
  assert.equal(v.spec.tests[0].steps[1].value, 'x-${unique}');
});

test('an unknown variable says to define it', () => {
  const v = validate('test: T\nsteps:\n  - fill: { label: Email, value: "${nope}" }\n');
  assert.match(v.error, /unknown variable "\$\{nope\}"/);
});

test('a test may add vars of its own', () => {
  const v = validate('vars:\n  a: one\n\ntest: T\nvars:\n  b: two\nsteps:\n  - fill: { label: A, value: "${a}-${b}" }\n');
  assert.equal(v.spec.tests[0].steps[0].value, 'one-two');
});

test('substitute reaches into nested targets', () => {
  assert.deepEqual(substitute({ fill: { label: '${l}', value: '${v}' } }, { l: 'Email', v: 'a' }, 'n'),
    { fill: { label: 'Email', value: 'a' } });
});

/* ---------- beforeEach ---------- */

test('beforeEach runs at the start of every test, and says where it came from', () => {
  const v = validate('beforeEach:\n  - click: Open\n\ntest: One\nsteps:\n  - click: A\n\ntest: Two\nsteps:\n  - click: B\n');
  for (const t of v.spec.tests){
    assert.equal(t.steps.length, 2);
    assert.equal(t.steps[0].from, 'beforeEach');
    assert.equal(t.steps[1].from, undefined);
  }
});

test('beforeEach has to be a list of steps', () => {
  assert.match(validate('beforeEach: click\n\ntest: T\nsteps:\n  - click: A\n').error, /must be a list of steps/);
});

/* ---------- The file as a whole ---------- */

test('only vars, beforeEach and failOnPageErrors may come before the first test', () => {
  assert.equal(validate('failOnPageErrors: true\n\ntest: T\nsteps:\n  - click: A\n').spec.failOnPageErrors, true);
  for (const key of ['speed', 'tests', 'site', 'flows']){
    const v = validate(`${key}: x\n\ntest: T\nsteps:\n  - click: A\n`);
    assert.match(v.error, new RegExp(`Unknown setting "${key}"`));
    assert.match(v.error, /vars, beforeEach, failOnPageErrors/);
  }
});

test('"vars:" must be name: value pairs', () => {
  assert.match(validate('vars:\n  - a\n\ntest: T\nsteps:\n  - click: A\n').error, /name: value pairs/);
});

test('a steps list with no title above it says so', () => {
  assert.match(validate('steps:\n  - click: A\n').error, /needs a "test: <title>" line right above it/);
});

test('a test with no steps is rejected', () => {
  assert.match(validate('test: T\n').error, /needs a "steps:" list/);
  assert.match(validate('test: T\nsteps: []\n').error, /needs a "steps:" list/);
});

test('an empty file asks for the first test', () => {
  assert.match(validate('').error, /No tests yet/);
  assert.match(validate('vars:\n  a: b\n').error, /No tests yet/);
});

test('invalid YAML is reported with the line it is on', () => {
  const v = validate('test: T\nsteps:\n  - click: { role: button\n');
  assert.match(v.error, /isn’t valid YAML/);
});

test('a code fence around the file is stripped, the way an LLM writes one', () => {
  assert.equal(stripFences('```yaml\ntest: T\n```\n'), 'test: T\n');
  assert.equal(validate('```yaml\ntest: T\nsteps:\n  - click: A\n```\n').error, undefined);
});

test('every problem in a file is reported, not only the first', () => {
  const v = validate('test: T\nsteps:\n  - fill: { label: A }\n  - hover: B\n');
  assert.match(v.error, /needs a value/);
  assert.match(v.error, /unknown action/);
});

test('a step remembers where it was written, so a run can point at the line', () => {
  const v = validate('test: One\nsteps:\n  - click: A\n  - click: B\n');
  assert.deepEqual(v.spec.tests[0].steps.map(s => s.src), [{ label: 'Test 1', i: 0 }, { label: 'Test 1', i: 1 }]);
});

/* ---------- The lists other panels read ---------- */

test('ASSERTIONS is every action that says what should be true', () => {
  assert.deepEqual([...ASSERTIONS].sort(), ['expectNoText', 'expectText', 'expectTextInRange', 'expectVisible']);
});

test('STEP_OPTS is what a step may carry besides its action', () => {
  assert.deepEqual([...STEP_OPTS].sort(), ['timeout', 'value']);
});

test('normalizeStep can be called on its own', () => {
  assert.deepEqual(normalizeStep({ click: 'Send' }, 'n'), { action: 'click', target: { text: 'Send' } });
  assert.throws(() => normalizeStep({ nope: 1 }, 'n'), /unknown action/);
});
