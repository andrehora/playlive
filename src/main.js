import { SITES, SITE_IDS } from '../examples/examples.js';
import { bugsFor, clearBugs, hunt, inject, renderBugs, repair, report as bugReport, setBugFolded } from './bugs.js';
import { clearCatalog, harvest, snapshot } from './catalog.js';
import { clearCoverage, report } from './coverage.js';
import { closeCompletion, completion, context, suggest } from './complete.js';
import { $id, errorEl, recordBtn, reloadBtn, resetBtn, runBtn, specEl, speedMode, stopBtn, summaryEl } from './dom.js';
import { setSpecFolded } from './editor.js';
import { toCypress, toPlaywright } from './exports.js';
import { applyHtml, htmlDirty, htmlEdit, revertHtml } from './htmlview.js';
import { query } from './find.js';
import { HIST, runHistory } from './history.js';
import { layout } from './layout.js';
import { LESSONS, LESSONS_KEY, clearLessons, lessonsDone, startLesson } from './lessons.js';
import { setMode } from './modes.js';
import { validate } from './parse.js';
import { renderTabs, selectSite, setView } from './picker.js';
import { createSkeleton, report as createReport, setCreateFolded, titlesOf } from './create.js';
import { found as smellFound, scanSites, report as smellReport, setSmellFolded, setSmellView, smellView, smelly } from './smells.js';
import { startRecording, stopRecording } from './recorder.js';
import { expandedTests } from './results.js';
import { nextResolve, preview, releaseNext, run, syncUI } from './run.js';
import { copyLink, modeFromHash, shareUrl, siteFromHash, syncUrl } from './share.js';
import { CREATE, SITE_KEYS, STORE, createTests, exampleTests, loadApp, persist, savedTests, siteKeys, testsFor } from './sites.js';
import { clearBugHtml, clearEditedHtml, editorSite, mode, previewTimer, recording, running, setEditorSite, setPreviewTimer, setStopRequested } from './state.js';
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
    clearCoverage(id);           // and the score was about a run of that page
    clearEditedHtml(id);         // and on the markup, which goes back to the file
    clearBugs(id);               // and a bug score was about a hunt of those tests
    clearBugHtml(id);            // and no bug is left on any page
    delete savedTests[id];
    delete createTests[id];      // and what you had written of this example yourself
    if (window.__trMem) delete window.__trMem[id];
  }
  for (const k of keys){
    const i = k.indexOf(':'), area = k.slice(0, i), key = k.slice(i + 1);
    try { (area === 'session' ? sessionStorage : localStorage).removeItem(key); } catch {}
  }
  // the runner's own data about every site
  for (const o of [siteKeys, runHistory, siteStatus]) for (const k of Object.keys(o)) delete o[k];
  expandedTests.clear();
  clearLessons();              // and the path starts again from lesson 1
  try { for (const k of [STORE, CREATE, SITE_KEYS, HIST, STATUS, LESSONS_KEY]) localStorage.removeItem(k); } catch {}
  specEl.value = mode === 'create' ? await createSkeleton(site) : await exampleTests(site);
  errorEl.textContent = ''; summaryEl.textContent = ''; summaryEl.className = ''; setProgress(null);
  // deliberately no persist(): after Reset nothing of ours is in storage until you type
  setView(site); paintTabs(); preview(); renderBugs(); loadApp(); syncUI();
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
// The link's mode wins over the one this browser remembers: a link is someone
// saying what to do, and it is applied before the file loads, because which
// file the editor holds is the mode's to say.
setMode(modeFromHash() || layout.mode || 'explore', { initial: true });
syncUrl(editorSite);
specEl.value = await testsFor(editorSite) ?? await createSkeleton(editorSite);
renderBugs();
preview(); loadApp(); syncUI();
// On a narrow screen the panels stack, so a screenful of YAML would push the
// site and its results off the bottom: the code starts folded and the Tests
// panel's own button brings it back.
if (matchMedia('(max-width:900px)').matches) setSpecFolded(true);

// Playlive's own tests drive the app through this.
window.playlive = {
  selectSite, validate, toPlaywright, toCypress, SITES, SITE_IDS,
  catalog: { harvest, snapshot, clear: clearCatalog },
  coverage: { report, clear: clearCoverage },
  bugs: { report: bugReport, list: bugsFor, hunt, inject, repair, render: renderBugs, fold: setBugFolded },
  modes: { set: setMode, get: () => mode },
  smells: {
    report: smellReport, fold: setSmellFolded, scan: scanSites, sites: () => [...smelly],
    view: setSmellView, viewing: smellView, found: id => smellFound.get(id) || []
  },
  lessons: { list: LESSONS, done: () => [...lessonsDone], start: id => startLesson(LESSONS.find(l => l.id === id)) },
  create: { report: createReport, fold: setCreateFolded, skeleton: createSkeleton, titles: titlesOf },
  share: { copy: copyLink, url: shareUrl, linked: siteFromHash, linkedMode: modeFromHash },
  complete: { suggest, context, showing: completion, close: closeCompletion },
  html: { markup: () => htmlEdit.value, apply: applyHtml, revert: revertHtml, edited: () => htmlDirty() },
  query
};
