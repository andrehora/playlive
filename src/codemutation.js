import { $id } from './dom.js';
import { begin, boot, send, settle } from './code.js';
import { P, S, active, codeEd, job, onWorker, progressEl, request, testsEd, view } from './codecore.js';
import { showCode } from './codecoverage.js';
import { listGroup, listNote } from './lists.js';
import { setProgress } from './ui.js';
import { band } from './util.js';

/* ---------- Mutation: does a test notice when the code changes? ----------
   As in the site modes, but the mutations are made, not written: the worker
   changes the code in small ways, one at a time (a < for a <=, a + for a -,
   a number one more, a value returned as None), runs the tests on each, and
   says whether one failed. It refuses unless the tests all pass as they are.
   A mutation on a line no test runs cannot be caught, and says so. Results
   last until the next run; an edit to the code or the tests makes them stale.
   Before a run, the tab lists what a run would try, made for the code as it
   is (`list`). `mutation` is { mutants: [{ id, line, what, text, outcome }],
   code, ran, refused, note, stale }, and the job is 'mutate' while it runs. */
export const mutationEl = $id('codeMutation'), mutationBtn = document.querySelector('.code-seg [data-codetab="mutation"]');
export let mutation = null, huntOne = null;   // huntOne: the id of a mutant run alone
// A mutation put into the code, as the site modes inject one into the page, to
// look at or run by hand: { id, line, before, code } while the code is that
export let injected = null, injecting = false;
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
export function renderMutation(){
  const ms = mutation?.mutants || [];
  const caught = ms.filter(m => m.outcome === 'caught').length;
  const scored = ms.filter(m => m.outcome !== 'unchecked').length;
  const pct = scored ? Math.floor(caught / scored * 100) : 0;
  mutationEl.innerHTML = '<div class="mut-head"><button type="button" class="small mut-run"></button><span class="mut-score" aria-live="polite"></span></div>';
  const btn = mutationEl.querySelector('.mut-run'), scoreEl = mutationEl.querySelector('.mut-score');
  btn.textContent = job === 'mutate' ? 'Running…' : mutation?.ran ? 'Run again' : 'Run mutations';
  btn.disabled = !!job;
  btn.addEventListener('click', runMutations);
  scoreEl.textContent = scored ? `${caught} of ${scored} mutations caught (${pct}%)` : ms.length ? `${ms.length} mutations` : '';
  scoreEl.dataset.band = scored && job !== 'mutate' ? band(pct) : '';
  const say = text => mutationEl.append(listNote(text));
  if (!mutation) return;
  if (mutation.refused) return say(REFUSED[mutation.refused]);
  if (mutation.stale) say('The code or the tests changed after this run. Run mutations again.');
  if (mutation.note) say(mutation.note);
  if (!ms.length && job !== 'mutate') return say('This code has nothing to mutate: no comparisons, arithmetic, numbers or returned values.');
  for (const [state, title, why] of MUT_GROUPS){
    const rows = ms.filter(m => m.outcome === state);
    if (!rows.length) continue;
    const g = listGroup('bug', { state, title, n: rows.length, why });
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
      b.addEventListener('click', () => { showCode(); codeEd.jump(m.line); });
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
        put.disabled = !!job;
        put.addEventListener('click', () => (live ? repair() : inject(m)));
        li.firstChild.append(put);
      }
      // As on a Results row: this one mutation alone
      const one = document.createElement('button');
      one.type = 'button'; one.className = 'ghost small bug-btn mut-one';
      one.textContent = 'Run';
      one.title = 'Run this mutation';
      one.setAttribute('aria-label', `Run only this mutation: line ${m.line + 1}, ${m.what}`);
      one.disabled = !!job;
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
  if (job || (mutation?.code !== codeEd.value && !injected)) return;
  repair();
  const before = codeEd.value.split('\n')[m.line];
  setLine(m.line, m.after);
  injected = { id: m.id, line: m.line, before, code: codeEd.value };
  showCode();
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
// Another example, framework or language: nothing said yet, and what a run would try
export function resetMutation(){ mutation = null; injected = null; renderMutation(); listMutations(); }
export function listMutations(){
  // A late timer, after leaving the mode, has nothing to list for
  if (!active || !P().mutation || view !== 'mutation' || job === 'mutate') return;
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
  if (data.type === 'mutants' && job !== 'mutate'){
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
  if (job || !active || !P().mutation) return;
  only = typeof only === 'number' ? only : null;
  repair();                         // mutations are made from the code as written
  huntOne = only; begin('mutate');
  if (only != null && mutation) Object.assign(mutation, { ran: true, note: '', refused: null, stale: false, code: codeEd.value });
  else mutation = { mutants: [], code: codeEd.value, ran: true };
  setProgress(0, null, progressEl);
  renderMutation();
  send(request({ mutate: true, only }));
}
// The run ended, by itself or not: `note` says why, when it did not finish
export function endHunt(note = ''){
  huntOne = null; settle(!note);
  if (note) mutation.note = note;
  const done = !note && !mutation.refused;
  setProgress(done ? 1 : null, done ? 'ok' : null, progressEl);
  renderMutation();
}
for (const ed of [codeEd, testsEd]) ed.ta.addEventListener('input', () => { if (mutation?.ran && job !== 'mutate' && !injecting && !mutation.stale){ mutation.stale = true; renderMutation(); } });
onWorker(['mutants', 'mutant', 'mutation-refused', 'mutation-done'], onMutation);
document.addEventListener('playlive:code-job', () => mutationEl.querySelectorAll('.mut-run, .mut-one, .mut-inject').forEach(b => { b.disabled = !!job; }));
