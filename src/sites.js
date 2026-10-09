import { SITES } from '../examples/html/examples.js';
import { harvest } from './catalog.js';
import { frame, specEl } from './dom.js';
import { attachRecorder } from './recorder.js';
import { hideSnapshot } from './snapshots.js';
import { bugHtml, currentSite, editedHtml, editorSite, mode } from './state.js';

/* ---------- Sites and saved tests (kept in this browser between visits) ---------- */

export const savedTests = {};             // only the sites visited in this browser
// Create mode asks you to write the example's tests yourself, so it holds a
// different file for the same site. Two buffers, one editor: which one is
// showing is the mode's business, and everything that reads or writes the
// editor goes through bufferFor so neither can overwrite the other.
export const createTests = {};
const bufferFor = (m = mode) => (m === 'create' ? createTests : savedTests);
export const exampleCache = {};
// The tests that ship with a site, fetched once and kept for Reset
export async function exampleTests(id){
  if (exampleCache[id] === undefined){
    try {
      const res = await fetch(`examples/html/${id}/tests.yaml`);
      exampleCache[id] = res.ok ? await res.text() : '';
    } catch { exampleCache[id] = ''; }
  }
  return exampleCache[id];
}
// What the editor should show for a site in the mode it is in: your saved copy,
// or — outside Create, where only you can fill the file — the shipped tests.
export async function testsFor(id, m = mode){
  const kept = bufferFor(m)[id];
  if (kept !== undefined) return kept;
  return m === 'create' ? null : await exampleTests(id);
}
// Put what the editor holds back where this mode keeps it. Called before the
// editor is handed to another site or another mode.
export const stashEditor = (id = editorSite, m = mode) => { bufferFor(m)[id] = specEl.value; };
// The site's markup as it ships, fetched once: what a bug patch is applied to
const sourceCache = {};
export async function pageSource(id){
  if (sourceCache[id] === undefined){
    try {
      const res = await fetch(`examples/html/${id}/index.html`);
      sourceCache[id] = res.ok ? await res.text() : '';
    } catch { sourceCache[id] = ''; }
  }
  return sourceCache[id];
}
export const STORE = 'live-test-runner';
export const CREATE = 'live-test-runner:create';
try {
  const d = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (d && d.savedTests){
    for (const k of Object.keys(SITES)) if (typeof d.savedTests[k] === 'string') savedTests[k] = d.savedTests[k];
  }
} catch {}
try {
  const d = JSON.parse(localStorage.getItem(CREATE) || 'null');
  if (d) for (const k of Object.keys(SITES)) if (typeof d[k] === 'string') createTests[k] = d[k];
} catch {}
export function persist(){
  stashEditor();
  // The example visited last is deliberately not kept: opening the page with no
  // hash starts at the first example, so only the tests are stored. What you
  // write in Create is yours too, and is kept beside them under its own key.
  try { localStorage.setItem(STORE, JSON.stringify({ savedTests })); } catch {}
  try { localStorage.setItem(CREATE, JSON.stringify(createTests)); } catch {}
}

// examples/html/hooks.js, which every example page loads, reports the storage keys the
// site writes so Reset can clear that site's data
export const SITE_KEYS = 'live-test-runner:site-keys';
export let siteKeys = {};
try { siteKeys = JSON.parse(localStorage.getItem(SITE_KEYS) || '{}') || {}; } catch {}
window.__trRecordKey = (site, area, key) => {
  const list = (siteKeys[site] ||= []), k = `${area}:${key}`;
  if (list.includes(k)) return;
  list.push(k);
  try { localStorage.setItem(SITE_KEYS, JSON.stringify(siteKeys)); } catch {}
};
export const pageErrors = () => (frame.contentWindow && frame.contentWindow.__trErrors) || [];
// Reloading the same URL needs a new one, so each load gets a fresh token.
let loadCount = 0;
export function loadApp(){
  hideSnapshot();
  const site = currentSite;
  return new Promise(res => {
    frame.onload = () => {
      attachRecorder(); harvest(site);
      // A page that fills itself in after load is read again a moment later
      setTimeout(() => { if (currentSite === site) harvest(site); }, 250);
      res();
    };
    frame.removeAttribute('srcdoc');          // a snapshot may have been showing
    // An injected bug is the page while it is injected, so the tests meet the
    // broken version. Markup applied in the HTML view is the page until Reset,
    // so a run starts every test from the page as it was edited.
    if (bugHtml[currentSite]) frame.srcdoc = bugHtml[currentSite];
    else if (editedHtml[currentSite]) frame.srcdoc = editedHtml[currentSite];
    else frame.src = `examples/html/${currentSite}/index.html?load=${++loadCount}`;
  });
}
