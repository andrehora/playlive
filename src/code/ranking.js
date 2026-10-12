import { $id } from '../dom.js';
import { begin, runCodeTests, selectExample, send, settle } from './code.js';
import { P, S, active, codeEd, creating, exampleOf, job, key, onWorker, progressEl, shipped, testsEd, view } from './core.js';
import { coverage, coverageNote, showCode } from './coverage.js';
import { lineRow, listGroup, listNote } from '../lists.js';
import { setProgress } from '../ui.js';
import { band } from '../util.js';

/* ---------- Coverage: this example's, or every example's, ranked ----------
   This example by default, as in the Smells panel. It is the file on screen:
   its two scores, and the lines its tests never ran and the branches they
   took only one way, each going to its line, and the code shaded by them
   (code/coverage.js). It is what the last run measured: opening the tab
   runs the tests, unless that is still up to date.

   **Measure all examples**, pressed, runs every example's tests: on its code, as you left
   them, in the framework and language on screen, quietly, one at a time (the
   job is 'cover'). Each file is ranked by the lines its tests ran, then by
   the branches, the most covered first, or as its Lines or Branches head
   sorts it (`sortBy`, again the other way). Pressing it runs it, unless
   what it shows is still up to date. A row opens
   that example's source. `ranked` is { key, sig, found, done, note,
   stale }: the framework and language it was for (key), what the files were
   (sig), each example's coverage as the worker said it ({ file, lines, hit,
   branches } or lines null), whether every
   one was measured, and why not. Never stored. */
export const rankEl = $id('codeRanking');
rankEl.innerHTML = `<div class="mut-head"><button type="button" class="small ghost help-toggle" data-codecov="all" aria-pressed="false" title="Rank every example"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>Measure all examples</button><span class="rank-score" aria-live="polite"></span></div>
  <table class="rank-table" hidden><thead><tr><th scope="col">File</th><th scope="col" data-col="lines"></th><th scope="col" data-col="branches"></th></tr></thead><tbody></tbody></table><div class="rank-missed"></div>`;
const scoreEl = rankEl.querySelector('.rank-score'), tableEl = rankEl.querySelector('.rank-table'), listEl = tableEl.tBodies[0];
const missedEl = rankEl.querySelector('.rank-missed');
// What All examples is sorted by, and which way: the most covered first, or the least
let sortBy = 'lines', sortDir = 'desc';
const NAMES = { lines: 'Lines', branches: 'Branches' };
// The Lines and Branches heads: buttons that sort All examples; plain on This example's one row
function renderHeads(){
  for (const th of tableEl.querySelectorAll('th[data-col]')){
    const col = th.dataset.col, all = rankView === 'all', on = col === sortBy;
    if (th.dataset.view !== rankView){
      th.dataset.view = rankView;
      th.innerHTML = all ? `<button type="button" class="rank-sort" data-sort="${col}">${NAMES[col]}<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>` : NAMES[col];
    }
    if (!all){ th.removeAttribute('aria-sort'); continue; }
    th.setAttribute('aria-sort', on ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none');
    th.firstChild.title = on && sortDir === 'desc' ? 'Least covered first' : 'Most covered first';
  }
}
tableEl.tHead.addEventListener('click', e => {
  const b = e.target.closest('[data-sort]');
  if (!b) return;
  if (b.dataset.sort === sortBy) sortDir = sortDir === 'desc' ? 'asc' : 'desc';
  else { sortBy = b.dataset.sort; sortDir = 'desc'; }
  renderRanking();
});
export let rankView = 'file';
function setRankView(v){
  rankView = v === 'all' ? 'all' : 'file';
  allBox.setAttribute('aria-pressed', String(rankView === 'all'));
  listRanking();
}
const allBox = rankEl.querySelector('[data-codecov="all"]');
allBox.addEventListener('click', () => setRankView(rankView === 'all' ? 'file' : 'all'));
export let ranked = null;
let queue = [], asking = null;      // the examples still to measure, and the files this job measures

// Every example's files, as you left them; the one on screen as the editors hold it
async function sources(){
  const s = S(), p = P(), cur = exampleOf(active), create = creating;
  const out = await Promise.all(p.ids.map(async id => {
    const at = { id, lang: s.lang, framework: s.framework, create }, f = p.files(id, s.framework, s.lang);
    try {
      const code = id === cur ? codeEd.value : s.edits.get(key(at, 'code')) ?? await shipped(id, 'code');
      const tests = id === cur ? testsEd.value : s.edits.get(key(at, 'tests'))
        ?? (create ? p.skeleton(await shipped(id, 'tests'), f.tests) : await shipped(id, 'tests'));
      return { id, f, code, tests };
    } catch { return { id, f, code: null }; }
  }));
  return { key: `${active}/${s.framework}/${s.lang}/${create}`, list: out };
}
const sigOf = src => JSON.stringify([src.key, src.list.map(x => [x.code, x.tests])]);

// The tab opened, a view chosen, or another example, framework or language:
// a measure of other files is gone, one of these files as they were is stale,
// and the view on screen is measured if it has nothing up to date to show,
// once the job running, if one is, ends (`waiting`)
let waiting = false;
export async function listRanking(){
  waiting = false;
  if (!active || view !== 'coverage') return;
  renderRanking();
  // This example is measured by a run, as it is when the tab opens
  if (rankView === 'file'){
    if (mine()) return;
    if (job){ waiting = true; return renderRanking(); }
    return runCodeTests();
  }
  const m = active, src = await sources();
  if (active !== m || view !== 'coverage') return;
  if (job !== 'cover'){
    if (ranked && ranked.key !== src.key) ranked = null;
    else if (ranked) ranked.stale = ranked.sig !== sigOf(src);
  }
  renderRanking();
  if (rankView !== 'all' || (ranked && !ranked.stale)) return;
  if (job){ waiting = true; renderRanking(); }
  else runRanking();
}
async function runRanking(){
  if (!active || job) return;
  const m = active, src = await sources();
  if (active !== m || job) return;
  ranked = { key: src.key, sig: sigOf(src), found: new Map(), done: false, note: '', stale: false };
  queue = src.list.filter(x => x.code != null);
  asking = ranked;
  begin('cover');
  setProgress(0, null, progressEl);
  next();
}
function next(){
  renderRanking();
  const x = queue.shift();
  if (!x) return endRanking();
  const s = S();
  send({ measure: true, example: x.id, files: { [x.f.code]: x.code, [x.f.tests]: x.tests }, target: x.f.tests, cover: x.f.code, framework: s.framework, lang: s.lang });
}
onWorker(['measured'], data => {
  if (job !== 'cover' || ranked !== asking) return;
  ranked.found.set(data.example, data);
  setProgress(ranked.found.size / P().ids.length, null, progressEl);
  next();
});
// Every example measured, or not: `note` says why
export function endRanking(note = ''){
  if (job !== 'cover') return;
  settle(!note);
  asking = null; queue = [];
  if (ranked){ ranked.done = !note; ranked.note = note; }
  setProgress(note ? null : 1, note ? null : 'ok', progressEl);
  renderRanking();
}

// A file's scores, the share of its lines and of its branches that ran (null
// with no branch); null when not measured
function scores(c){
  if (!c?.lines) return null;
  const hit = new Set(c.hit), ran = c.lines.filter(l => hit.has(l)).length;
  const ways = c.branches?.reduce((n, b) => n + b[1], 0), taken = c.branches?.reduce((n, b) => n + b[2], 0);
  const pct = (a, b) => (b ? Math.floor(a / b * 100) : 100);
  return { lines: pct(ran, c.lines.length), branches: ways ? pct(taken, ways) : null };
}
export function renderRanking(){
  const top = rankEl.scrollTop;
  listEl.innerHTML = ''; missedEl.innerHTML = '';
  rankEl.querySelectorAll(':scope > .list-note').forEach(n => n.remove());
  scoreEl.textContent = '';
  if (rankView === 'all') renderAll(); else renderFile();
  renderHeads();
  tableEl.hidden = !listEl.rows.length;
  rankEl.scrollTop = top;
}
const note = text => rankEl.insertBefore(listNote(text), tableEl);
// The file on screen, as the last run measured it, in the worker's shape
function mine(){
  if (!coverage || coverage.stale) return null;
  return { file: coverage.file, lines: coverage.lines, hit: [...coverage.hit],
    branches: coverage.branches && [...coverage.branches].map(([l, [of, taken]]) => [l, of, taken]) };
}
function renderFile(){
  const c = active && mine(), s = scores(c);
  if (!s) return note(job === 'run' ? 'Running the tests…' : waiting ? 'Measuring once the run ends…'
    : coverage?.stale ? 'The code changed after the last run. Run the tests to measure it again.'
    : coverageNote || 'Run the tests to see which lines of this example they run.');
  listEl.append(row({ id: exampleOf(active), c, s }));
  const hit = new Set(c.hit), code = codeEd.value.split('\n');
  const go = l => () => { showCode(); codeEd.jump(l); };
  // Lines that never ran, a run of them together
  const runs = [];
  for (const l of c.lines.filter(x => !hit.has(x))){
    const last = runs.at(-1);
    if (last && c.lines.filter(x => x > last.to && x < l).length === 0) last.to = l; else runs.push({ from: l, to: l });
  }
  if (runs.length){
    const g = listGroup('bug', { state: 'uncovered', title: 'Uncovered', n: runs.length, why: 'No test runs these lines' });
    for (const { from, to } of runs) g.lastChild.append(lineRow('smell', { what: from === to ? `line ${from + 1}` : `lines ${from + 1}–${to + 1}`,
      detail: code[from]?.trim() ?? '', title: 'Go to the line', label: `Go to line ${from + 1}`, go: go(from) }));
    missedEl.append(g);
  }
  const part = (c.branches || []).filter(([l, of, taken]) => taken < of && hit.has(l));
  if (part.length){
    const g = listGroup('bug', { state: 'stale', title: 'Branch partially covered', n: part.length, why: 'No test takes the other way' });
    for (const [l, of, taken] of part) g.lastChild.append(lineRow('smell', { what: `line ${l + 1}`,
      detail: `${taken} of ${of} ways · ${code[l]?.trim() ?? ''}`, title: 'Go to the line', label: `Go to line ${l + 1}`, go: go(l) }));
    missedEl.append(g);
  }
  if (!runs.length && !part.length) missedEl.append(listNote('Every line ran, and every branch went both ways.'));
}
function renderAll(){
  const ids = active ? P().ids : [];
  const rows = ids.map((id, i) => ({ id, i, c: ranked?.found.get(id), s: scores(ranked?.found.get(id)) }));
  const measured = rows.filter(r => r.s);
  scoreEl.textContent = job === 'cover' ? `Measuring ${Math.min((ranked?.found.size ?? 0) + 1, ids.length)} of ${ids.length} examples…`
    : measured.length ? `${measured.filter(r => r.s.lines === 100).length} of ${measured.length} files fully covered` : '';
  if (waiting) note('Measuring every example once the run ends…');
  if (ranked?.note) note(ranked.note);
  // By the column chosen, then the other, the most covered first; a tie keeps the
  // catalogue's order. A file with no branch counts as all of them for Lines,
  // and goes last for Branches, whichever way.
  const other = sortBy === 'lines' ? 'branches' : 'lines', dir = sortDir === 'desc' ? 1 : -1;
  const at = (r, col) => r.s[col] ?? (col === 'branches' && sortBy === 'branches' ? null : 100);
  measured.sort((a, b) => {
    const x = at(a, sortBy), y = at(b, sortBy);
    if ((x == null) !== (y == null)) return x == null ? 1 : -1;
    return dir * (y - x) || at(b, other) - at(a, other) || a.i - b.i;
  });
  const unmeasured = rows.filter(r => !r.s && r.c);
  for (const r of [...measured, ...unmeasured]) listEl.append(row(r));
}
// A file, a button to its source, and its two scores; a file with no branch
// has none to score
function row({ id, c, s }){
  const tr = document.createElement('tr');
  tr.className = 'rank-row';
  tr.innerHTML = '<td><button type="button" class="rank-line"></button></td><td class="rank-pct rank-lines"></td><td class="rank-pct rank-branches"></td>';
  const b = tr.querySelector('.rank-line');
  b.textContent = c.file;
  b.title = 'Open the source';
  b.addEventListener('click', () => openSource(id));
  const put = (cell, pct, none) => {
    cell.textContent = pct == null ? none : `${pct}%`;
    if (pct != null) cell.dataset.band = band(pct);
  };
  put(tr.querySelector('.rank-lines'), s?.lines, 'not measured');
  put(tr.querySelector('.rank-branches'), s?.branches, '–');
  if (s && s.branches == null) tr.querySelector('.rank-branches').title = 'No branches';
  return tr;
}
// The example, straight in its source
async function openSource(id){
  if (id !== exampleOf(active)) await selectExample(id);
  setRankView('file');
  showCode();
  codeEd.jump(0);
}
document.addEventListener('playlive:code-job', () => { if (!job && waiting) listRanking(); else renderRanking(); });
// A run measured this example, or an edit made what it measured stale
document.addEventListener('playlive:code-coverage', () => { if (view === 'coverage') renderRanking(); });
for (const ed of [codeEd, testsEd]) ed.ta.addEventListener('input', () => { if (view === 'coverage' && rankView === 'file') renderRanking(); });
renderRanking();
