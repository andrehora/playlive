import { $id } from './dom.js';
import { commentKey, undoable } from './editor.js';
import { JAVASCRIPT } from './javascript.js';
import { PYTHON } from './python.js';
import { labExample, mode } from './state.js';
import { escH } from './util.js';

/* ---------- The code modes: unit tests on plain code, in the browser ----------

   Python and JS/TS are experiments beside the end-to-end modes, laid out the
   same way: the tests on the left with Run under them, what they did below
   (Results and the runner's Console), and on the right what they test (a
   module rather than a site). The example picker lists the mode's own
   examples. Both modes share these panels and this module; what differs is a
   profile (python.js, javascript.js): the examples, the frameworks, how the
   code is coloured and indented, how a file's tests are found, and the worker
   that runs them.

   Every example's tests come written once per framework. The switch at the top
   of the Tests panel picks which one shows, and a run uses only that one, on
   that framework's own runner. JS/TS also has a language switch.

   The runtime is only fetched when its mode is entered, so the other modes
   never pay its download. Stop throws the worker away, since a running test
   cannot be interrupted, and starts a new one.

   Every run also measures which lines of the code ran (the worker's job).
   A check in the Results head shades the code by it and shows the scores.

   The files ship in examples/<mode>/<id>/. Edits are kept while you move
   between examples, frameworks and languages, but not stored: Reset or a
   reload brings them back as they ship.                                    */
export const LABS = { python: PYTHON, javascript: JAVASCRIPT };
// Each code mode has a Create beside it ("python-create"): the same panels and
// examples, with a file of your own in the tests editor. labOf is the code mode
// either one is, or null for the site modes.
export const labOf = m => { const l = m?.replace(/-create$/, ''); return LABS[l] ? l : null; };
export const isLab = m => !!labOf(m);
export const isLabCreate = m => !!labOf(m) && m.endsWith('-create');

// Each mode keeps its own framework, edits and runtime, so going from Python
// to JS/TS and back neither reloads Python nor loses what you typed. The
// example goes with you: both modes have the same ones (enterLab).
export const sessions = {};
export const session = (m = labOf(mode)) => (sessions[m] ||= {
  framework: LABS[m].frameworks[0].id,
  lang: LABS[m].langs?.[0].id ?? null,
  edits: new Map(),                 // "<id>" -> code, "<id>/<framework>" -> tests (with the language, and Create's apart)
  shown: null,                      // { id, lang, framework } the editors hold, once loaded
  worker: null, ready: false, pending: null
});
/* ---------- What the panels share ----------
   Each with its setter, as state.js has it: lab.js is what changes them. */
export let active = null;           // the code mode these panels are showing
export let creating = false;        // and whether it is its Create
// What runs now: a run of the tests ('run'), of the mutations ('mutate'), or
// Create's check ('check'); null when nothing does. One at a time.
export let job = null;
export let view = 'results';        // the tab under the tests
export const setActive = v => { active = v; };
export const setCreating = v => { creating = v; };
export const setJob = v => { job = v; };
export const setCurrentView = v => { view = v; };
export const P = () => LABS[active];
export const S = () => session(active);
// What runs the tests, with versions, once the runtime has said
export const label = () => P().label(S().versions, S().framework, S().lang);
export const rt = (m = active) => { const r = LABS[m].runtime; return typeof r === 'function' ? r(session(m).framework) : r; };
export const exampleOf = (m = mode) => labExample[labOf(m)] ?? LABS[labOf(m)].ids[0];
export const files = () => P().files(exampleOf(active), S().framework, S().lang);

/* ---------- The two editors ---------- */
function makeEditor(root){
  const ta = root.querySelector('textarea'), hl = root.querySelector('.hl'), gutter = root.querySelector('.gutter');
  // `painted`, while set, colours lines by its own classes instead of `bad`
  let bad = new Set(), painted = null;
  const sync = () => { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; };
  const render = () => {
    const lines = active ? P().highlight(ta.value) : ta.value.split('\n').map(escH);
    const cls = i => (painted ? painted.get(i) || '' : bad.has(i) ? 'bad' : '');
    hl.innerHTML = lines.map((l, i) => `<span class="l ${cls(i)}">${l || ' '}</span>`).join('');
    gutter.innerHTML = lines.map((_, i) => `<div class="${cls(i)}">${i + 1}</div>`).join('');
    sync();
  };
  ta.addEventListener('scroll', sync);
  commentKey(ta, () => P().comment);
  undoable(ta);
  // An edit makes the marks from the last run point at the wrong lines
  ta.addEventListener('input', () => { bad = new Set(); render(); });
  // Tab indents by the language's step, and Enter keeps the indent, one step
  // deeper after a line that opens a block
  ta.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    if (e.key === 'Tab' && !e.shiftKey){
      e.preventDefault(); ta.setRangeText(P().indent, a, b, 'end');
    } else if (e.key === 'Enter' && !e.shiftKey){
      const line = value.slice(value.lastIndexOf('\n', a - 1) + 1, a);
      const indent = /^\s*/.exec(line)[0] + (P().opensBlock.test(line) ? P().indent : '');
      e.preventDefault(); ta.setRangeText('\n' + indent, a, b, 'end');
    } else return;
    // what the other edits say with their input event; it is how undo hears of it
    ta.dispatchEvent(new Event('input'));
  });
  return {
    ta, render,
    get value(){ return ta.value; },
    set value(v){ ta.value = v; bad = new Set(); ta.scrollTop = 0; render(); },
    mark(lines){ bad = lines; render(); },
    paint(classes){ painted = classes; render(); },
    // Select a line, counted from 0, and scroll it a third of the way down
    jump(line){
      const lines = ta.value.split('\n');
      if (!(line >= 0 && line < lines.length)) return;
      const pos = lines.slice(0, line).reduce((n, l) => n + l.length + 1, 0);
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(pos + lines[line].search(/\S|$/), pos + lines[line].length);
      ta.scrollTop = Math.max(0, line * (parseFloat(getComputedStyle(ta).lineHeight) || 20) - ta.clientHeight / 3);
    }
  };
}
export const testsEd = makeEditor($id('labTestsEd')), codeEd = makeEditor($id('labCodeEd'));
// The bar under the Results and Console head, which every job fills
export const progressEl = $id('labProgress');

/* ---------- Examples ---------- */
// What an edit is kept under: the code per language, the tests per framework too
export const key = ({ id, lang, framework, create }, which) => (which === 'code' ? `${id}/${lang}` : `${create ? 'create:' : ''}${id}/${lang}/${framework}`);
// Every code mode ships the same way: examples/<mode>/<id>/ holds the code,
// and a folder per framework the tests
export async function shipped(id, which){
  const s = S(), f = P().files(id, s.framework, s.lang);
  const r = await fetch(new URL(`../examples/${active}/${id}/${which === 'code' ? f.code : `${s.framework}/${f.tests}`}`, import.meta.url));
  if (!r.ok) throw new Error(`${id}: ${r.status}`);
  return r.text();
}

