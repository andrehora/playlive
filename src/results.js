import { $id, resultsEl } from './dom.js';
import { describeStep } from './find.js';
import { paintHistory, testKey } from './history.js';
import { run, syncUI } from './run.js';
import { captureSnapshot, showSnapshot } from './snapshots.js';
import { editorSite } from './state.js';

/* ---------- Results panel ---------- */
export function renderResults(tests){
  resultsEl.innerHTML = '';
  tests.forEach((t, i) => {
    const site = editorSite;
    const sec = document.createElement('section');
    sec.className = 'test';
    sec.dataset.title = t.title;
    sec.dataset.key = testKey(t, site);
    sec.innerHTML = `<div class="test-head"><button type="button" class="chev" aria-expanded="true" aria-label="Collapse steps"><svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button><span class="tstate" aria-hidden="true"></span><h3><span class="ttl"></span><span class="sdots" aria-hidden="true"></span><span class="flaky" hidden title="Passed and failed without changes">flaky</span></h3><span class="hist"></span><span class="ms"></span><button type="button" class="run-one">Run</button></div><div class="warnings"></div><ol class="steps"></ol>`;
    sec.querySelector('.ttl').textContent = t.title;
    sec.dataset.site = site;
    sec.querySelector('.chev').addEventListener('click', () => setCollapsed(sec, !sec.classList.contains('collapsed')));
    setCollapsed(sec, !expandedTests.has(foldKey(sec)));   // folded unless you opened it
    const one = sec.querySelector('.run-one');
    one.setAttribute('aria-label', `Run only “${t.title}”`);
    one.addEventListener('click', () => run(i));
    const ol = sec.querySelector('ol');
    t.steps.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="desc"></span><span class="ms"></span>`;
      const desc = li.querySelector('.desc');
      if (s.from){ const f = document.createElement('span'); f.className = 'from-tag'; f.textContent = s.from; desc.appendChild(f); }
      desc.appendChild(document.createTextNode(describeStep(s)));
      li.__site = site;
      li.addEventListener('click', () => showSnapshot(li));
      li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); showSnapshot(li); } });
      ol.appendChild(li);
    });
    resultsEl.appendChild(sec);
    paintHistory(sec);
  });
  updateFoldAll();
  syncUI();
}
/* ---------- Results, Mutation or Smells: one panel, three tabs ----------
   The two graders answer questions about the tests on screen, so they sit
   beside the run rather than in modes of their own, as in the code modes. The
   tab is about this browser and costs nothing to choose again, so it is never
   stored. The panels behind the other two tabs listen for the change. */
export let resultsTab = 'results';
const TABS = { results: resultsEl, mutation: $id('bugTab'), smells: $id('smellTab') };
export function setResultsTab(v){
  resultsTab = TABS[v] ? v : 'results';
  for (const [k, el] of Object.entries(TABS)) el.hidden = k !== resultsTab;
  document.querySelectorAll('.res-seg [data-resview]')
    .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.resview === resultsTab)));
  // A collapsed panel opens on the tab you asked for
  if (resultsView === 'collapsed') setResultsView(lastOpen); else updateFoldAll();
  document.dispatchEvent(new CustomEvent('playlive:restab'));
}
document.querySelectorAll('.res-seg [data-resview]')
  .forEach(b => b.addEventListener('click', () => setResultsTab(b.dataset.resview)));

/* One button, three stops: the steps of every test shown, then hidden, then the
   panel itself down to its one row, which gives the panel below the space. The
   button always says what the next press does. Collapsed, the head still
   carries the summary, so a run is still readable from one line. */
export const foldAllBtn = $id('foldAll');
export let resultsView = 'folded';          // 'expanded' | 'folded' | 'collapsed'
let lastOpen = 'folded';                    // what a collapsed panel opens back to
const NEXT = { expanded: 'folded', folded: 'collapsed', collapsed: 'expanded' };
const SAYS = {
  folded: ['Collapse all', 'Collapse all steps', 'M7 4l5 5 5-5M7 20l5-5 5 5'],
  collapsed: ['Collapse the panel', 'Collapse Results', 'M5 12h14'],
  expanded: ['Expand all', 'Expand all steps', 'M7 9l5-5 5 5M7 15l5 5 5-5']
};
export function setResultsView(v){
  resultsView = v;
  if (v !== 'collapsed') lastOpen = v;
  $id('left').dataset.results = v;
  if (v !== 'collapsed') [...resultsEl.querySelectorAll('.test')].forEach(x => setCollapsed(x, v === 'folded'));
  updateFoldAll();
}
// With no tests there are no steps to show or hide, so the button only opens
// and collapses the panel (Create starts like this: titles as comments). The
// other tabs have no steps either: the panel opens back to how Results was.
const nextView = () => (resultsView === 'collapsed' ? (resultsTab === 'results' ? NEXT.collapsed : lastOpen)
  : resultsTab === 'results' && resultsEl.querySelector('.test') ? NEXT[resultsView] : 'collapsed');
export function updateFoldAll(){
  const secs = [...resultsEl.querySelectorAll('.test')];
  // A fold opened by hand moves the cycle to where the panel actually is
  if (resultsView !== 'collapsed' && secs.length)
    resultsView = secs.every(x => x.classList.contains('collapsed')) ? 'folded' : 'expanded';
  const next = nextView();
  const [label, title, d] = resultsTab === 'results' ? SAYS[next]
    : next === 'collapsed' ? ['Collapse the panel', 'Collapse', SAYS.collapsed[2]] : ['Expand the panel', 'Expand', SAYS.expanded[2]];
  foldAllBtn.setAttribute('aria-label', label);
  foldAllBtn.title = title;
  $id('foldIcon').setAttribute('d', d);
}
foldAllBtn.addEventListener('click', () => setResultsView(nextView()));
// Folded tests stay folded when the list is redrawn (every run and every edit redraws it)
export const expandedTests = new Set();   // tests start folded; only the ones you open are remembered as open
export const foldKey = sec => sec.dataset.site + '::' + sec.dataset.title;
export function setCollapsed(sec, c){
  sec.classList.toggle('collapsed', c);
  if (c) expandedTests.delete(foldKey(sec)); else expandedTests.add(foldKey(sec));
  updateFoldAll();
  const b = sec.querySelector('.chev');
  b.setAttribute('aria-expanded', String(!c)); b.setAttribute('aria-label', c ? 'Expand steps' : 'Collapse steps');
}
export function markStep(li, state){
  li.className = state;
  const snap = captureSnapshot();
  if (snap){ li.__snap = snap; li.classList.add('has-snap'); li.tabIndex = 0; li.title = 'Show the page at this step'; }
}
