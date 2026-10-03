import { SITES } from '../example/examples.js';
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
    const site = t.site || editorSite;
    const sec = document.createElement('section');
    sec.className = 'test';
    sec.dataset.title = t.title;
    sec.dataset.key = testKey(t, site);
    sec.innerHTML = `<div class="test-head"><button type="button" class="chev" aria-expanded="true" aria-label="Collapse steps"><svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button><span class="tstate" aria-hidden="true"></span><h3><span class="ttl"></span><span class="sdots" aria-hidden="true"></span><span class="flaky" hidden title="This test both passed and failed without being changed. Common causes: slow responses (add timeout:), random content, or data left over by other tests.">flaky</span></h3><span class="hist"></span><span class="ms"></span><button type="button" class="run-one">Run</button></div><div class="warnings"></div><ol class="steps"></ol>`;
    sec.querySelector('.ttl').textContent = t.title;
    sec.dataset.site = site;
    sec.querySelector('.chev').addEventListener('click', () => setCollapsed(sec, !sec.classList.contains('collapsed')));
    setCollapsed(sec, !expandedTests.has(foldKey(sec)));   // folded unless you opened it
    const one = sec.querySelector('.run-one');
    one.setAttribute('aria-label', `Run only “${t.title}”`);
    one.addEventListener('click', () => run(i));
    if (t.site && t.site !== editorSite){
      const tag = document.createElement('span'); tag.className = 'site-tag'; tag.textContent = SITES[t.site].name;
      sec.querySelector('h3').appendChild(tag);
    }
    const ol = sec.querySelector('ol');
    t.steps.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="desc"></span><span class="ms"></span>`;
      const desc = li.querySelector('.desc');
      if (s.from){ const f = document.createElement('span'); f.className = 'flow-tag'; f.textContent = s.from; desc.appendChild(f); }
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
// One button folds or unfolds every test: it offers "Expand all" once everything is folded
export const foldAllBtn = $id('foldAll');
export function updateFoldAll(){
  const secs = [...resultsEl.querySelectorAll('.test')];
  const allFolded = secs.length > 0 && secs.every(x => x.classList.contains('collapsed'));
  foldAllBtn.disabled = !secs.length;
  foldAllBtn.querySelector('.lbl').textContent = allFolded ? 'Expand all' : 'Collapse all';
  foldAllBtn.title = allFolded ? 'Show the steps of every test' : 'Hide the steps of every test';
  $id('foldIcon').setAttribute('d', allFolded ? 'M7 9l5-5 5 5M7 15l5 5 5-5' : 'M7 4l5 5 5-5M7 20l5-5 5 5');
}
foldAllBtn.addEventListener('click', () => {
  const secs = [...resultsEl.querySelectorAll('.test')];
  const fold = !secs.every(x => x.classList.contains('collapsed'));
  secs.forEach(x => setCollapsed(x, fold));
});
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
  if (snap){ li.__snap = snap; li.classList.add('has-snap'); li.tabIndex = 0; li.title = 'Show the page as it was after this step'; }
}
