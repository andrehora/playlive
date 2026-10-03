import { SITES, SITE_IDS } from '../examples/examples.js';
import { $id, errorEl, resultsEl, specEl, tabsEl } from './dom.js';
import { preview } from './run.js';
import { loadApp, persist, savedTests, testsFor } from './sites.js';
import { currentSite, editorSite, previewTimer, recording, running, setCurrentSite, setEditorSite } from './state.js';
import { paintTabs } from './ui.js';

/* ---------- Site picker: 50 examples, grouped and searchable ---------- */
export const CATEGORIES = [...new Set(SITE_IDS.map(id => SITES[id].category))];
export const siteBtn = $id('siteBtn'), sitePop = $id('sitePop'), siteSearch = $id('siteSearch');
siteSearch.placeholder = `Search ${SITE_IDS.length} examples`;
export function renderTabs(){
  tabsEl.innerHTML = '';
  for (const cat of CATEGORIES){
    const group = document.createElement('div'); group.className = 'pop-group';
    const head = document.createElement('div'); head.className = 'pop-cat';
    head.innerHTML = '<span class="swatch" aria-hidden="true"></span><span></span>';
    head.firstChild.style.background = SITES[SITE_IDS.find(id => SITES[id].category === cat)].accent;
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
  $id('siteSwatch').style.background = SITES[id].accent;
  $id('siteName').textContent = SITES[id].name;
  siteBtn.title = `${SITES[id].category}: ${SITES[id].name}. Choose another example`;
  $id('siteCount').textContent = `${SITE_IDS.indexOf(id) + 1} of ${SITE_IDS.length}`;
  paintTabs();
}
export function filterSites(q){
  q = q.trim().toLowerCase();
  let shown = 0;
  tabsEl.querySelectorAll('.pop-group').forEach(g => {
    const catHit = g.querySelector('.pop-cat').textContent.toLowerCase().includes(q);
    let any = false;
    g.querySelectorAll('.tab').forEach(b => {
      const hit = !q || catHit || SITES[b.dataset.site].name.toLowerCase().includes(q) || b.dataset.site.includes(q);
      b.hidden = !hit; if (hit){ any = true; shown++; }
    });
    g.hidden = !any;
  });
  $id('popEmpty').hidden = shown > 0;
}
export function openPicker(){
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
export function stepSite(d){
  if (running || recording) return;
  const i = SITE_IDS.indexOf(editorSite);
  selectSite(SITE_IDS[(i + d + SITE_IDS.length) % SITE_IDS.length]);
}
$id('prevSite').addEventListener('click', () => stepSite(-1));
$id('nextSite').addEventListener('click', () => stepSite(1));
// Each site keeps its own tests, so switching back and forth keeps edits
export async function selectSite(id){
  // A pending save from the editor belongs to the site we are leaving, and the
  // tests below are fetched, so it has to be settled before the site changes.
  clearTimeout(previewTimer);
  savedTests[editorSite] = specEl.value;
  setEditorSite(id); setView(id);
  specEl.value = await testsFor(id);
  errorEl.textContent = '';
  persist(); preview(); loadApp();
  resultsEl.scrollTop = 0; specEl.scrollTop = 0;
}
