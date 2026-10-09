import { $id, doc, frame, resultsEl } from './dom.js';

import { setView } from './picker.js';
import { lastEl, recording, running } from './state.js';

/* ---------- Time travel: a snapshot of the page after every step ---------- */
const snapBar = $id('snapbar');
let viewingSnapshot = false;
export function captureSnapshot(){
  const d = doc(); if (!d || !d.documentElement) return null;
  const root = d.documentElement, clone = root.cloneNode(true);
  // Copy live form values into attributes, so the snapshot shows what the user saw
  const live = root.querySelectorAll('input,textarea,select'), copy = clone.querySelectorAll('input,textarea,select');
  live.forEach((el, i) => {
    const c = copy[i]; if (!c) return;
    if (el.tagName === 'TEXTAREA') c.textContent = el.value;
    else if (el.tagName === 'SELECT') [...c.options].forEach((o, j) => o.toggleAttribute('selected', !!el.options[j]?.selected));
    else if (el.type === 'checkbox' || el.type === 'radio') c.toggleAttribute('checked', el.checked);
    else c.setAttribute('value', el.value);
  });
  if (lastEl && lastEl.ownerDocument === d){
    const idx = [...root.querySelectorAll('*')].indexOf(lastEl);
    const target = idx >= 0 ? clone.querySelectorAll('*')[idx] : null;
    if (target) target.setAttribute('data-tr-target', '');
  }
  clone.querySelectorAll('script').forEach(s => s.remove());
  // Snapshots are shown with srcdoc, so they need a base URL to find site.css
  const base = d.createElement('base');
  base.href = d.baseURI;
  const head = clone.querySelector('head') || clone;
  head.insertBefore(base, head.firstChild);
  const style = d.createElement('style');
  style.textContent = '[data-tr-target]{outline:3px solid #EAB308!important;outline-offset:2px!important}body{pointer-events:none}';
  (clone.querySelector('head') || clone).appendChild(style);
  return '<!doctype html>' + clone.outerHTML;
}
export function showSnapshot(li){
  if (running || recording || !li.__snap) return;
  resultsEl.querySelectorAll('li.viewing').forEach(x => x.classList.remove('viewing'));
  li.classList.add('viewing');
  setView(li.__site);
  frame.onload = null; frame.srcdoc = li.__snap;
  const sec = li.closest('.test'), n = [...sec.querySelectorAll('li')].indexOf(li) + 1;
  $id('snapText').textContent = `Snapshot after step ${n} of “${sec.dataset.title}”`;
  snapBar.hidden = false; viewingSnapshot = true;
}
export function hideSnapshot(){
  if (!viewingSnapshot) return;
  viewingSnapshot = false; snapBar.hidden = true;
  resultsEl.querySelectorAll('li.viewing').forEach(x => x.classList.remove('viewing'));
}
