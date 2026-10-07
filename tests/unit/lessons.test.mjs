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
