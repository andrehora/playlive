// Lessons: which lesson an example and a mode are, and a grader's word being
// what marks one done. What the bar and the list look like is a browser's
// question, in tests/e2e/lessons.spec.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpus, load } from './env.mjs';

const { LESSONS, LESSONS_KEY, lessonFor, nextLesson, markGraded, clearLessons, lessonsDone } = await load('src/lessons.js');
const { titlesOf } = await load('src/create.js');
const { SITES } = await load('examples/examples.js');
const { MODES } = await load('src/modes.js');
const { report: smells, clean, SMELLS } = await load('src/smells.js');

test('every lesson is a real example in a real mode, with a goal', () => {
  assert.equal(new Set(LESSONS.map(l => l.id)).size, LESSONS.length, 'ids are unique');
  for (const l of LESSONS){
    assert.ok(SITES[l.site], `${l.id}: ${l.site} is not an example`);
    assert.ok(MODES.includes(l.mode), `${l.id}: ${l.mode} is not a mode`);
    assert.ok(l.title && l.goal.endsWith('.'), `${l.id} needs a title and a goal sentence`);
  }
});

test('a Create lesson has briefs to write', async () => {
  const files = new Map((await corpus()).map(({ id, yaml }) => [id, yaml]));
  for (const l of LESSONS.filter(x => x.mode === 'create')){
    assert.ok(titlesOf(files.get(l.site)).length > 0, `${l.id}: ${l.site} offers no brief`);
  }
});

test('a Mutation lesson has mutations to catch', () => {
  for (const l of LESSONS.filter(x => x.mode === 'mutation')) assert.ok(SITES[l.site].bugs, `${l.id}: ${l.site} has no bugs`);
});

test('a Smells lesson starts smelly, and deleting the smelly test does not clear it', async () => {
  const files = new Map((await corpus()).map(({ id, yaml }) => [id, yaml]));
  for (const l of LESSONS.filter(x => x.mode === 'smells')){
    const shipped = files.get(l.site);
    assert.equal(clean(smells(shipped), shipped), false, `${l.id}: ${l.site} is already clean`);
  }
  const shipped = 'test: A\nsteps:\n  - click: Go\n  - expectText: Done\n\ntest: B\nsteps:\n  - click: Stop\n';
  assert.equal(clean(smells(shipped.split('\n\n')[0] + '\n'), shipped), false, 'one test fewer');
  assert.equal(clean(smells(shipped + '  - expectText: Done\n'), shipped), true);
  assert.equal(clean(smells('test: A\nsteps:\n  - nonsense\n'), shipped), false, 'does not parse');
});

test('there is a Smells lesson for every smell, each starting with that smell alone', async () => {
  const files = new Map((await corpus()).map(({ id, yaml }) => [id, yaml]));
  const taught = LESSONS.filter(l => l.mode === 'smells').map(l => {
    const found = [...new Set(smells(files.get(l.site)).items.map(i => i.smell))];
    assert.equal(found.length, 1, `${l.id}: ${l.site} should smell of one thing, not ${found.join(', ')}`);
    return found[0];
  });
  assert.deepEqual(taught.sort(), SMELLS.map(s => s.id).sort());
});

// The fix a student would write, applied to the shipped file: every Smells
// lesson can be finished without deleting a test.
const FIXES = {
  'checks-nothing': f => f.trimEnd() + '\n  - expectText: "Count: 3"\n',
  'too-many-checks': f => f.replace(/ {2}- expectText: "Email delivery · Operational"\n {2}- expectText: "Dashboards · Operational"\n/, ''),
  'say-it-once': f => 'beforeEach:\n  - click: { role: button, name: Load orders }\n\n'
    + f.replaceAll('  - click: { role: button, name: Load orders }\n', ''),
  'shared-setup': f => f.replace('  - fill: { label: Password, value: secret123 }\n', '')
    .replaceAll('steps:\n  - click: { role: button, name: Log in }', 'steps:\n  - fill: { label: Password, value: secret123 }\n  - click: { role: button, name: Log in }')
};
test('every Smells lesson can be finished without deleting a test', async () => {
  const files = new Map((await corpus()).map(({ id, yaml }) => [id, yaml]));
  for (const l of LESSONS.filter(x => x.mode === 'smells')){
    assert.ok(FIXES[l.id], `${l.id} needs a fix in this test`);
    const shipped = files.get(l.site), fixed = FIXES[l.id](shipped);
    assert.notEqual(fixed, shipped, `${l.id}: the fix changed nothing`);
    assert.deepEqual(smells(fixed).items.map(i => i.smell), [], `${l.id}: still smells`);
    assert.equal(clean(smells(fixed), shipped), true, l.id);
  }
});

test('an example in its lesson’s mode is that lesson; in another mode it still names it', () => {
  const [first, second] = LESSONS;
  assert.equal(lessonFor(first.site, first.mode), first);
  assert.equal(lessonFor(first.site, 'explore'), first, 'so the bar can offer to start it');
  assert.equal(lessonFor('weather-app', 'explore'), null);
  assert.equal(nextLesson(first), second);
  assert.equal(nextLesson(LESSONS.at(-1)), null);
});

test('a grader’s word marks a lesson done, once, and only in the lesson’s mode', () => {
  clearLessons();
  const [first] = LESSONS;
  assert.equal(markGraded({ site: first.site, mode: 'explore', done: true }), false, 'wrong mode');
  assert.equal(markGraded({ site: first.site, mode: first.mode, done: false }), false, 'not met');
  assert.equal(markGraded({ site: first.site, mode: first.mode, done: true }), true);
  assert.equal(markGraded({ site: first.site, mode: first.mode, done: true }), false, 'already done');
  assert.deepEqual(JSON.parse(localStorage.getItem(LESSONS_KEY)), [first.id]);
  // Done stays done: a later edit that breaks the file does not take it back.
  markGraded({ site: first.site, mode: first.mode, done: false });
  assert.ok(lessonsDone.has(first.id));
  clearLessons();
  assert.equal(lessonsDone.size, 0);
  assert.equal(localStorage.getItem(LESSONS_KEY), null);
});
