import { $id, tabsEl } from './dom.js';
import { siteBtn } from './picker.js';
import { currentSite } from './state.js';

/* ---------- Progress, toast, tab status ---------- */
export const progressEl = $id('progress');
export function setProgress(frac, state){
  progressEl.hidden = frac == null;
  progressEl.className = 'progress' + (state ? ' ' + state : '');
  if (frac != null) progressEl.firstElementChild.style.width = `${Math.round(frac * 100)}%`;
}
export function toast(msg){
  const t = $id('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}
export const STATUS = 'live-test-runner:status:v1';
export let siteStatus = {};
try { siteStatus = JSON.parse(localStorage.getItem(STATUS) || '{}') || {}; } catch {}
export function paintTabs(){
  const s = siteStatus[currentSite];
  if (s) siteBtn.dataset.status = s; else delete siteBtn.dataset.status;
  tabsEl.querySelectorAll('.tab').forEach(b => {
    const s = siteStatus[b.dataset.site];
    if (s) b.dataset.status = s; else delete b.dataset.status;
    b.title = s === 'pass' ? 'Last run passed' : s === 'fail' ? 'Last run had failures' : 'Not run yet';
  });
}
export function setSiteStatus(site, ok){
  siteStatus[site] = ok ? 'pass' : 'fail';
  try { localStorage.setItem(STATUS, JSON.stringify(siteStatus)); } catch {}
  paintTabs();
}
