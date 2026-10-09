import { SITES, SITE_IDS } from '../examples/html/examples.js';
import { $id, errorEl, resultsEl, specEl, tabsEl } from './dom.js';
import { createSkeleton } from './html/create.js';
import { catIconSvg } from './html/icons.js';
import { selectExample } from './code/code.js';
import { CODE_MODES, exampleOf, codeModeOf } from './code/core.js';
import { preview } from './html/run.js';
import { syncUrl } from './share.js';
import { loadApp, persist, stashEditor, testsFor } from './html/sites.js';
import { editorSite, mode, previewTimer, recording, running, setCurrentSite, setEditorSite } from './state.js';
import { paintTabs } from './ui.js';

/* ---------- Site picker: 100 examples, grouped and searchable ---------- */
export const CATEGORIES = [...new Set(SITE_IDS.map(id => SITES[id].category))];
export const siteBtn = $id('siteBtn'), sitePop = $id('sitePop'), siteSearch = $id('siteSearch');
siteSearch.placeholder = 'Search examples';
// A code mode lists its own examples, in the order they are written to be met
const profile = () => CODE_MODES[codeModeOf(mode)];
const current = () => (profile() ? exampleOf(mode) : editorSite);
const nameOf = id => (profile() ? profile().examples : SITES)[id]?.name || '';
function renderExampleTabs(){
  const p = profile();
  tabsEl.innerHTML = '';
  const group = document.createElement('div'); group.className = 'pop-group';
  const head = document.createElement('div'); head.className = 'pop-cat';
  head.innerHTML = catIconSvg(p.icon) + '<span></span>';
  head.lastChild.textContent = p.title;
  head.style.setProperty('--cat', p.accent);
  group.appendChild(head);
  for (const id of p.ids){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.dataset.site = id;
    b.innerHTML = '<span class="tname"></span><span class="tsub"></span>';
    b.querySelector('.tname').textContent = p.examples[id].name;
    b.querySelector('.tsub').textContent = p.examples[id].teaches;
    b.addEventListener('click', () => { closePicker(true); selectExample(id); });
    group.appendChild(b);
  }
  tabsEl.appendChild(group);
}
function setExampleView(id){
  const p = profile();
  tabsEl.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.site === id)));
  const swatch = $id('siteSwatch');
  swatch.innerHTML = catIconSvg(p.icon);
  swatch.style.setProperty('--cat', p.accent);
  $id('siteName').textContent = p.examples[id].name;
  delete siteBtn.dataset.status;
  siteBtn.title = 'Choose an example';
  setCount(id);
}
document.addEventListener('playlive:code-example', () => setExampleView(current()));
export function renderTabs(){
  if (profile()) return renderExampleTabs();
  tabsEl.innerHTML = '';
  for (const cat of CATEGORIES){
    const group = document.createElement('div'); group.className = 'pop-group';
    const head = document.createElement('div'); head.className = 'pop-cat';
    head.innerHTML = catIconSvg(cat) + '<span></span>';
    // The accent still carries the grouping; the icon is what makes it readable.
    head.style.setProperty('--cat', SITES[SITE_IDS.find(id => SITES[id].category === cat)].accent);
    head.lastChild.textContent = cat;
    group.appendChild(head);
    for (const id of SITE_IDS.filter(i => SITES[i].category === cat)){
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tab'; b.dataset.site = id;
      b.innerHTML = '<span class="tname"></span><span class="tres" aria-hidden="true"></span>';
      b.querySelector('.tname').textContent = SITES[id].name;
      b.addEventListener('click', () => { closePicker(true); selectSite(id); });
      group.appendChild(b);
    }
    tabsEl.appendChild(group);
  }
  paintTabs();
}
export function setView(id){
  setCurrentSite(id);
  tabsEl.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.site === id)));
  const swatch = $id('siteSwatch');
  swatch.innerHTML = catIconSvg(SITES[id].category);
  swatch.style.setProperty('--cat', SITES[id].accent);
  $id('siteName').textContent = SITES[id].name;
  $id('sitePanelName').textContent = SITES[id].name;
  const cat = $id('siteCat');
  cat.innerHTML = catIconSvg(SITES[id].category) + '<span></span>';
  cat.lastChild.textContent = SITES[id].category;
  cat.style.setProperty('--cat', SITES[id].accent);
  siteBtn.title = 'Choose an example';
  setCount(id);
  paintTabs();
}
// "2 of 100", or of however many the mode is offering
function setCount(id){
  const list = listed(), i = list.indexOf(id);
  if (i < 0) return;
  $id('siteCount').textContent = `${i + 1} of ${list.length}`;
}
// Every example, in every mode. Smells mode once narrowed this to the examples
// that have a smell, which hid the ones worth comparing them with: an example
// whose tests are clean is the answer to the one that is not, and a list that
// changes length when the mode changes is a list you cannot keep your place in.
// The All smells tab in the panel is where "which examples have one" is
// answered now, and it names them.
export const listed = () => (profile() ? profile().ids : SITE_IDS);
function filterSites(q){
  q = q.trim().toLowerCase();
  const inList = new Set(listed());
  let shown = 0;
  tabsEl.querySelectorAll('.pop-group').forEach(g => {
    const catHit = g.querySelector('.pop-cat').textContent.toLowerCase().includes(q);
    let any = false;
    g.querySelectorAll('.tab').forEach(b => {
      const hit = inList.has(b.dataset.site)
        && (!q || catHit || nameOf(b.dataset.site).toLowerCase().includes(q) || b.dataset.site.includes(q));
      b.hidden = !hit; if (hit){ any = true; shown++; }
    });
    g.hidden = !any;
  });
  $id('popEmpty').textContent = 'No examples match.';
  $id('popEmpty').hidden = shown > 0;
}
// The count and the stepper follow the list. A code mode has a list of its
// own, so crossing into one or out of it draws the other list.
let listedFor = null;                 // the code mode the list is of, or null for the sites
const relist = () => {
  const now = codeModeOf(mode);
  if (now !== listedFor){
    listedFor = now;
    renderTabs();
    if (now) setExampleView(current()); else setView(editorSite);
  }
  setCount(current());
  if (!sitePop.hidden) filterSites(siteSearch.value);
};
document.addEventListener('playlive:mode', relist);
function openPicker(){
  sitePop.hidden = false; siteBtn.setAttribute('aria-expanded', 'true');
  siteSearch.value = ''; filterSites('');
  siteSearch.focus({ preventScroll: true });
  const cur = tabsEl.querySelector('.tab[aria-pressed="true"]');
  if (cur) tabsEl.scrollTop = cur.offsetTop - tabsEl.clientHeight / 2;
}
export function closePicker(refocus){
  if (sitePop.hidden) return;
  sitePop.hidden = true; siteBtn.setAttribute('aria-expanded', 'false');
  if (refocus) siteBtn.focus({ preventScroll: true });
}
siteBtn.addEventListener('click', () => sitePop.hidden ? openPicker() : closePicker());
siteSearch.addEventListener('input', () => filterSites(siteSearch.value));
document.addEventListener('pointerdown', e => { if (!sitePop.hidden && !e.target.closest('.picker')) closePicker(); });
sitePop.addEventListener('keydown', e => {
  const items = [...tabsEl.querySelectorAll('.tab:not([hidden])')].filter(b => !b.closest('.pop-group').hidden);
  if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closePicker(true); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? Math.min(i + 1, items.length - 1) : i - 1;
    if (next < 0) siteSearch.focus(); else items[next].focus();
  }
  else if (e.key === 'Enter' && document.activeElement === siteSearch && items[0]){ e.preventDefault(); items[0].click(); }
});
function stepSite(d){
  if (running || recording) return;
  const list = listed();
  if (list.length < 2) return;
  const i = list.indexOf(current()), next = list[(i + d + list.length) % list.length];
  if (profile()) selectExample(next); else selectSite(next);
}
$id('prevSite').addEventListener('click', () => stepSite(-1));
$id('nextSite').addEventListener('click', () => stepSite(1));
// Each site keeps its own tests, so switching back and forth keeps edits
export async function selectSite(id){
  // A pending save from the editor belongs to the site we are leaving, and the
  // tests below are fetched, so it has to be settled before the site changes.
  clearTimeout(previewTimer);
  stashEditor();
  // The URL changes with the visible example, before the fetch below, so the
  // address bar is never a step behind what the app bar says.
  setEditorSite(id); setView(id); syncUrl(id);
  specEl.value = await testsFor(id) ?? await createSkeleton(id);
  errorEl.textContent = '';
  // Mutations belong to the example, and the Mutation tab may be on screen the
  // whole time: it is told the example changed rather than being reached into.
  document.dispatchEvent(new CustomEvent('playlive:site'));
  persist(); preview(); loadApp();
  resultsEl.scrollTop = 0; specEl.scrollTop = 0;
}
