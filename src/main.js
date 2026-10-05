import { SITES, SITE_IDS } from '../examples/examples.js';
import { clearCatalog, harvest, snapshot } from './catalog.js';
import { closeCompletion, completion, context, suggest } from './complete.js';
import { $id, errorEl, recordBtn, reloadBtn, resetBtn, runBtn, specEl, speedMode, stopBtn, summaryEl } from './dom.js';
import { toCypress, toPlaywright } from './exports.js';
import { applyHtml, htmlDirty, htmlEdit, revertHtml } from './htmlview.js';
import { query } from './find.js';
import { HIST, runHistory } from './history.js';
import { validate } from './parse.js';
import { renderTabs, selectSite, setView } from './picker.js';
import { startRecording, stopRecording } from './recorder.js';
import { expandedTests } from './results.js';
import { nextResolve, preview, releaseNext, run, syncUI } from './run.js';
import { copyLink, shareUrl, siteFromHash, syncUrl } from './share.js';
import { SITE_KEYS, STORE, exampleTests, loadApp, persist, savedTests, siteKeys, testsFor } from './sites.js';
import { clearEditedHtml, editorSite, previewTimer, recording, running, setEditorSite, setPreviewTimer, setStopRequested } from './state.js';
import { STATUS, paintTabs, setProgress, siteStatus, toast } from './ui.js';
import './dialog.js';          // registers the export dialog and its Copy button
import './complete.js';       // registers the editor's suggestion list

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
// Reset = a clean slate for every example, not only the one showing: the example
// tests back, and every site's saved data, run history, last result, catalog and
// edited markup cleared, with nothing of ours left in storage.
export async function resetAll(){
  const site = editorSite;
  // the example pages' own data: the keys they reported writing, plus any they are known to use
  const keys = new Set();
  for (const id of SITE_IDS){
    for (const k of siteKeys[id] || []) keys.add(k);
    for (const k of SITES[id].storageKeys || []) keys.add('local:' + k);
    clearCatalog(id);            // what a page offers depends on the data it kept
    clearEditedHtml(id);         // and on the markup, which goes back to the file
    delete savedTests[id];
    if (window.__trMem) delete window.__trMem[id];
  }
  for (const k of keys){
    const i = k.indexOf(':'), area = k.slice(0, i), key = k.slice(i + 1);
    try { (area === 'session' ? sessionStorage : localStorage).removeItem(key); } catch {}
  }
  // the runner's own data about every site
  for (const o of [siteKeys, runHistory, siteStatus]) for (const k of Object.keys(o)) delete o[k];
  expandedTests.clear();
  try { for (const k of [STORE, SITE_KEYS, HIST, STATUS]) localStorage.removeItem(k); } catch {}
  specEl.value = await exampleTests(site);
  errorEl.textContent = ''; summaryEl.textContent = ''; summaryEl.className = ''; setProgress(null);
  // deliberately no persist(): after Reset nothing of ours is in storage until you type
  setView(site); paintTabs(); preview(); loadApp(); syncUI();
  toast('Reset: every example back as it ships, saved data and history cleared');
}
resetBtn.addEventListener('click', () => {
  if (running || recording) return;
  resetAll();
});
// Reload = this site's page again from the start, keeping the tests, saved data
// and history. Edited markup is still the page; Reset is what brings the file back.
reloadBtn.addEventListener('click', () => {
  if (running || recording) return;
  loadApp();
});
// A link like "#coupon-code" names the example to open; with no hash the page
// opens the first example
const linked = siteFromHash();
if (linked) setEditorSite(linked);
renderTabs();
setView(editorSite);
syncUrl(editorSite);
specEl.value = await testsFor(editorSite);
preview(); loadApp(); syncUI();

// Playlive's own tests drive the app through this.
window.playlive = {
  selectSite, validate, toPlaywright, toCypress, SITES, SITE_IDS,
  catalog: { harvest, snapshot, clear: clearCatalog },
  share: { copy: copyLink, url: shareUrl, linked: siteFromHash },
  complete: { suggest, context, showing: completion, close: closeCompletion },
  html: { markup: () => htmlEdit.value, apply: applyHtml, revert: revertHtml, edited: () => htmlDirty() },
  query
};
