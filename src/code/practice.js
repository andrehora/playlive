import { CODE_EXAMPLES } from '../../examples/code.js';
import { $id } from '../dom.js';
import { coverage } from './coverage.js';
import { P, S, active, codeEd, exampleOf, files, shipped, testsEd } from './core.js';
import { toast } from '../ui.js';
import { plural } from '../util.js';

/* ---------- Practice: a lesson, and its answer once you have earned it ----------
   A lesson is an example's idea on code of its own (examples/practice.js). The
   Lesson tab says which example it practises, and keeps the lesson's goals
   (GOALS below): every test passing and every line run, and what the idea
   asks for, such as parameterized tests. Each is read off the last run of the
   whole file, while neither file has changed since. Once all are met, Show answer opens the answer large, in a dialog
   like the tests' Open large, and stays able to for that lesson until Reset
   or a reload: it is never stored.                                        */
export const lessonEl = $id('codeLesson'), lessonBtn = document.querySelector('.code-seg [data-codetab="lesson"]');
const solved = new Set();            // the lessons whose answer you may see
let lastRun = null;                  // { id, code, tests, whole, ok, passed, ran, reps, lines, hit, ways, taken }
const dlg = $id('answer'), compareBtn = $id('answerCompare');
const sides = { mine: $id('answerMine'), answer: $id('answerTheirs') };
let answerText = '';               // the answer showing in the dialog

// What the last run says about the files as they are now, or null
function current(){
  const r = lastRun;
  return r && r.id === exampleOf(active) && r.code === codeEd.value && r.tests === testsEd.value ? r : null;
}
/* ---------- Goals ----------
   Each is named in examples/practice.js's GOALS, and said in words that hold
   for any framework: how a framework writes the thing is its profile's to
   know (code/python/python.js's parametrizedIn, raisesIn, setupIn and truthsIn). `check` takes the last run of
   the files as they are, and says { done, detail }.                        */
const GOALS = {
  pass: { text: 'Every test passes', check: r => ({ done: r.ok, detail: r.ran ? `${r.passed} of ${r.ran}` : 'no tests' }) },
  lines: { text: '100% line coverage', check: r => {
    const pct = Math.floor(r.hit / (r.lines || 1) * 100);
    return { done: r.hit === r.lines, detail: `${pct}% (${r.hit} of ${r.lines} lines)` };
  } },
  branches: { text: '100% branch coverage', check: r => {
    if (r.ways == null) return { done: false, detail: 'not measured' };
    const pct = r.ways ? Math.floor(r.taken / r.ways * 100) : 100;
    return { done: r.taken === r.ways, detail: `${pct}% (${r.taken} of ${r.ways} branches)` };
  } },
  setup: { text: 'Uses shared setup', check: r => {
    const n = P().setupIn(r.tests, files().tests, S().framework).length;
    return { done: n > 0, detail: n ? plural(n, 'test') : 'none yet' };
  } },
  // Repeated, a run is ok only when every repetition passed
  steady: { text: 'Passes 10 runs in a row', check: r => ({
    done: r.ok && r.reps >= 10,
    detail: r.reps < 10 ? 'run with Repeat 10×' : r.ok ? `${r.reps} of ${r.reps} runs` : 'failed in a run'
  }) },
  truefalse: { text: 'Checks both true and false', check: r => {
    const { truthy, falsy } = P().truthsIn(r.tests, files().tests, S().framework);
    return { done: truthy.length > 0 && falsy.length > 0, detail: `${truthy.length} true, ${falsy.length} false` };
  } },
  raises: { text: 'Checks for exceptions', check: r => {
    const n = P().raisesIn(r.tests, files().tests, S().framework).length;
    return { done: n > 0, detail: n ? plural(n, 'test') : 'none yet' };
  } },
  parametrized: { text: 'Uses parameterized tests', check: r => {
    const n = P().parametrizedIn(r.tests, files().tests, S().framework).length;
    return { done: n > 0, detail: n ? plural(n, 'test') : 'none yet' };
  } }
};
const goalsOf = id => P().examples[id].goals;
const met = r => !!r?.whole && goalsOf(r.id).every(g => GOALS[g].check(r).done);

const goal = (done, text, detail) => {
  const li = document.createElement('li');
  li.dataset.done = String(done);
  li.innerHTML = '<span class="lesson-mark" aria-hidden="true"></span><span class="lesson-goal"></span><span class="lesson-m"></span>';
  li.querySelector('.lesson-goal').textContent = text;
  li.querySelector('.lesson-m').textContent = detail;
  li.setAttribute('aria-label', `${text}: ${done ? 'done' : 'not yet'}${detail ? `, ${detail}` : ''}`);
  return li;
};

export function renderLesson(){
  if (!active || !P().practice) return;
  const id = exampleOf(active), lesson = P().examples[id], from = CODE_EXAMPLES[lesson.from];
  const r = current(), open = solved.has(id);
  lessonEl.innerHTML = '<div class="mut-head lesson-head"><p class="lesson-from">Related: <a></a></p>'
    + '<button type="button" class="small lesson-answer"></button></div><div class="lesson"><ul class="lesson-goals"></ul></div>';
  const link = lessonEl.querySelector('.lesson-from a');
  link.href = `#python#${lesson.from}`;
  link.textContent = `${from.name}: ${from.teaches}`;
  link.title = `Open ${from.name}`;

  const goals = lessonEl.querySelector('.lesson-goals');
  for (const g of goalsOf(id)){
    const { done, detail } = r ? GOALS[g].check(r) : { done: false, detail: '' };
    goals.append(goal(done, GOALS[g].text, detail));
  }

  const btn = lessonEl.querySelector('.lesson-answer');
  // A lightbulb: the idea, once you have had it yourself
  btn.innerHTML = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>Show answer';
  btn.disabled = !open;
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.title = open ? 'Show the answer' : 'Meet every goal first';
  btn.addEventListener('click', showAnswer);
}

// The answer, large and read-only, named after the file it would be. Compare
// puts your tests beside it, to read the two side by side.
async function showAnswer(){
  const id = exampleOf(active);
  if (!solved.has(id)) return;
  try { answerText = await shipped(id, 'answer'); }
  catch { toast('The answer did not load. Try again.'); return; }
  if (!active || exampleOf(active) !== id) return;
  for (const side of Object.values(sides)) side.querySelector('.code-file').textContent = files().tests;
  setComparing(false);
  dlg.showModal();
}
function paint(side, text){
  const code = side.querySelector('.cmp-code');
  code.innerHTML = P().highlight(text).map(l => `<span class="l">${l || ' '}</span>`).join('');
  code.scrollTop = 0;
}
function setComparing(on){
  compareBtn.setAttribute('aria-pressed', String(on));
  sides.mine.hidden = !on;
  dlg.classList.toggle('comparing', on);
  if (on) paint(sides.mine, testsEd.value);
  paint(sides.answer, answerText);
}
compareBtn.addEventListener('click', () => setComparing(compareBtn.getAttribute('aria-pressed') !== 'true'));
$id('answerClose').addEventListener('click', () => dlg.close());
// A click on the backdrop closes it, as Escape does
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

// The ways out of the code's branches, and those taken, where the runtime measures them
function branchesOf({ branches }){
  if (!branches) return { ways: null, taken: null };
  const all = [...branches.values()];
  return { ways: all.reduce((n, w) => n + w[0], 0), taken: all.reduce((n, w) => n + w[1], 0) };
}
// A run of the whole file that ended (code/code.js), with what it measured
document.addEventListener('playlive:code-ran', ({ detail }) => {
  if (!active || !P().practice) return;
  const id = exampleOf(active);
  lastRun = coverage && !coverage.stale ? {
    id, code: codeEd.value, tests: testsEd.value, ...detail,
    lines: coverage.lines.length, hit: coverage.lines.filter(l => coverage.hit.has(l)).length,
    ...branchesOf(coverage)
  } : null;
  const r = current();
  if (met(r)) solved.add(id);
  if (r && !r.whole) lastRun = { id };
  renderLesson();
});
// Another lesson: its own goals, and its own answer
export function resetLesson(){ lastRun = null; renderLesson(); }
// Reset forgets which answers were open
export function forgetSolved(){ solved.clear(); }
let editTimer;
for (const ed of [testsEd, codeEd]) ed.ta.addEventListener('input', () => { clearTimeout(editTimer); editTimer = setTimeout(renderLesson, 300); });
