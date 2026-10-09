import { $id } from '../dom.js';
import { FLOW_DEFS, flowSvg } from './flow.js';
import { codeEd, onWorker } from './core.js';
import { band, escH } from '../util.js';

/* ---------- Coverage: which lines of the code the last run ran ----------
   Measured on every run. A check in the Results head shades the code's lines (light green ran, light red never did, light yellow ran but
   left a branch untaken) and puts the scores on top of the code. It is
   { file, lines, hit, branches }: the lines holding code and those that ran,
   counted from 0, and, where the runtime measures them, the lines with
   branches as line -> [ways out, ways taken], and the flows of the methods
   with a branch (code/flow.js draws them). The code is coloured by lines or by
   branches, as chosen on top of it. An edit to the code moves its
   lines, so it makes the measure stale until the next run. `note` says why
   there is none, on top of the code while the check is on. */
const covShow = $id('codeCovShow'), codeCov = $id('codeCov'), codeBranch = $id('codeBranch'), covNote = $id('codeCovNote');
const covSeg = document.querySelector('.cov-seg'), viewSeg = document.querySelector('.code-flowseg'), flowEl = $id('codeFlow');
export let coverage = null, coverageNote = '';
let covBy = 'lines', codeView = 'code';    // what colours the code, and code or flow
// The code, not its flow: where a row of another panel takes you
export function showCode(){ codeView = 'code'; renderFlow(); }
export function setCoverage(c, note = ''){ coverage = c; coverageNote = note; renderCoverage(); }
// What a run measured, or the file it could not
onWorker(['coverage'], data => (data.lines
  ? setCoverage({ file: data.file, lines: data.lines, hit: new Set(data.hit),
    branches: data.branches && new Map(data.branches.map(([l, of, taken]) => [l, [of, taken]])), flows: data.flows || [] })
  : setCoverage(null, `${data.file} could not be measured, so it ran as written.`)));
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
  $id('codeEd').hidden = flow;
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

