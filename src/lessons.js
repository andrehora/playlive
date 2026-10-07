import { SITES } from '../examples/examples.js';
import { $id, tabsEl } from './dom.js';
import { setMode } from './modes.js';
import { closePicker, selectSite } from './picker.js';
import { editorSite, mode, recording, running } from './state.js';
import { toast } from './ui.js';

/* ---------- Lessons: a short path through the examples and the modes ----------

   A hundred examples and five modes say nothing about where to start. The path
   is a handful of them in order, each teaching one idea: one example, one mode,
   and a goal that a grader the app already has can see met. It is not a mode
   of its own — a lesson is somewhere you go, and once there everything works
   exactly as it does for anyone who walked in without one.

   A lesson is done when its grader says so, and stays done: the graders
   announce what they see as `playlive:graded` and this module listens, rather
   than reaching into a panel. Only which lessons are done is stored, never a
   score.                                                                      */

export const LESSONS = [
  {
    id: 'first-test', site: 'address-form', mode: 'create',
    title: 'Your first test',
    goal: 'Write each test from its title alone.',
    tip: 'Press Run to watch your steps happen in the site.'
  },
  {
    id: 'gone', site: 'faq-accordion', mode: 'create',
    title: 'Proving something is gone',
    goal: 'Write each test from its title alone.',
    tip: 'Some of these prove that text has left the page.'
  }
];

export const LESSONS_KEY = 'live-test-runner:lessons';
export const lessonsDone = new Set();
try {
  const d = JSON.parse(localStorage.getItem(LESSONS_KEY) || 'null');
  if (Array.isArray(d)) for (const id of d) if (LESSONS.some(l => l.id === id)) lessonsDone.add(id);
} catch {}
const save = () => { try { localStorage.setItem(LESSONS_KEY, JSON.stringify([...lessonsDone])); } catch {} };

// The lesson this example and mode are, or failing that the first lesson this
// example belongs to, so the bar can offer to start it.
export function lessonFor(site, m){
  return LESSONS.find(l => l.site === site && l.mode === m) || LESSONS.find(l => l.site === site) || null;
}
export const nextLesson = l => LESSONS[LESSONS.indexOf(l) + 1] || null;

// A grader saw its goal met on this example, in this mode.
export function markGraded({ site, mode: m, done }){
  const l = LESSONS.find(x => x.site === site && x.mode === m);
  if (!l || !done || lessonsDone.has(l.id)) return false;
  lessonsDone.add(l.id);
  save();
  toast(`Lesson ${LESSONS.indexOf(l) + 1} done: ${l.title}`);
  return true;
}
export function clearLessons(){
  lessonsDone.clear();
  try { localStorage.removeItem(LESSONS_KEY); } catch {}
  renderLessons();
}

// Mode first, as a link does: it decides which file the example is handed.
export function startLesson(l){
  if (running || recording) return;
  if (mode !== l.mode) setMode(l.mode);
  if (editorSite !== l.site) selectSite(l.site);
  else renderLessonBar();
}

/* ---------- In the example list: a group above the categories ---------- */
export function lessonGroup(){
  const group = document.createElement('div');
  group.className = 'pop-group lessons';
  const head = document.createElement('div');
  head.className = 'pop-cat';
  head.innerHTML = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg><span>Lessons</span>';
  group.appendChild(head);
  LESSONS.forEach((l, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lesson'; b.dataset.lesson = l.id;
    b.innerHTML = '<span class="lnum"></span><span class="tname"></span><span class="tres" aria-hidden="true"></span>';
    b.querySelector('.lnum').textContent = i + 1;
    b.querySelector('.tname').textContent = l.title;
    b.addEventListener('click', () => { closePicker(true); startLesson(l); });
    group.appendChild(b);
  });
  return group;
}
function paintLessons(){
  const here = LESSONS.find(l => l.site === editorSite && l.mode === mode);
  tabsEl.querySelectorAll('.lesson').forEach(b => {
    const l = LESSONS.find(x => x.id === b.dataset.lesson), done = lessonsDone.has(l.id);
    if (done) b.dataset.status = 'pass'; else delete b.dataset.status;
    b.setAttribute('aria-pressed', String(l === here));
    b.title = `${SITES[l.site].name}, in ${l.mode[0].toUpperCase() + l.mode.slice(1)}${done ? '. Done' : ''}`;
  });
}

/* ---------- Above the site: what this lesson asks, and what is next ---------- */
const bar = $id('lessonbar'), barText = $id('lessonText'), barBtn = $id('lessonGo');
const modeName = m => m[0].toUpperCase() + m.slice(1);
let barAction = null;
export function renderLessonBar(){
  const l = lessonFor(editorSite, mode);
  bar.hidden = !l;
  if (!l) return;
  const n = `Lesson ${LESSONS.indexOf(l) + 1} of ${LESSONS.length}: ${l.title}.`;
  const next = nextLesson(l);
  bar.dataset.state = l.mode !== mode ? 'invite' : lessonsDone.has(l.id) ? 'done' : 'doing';
  if (l.mode !== mode){
    barText.textContent = `This example is ${n.replace(/^L/, 'l')} It is done in ${modeName(l.mode)} mode.`;
    barBtn.textContent = 'Start lesson'; barAction = () => startLesson(l);
  } else if (lessonsDone.has(l.id)){
    barText.textContent = `${n} Done.` + (next ? '' : ' That is every lesson so far.');
    barBtn.textContent = 'Next lesson'; barAction = next && (() => startLesson(next));
  } else {
    barText.textContent = `${n} ${l.goal} ${l.tip}`;
    barAction = null;
  }
  barBtn.hidden = !barAction;
}
barBtn.addEventListener('click', () => { if (barAction) barAction(); });

export function renderLessons(){ paintLessons(); renderLessonBar(); }
document.addEventListener('playlive:site', renderLessons);
document.addEventListener('playlive:mode', renderLessons);
document.addEventListener('playlive:graded', e => { markGraded(e.detail); renderLessons(); });
document.addEventListener('playlive:busy', () => { barBtn.disabled = running || recording; });
