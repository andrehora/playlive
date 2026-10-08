import { $id, KEY } from './dom.js';
import { commentKey, escH, undoable } from './editor.js';
import { LOGOS } from './logos.js';
import { JAVASCRIPT } from './javascript.js';
import { PYTHON } from './python.js';
import { syncUrl } from './share.js';
import { labExample, mode, setLabExample } from './state.js';
import { setProgress, toast } from './ui.js';
import { band } from './bugs.js';
import { FLOW_DEFS, flowSvg } from './flow.js';
import { runSummary } from './util.js';

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

// Each mode keeps its own place and its own runtime, so going from Python to
// JS/TS and back neither reloads Python nor loses what you typed.
const sessions = {};
const session = (m = labOf(mode)) => (sessions[m] ||= {
  framework: LABS[m].frameworks[0].id,
  lang: LABS[m].langs?.[0].id ?? null,
  edits: new Map(),                 // "<id>" -> code, "<id>/<framework>" -> tests (with the language, and Create's apart)
  shown: null,                      // { id, lang, framework } the editors hold, once loaded
  worker: null, ready: false, pending: null
});
let active = null;                  // the code mode these panels are showing
let creating = false;               // and whether it is its Create
const P = () => LABS[active];
const S = () => session(active);
// What runs the tests, by name: Python, or the framework chosen
// What runs the tests, with versions, once the runtime has said
const label = () => P().label(S().versions, S().framework, S().lang);
const rt = (m = active) => { const r = LABS[m].runtime; return typeof r === 'function' ? r(session(m).framework) : r; };
export const exampleOf = (m = mode) => labExample[labOf(m)] ?? LABS[labOf(m)].ids[0];
const files = () => P().files(exampleOf(active), S().framework, S().lang);

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
const testsEd = makeEditor($id('labTestsEd')), codeEd = makeEditor($id('labCodeEd'));

/* ---------- Results: one row per test, as in the other modes ----------
   Before a run the rows come from reading the file; once the runner has
   collected, from the runner, so a parametrized test shows each of its cases.
   The worker reports each test as it starts and ends, which is what the rows
   and their dots follow. */
const resultsEl = $id('labResults');
resultsEl.innerHTML = '<p class="lab-note" hidden></p><div class="lab-list"></div>';
const noteEl = resultsEl.firstChild, listEl = resultsEl.lastChild;
const countEl = $id('labCount');
let tests = [], collectError = null, runTarget = null, running = false;
// The tests the last run covered, in order, for the circles in the panel head;
// null until a run, and again once the file is edited
let runIds = null;
const dotsEl = $id('labDots');
const DOT = { running: 'run', passed: 'ok', failed: 'bad', error: 'bad', skipped: 'skip' };
// Updated in place, so a circle pops in once, when it first appears, and not
// on every redraw of the list
function paintDots(){
  const byId = new Map(tests.map(t => [t.id, t])), ids = runIds || [];
  while (dotsEl.children.length > ids.length) dotsEl.lastChild.remove();
  ids.forEach((id, i) => {
    const dot = dotsEl.children[i] || dotsEl.appendChild(document.createElement('i'));
    const t = byId.get(id);
    dot.className = DOT[t?.state] || 'todo';
    dot.title = t?.name || id;
  });
}
const folded = new Set();           // failures you closed; a failure starts open
const CHEV = '<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const editorFor = file => (file === files().code ? codeEd : file === files().tests ? testsEd : null);
// Why a test did not pass, and a link to where: the deepest line of ours the
// traceback went through, which is where the cause usually is.
function detail(sec, { message, frames = [] }){
  const { file, line } = frames.at(-1) || {};
  const d = document.createElement('div');
  d.className = 'lab-detail';
  const err = document.createElement('span');
  err.className = 'err'; err.textContent = message || 'Failed';
  d.append(err);
  if (editorFor(file) && line >= 0){
    const at = document.createElement('button');
    at.type = 'button'; at.className = 'ghost small lab-at';
    at.textContent = `${file}, line ${line + 1}`;
    at.title = 'Go to the line';
    at.addEventListener('click', () => editorFor(file).jump(line));
    d.append(at);
  }
  sec.append(d);
}
function row(t){
  const sec = document.createElement('section');
  sec.className = 'test';
  sec.dataset.state = t.state;
  sec.innerHTML = `<div class="test-head"><button type="button" class="chev">${CHEV}</button><span class="tstate" aria-hidden="true"></span><h3><button type="button" class="lab-name"></button></h3><span></span><span class="ms"></span><button type="button" class="run-one">Run</button></div>`;
  const name = sec.querySelector('.lab-name');
  name.textContent = t.name;
  name.title = 'Go to the test';
  name.addEventListener('click', () => testsEd.jump(t.line));
  if (t.ms != null && t.state !== 'running') sec.querySelector('.ms').textContent = `${t.ms} ms`;
  const one = sec.querySelector('.run-one');
  one.setAttribute('aria-label', `Run only ${t.name}`);
  one.disabled = running;
  one.addEventListener('click', () => runLab(t.id));
  const chev = sec.querySelector('.chev');
  if (t.fail){
    detail(sec, t.fail);
    const fold = c => {
      sec.classList.toggle('collapsed', c);
      chev.setAttribute('aria-expanded', String(!c));
      chev.setAttribute('aria-label', c ? 'Show why' : 'Hide why');
    };
    fold(folded.has(t.id));
    chev.addEventListener('click', () => {
      const c = !sec.classList.contains('collapsed');
      if (c) folded.add(t.id); else folded.delete(t.id);
      fold(c);
    });
  } else chev.style.visibility = 'hidden';
  return sec;
}
function renderResults(){
  listEl.innerHTML = '';
  if (collectError){
    const sec = document.createElement('section');
    sec.className = 'test'; sec.dataset.state = 'error';
    sec.innerHTML = '<div class="test-head"><span></span><span class="tstate" aria-hidden="true"></span><h3></h3></div>';
    sec.querySelector('h3').textContent = `${files().tests} did not load. The Console tab has the whole error.`;
    detail(sec, collectError);
    listEl.append(sec);
  }
  if (!tests.length && !collectError) listEl.innerHTML = `<p class="empty">No tests yet. ${P().emptyText(S().framework)}</p>`;
  for (const t of tests) listEl.append(row(t));
  paintDots();
}
// What the file defines now, keeping what the last run said about each test
function readTests(){
  if (!active) return;                // an edit's late re-read, after leaving the mode
  const was = new Map(tests.map(t => [t.id, t]));
  tests = P().testsIn(testsEd.value, files().tests, S().framework).map(t => ({ state: 'idle', ...was.get(t.id), ...t }));
  const n = tests.length;
  countEl.textContent = n ? `${n} ${n === 1 ? 'test' : 'tests'}` : 'No tests';
  countEl.className = n ? 'file-status' : 'file-status none';
  renderResults();
}
let readTimer;
testsEd.ta.addEventListener('input', () => {
  runIds = null;                      // the circles were about that run, of that file
  clearTimeout(readTimer); readTimer = setTimeout(readTests, 300);
});
// `line` is where a test is defined; `fail` is where and why it did not pass.
function onTest(data){
  if (data.type === 'collected'){
    // A run of the whole file replaces the list with what the runner found, in
    // the file's order (unittest runs them alphabetically). A runner that does
    // not know where a test is written leaves that to the file.
    if (runTarget === files().tests){
      const lines = new Map(P().testsIn(testsEd.value, files().tests, S().framework).map(t => [t.id, t.line]));
      tests = data.tests.map(t => ({ ...t, line: t.line ?? lines.get(t.id) ?? 0, state: 'idle' })).sort((x, y) => x.line - y.line);
      runIds = tests.map(t => t.id);
    }
  } else if (data.type === 'collect-error') collectError = data;
  else {
    const t = tests.find(x => x.id === data.id);
    if (!t) return;
    if (data.type === 'start'){
      t.state = 'running';
      // The head counts the run the way the site modes' does
      const n = runIds?.length || 1;
      summaryEl.textContent = `Running ${Math.min(++started, n)} of ${n}`;
      setProgress((started - 1) / n, null, progressEl);
    }
    else {
      t.state = data.outcome; t.ms = data.ms;
      t.fail = data.outcome === 'passed' ? null : { message: data.message, frames: data.frames };
      ran.push(data.outcome);
      setProgress(ran.length / (runIds?.length || 1), null, progressEl);
    }
  }
  renderResults();
}

/* ---------- Results, console or mutation: one panel, three views ---------- */
let view = 'results';
function setView(v){
  // All smells is read again each time the tab opens
  if (v === 'smells' && view !== 'smells' && smellView === 'all') scanAll();
  view = v;
  document.querySelectorAll('.lab-seg [data-labview]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.labview === v)));
  createEl.hidden = v !== 'create';
  resultsEl.hidden = v !== 'results';
  consoleEl.hidden = v !== 'console';
  mutationEl.hidden = v !== 'mutation';
  smellsEl.hidden = v !== 'smells';
  listMutations();
  listSmells();
}
document.querySelectorAll('.lab-seg [data-labview]').forEach(b => b.addEventListener('click', () => setView(b.dataset.labview)));

/* ---------- Coverage: which lines of the code the last run ran ----------
   Measured on every run. A check in the Results head shades the code's lines (light green ran, light red never did, light yellow ran but
   left a branch untaken) and puts the scores on top of the code. It is
   { file, lines, hit, branches }: the lines holding code and those that ran,
   counted from 0, and, where the runtime measures them, the lines with
   branches as line -> [ways out, ways taken], and the flows of the methods
   with a branch (flow.js draws them). The code is coloured by lines or by
   branches, as chosen on top of it. An edit to the code moves its
   lines, so it makes the measure stale until the next run. `note` says why
   there is none, on top of the code while the check is on. */
const covShow = $id('labCovShow'), codeCov = $id('labCodeCov'), codeBranch = $id('labCodeBranch'), covNote = $id('labCodeCovNote');
const covSeg = document.querySelector('.cov-seg'), viewSeg = document.querySelector('.lab-codeview'), flowEl = $id('labFlow');
let coverage = null, coverageNote = '';
let covBy = 'lines', codeView = 'code';    // what colours the code, and code or flow
function setCoverage(c, note = ''){ coverage = c; coverageNote = note; renderCoverage(); }
// One score on top of the code: `of` 0 when there is nothing to count
function score(el, done, of, noun){
  const pct = of ? Math.floor(done / of * 100) : 100;
  el.dataset.band = band(pct);
  el.firstElementChild.textContent = `${pct}%`;
  el.lastElementChild.textContent = `(${done} of ${of} ${noun})`;
}
// How a line, or a box of the flow, is coloured: by whether its lines ran,
// or, by branches, a decision by the ways it went (a line with no branch is
// left plain in the code)
function lineClass(l){
  const br = coverage.branches?.get(l);
  if (covBy === 'branches') return !br ? '' : br[1] === br[0] ? 'cov-hit' : br[1] ? 'cov-part' : 'cov-miss';
  return coverage.hit.has(l) ? 'cov-hit' : 'cov-miss';
}
function boxClass(lines, decision){
  const br = decision && covBy === 'branches' && coverage.branches?.get(lines[0]);
  if (br) return br[1] === br[0] ? 'hit' : br[1] ? 'part' : 'miss';
  const code = lines.filter(l => coverage.lines.includes(l)), ran = code.filter(l => coverage.hit.has(l)).length;
  return !code.length ? 'none' : ran === code.length ? 'hit' : ran ? 'part' : 'miss';
}
function renderCoverage(){
  const live = coverage && !coverage.stale, on = live && covShow.checked, br = live && coverage.branches;
  if (live){
    score(codeCov, coverage.lines.filter(l => coverage.hit.has(l)).length, coverage.lines.length, 'lines');
    if (br){
      const ways = [...br.values()];
      score(codeBranch, ways.reduce((n, w) => n + w[1], 0), ways.reduce((n, w) => n + w[0], 0), 'branches');
    }
  }
  if (!br) covBy = 'lines';
  covSeg.hidden = !on;
  codeBranch.hidden = !br;
  for (const b of covSeg.querySelectorAll('[data-covby]')) b.setAttribute('aria-pressed', String(b.dataset.covby === covBy));
  // Checked with nothing to show: why
  const why = coverage?.stale ? `${coverage.file} changed after the run. Run the tests again to measure it.` : coverageNote;
  covNote.textContent = why;
  covNote.hidden = !(covShow.checked && !live && why);
  codeEd.paint(on ? new Map(coverage.lines.map(l => [l, lineClass(l)])) : null);
  // The flow is there while coverage is shown, for the methods with a branch
  viewSeg.hidden = !(on && coverage.flows?.length);
  if (viewSeg.hidden) codeView = 'code';
  renderFlow();
}
function renderFlow(){
  for (const b of viewSeg.querySelectorAll('[data-codeview]')) b.setAttribute('aria-pressed', String(b.dataset.codeview === codeView));
  const flow = codeView === 'flow';
  flowEl.hidden = !flow;
  $id('labCodeEd').hidden = flow;
  if (!flow) return;
  flowEl.innerHTML = FLOW_DEFS + coverage.flows.map(fn => `<section class="flow-fn"><h3>${escH(fn.name)}</h3>${flowSvg(fn, boxClass)}</section>`).join('');
}
// A box takes you to its line, in the code
function goToBox(e){
  const g = e.target.closest('[data-line]');
  if (!g || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault();
  codeView = 'code'; renderFlow();
  codeEd.jump(+g.dataset.line);
}
flowEl.addEventListener('click', goToBox);
flowEl.addEventListener('keydown', goToBox);
covSeg.addEventListener('click', e => { const b = e.target.closest('[data-covby]'); if (b){ covBy = b.dataset.covby; renderCoverage(); } });
viewSeg.addEventListener('click', e => { const b = e.target.closest('[data-codeview]'); if (b){ codeView = b.dataset.codeview; renderFlow(); } });
covShow.addEventListener('change', renderCoverage);
codeEd.ta.addEventListener('input', () => { if (coverage && !coverage.stale){ coverage.stale = true; renderCoverage(); } });

/* ---------- Mutation: does a test notice when the code changes? ----------
   As in the site modes, but the mutations are made, not written: the worker
   changes the code in small ways, one at a time (a < for a <=, a + for a -,
   a number one more, a value returned as None), runs the tests on each, and
   says whether one failed. It refuses unless the tests all pass as they are.
   A mutation on a line no test runs cannot be caught, and says so. Results
   last until the next run; an edit to the code or the tests makes them stale.
   Before a run, the tab lists what a run would try, made for the code as it
   is (`list`). `mutation` is { mutants: [{ id, line, what, text, outcome }],
   code, ran, refused, note, stale }, and `hunting` is true while it runs. */
const mutationEl = $id('labMutation'), mutationBtn = document.querySelector('.lab-seg [data-labview="mutation"]');
let mutation = null, hunting = false, huntOne = null;   // huntOne: the id of a mutant run alone
// A mutation put into the code, as the site modes inject one into the page, to
// look at or run by hand: { id, line, before, code } while the code is that
let injected = null, injecting = false;
const MUT_GROUPS = [
  ['escaped', 'Escaped', 'Every test still passed'],
  ['unrun', 'Never run', 'No test runs these lines'],
  ['unchecked', 'Not checked yet', 'Not tried yet'],
  ['caught', 'Caught', 'A test failed']
];
const REFUSED = {
  failing: 'The tests must all pass first: a mutation is caught when a test fails, so a test that already fails says nothing. Fix it, then run mutations.',
  none: 'There are no tests to run yet. Write one, then run mutations.',
  unsupported: 'This Python cannot run mutations.'
};
function renderMutation(){
  const ms = mutation?.mutants || [];
  const caught = ms.filter(m => m.outcome === 'caught').length;
  const scored = ms.filter(m => m.outcome !== 'unchecked').length;
  const pct = scored ? Math.floor(caught / scored * 100) : 0;
  mutationEl.innerHTML = '<div class="mut-head"><button type="button" class="small mut-run"></button><span class="mut-score" aria-live="polite"></span></div>';
  const btn = mutationEl.querySelector('.mut-run'), scoreEl = mutationEl.querySelector('.mut-score');
  btn.textContent = hunting ? 'Running…' : mutation?.ran ? 'Run again' : 'Run mutations';
  btn.disabled = running;
  btn.addEventListener('click', runMutations);
  scoreEl.textContent = scored ? `${caught} of ${scored} mutations caught (${pct}%)` : ms.length ? `${ms.length} mutations` : '';
  scoreEl.dataset.band = scored && !hunting ? band(pct) : '';
  const say = text => { const p = document.createElement('p'); p.className = 'list-note'; p.textContent = text; mutationEl.append(p); };
  if (!mutation) return;
  if (mutation.refused) return say(REFUSED[mutation.refused]);
  if (mutation.stale) say('The code or the tests changed after this run. Run mutations again.');
  if (mutation.note) say(mutation.note);
  if (!ms.length && !hunting) return say('This code has nothing to mutate: no comparisons, arithmetic, numbers or returned values.');
  for (const [state, title, why] of MUT_GROUPS){
    const rows = ms.filter(m => m.outcome === state);
    if (!rows.length) continue;
    const g = document.createElement('div');
    g.className = 'bug-group'; g.dataset.state = state;
    g.innerHTML = '<div class="list-head"><span class="bug-dot" aria-hidden="true"></span><span class="list-title"></span><span class="list-n"></span></div><ul class="list-list"></ul>';
    g.firstChild.title = why;
    g.querySelector('.list-title').textContent = title;
    g.querySelector('.list-n').textContent = rows.length;
    for (const m of rows){
      const li = document.createElement('li');
      li.className = 'bug-row';
      li.innerHTML = '<div class="bug-line"><button type="button" class="mut-row"><span class="mut-at"></span><span class="mut-what"></span><span class="mut-text"></span></button></div>';
      if (huntOne === m.id) li.dataset.trying = 'yes';
      const b = li.querySelector('.mut-row');
      b.querySelector('.mut-at').textContent = `line ${m.line + 1}`;
      b.querySelector('.mut-what').textContent = m.what;
      b.querySelector('.mut-text').textContent = m.text;
      b.title = 'Go to the line';
      b.addEventListener('click', () => { codeView = 'code'; renderFlow(); codeEd.jump(m.line); });
      const live = injected?.id === m.id;
      if (live) li.dataset.live = 'yes';
      const note = huntOne === m.id ? 'trying…' : live ? 'in the code now' : m.timeout ? 'never ended' : '';
      if (note){ const t = document.createElement('span'); t.className = 'bug-m'; t.textContent = note; li.firstChild.append(t); }
      if (m.after != null){
        const put = document.createElement('button');
        put.type = 'button'; put.className = 'ghost small bug-btn mut-inject';
        put.textContent = live ? 'Repair' : 'Inject';
        put.title = live ? 'Repair this line' : 'Inject this change';
        put.setAttribute('aria-label', `${live ? 'Repair' : 'Inject'}: line ${m.line + 1}, ${m.what}`);
        put.disabled = running;
        put.addEventListener('click', () => (live ? repair() : inject(m)));
        li.firstChild.append(put);
      }
      // As on a Results row: this one mutation alone
      const one = document.createElement('button');
      one.type = 'button'; one.className = 'ghost small bug-btn mut-one';
      one.textContent = 'Run';
      one.title = 'Run this mutation';
      one.setAttribute('aria-label', `Run only this mutation: line ${m.line + 1}, ${m.what}`);
      one.disabled = running;
      one.addEventListener('click', () => runMutations(m.id));
      li.firstChild.append(one);
      g.lastChild.append(li);
    }
    mutationEl.append(g);
  }
}
// What a run would try, for the code as it is now: asked for when the tab
// shows, and again when the code changes, unless a run already says
let listing = null;                 // the code a list was asked for
// Change one line of the code, as an edit would, so undo takes it back too
function setLine(line, text){
  const lines = codeEd.value.split('\n');
  const from = lines.slice(0, line).reduce((n, l) => n + l.length + 1, 0);
  injecting = true;
  codeEd.ta.setRangeText(text, from, from + lines[line].length, 'end');
  codeEd.ta.dispatchEvent(new Event('input'));
  injecting = false;
}
function inject(m){
  if (running || (mutation?.code !== codeEd.value && !injected)) return;
  repair();
  const before = codeEd.value.split('\n')[m.line];
  setLine(m.line, m.after);
  injected = { id: m.id, line: m.line, before, code: codeEd.value };
  codeView = 'code'; renderFlow();
  codeEd.mark(new Set([m.line]));
  renderMutation();
}
function repair(){
  if (!injected) return;
  const { line, before, code } = injected;
  injected = null;
  if (codeEd.value === code) setLine(line, before);
  renderMutation();
}
// Any other edit to the code ends it: the line is the person's now
codeEd.ta.addEventListener('input', () => { if (!injecting && injected && codeEd.value !== injected.code){ injected = null; renderMutation(); } });
function listMutations(){
  // A late timer, after leaving the mode, has nothing to list for
  if (!active || !P().mutation || view !== 'mutation' || hunting) return;
  const s = S();
  if (injected && codeEd.value === injected.code) return;   // the list is the code's without it
  if (mutation?.code === codeEd.value) return;
  if (!s.ready){ boot(); return; }  // asked again once it is ready
  listing = codeEd.value;
  s.worker.postMessage({ list: true, src: listing });
}
let listTimer;
codeEd.ta.addEventListener('input', () => { clearTimeout(listTimer); listTimer = setTimeout(listMutations, 400); });
function onMutation(data){
  if (data.type === 'mutants' && !hunting){
    if (listing === codeEd.value) mutation = { mutants: data.mutants.map(m => ({ ...m, outcome: 'unchecked' })), code: listing };
    listing = null;
    return renderMutation();
  }
  if (data.type === 'mutants'){
    // One run alone keeps what the others said, if they are still the same mutants
    const same = huntOne != null && data.mutants.length === mutation.mutants.length
      && data.mutants.every((m, i) => m.what === mutation.mutants[i].what && m.line === mutation.mutants[i].line);
    if (same) mutation.mutants.find(m => m.id === huntOne).outcome = 'unchecked';
    else mutation.mutants = data.mutants.map(m => ({ ...m, outcome: 'unchecked' }));
  }
  else if (data.type === 'mutant'){
    Object.assign(mutation.mutants.find(m => m.id === data.id) || {}, { outcome: data.outcome, timeout: data.timeout });
    const n = mutation.mutants.length;
    setProgress(mutation.mutants.filter(m => m.outcome !== 'unchecked').length / (n || 1), null, progressEl);
  } else if (data.type === 'mutation-refused'){
    // Alone, the list stays, with why it could not run
    if (huntOne != null) mutation.note = REFUSED[data.reason];
    else mutation.refused = data.reason;
  }
  else if (data.type === 'mutation-done') return endHunt();
  renderMutation();
}
// Every mutation, or `only` (an id) alone, keeping what the others said
function runMutations(only){
  if (running || !active || !P().mutation) return;
  only = typeof only === 'number' ? only : null;
  repair();                         // mutations are made from the code as written
  running = true; hunting = true; huntOne = only; syncButtons();
  if (only != null && mutation) Object.assign(mutation, { ran: true, note: '', refused: null, stale: false, code: codeEd.value });
  else mutation = { mutants: [], code: codeEd.value, ran: true };
  setProgress(0, null, progressEl);
  renderMutation();
  const s = S();
  const job = { mutate: true, only, files: { [files().code]: codeEd.value, [files().tests]: testsEd.value }, target: files().tests, framework: s.framework, cover: files().code };
  boot();
  if (s.ready) s.worker.postMessage(job);
  else s.pending = job;
}
// The run ended, by itself or not: `note` says why, when it did not finish
function endHunt(note = ''){
  running = false; hunting = false; huntOne = null; syncButtons();
  if (P().fresh && !note){ drop(); boot(); }   // a run of mutations ran many runners in it
  if (note) mutation.note = note;
  const done = !note && !mutation.refused;
  setProgress(done ? 1 : null, done ? 'ok' : null, progressEl);
  renderMutation();
}
for (const ed of [codeEd, testsEd]) ed.ta.addEventListener('input', () => { if (mutation?.ran && !hunting && !injecting && !mutation.stale){ mutation.stale = true; renderMutation(); } });

/* ---------- Smells: what is wrong with the tests themselves ----------
   The site modes' four smells, found in the test file by the worker, and
   shown the way the Smells panel shows them: a group per smell, its sentence,
   and a row per finding that goes to its line. Read again as the tests are
   typed; nothing runs. `smells` is { src, report } for the file it read.

   Two tabs, as in the site modes' panel: **This file** is what the tests on
   screen smell of, **All smells** every smell with the examples that have it,
   in the framework (and language) on screen. `all` is { key, found }: each
   example's report, read again each time the tab opens, and the example on
   screen followed as it is typed. Never stored. */
const smellsEl = $id('labSmells'), smellsBtn = document.querySelector('.lab-seg [data-labview="smells"]');
smellsEl.innerHTML = `<div class="mut-head"><div class="seg smell-seg" role="group" aria-label="What to list">
  <button type="button" data-labsmells="file" aria-pressed="true" title="Smells in these tests">This file</button>
  <button type="button" data-labsmells="all" aria-pressed="false" title="All smells">All smells</button>
  </div><span class="smell-score" aria-live="polite"></span></div><div class="lab-smells"></div>`;
const smellScoreEl = smellsEl.querySelector('.smell-score'), smellList = smellsEl.querySelector('.lab-smells');
let smells = null, smellsAsked = null, smellView = 'file', all = null;
function setSmellView(v){
  smellView = v === 'all' ? 'all' : 'file';
  smellsEl.querySelectorAll('[data-labsmells]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.labsmells === smellView)));
  if (smellView === 'all') scanAll();
  renderSmells();
}
smellsEl.querySelectorAll('[data-labsmells]').forEach(b => b.addEventListener('click', () => setSmellView(b.dataset.labsmells)));
function listSmells(){
  if (!active || !P().smells || view !== 'smells' || smells?.src === testsEd.value) return;
  // A profile that reads them on the page needs no runtime for it
  if (P().smellsOf){ smellsAsked = testsEd.value; onSmells(P().smellsOf(smellsAsked)); return; }
  const s = S();
  if (!s.ready){ boot(); return; }   // asked again once it is ready
  smellsAsked = testsEd.value;
  s.worker.postMessage({ smells: true, src: smellsAsked });
}
// Every example's tests, as you left them, in the framework and language on screen
const allKey = () => `${active}/${S().framework}/${S().lang}`;
async function scanAll(){
  if (!active || !P().smells) return;
  const s = S(), p = P(), k = allKey(), cur = exampleOf(active), create = creating;
  if (!s.ready && !p.smellsOf){ boot(); return; }   // scanned once it is ready
  if (all?.key !== k) all = { key: k, found: new Map() };
  const mine = all;
  mine.waiting = p.ids.length;
  await Promise.all(p.ids.map(async id => {
    let src;
    try {
      src = id === cur ? testsEd.value
        : s.edits.get(key({ id, lang: s.lang, framework: s.framework, create }, 'tests'))
          ?? (create ? p.skeleton(await shipped(id, 'tests'), p.files(id, s.framework, s.lang).tests) : await shipped(id, 'tests'));
    } catch { src = null; }
    if (all !== mine || (!s.ready && !p.smellsOf)) return;
    if (src == null){ mine.waiting--; return; }
    if (p.smellsOf) onSmells(p.smellsOf(src), `${k}#${id}`);
    else s.worker.postMessage({ smells: true, src, example: `${k}#${id}` });
  }));
}
let smellTimer;
testsEd.ta.addEventListener('input', () => { clearTimeout(smellTimer); smellTimer = setTimeout(listSmells, 400); });
function onSmells(report, example){
  if (example){
    const at = example.lastIndexOf('#');
    if (all?.key !== example.slice(0, at)) return;     // read for another framework
    all.found.set(example.slice(at + 1), report);
    all.waiting--;
    if (smellView === 'all') renderSmells();
    return;
  }
  if (smellsAsked !== testsEd.value) return;   // typed since: a newer one is coming
  smells = { src: smellsAsked, report };
  // The example on screen is in the All smells list as it is now
  if (all?.key === allKey()) all.found.set(exampleOf(active), report);
  renderSmells();
}
const plural = (k, one, many) => `${k} ${k === 1 ? one : many}`;
function smellGroup(sm, n){
  const g = document.createElement('div');
  g.className = 'smell-group'; g.dataset.smell = sm.id;
  g.innerHTML = '<div class="list-head"><span class="smell-dot" aria-hidden="true"></span><span class="list-title"></span><span class="list-n"></span></div><p class="smell-why"></p><ul class="list-list"></ul>';
  g.firstChild.title = sm.why;
  g.querySelector('.list-title').textContent = sm.name;
  g.querySelector('.list-n').textContent = n;
  g.querySelector('.smell-why').textContent = sm.why;
  return g;
}
function smellRow(what, detail, label, title, go){
  const li = document.createElement('li');
  li.className = 'smell-row';
  li.innerHTML = '<button type="button" class="smell-line"><span class="smell-what"></span><span class="smell-m"></span></button>';
  const b = li.firstChild;
  b.title = title;
  b.setAttribute('aria-label', label);
  b.querySelector('.smell-what').textContent = what;
  b.querySelector('.smell-m').textContent = detail;
  b.addEventListener('click', go);
  return li;
}
const smellNote = text => { const p = document.createElement('p'); p.className = 'list-note'; p.textContent = text; smellList.append(p); };
function renderSmells(){
  const top = smellsEl.scrollTop;
  smellList.innerHTML = '';
  smellScoreEl.textContent = ''; delete smellScoreEl.dataset.band;
  if (smellView === 'all') renderAllSmells(); else renderFileSmells();
  smellsEl.scrollTop = top;
}
function renderFileSmells(){
  const r = smells?.report, n = r?.tests ?? 0;
  if (!smells) return smellNote('Reading the tests…');
  if (!r) return smellNote('Fix the tests first: they do not parse.');
  smellScoreEl.textContent = r.items.length ? `${plural(r.items.length, 'smell', 'smells')} in ${plural(n, 'test', 'tests')}` : `No smells in ${plural(n, 'test', 'tests')}`;
  smellScoreEl.dataset.band = r.items.length ? 'warn' : 'ok';
  if (!r.items.length) return smellNote('Nothing to report.');
  for (const sm of P().smells(S().framework)){
    const rows = r.items.filter(i => i.smell === sm.id);
    if (!rows.length) continue;
    const g = smellGroup(sm, rows.length);
    for (const i of rows) g.lastChild.append(smellRow(i.what, i.detail, `Go to ${i.what}`, 'Go to the line', () => testsEd.jump(i.line)));
    smellList.append(g);
  }
}
// Every smell, named and explained whether or not an example has it, and the
// examples that do under it. A row opens the example at its line.
function renderAllSmells(){
  const ids = P().ids, scanned = all?.key === allKey() && all.waiting <= 0;
  const found = id => (all?.key === allKey() && all.found.get(id)?.items) || [];
  const having = ids.filter(id => found(id).length);
  smellScoreEl.textContent = !scanned ? 'Reading every example…'
    : `${having.length} of ${ids.length} examples ${having.length === 1 ? 'has' : 'have'} one`;
  if (scanned) smellScoreEl.dataset.band = having.length ? 'warn' : 'ok';
  for (const sm of P().smells(S().framework)){
    const rows = ids.flatMap(id => found(id).filter(i => i.smell === sm.id).map(item => ({ id, item })));
    const g = smellGroup(sm, new Set(rows.map(x => x.id)).size);
    if (!rows.length){
      g.dataset.none = '';
      g.lastChild.replaceWith(Object.assign(document.createElement('p'), { className: 'list-note', textContent: scanned ? 'No example has this one.' : 'Reading the examples…' }));
    }
    for (const { id, item } of rows){
      const name = P().examples[id].name;
      g.lastChild.append(smellRow(name, item.what, `Open ${name} at ${item.what}`, `Open ${name} at this line`, async () => {
        if (id !== exampleOf(active)) await selectExample(id);
        setSmellView('file');
        testsEd.jump(item.line);
      }));
    }
    smellList.append(g);
  }
}

/* ---------- Create: write the example's tests from their names ----------
   As in the site modes, the tests editor starts as the example's own tests
   taken away, leaving their names as comments (and the imports, so the file
   runs), and the tab says how far you have got: TODO until a test with that
   name is written, DOING until a check says it is done, DONE when it is.

   A name is done when your test with it passes and catches every mutation the
   example's test with that name catches: the names do not say which values to
   try, so what is compared is what the tests notice, not how they are written.
   Check runs both files on the code and on each mutation (the worker's
   `brief`). What it said about a test lasts while that test's own lines and
   the code stay as they were. `checked` is { code, tests: name -> { written,
   passes, need, missed, text }, mutants: id -> mutant } or { refused | note }. */
const createEl = $id('labCreate'), createBtn = document.querySelector('.lab-seg [data-labview="create"]');
let briefSrc = null, checked = null, checking = false, asked = null;
const BRIEF_REFUSED = {
  original: 'The example’s own tests fail on this code, so there is nothing to compare yours with. Undo your changes to the code, or Reset.',
  mine: 'Your tests do not load. Run them to see why.',
  unsupported: 'This Python cannot run mutations.'
};
// A test's own lines: its first, and those below indented further, so an edit
// to it, and only to it, makes what a check said about it stale
function blockAt(lines, at){
  const indent = l => /^\s*/.exec(l)[0].length, own = indent(lines[at]);
  let end = at + 1;
  while (end < lines.length && (!lines[end].trim() || indent(lines[end]) > own)) end++;
  return lines.slice(at, end).join('\n').trimEnd();
}
const testsOf = text => P().testsIn(text, files().tests, S().framework);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function briefItems(){
  const names = [...new Set(testsOf(briefSrc || '').map(P().nameOf))];
  const text = testsEd.value, lines = text.split('\n'), mine = testsOf(text);
  const fresh = checked?.tests && checked.code === codeEd.value;
  return names.map(name => {
    const t = mine.find(x => P().nameOf(x) === name);
    if (!t){
      const at = lines.findIndex(l => new RegExp(`^\\s*${escRe(P().comment)}\\s*${escRe(name)}\\s*$`).test(l));
      return { name, state: 'todo', line: at, why: '' };
    }
    const r = fresh && checked.tests[name];
    const item = { name, state: 'nocheck', line: t.line };
    if (!r || r.text !== blockAt(lines, t.line)) return { ...item, why: 'not checked yet' };
    if (!r.written) return { ...item, why: 'the runner did not find it' };
    if (!r.passes) return { ...item, why: 'fails on the code' };
    if (r.missed.length){
      const m = checked.mutants.get(r.missed[0]);
      return { ...item, why: `misses ${r.missed.length} of ${r.need.length}${m ? `: line ${m.line + 1}, ${m.what}` : ''}`, missed: m };
    }
    return { ...item, state: 'done', why: r.need.length ? `catches ${r.need.length} of ${r.need.length}` : 'passes' };
  });
}
const BRIEF_GROUPS = [
  ['todo', 'TODO', 'No test with this name yet'],
  ['nocheck', 'DOING', 'Not checked yet, or misses what the original catches'],
  ['done', 'DONE', 'Catches what the original catches']
];
function renderCreate(){
  if (!active || !creating) return;
  const top = createEl.scrollTop;
  createEl.innerHTML = '<div class="mut-head"><button type="button" class="small brief-run"></button><span class="mut-score brief-score" aria-live="polite"></span></div>';
  const btn = createEl.querySelector('.brief-run'), scoreEl = createEl.querySelector('.brief-score');
  btn.textContent = checking ? 'Checking…' : 'Check';
  btn.title = 'Check your tests against the original';
  btn.disabled = running;
  btn.addEventListener('click', runBrief);
  const say = text => { const p = document.createElement('p'); p.className = 'list-note'; p.textContent = text; createEl.append(p); };
  if (briefSrc == null) return say('Reading this example’s tests…');
  const items = briefItems(), done = items.filter(i => i.state === 'done').length;
  const pct = items.length ? Math.floor(done / items.length * 100) : 0;
  scoreEl.textContent = items.length && done === items.length ? `All ${items.length} ${items.length === 1 ? 'test' : 'tests'} written` : `${done} of ${items.length} done`;
  scoreEl.dataset.band = band(pct);
  if (checked?.refused && checked.code === codeEd.value) say(BRIEF_REFUSED[checked.refused]);
  if (checked?.note) say(checked.note);
  for (const [state, title, why] of BRIEF_GROUPS){
    const rows = items.filter(i => i.state === state);
    if (!rows.length) continue;
    const g = document.createElement('div');
    g.className = 'create-group'; g.dataset.state = state;
    g.innerHTML = '<div class="list-head"><span class="create-dot" aria-hidden="true"></span><span class="list-title"></span><span class="list-n"></span></div><ul class="list-list"></ul>';
    g.firstChild.title = why;
    g.querySelector('.list-title').textContent = title;
    g.querySelector('.list-n').textContent = rows.length;
    for (const i of rows){
      const li = document.createElement('li');
      li.className = 'create-row';
      const el = document.createElement(i.line >= 0 ? 'button' : 'div');
      el.className = 'create-line';
      el.innerHTML = '<span class="create-what"></span><span class="create-m"></span>';
      el.querySelector('.create-what').textContent = i.name;
      el.querySelector('.create-m').textContent = i.why;
      if (i.line >= 0){
        el.type = 'button';
        el.title = i.state === 'todo' ? 'Go to its comment' : 'Go to the test';
        el.setAttribute('aria-label', `Go to ${i.name}`);
        el.addEventListener('click', () => testsEd.jump(i.line));
      }
      li.append(el);
      g.lastChild.append(li);
    }
    createEl.append(g);
  }
  createEl.scrollTop = top;
}
let briefTimer;
for (const ed of [testsEd, codeEd]) ed.ta.addEventListener('input', () => { clearTimeout(briefTimer); briefTimer = setTimeout(renderCreate, 300); });
function runBrief(){
  if (running || !active || !creating || briefSrc == null) return;
  const s = S();
  running = true; checking = true; syncButtons();
  asked = { code: codeEd.value, tests: testsEd.value };
  setProgress(0, null, progressEl);
  renderCreate();
  const job = { brief: true, files: { [files().code]: asked.code, [files().tests]: asked.tests }, cover: files().code,
    target: files().tests, original: briefSrc, framework: s.framework, lang: s.lang,
    names: [...new Set(testsOf(briefSrc).map(P().nameOf))] };
  boot();
  if (s.ready) s.worker.postMessage(job);
  else s.pending = job;
}
function onBrief(data){
  if (!checking) return;
  if (data.type === 'brief-progress') return setProgress(data.done / (data.of || 1), null, progressEl);
  if (data.refused) return endCheck({ refused: data.refused, code: asked.code });
  // What each of your tests looked like when it was checked
  const lines = asked.tests.split('\n'), mine = testsOf(asked.tests);
  const tests = {};
  for (const [name, r] of Object.entries(data.tests)){
    const t = mine.find(x => P().nameOf(x) === name);
    tests[name] = { ...r, text: t ? blockAt(lines, t.line) : null };
  }
  endCheck({ code: asked.code, tests, mutants: new Map(data.mutants.map(m => [m.id, m])) });
}
function endCheck(result){
  running = false; checking = false; syncButtons();
  if (P().fresh){ drop(); boot(); }     // a check ran many runners in it
  checked = result;
  const ok = !!result.tests;
  setProgress(ok ? 1 : null, ok ? 'ok' : null, progressEl);
  renderCreate();
}

/* ---------- The console ---------- */
const consoleEl = $id('labConsole'), summaryEl = $id('labSummary'), stateEl = $id('labState'), progressEl = $id('labProgress');
const runBtn = $id('labRun'), stopBtn = $id('labStop');
let out = [];
function print(line, cls = P().consoleClass(line)){
  out.push(line);
  // Follow the output only while you are already at the bottom of it
  const atEnd = consoleEl.scrollHeight - consoleEl.scrollTop - consoleEl.clientHeight < 40;
  consoleEl.querySelector('.empty')?.remove();
  consoleEl.insertAdjacentHTML('beforeend', `<span class="l ${cls}">${escH(line) || ' '}</span>`);
  if (atEnd) consoleEl.scrollTop = consoleEl.scrollHeight;
}
function clearConsole(){
  out = [];
  consoleEl.innerHTML = '<span class="empty"></span>';
  idle();
  summaryEl.textContent = ''; summaryEl.className = ''; setProgress(null, null, progressEl);
}
function setState(text, bad = false){ stateEl.textContent = text; stateEl.classList.toggle('bad', bad); idle(); }
// An empty console says what the runtime is doing, since the first download
// takes a few seconds and Run would otherwise seem to do nothing.
function idle(){
  if (!active) return;
  const { worker, ready } = S();
  const waiting = `Downloading ${rt()}. This takes a few seconds the first time; after that your browser keeps it.`;
  const down = `${rt()} is not running. Press Run to try again.`;
  // Results says so too, above the tests, until the runtime is ready. A fresh
  // worker starting for the next run downloads nothing it has not already.
  const known = ready || !!S().versions;
  noteEl.hidden = known;
  noteEl.textContent = worker ? waiting : down;
  noteEl.classList.toggle('loading', !!worker && !ready);
  const el = consoleEl.querySelector('.empty');
  if (!el) return;
  el.textContent = known ? 'Press Run to run the tests.' : worker ? waiting : down;
  el.classList.toggle('loading', !!worker && !known);
}

/* ---------- The runtime ---------- */
function boot(m = active){
  const s = session(m), p = LABS[m];
  if (s.worker) return;
  s.ready = false;
  s.worker = p.worker(s.framework, s.lang);
  if (m === active && !s.versions) setState(`Downloading ${rt(m)}…`);
  s.worker.onmessage = ({ data }) => {
    // A worker for the mode not on screen only gets itself ready
    if (data.type === 'ready'){ s.ready = true; s.versions = data.versions; }
    if (m !== active) return;
    if (data.type === 'status') setState(data.text);
    else if (data.type === 'ready'){
      setState(label());
      if (s.pending){ t0 = performance.now(); s.worker.postMessage(s.pending); s.pending = null; }
      listMutations();
      listSmells();
      if (view === 'smells' && smellView === 'all') scanAll();
    }
    else if (data.type === 'out') print(data.line);
    else if (['collected', 'collect-error', 'start', 'result'].includes(data.type)) onTest(data);
    else if (data.type === 'coverage' && !data.lines) setCoverage(null, `${data.file} could not be measured, so it ran as written.`);
    else if (data.type === 'coverage') setCoverage({ file: data.file, lines: data.lines, hit: new Set(data.hit),
      branches: data.branches && new Map(data.branches.map(([l, of, taken]) => [l, [of, taken]])), flows: data.flows || [] });
    else if (['mutants', 'mutant', 'mutation-refused', 'mutation-done'].includes(data.type)) onMutation(data);
    else if (data.type === 'smells') onSmells(data.report, data.example);
    else if (data.type === 'brief' || data.type === 'brief-progress') onBrief(data);
    else if (data.type === 'done') finish(data.code);
    else if (data.type === 'error') fail(data.message);
  };
  // The worker's own script, or the runtime's, did not load: nothing to talk to
  s.worker.onerror = e => {
    e.preventDefault();
    if (m === active) fail(`${rt(m)} did not download. Check your connection, then press Run to try again.`);
    else { s.worker?.terminate(); s.worker = null; }
  };
}
// Throw the worker away; a profile whose worker is cheap starts each run on a
// fresh one, so no test can leave anything behind for the next.
function drop(m = active){
  const s = session(m);
  s.worker?.terminate(); s.worker = null; s.ready = false; s.pending = null;
}
function fail(message){
  drop();
  setState(`${rt()} is not running`, true);
  if (checking){ endCheck({ note: message }); return; }
  if (hunting){ endHunt(message); return; }
  if (running){ print(message, 'bad'); finish(null, 'Did not run'); }
  else toast(message);
}
function syncButtons(){
  runBtn.disabled = running; stopBtn.disabled = !running;
  mutationEl.querySelectorAll('.mut-run, .mut-one, .mut-inject').forEach(b => { b.disabled = running; });
  createEl.querySelectorAll('.brief-run').forEach(b => { b.disabled = running; });
  listEl.querySelectorAll('.run-one').forEach(b => { b.disabled = running; });
}
// The lines of `file` that the run's tracebacks went through, counted from 0
const marksIn = (fails, file) => new Set(fails.flatMap(f => f.frames || []).filter(f => f.file === file).map(f => f.line));
// The exit code: 0 all passed, 1 some failed, 5 none collected; null when it
// never finished, which `note` then says why.
function finish(code, note = 'Stopped'){
  running = false; syncButtons();
  // What the head says is what the site modes' says: a skipped test did not run
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const counted = ran.filter(o => o !== 'skipped'), passed = counted.filter(o => o === 'passed').length;
  // Stopped, the test it stopped in counts as one that ran, as in the site modes
  const said = code == null && note === 'Stopped' ? runSummary({ ran: Math.max(counted.length, started), passed, secs, stopped: true })
    : code === 5 ? { text: 'No tests found', ok: false }
    : collectError ? { text: 'The tests did not load', ok: false }
    : code == null ? { text: note, ok: false }
    : runSummary({ ran: counted.length, passed, secs });
  summaryEl.textContent = said.text;
  summaryEl.className = said.ok ? 'ok' : 'bad';
  setProgress(code == null ? null : 1, said.ok ? 'ok' : 'bad', progressEl);
  const fails = [collectError, ...tests.map(t => t.fail)].filter(Boolean);
  testsEd.mark(marksIn(fails, files().tests));
  codeEd.mark(marksIn(fails, files().code));
  // A test still running when the run ended never finished
  for (const t of tests) if (t.state === 'running') t.state = 'idle';
  renderResults();
  if (!coverage) setCoverage(null, code == null ? 'The run did not finish, so nothing was measured. Run the tests again.' : '');
  if (code != null && P().fresh){ drop(); boot(); }
}

// The whole file, or one test by its id (what the Run on its row does)
let ran = [];                       // how each test this run reported ended
let started = 0, t0 = 0;            // tests begun this run, and when it began
export function runLab(target = files().tests){
  if (running || !active) return;
  running = true; runTarget = target; ran = []; started = 0; t0 = performance.now();
  clearConsole(); consoleEl.innerHTML = '';
  summaryEl.textContent = 'Running…'; summaryEl.className = ''; setProgress(0, null, progressEl);
  testsEd.mark(new Set()); codeEd.mark(new Set());
  readTests();
  if (target === files().tests){ collectError = null; for (const t of tests) Object.assign(t, { state: 'idle', ms: null, fail: null }); }
  else { const t = tests.find(x => x.id === target); if (t) Object.assign(t, { state: 'idle', ms: null, fail: null }); }
  runIds = target === files().tests ? tests.map(t => t.id) : [target];
  renderResults(); syncButtons();
  setCoverage(null);
  const s = S();
  const job = { files: { [files().code]: codeEd.value, [files().tests]: testsEd.value }, target, framework: s.framework, lang: s.lang, cover: files().code };
  boot();
  if (s.ready) s.worker.postMessage(job);
  else { s.pending = job; print(`Waiting for ${rt()} to load…`, 'muted'); }
}
export function stopLab(){
  if (!running) return;
  if (checking){
    drop();
    endCheck({ note: 'Stopped before the check finished. Press Check to start again.' });
    boot();
    return;
  }
  if (hunting){
    drop();
    endHunt('Stopped. The mutations not checked yet were left as they were.');
    boot();
    return;
  }
  drop();
  print(`Stopped. ${rt()} is starting again for the next run.`, 'muted');
  finish(null);
  boot();
}

/* ---------- Examples, frameworks and languages ----------
   What you typed is kept per example, and the tests per framework and
   language too, until Reset or a reload. The shipped files are fetched the
   first time each is needed. */
// What an edit is kept under: the code per language, the tests per framework too
const key = ({ id, lang, framework, create }, which) => (which === 'code' ? `${id}/${lang}` : `${create ? 'create:' : ''}${id}/${lang}/${framework}`);
// Every code mode ships the same way: examples/<mode>/<id>/ holds the code,
// and a folder per framework the tests
async function shipped(id, which){
  const s = S(), f = P().files(id, s.framework, s.lang);
  const r = await fetch(new URL(`../examples/${active}/${id}/${which === 'code' ? f.code : `${s.framework}/${f.tests}`}`, import.meta.url));
  if (!r.ok) throw new Error(`${id}: ${r.status}`);
  return r.text();
}
function stash(){
  const s = active && S();
  // Kept under what the editors hold, not what was chosen since: a switch
  // still loading has not replaced them yet
  if (!s?.shown) return;
  s.edits.set(key(s.shown, 'code'), codeEd.value);
  s.edits.set(key(s.shown, 'tests'), testsEd.value);
}
// The framework and language switches, drawn for the mode on screen
function drawSwitches(){
  const p = P(), s = S();
  // The languages are told apart by their logos alone; the name is still what a
  // screen reader says.
  const draw = (el, items, cur, attr, { logoOnly = false } = {}) => {
    el.innerHTML = '';
    for (const it of items){
      const b = document.createElement('button');
      b.type = 'button'; b.dataset[attr] = it.id;
      b.setAttribute('aria-pressed', String(it.id === cur));
      b.title = it.title;
      b.innerHTML = LOGOS[it.logo] || '';
      if (logoOnly) b.setAttribute('aria-label', it.label);
      else b.append(Object.assign(document.createElement('span'), { textContent: it.label }));
      el.append(b);
    }
  };
  draw(document.querySelector('.lab-fw'), p.frameworks, s.framework, 'fw');
  const lang = document.querySelector('.lab-lang');
  lang.hidden = !(p.langs?.length > 1);
  if (!lang.hidden) draw(lang, p.langs, s.lang, 'lang', { logoOnly: true });
}
// Put the example, in the framework and language chosen, into the editors
function show(){
  const m = active, id = exampleOf(m), s = S();
  const chosen = { id, lang: s.lang, framework: s.framework, create: creating };
  s.want = chosen;
  drawSwitches();
  return (async () => {
    try {
      // Create starts from the names in the example's own tests, which are
      // also what a check compares yours with
      const [code, testText, original] = await Promise.all([
        s.edits.get(key(chosen, 'code')) ?? shipped(id, 'code'),
        s.edits.get(key(chosen, 'tests')) ?? (chosen.create ? null : shipped(id, 'tests')),
        chosen.create ? shipped(id, 'tests') : null
      ]);
      if (active !== m || s.want !== chosen) return;  // something else was chosen meanwhile
      s.shown = chosen;
      briefSrc = original; checked = null;
      codeEd.value = code; testsEd.value = testText ?? P().skeleton(original, files().tests);
    } catch { toast('The example did not load. Reload the page to try again.'); return; }
    const f = files();
    $id('labCodeTitle').textContent = P().codeTitle(s.lang);
    $id('labCodeFile').textContent = f.code;
    $id('labTestsFile').textContent = f.tests;
    tests = []; collectError = null; folded.clear(); runIds = null;
    clearConsole(); readTests(); setCoverage(null);
    mutation = null; injected = null; renderMutation(); listMutations();
    smells = null; renderSmells(); listSmells();
    if (view === 'smells' && smellView === 'all') scanAll();
    renderCreate();
    runBtn.title = `Run tests (${KEY}+Enter)`;
  })();
}
// The picker, the stepper and a link all come here
export function selectExample(id){
  if (!active || !P().examples[id]) return;
  stopLab();
  stash();
  setLabExample(active, id);
  syncUrl();
  document.dispatchEvent(new CustomEvent('playlive:lab-example'));
  return show();
}
export function setFramework(fw){
  const s = S();
  if (!P().frameworks.some(f => f.id === fw) || fw === s.framework) return;
  stopLab(); stash();
  s.framework = fw;
  if (P().fresh) s.versions = null; else if (s.ready) setState(label());
  if (P().fresh){ drop(); boot(); }
  return show();
}
export function setLang(lang){
  const s = S();
  if (!P().langs?.some(l => l.id === lang) || lang === s.lang) return;
  stopLab(); stash();
  s.lang = lang;
  if (P().fresh) s.versions = null;
  if (P().fresh){ drop(); boot(); }
  return show();
}
export const labState = () => ({ mode: active, create: creating, example: active && exampleOf(active), framework: active && S().framework, lang: active && S().lang });
// Entering a code mode is what fetches its files and starts its runtime
// downloading. Leaving one leaves its runtime loaded for coming back.
export function enterLab(mode){
  const m = labOf(mode), create = isLabCreate(mode);
  if (active === m && creating === create) return;
  if (active){ stopLab(); stash(); }
  active = m; creating = create;
  mutationBtn.hidden = !P().mutation;
  smellsBtn.hidden = !P().smells;
  createBtn.hidden = !creating;
  // Create opens on its list; leaving it, the list goes with it
  if (creating) setView('create');
  else if ((mutationBtn.hidden && view === 'mutation') || (smellsBtn.hidden && view === 'smells') || view === 'create') setView('results');
  // the editors keep their contents, so colour them for the language now showing
  testsEd.render(); codeEd.render();
  boot(m);
  setState(S().versions ? label() : `Downloading ${rt()}…`);
  return show();
}
export function leaveLab(){
  if (!active) return;
  stopLab(); stash();
  active = null; creating = false;
  codeEd.paint(null);
}
// Reset: every example of every code mode back as it ships
export async function resetLab(){
  stopLab();
  for (const s of Object.values(sessions)){ s.edits.clear(); s.shown = null; }
  if (active) await show();
}

// Results and Console fold to their head, which still carries the summary and
// the circles, and the code takes the room
let labFolded = false;
export function setLabFolded(f){
  labFolded = f;
  $id('left').dataset.lab = f ? 'collapsed' : 'open';
  const b = $id('foldLab');
  b.setAttribute('aria-expanded', String(!f));
  b.setAttribute('aria-label', f ? 'Expand the panel' : 'Collapse the panel');
  b.title = f ? 'Expand' : 'Collapse';
  $id('foldLabIcon').setAttribute('d', f ? 'M7 9l5-5 5 5M7 15l5 5 5-5' : 'M7 4l5 5 5-5M7 20l5-5 5 5');
}
$id('foldLab').addEventListener('click', () => setLabFolded(!labFolded));
document.querySelector('.lab-fw').addEventListener('click', e => { const b = e.target.closest('[data-fw]'); if (b) setFramework(b.dataset.fw); });
document.querySelector('.lab-lang').addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
runBtn.addEventListener('click', () => runLab());
stopBtn.addEventListener('click', stopLab);
document.addEventListener('keydown', e => {
  if (!isLab(mode)) return;
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter'){ e.preventDefault(); runLab(); }
  if (e.key === 'Escape' && running) stopLab();
});
