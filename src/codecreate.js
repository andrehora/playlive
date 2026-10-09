import { $id } from './dom.js';
import { begin, send, settle } from './code.js';
import { P, S, active, codeEd, creating, files, job, onWorker, progressEl, request, testsEd } from './codecore.js';
import { lineRow, listGroup, listNote } from './lists.js';
import { setProgress } from './ui.js';
import { band, escRe, plural } from './util.js';

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
export const createEl = $id('codeCreate'), createBtn = document.querySelector('.code-seg [data-codetab="create"]');
export let briefSrc = null, checked = null, asked = null;
const BRIEF_REFUSED = {
  original: 'The example’s own tests fail on this code, so there is nothing to compare yours with. Undo your changes to the code, or Reset.',
  mine: 'Your tests do not load. Run them to see why.',
  unsupported: 'This Python cannot run mutations.'
};
// A test's own lines: its first, and those below indented further, so an edit
// to it, and only to it, makes what a check said about it stale
// Another example, framework or language: its tests are the brief, and nothing is checked yet
export function resetCreate(original){ briefSrc = original; checked = null; }
function blockAt(lines, at){
  const indent = l => /^\s*/.exec(l)[0].length, own = indent(lines[at]);
  let end = at + 1;
  while (end < lines.length && (!lines[end].trim() || indent(lines[end]) > own)) end++;
  return lines.slice(at, end).join('\n').trimEnd();
}
const testsOf = text => P().testsIn(text, files().tests, S().framework);
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
export function renderCreate(){
  if (!active || !creating) return;
  const top = createEl.scrollTop;
  createEl.innerHTML = '<div class="mut-head"><button type="button" class="small brief-run"></button><span class="mut-score brief-score" aria-live="polite"></span></div>';
  const btn = createEl.querySelector('.brief-run'), scoreEl = createEl.querySelector('.brief-score');
  btn.textContent = job === 'check' ? 'Checking…' : 'Check';
  btn.title = 'Check your tests against the original';
  btn.disabled = !!job;
  btn.addEventListener('click', runBrief);
  const say = text => createEl.append(listNote(text));
  if (briefSrc == null) return say('Reading this example’s tests…');
  const items = briefItems(), done = items.filter(i => i.state === 'done').length;
  const pct = items.length ? Math.floor(done / items.length * 100) : 0;
  scoreEl.textContent = items.length && done === items.length ? `All ${plural(items.length, 'test')} written` : `${done} of ${items.length} done`;
  scoreEl.dataset.band = band(pct);
  if (checked?.refused && checked.code === codeEd.value) say(BRIEF_REFUSED[checked.refused]);
  if (checked?.note) say(checked.note);
  for (const [state, title, why] of BRIEF_GROUPS){
    const rows = items.filter(i => i.state === state);
    if (!rows.length) continue;
    const g = listGroup('create', { state, title, n: rows.length, why });
    for (const i of rows) g.lastChild.append(lineRow('create', { what: i.name, detail: i.why, go: i.line >= 0 && (() => testsEd.jump(i.line)),
      title: i.state === 'todo' ? 'Go to its comment' : 'Go to the test', label: `Go to ${i.name}` }));
    createEl.append(g);
  }
  createEl.scrollTop = top;
}
let briefTimer;
for (const ed of [testsEd, codeEd]) ed.ta.addEventListener('input', () => { clearTimeout(briefTimer); briefTimer = setTimeout(renderCreate, 300); });
function runBrief(){
  if (job || !active || !creating || briefSrc == null) return;
  begin('check');
  asked = { code: codeEd.value, tests: testsEd.value };
  setProgress(0, null, progressEl);
  renderCreate();
  send(request({ brief: true, original: briefSrc, names: [...new Set(testsOf(briefSrc).map(P().nameOf))] }));
}
function onBrief(data){
  if (job !== 'check') return;
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
export function endCheck(result){
  settle(!result.note);
  checked = result;
  const ok = !!result.tests;
  setProgress(ok ? 1 : null, ok ? 'ok' : null, progressEl);
  renderCreate();
}
onWorker(['brief', 'brief-progress'], onBrief);
document.addEventListener('playlive:code-job', () => createEl.querySelectorAll('.brief-run').forEach(b => { b.disabled = !!job; }));
