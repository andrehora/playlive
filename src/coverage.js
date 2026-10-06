import { catalogs, keyFor } from './catalog.js';
import { $id, specEl } from './dom.js';
import { validate } from './parse.js';
import { addTest, withValue } from './recorder.js';
import { editorSite, recording, running } from './state.js';
import { toast } from './ui.js';

/* ---------- UI coverage: which of a site's controls the tests reach ----------

   The catalog already knows every element a step could target, and the runner
   already knows the element each step acted on. Coverage is the join: of the
   controls this site offers, how many did the tests actually use?

   What counts is measured as the run happens, never by reading the file. The
   element a step landed on is credited under the very key the catalog lists it
   under, so "- click: Apply" credits the entry written { role: button, name:
   "Apply" } with no second matching rule to keep in step with find.js. What
   beforeEach does and ${unique} come free, because a step is credited after it
   ran.

   Like the catalog, it is never stored: a score describes the run you watched.  */

// Using an element and merely looking at it are different things
export const INTERACTIONS = new Set(['click', 'fill', 'select', 'check', 'uncheck']);
// The kinds a score counts. Headings and page text have no interaction, so
// they are not controls and do not belong in the denominator.
export const KINDS = ['click', 'field', 'select', 'toggle'];
const GROUPS = [
  ['untested', 'Untested', 'No step has reached these yet'],
  ['checked', 'Checked but not used', 'A step asserts these, but none uses them'],
  ['used', 'Used', 'A step clicks, fills, picks or toggles these']
];
// What to call a control in the list: its role, in the words the format uses
const LABELS = { textbox: 'field', combobox: 'select' };

export const touched = {};                 // site -> Map(catalog key -> { actions, options })
const touchOf = site => (touched[site] ||= new Map());
// Controls whose step this panel has already written into the file. The file is
// the record, so the button goes once it has done its one job, and the row says
// so instead. A run settles it: the control is used from then on, or it is not.
export const queued = {};                  // site -> Set(catalog key)
export const clearCoverage = site => { delete touched[site]; delete queued[site]; };

// Credit the element a step just finished with. Called only after the step
// passed: a click that never landed has used nothing.
export function markTested(site, el, action, value){
  if (!el) return;
  let key;
  try { key = keyFor(el); } catch { return; }    // the frame can move on mid-step
  if (!key) return;
  const t = touchOf(site);
  const e = t.get(key) || { actions: new Set(), options: new Set() };
  e.actions.add(action);
  if (action === 'select' && value != null) e.options.add(String(value));
  t.set(key, e);
}

// Every control the catalog knows about for a site, with what the tests did to
// it. Hidden controls are kept: one behind a screen no test opens is exactly
// what should count against the score.
export function report(site = editorSite){
  const cat = catalogs[site], t = touched[site] || new Map();
  const items = [];
  for (const e of cat ? cat.values() : []){
    if (!KINDS.includes(e.kind)) continue;
    const hit = t.get(e.key);
    const used = !!hit && [...hit.actions].some(a => INTERACTIONS.has(a));
    items.push({
      key: e.key, kind: e.kind, role: e.role, target: e.target, parts: e.parts, vis: e.vis,
      options: e.options ? [...e.options] : undefined,
      state: used ? 'used' : hit ? 'checked' : 'untested',
      queued: !!queued[site] && queued[site].has(e.key),
      actions: hit ? [...hit.actions] : [],
      picked: hit ? [...hit.options] : []
    });
  }
  const n = s => items.filter(i => i.state === s).length;
  const used = n('used');
  return {
    site, items, total: items.length, used, checked: n('checked'), untested: n('untested'),
    links: items.filter(i => i.role === 'link' && i.state !== 'used').length,
    score: items.length ? used / items.length : 0
  };
}

// A whole number that never rounds to the wrong story: not 100% until every
// control has been used, and not 0% once one has.
export function percent(r){
  const p = Math.round(r.score * 100);
  if (p === 100 && r.used < r.total) return 99;
  if (p === 0 && r.used > 0) return 1;
  return p;
}
// The score reads in the app's own three colours: everything covered is a pass,
// most of it covered is a warning, and most of it missed is a failure.
export const band = p => p === 100 ? 'ok' : p >= 60 ? 'warn' : 'bad';

// The step an untested control is missing, and the test to put it in. A title
// says what the test does, in the words the list already uses for the control.
export function titleFor(e){
  const name = e.parts.name || e.parts.label || e.parts.placeholder || e.parts.text || label(e);
  const verb = e.kind === 'field' ? 'Fills' : e.kind === 'select' ? 'Chooses' : e.kind === 'toggle' ? 'Checks' : 'Clicks';
  return `${verb} ${name}`;
}
// Two tests may share a title, but a reader should not have to tell them apart
export function uniqueTitle(base, spec){
  const taken = new Set((spec ? spec.tests : []).map(t => t.title));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}
export function stepFor(e){
  if (e.kind === 'field') return `- fill: ${withValue(e.target, 'text')}`;
  if (e.kind === 'select') return `- select: ${withValue(e.target, (e.options && e.options[0]) || 'value')}`;
  if (e.kind === 'toggle') return `- check: ${e.target}`;
  return `- click: ${e.target}`;
}

/* ---------- The panel ---------- */
export const covEl = $id('coverage'), covScore = $id('covScore'), covBar = $id('covBar');
export const covPanel = covEl.closest('.panel');    // the band is the panel's, head and bar included
export const foldCovBtn = $id('foldCov');
const label = e => LABELS[e.role] || e.role || 'control';

// Redrawn after every step, so the score moves while the run is watched. The
// denominator grows as a step reveals a screen, which can take the score down:
// that is the truth, and the panel says what it is a score of.
export function renderCoverage(){
  const r = report();
  const pct = percent(r);
  covScore.textContent = r.total ? `${r.used} of ${r.total} controls (${pct}%)` : '';
  covScore.title = r.total ? 'Controls a step has used, of the controls the tests have reached so far' : '';
  covPanel.dataset.band = r.total ? band(pct) : '';
  covBar.hidden = !r.total;
  covBar.firstElementChild.style.width = `${Math.round(r.score * 100)}%`;
  const top = covEl.scrollTop;
  covEl.innerHTML = '';
  if (!r.total){
    covEl.appendChild(note('Nothing has been read yet. Run the tests to see which of this site’s controls they reach.'));
    return;
  }
  // The file is only parsed when a step could actually be added, so a run
  // redrawing this after every step costs nothing.
  const busy = running || recording;
  const v = busy ? { spec: null, error: '' } : validate(specEl.value);
  // A new test can be written into an empty file as well as a full one; what
  // it cannot be written into is a file that does not parse.
  const canAdd = !busy && (!!v.spec || !specEl.value.trim());
  for (const [state, title, why] of GROUPS){
    const rows = r.items.filter(i => i.state === state);
    if (!rows.length) continue;
    const g = document.createElement('div');
    g.className = 'cov-group'; g.dataset.state = state;
    const h = document.createElement('div');
    h.className = 'cov-head'; h.title = why;
    h.innerHTML = '<span class="cov-dot" aria-hidden="true"></span><span class="cov-title"></span><span class="cov-n"></span>';
    h.querySelector('.cov-title').textContent = title;
    h.querySelector('.cov-n').textContent = rows.length;
    g.appendChild(h);
    const ul = document.createElement('ul');
    ul.className = 'cov-list';
    for (const e of rows) ul.appendChild(row(e, state === 'untested', canAdd, v));
    g.appendChild(ul);
    covEl.appendChild(g);
  }
  covEl.scrollTop = top;
}
function note(text){
  const p = document.createElement('p');
  p.className = 'cov-note'; p.textContent = text;
  return p;
}
function row(e, addable, canAdd, v){
  const li = document.createElement('li');
  li.className = 'cov-row'; li.dataset.kind = e.kind;
  li.innerHTML = '<span class="cov-k"></span><code class="cov-t"></code><span class="cov-m"></span>';
  li.querySelector('.cov-k').textContent = label(e);
  li.querySelector('.cov-t').textContent = e.target;
  const m = li.querySelector('.cov-m');
  // A select is one control, but which of its options a test ever picked is
  // the more useful number, and the catalog already knows them all.
  if (e.kind === 'select' && e.options) m.textContent = e.picked.length
    ? `picked ${e.picked.length} of ${e.options.length} options`
    : `${e.options.length} options`;
  else if (!e.vis) m.textContent = 'not visible yet';
  else if (e.state === 'checked') m.textContent = e.actions.join(', ');
  // Its step is already in the file, so there is nothing left to add: the row
  // says what happened in place of a button that would only repeat itself.
  if (e.queued){ m.textContent = 'test added'; li.dataset.queued = 'yes'; return li; }
  if (!addable) return li;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'ghost small cov-add'; b.textContent = 'Add test';
  b.setAttribute('aria-label', `Add a test for ${label(e)} ${e.target}`);
  b.disabled = !canAdd;
  b.title = canAdd ? 'Write a test for this control at the end of the file'
    : running || recording ? 'Not while the runner is busy'
      : 'Fix the problems in the file first';
  b.addEventListener('click', () => {
    if (running || recording) return;
    (queued[editorSite] ||= new Set()).add(e.key);
    addTest(uniqueTitle(titleFor(e), v.spec), [stepFor(e)]);   // which redraws this list through preview()
    toast('Test added at the end of the file');
  });
  li.appendChild(b);
  return li;
}

/* ---------- Folding: the score stays, the list goes ----------
   Folded, the panel is its one row and the space it gave up goes to Results,
   rather than staying behind as a blank panel. The layout reads the state off
   #left the way it reads the Results fold, and its clamps measure what the
   panel is actually using, so the editor follows without being told. */
let folded = false;
export function setCovFolded(f){
  folded = f;
  $id('covBody').hidden = f;
  $id('left').dataset.cov = f ? 'collapsed' : 'open';
  foldCovBtn.setAttribute('aria-expanded', String(!f));
  foldCovBtn.setAttribute('aria-label', f ? 'Expand the controls' : 'Collapse the controls');
  foldCovBtn.title = f ? 'Show every control on this site' : 'Hide the list of controls';
  $id('foldCovIcon').setAttribute('d', f ? 'M7 9l5-5 5 5M7 15l5 5 5-5' : 'M7 4l5 5 5-5M7 20l5-5 5 5');
}
foldCovBtn.addEventListener('click', () => setCovFolded(!folded));
setCovFolded(false);
