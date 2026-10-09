import { $id, KEY } from './dom.js';
import { LOGOS } from './logos.js';
import { syncUrl } from './share.js';
import { mode, setCodeExample } from './state.js';
import { setProgress, toast } from './ui.js';
import { escH, plural, runSummary } from './util.js';
import { CODE_MODES, P, S, active, codeEd, creating, exampleOf, files, handlerOf, isCodeMode, isCodeCreate, job, key, label, codeModeOf, onWorker, progressEl,
  request, rt, session, sessions, setActive, setCreating, setCurrentView, setJob, shipped, testsEd, view } from './codecore.js';
import { coverage, setCoverage } from './codecoverage.js';
import { createBtn, createEl, endCheck, renderCreate, resetCreate } from './codecreate.js';
import { endHunt, listMutations, mutationBtn, mutationEl, resetMutation } from './codemutation.js';
import { listSmells, resetSmells, scanAll, smellView, smellsBtn, smellsEl } from './codesmells.js';

/* ---------- The code modes' panels, and what runs them ----------
   codecore.js holds what every panel shares (the profiles, the sessions, the
   two editors and the state they all read); each grader's tab is its own
   module (codecoverage, codemutation, codesmells, codecreate). This is the rest:
   Results, the console, the runtime and the jobs it runs, and moving between
   examples, frameworks and languages. */

/* ---------- Results: one row per test, as in the other modes ----------
   Before a run the rows come from reading the file; once the runner has
   collected, from the runner, so a parametrized test shows each of its cases.
   The worker reports each test as it starts and ends, which is what the rows
   and their dots follow. */
const resultsEl = $id('codeResults');
resultsEl.innerHTML = '<p class="code-note" hidden></p><div class="code-list"></div>';
const noteEl = resultsEl.firstChild, listEl = resultsEl.lastChild;
const countEl = $id('codeCount');
let tests = [], collectError = null, runTarget = null;
// The tests the last run covered, in order, for the circles in the panel head;
// null until a run, and again once the file is edited
let runIds = null;
const dotsEl = $id('codeDots');
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
  d.className = 'code-detail';
  const err = document.createElement('span');
  err.className = 'err'; err.textContent = message || 'Failed';
  d.append(err);
  if (editorFor(file) && line >= 0){
    const at = document.createElement('button');
    at.type = 'button'; at.className = 'ghost small code-at';
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
  sec.innerHTML = `<div class="test-head"><button type="button" class="chev">${CHEV}</button><span class="tstate" aria-hidden="true"></span><h3><button type="button" class="code-name"></button></h3><span></span><span class="ms"></span><button type="button" class="run-one">Run</button></div>`;
  const name = sec.querySelector('.code-name');
  name.textContent = t.name;
  name.title = 'Go to the test';
  name.addEventListener('click', () => testsEd.jump(t.line));
  if (t.ms != null && t.state !== 'running') sec.querySelector('.ms').textContent = `${t.ms} ms`;
  const one = sec.querySelector('.run-one');
  one.setAttribute('aria-label', `Run only ${t.name}`);
  one.disabled = !!job;
  one.addEventListener('click', () => runCodeTests(t.id));
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
  countEl.textContent = n ? plural(n, 'test') : 'No tests';
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
function setView(v){
  // All smells is read again each time the tab opens
  if (v === 'smells' && view !== 'smells' && smellView === 'all') scanAll();
  setCurrentView(v);
  document.querySelectorAll('.code-seg [data-codetab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.codetab === v)));
  createEl.hidden = v !== 'create';
  resultsEl.hidden = v !== 'results';
  consoleEl.hidden = v !== 'console';
  mutationEl.hidden = v !== 'mutation';
  smellsEl.hidden = v !== 'smells';
  listMutations();
  listSmells();
}
document.querySelectorAll('.code-seg [data-codetab]').forEach(b => b.addEventListener('click', () => setView(b.dataset.codetab)));


/* ---------- The console ---------- */
const consoleEl = $id('codeConsole'), summaryEl = $id('codeSummary'), stateEl = $id('codeState');
const runBtn = $id('codeRun'), stopBtn = $id('codeStop');
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
export function boot(m = active){
  const s = session(m), p = CODE_MODES[m];
  if (s.worker) return;
  s.ready = false;
  s.worker = p.worker(s.framework, s.lang);
  if (m === active && !s.versions) setState(`Downloading ${rt(m)}…`);
  s.worker.onmessage = ({ data }) => {
    // A worker for the mode not on screen only gets itself ready
    if (data.type === 'ready'){ s.ready = true; s.versions = data.versions; }
    if (m === active) handlerOf(data.type)?.(data);
  };
  // The worker's own script, or the runtime's, did not load: nothing to talk to
  s.worker.onerror = e => {
    e.preventDefault();
    if (m === active) fail(`${rt(m)} did not download. Check your connection, then press Run to try again.`);
    else { s.worker?.terminate(); s.worker = null; }
  };
}
onWorker(['status'], data => setState(data.text));
onWorker(['ready'], () => {
  const s = S();
  setState(label());
  if (s.pending){ t0 = performance.now(); s.worker.postMessage(s.pending); s.pending = null; }
  listMutations();
  listSmells();
  if (view === 'smells' && smellView === 'all') scanAll();
});
onWorker(['out'], data => print(data.line));
onWorker(['collected', 'collect-error', 'start', 'result'], onTest);
onWorker(['done'], data => finish(data.code));
onWorker(['error'], data => fail(data.message));
// Throw the worker away; a profile whose worker is cheap starts each run on a
// fresh one, so no test can leave anything behind for the next.
function drop(m = active){
  const s = session(m);
  s.worker?.terminate(); s.worker = null; s.ready = false; s.pending = null;
}
/* ---------- Jobs: a run, the mutations, or Create's check ----------
   One at a time (`job`). Each begins by saying so, which every button and
   panel reads, and sends its message to the runtime, now or once it is ready.
   It settles when it ends; a profile whose worker is cheap (`fresh`) then
   starts a new one, since a job may have run many runners in it. Stopped or
   failed, each kind ends in its own words (ENDS). */
export function begin(kind){ setJob(kind); syncButtons(); }
export function send(msg){
  const s = S();
  boot();
  if (s.ready) s.worker.postMessage(msg);
  else { s.pending = msg; if (job === 'run') print(`Waiting for ${rt()} to load…`, 'muted'); }
}
export function settle(finished){
  setJob(null); syncButtons();
  if (finished && P().fresh){ drop(); boot(); }
}
const ENDS = {
  run: {
    stopped: () => { print(`Stopped. ${rt()} is starting again for the next run.`, 'muted'); finish(null); },
    failed: message => { print(message, 'bad'); finish(null, 'Did not run'); }
  },
  mutate: { stopped: () => endHunt('Stopped. The mutations not checked yet were left as they were.'), failed: message => endHunt(message) },
  check: { stopped: () => endCheck({ note: 'Stopped before the check finished. Press Check to start again.' }), failed: message => endCheck({ note: message }) }
};
function fail(message){
  drop();
  setState(`${rt()} is not running`, true);
  if (job) ENDS[job].failed(message);
  else toast(message);
}
// Each panel disables its own buttons while a job runs (playlive:code-job)
function syncButtons(){
  runBtn.disabled = !!job; stopBtn.disabled = !job;
  listEl.querySelectorAll('.run-one').forEach(b => { b.disabled = !!job; });
  document.dispatchEvent(new CustomEvent('playlive:code-job'));
}
// The lines of `file` that the run's tracebacks went through, counted from 0
const marksIn = (fails, file) => new Set(fails.flatMap(f => f.frames || []).filter(f => f.file === file).map(f => f.line));
// The exit code: 0 all passed, 1 some failed, 5 none collected; null when it
// never finished, which `note` then says why.
function finish(code, note = 'Stopped'){
  settle(code != null);
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
}

// The whole file, or one test by its id (what the Run on its row does)
let ran = [];                       // how each test this run reported ended
let started = 0, t0 = 0;            // tests begun this run, and when it began
export function runCodeTests(target = files().tests){
  if (job || !active) return;
  begin('run');
  runTarget = target; ran = []; started = 0; t0 = performance.now();
  clearConsole(); consoleEl.innerHTML = '';
  summaryEl.textContent = 'Running…'; summaryEl.className = ''; setProgress(0, null, progressEl);
  testsEd.mark(new Set()); codeEd.mark(new Set());
  readTests();
  if (target === files().tests){ collectError = null; for (const t of tests) Object.assign(t, { state: 'idle', ms: null, fail: null }); }
  else { const t = tests.find(x => x.id === target); if (t) Object.assign(t, { state: 'idle', ms: null, fail: null }); }
  runIds = target === files().tests ? tests.map(t => t.id) : [target];
  renderResults();
  setCoverage(null);
  send(request({ target }));
}
function stopCodeTests(){
  if (!job) return;
  const stopped = job;
  drop();
  ENDS[stopped].stopped();
  boot();
}


/* ---------- Examples, frameworks and languages ----------
   What you typed is kept per example, and the tests per framework and
   language too, until Reset or a reload. The shipped files are fetched the
   first time each is needed. */
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
  draw(document.querySelector('.code-fw'), p.frameworks, s.framework, 'fw');
  const lang = document.querySelector('.code-lang');
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
      resetCreate(original);
      codeEd.value = code; testsEd.value = testText ?? P().skeleton(original, files().tests);
    } catch { toast('The example did not load. Reload the page to try again.'); return; }
    const f = files();
    $id('codeTitle').textContent = P().codeTitle(s.lang);
    $id('codeFile').textContent = f.code;
    $id('codeTestsFile').textContent = f.tests;
    tests = []; collectError = null; folded.clear(); runIds = null;
    clearConsole(); readTests(); setCoverage(null);
    resetMutation();
    resetSmells();
    if (view === 'smells' && smellView === 'all') scanAll();
    renderCreate();
    runBtn.title = `Run tests (${KEY}+Enter)`;
  })();
}
// The picker, the stepper and a link all come here
export function selectExample(id){
  if (!active || !P().examples[id]) return;
  stopCodeTests();
  stash();
  setCodeExample(active, id);
  syncUrl();
  document.dispatchEvent(new CustomEvent('playlive:code-example'));
  return show();
}
// A framework or a language: `{ framework }` or `{ lang }`, one of the profile's
function switchTo(change){
  const s = S(), [[k, v]] = Object.entries(change);
  const choices = k === 'framework' ? P().frameworks : P().langs;
  if (!choices?.some(c => c.id === v) || v === s[k]) return;
  stopCodeTests(); stash();
  s[k] = v;
  if (P().fresh){ s.versions = null; drop(); boot(); }
  else if (s.ready) setState(label());
  return show();
}
export const setFramework = framework => switchTo({ framework });
export const setLang = lang => switchTo({ lang });
export const codeState = () => ({ mode: active, create: creating, example: active && exampleOf(active), framework: active && S().framework, lang: active && S().lang });
// Entering a code mode is what fetches its files and starts its runtime
// downloading. Leaving one leaves its runtime loaded for coming back.
export function enterCodeMode(mode){
  const m = codeModeOf(mode), create = isCodeCreate(mode);
  if (active === m && creating === create) return;
  if (active){ stopCodeTests(); stash(); }
  // From the other language, the same example, as both modes have the same ones
  if (active && active !== m && CODE_MODES[m].examples[exampleOf(active)]) setCodeExample(m, exampleOf(active));
  setActive(m); setCreating(create);
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
export function leaveCodeMode(){
  if (!active) return;
  stopCodeTests(); stash();
  setActive(null); setCreating(false);
  codeEd.paint(null);
}
// Reset: every example of every code mode back as it ships
export async function resetCodeModes(){
  stopCodeTests();
  for (const s of Object.values(sessions)){ s.edits.clear(); s.shown = null; }
  if (active) await show();
}

// Results and Console fold to their head, which still carries the summary and
// the circles, and the code takes the room
let codeFolded = false;
function setCodeFolded(f){
  codeFolded = f;
  $id('left').dataset.code = f ? 'collapsed' : 'open';
  const b = $id('foldCode');
  b.setAttribute('aria-expanded', String(!f));
  b.setAttribute('aria-label', f ? 'Expand the panel' : 'Collapse the panel');
  b.title = f ? 'Expand' : 'Collapse';
  $id('foldCodeIcon').setAttribute('d', f ? 'M7 9l5-5 5 5M7 15l5 5 5-5' : 'M7 4l5 5 5-5M7 20l5-5 5 5');
}
$id('foldCode').addEventListener('click', () => setCodeFolded(!codeFolded));
document.querySelector('.code-fw').addEventListener('click', e => { const b = e.target.closest('[data-fw]'); if (b) setFramework(b.dataset.fw); });
document.querySelector('.code-lang').addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
runBtn.addEventListener('click', () => runCodeTests());
stopBtn.addEventListener('click', stopCodeTests);
document.addEventListener('keydown', e => {
  if (!isCodeMode(mode)) return;
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter'){ e.preventDefault(); runCodeTests(); }
  if (e.key === 'Escape' && job) stopCodeTests();
});

