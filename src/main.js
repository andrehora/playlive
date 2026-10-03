import { SITES, SITE_IDS } from '../examples/examples.js';
import { $id, errorEl, recordBtn, resetBtn, runBtn, specEl, speedMode, stopBtn, summaryEl } from './dom.js';
import { toCypress, toPlaywright } from './exports.js';
import { HIST, runHistory } from './history.js';
import { validate } from './parse.js';
import { renderTabs, selectSite, setView } from './picker.js';
import { startRecording, stopRecording } from './recorder.js';
import { nextResolve, preview, releaseNext, run, syncUI } from './run.js';
import { SITE_KEYS, exampleTests, loadApp, persist, savedTests, siteKeys, testsFor } from './sites.js';
import { editorSite, previewTimer, recording, running, setPreviewTimer, setStopRequested, stopRequested } from './state.js';
import { STATUS, paintTabs, setProgress, siteStatus, toast } from './ui.js';
import './dialog.js';          // registers the export dialog and its Copy button

/* ---------- Wiring ---------- */
specEl.addEventListener('input', () => {
  clearTimeout(previewTimer);
  setPreviewTimer(setTimeout(() => {
    preview(); persist();
  }, 400));
});
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter'){ e.preventDefault(); if (nextResolve) releaseNext(); else run(); }
  if (e.key === 'Escape' && running) stopBtn.click();
});
$id('snapBack').addEventListener('click', () => loadApp());
runBtn.addEventListener('click', () => { if (nextResolve) releaseNext(); else run(); });
stopBtn.addEventListener('click', () => { setStopRequested(true); releaseNext(); });
$id('speed').addEventListener('change', () => { if (speedMode() !== 'step') releaseNext(); else syncUI(); });
recordBtn.addEventListener('click', () => recording ? stopRecording() : startRecording());
// Reset = this site back to a clean slate: example tests, the app's stored data,
// run history, last result and report. Asks for a second click first.
export async function resetSite(site){
  // the app's own data (storage keys it wrote, plus any it is known to use)
  const keys = new Set([...(siteKeys[site] || []), ...(SITES[site].storageKeys || []).map(k => 'local:' + k)]);
  for (const k of keys){
    const i = k.indexOf(':'), area = k.slice(0, i), key = k.slice(i + 1);
    try { (area === 'session' ? sessionStorage : localStorage).removeItem(key); } catch {}
  }
  delete siteKeys[site];
  if (window.__trMem) delete window.__trMem[site];
  // the runner's data about this site
  for (const k of Object.keys(runHistory)) if (k.startsWith(site + ':')) delete runHistory[k];
  delete siteStatus[site];
  try {
    localStorage.setItem(SITE_KEYS, JSON.stringify(siteKeys));
    localStorage.setItem(HIST, JSON.stringify(runHistory));
    localStorage.setItem(STATUS, JSON.stringify(siteStatus));
  } catch {}
  savedTests[site] = specEl.value = await exampleTests(site);
  errorEl.textContent = ''; summaryEl.textContent = ''; summaryEl.className = ''; setProgress(null);
  setView(site); persist(); paintTabs(); preview(); loadApp(); syncUI();
  toast(`${SITES[site].name} reset: tests, saved data and history cleared`);
}
export let resetArmed = null;
export function disarmReset(){
  clearTimeout(resetArmed); resetArmed = null;
  resetBtn.classList.remove('danger'); resetBtn.lastChild.textContent = 'Reset';
}
resetBtn.addEventListener('click', () => {
  if (running || recording) return;
  if (!resetArmed){
    resetBtn.classList.add('danger'); resetBtn.lastChild.textContent = 'Click again to reset';
    resetArmed = setTimeout(disarmReset, 3500);
    return;
  }
  disarmReset(); resetSite(editorSite);
});
resetBtn.addEventListener('blur', () => { if (resetArmed) disarmReset(); });
renderTabs();
setView(editorSite);
specEl.value = await testsFor(editorSite);
preview(); loadApp(); syncUI();

// Playlive's own tests drive the app through this.
window.playlive = { selectSite, validate, toPlaywright, toCypress, SITES, SITE_IDS };
