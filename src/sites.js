import { SITES } from '../examples/examples.js';
import { harvest } from './catalog.js';
import { frame, specEl } from './dom.js';
import { attachRecorder } from './recorder.js';
import { hideSnapshot } from './snapshots.js';
import { currentSite, editedHtml, editorSite, setEditorSite } from './state.js';

/* ---------- Sites and saved tests (kept in this browser between visits) ---------- */

export const savedTests = {};             // only the sites visited in this browser
export const exampleCache = {};
// The tests that ship with a site, fetched once and kept for Reset
export async function exampleTests(id){
  if (exampleCache[id] === undefined){
    try {
      const res = await fetch(`examples/${id}/tests.yaml`);
      exampleCache[id] = res.ok ? await res.text() : '';
    } catch { exampleCache[id] = ''; }
  }
  return exampleCache[id];
}
// What the editor should show for a site: your saved copy, or the shipped tests
export const testsFor = async id => savedTests[id] ?? await exampleTests(id);
export const STORE = 'live-test-runner:v4';
try {
  const d = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (d && d.savedTests){
    for (const k of Object.keys(SITES)) if (typeof d.savedTests[k] === 'string') savedTests[k] = d.savedTests[k];
    if (SITES[d.editorSite]) setEditorSite(d.editorSite);
  }
} catch {}
export function persist(){
  savedTests[editorSite] = specEl.value;
  try { localStorage.setItem(STORE, JSON.stringify({ savedTests, editorSite })); } catch {}
}

// examples/hooks.js, which every example page loads, reports the storage keys the
// site writes so Reset can clear that site's data
export const SITE_KEYS = 'live-test-runner:site-keys:v1';
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
export let loadCount = 0;
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
    // Markup applied in the HTML view is the page until Reload or Reset, so a
    // run starts every test from the page as it was edited.
    if (editedHtml[currentSite]) frame.srcdoc = editedHtml[currentSite];
    else frame.src = `examples/${currentSite}/index.html?load=${++loadCount}`;
  });
}
