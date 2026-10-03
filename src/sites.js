import { SITES } from '../example/examples.js';
import { frame, specEl } from './dom.js';
import { attachRecorder } from './recorder.js';
import { hideSnapshot } from './snapshots.js';
import { currentSite, editorSite, setEditorSite } from './state.js';

/* ---------- Sites and saved tests (kept in this browser between visits) ---------- */

export const savedTests = {};             // only the sites visited in this browser
export const exampleCache = {};
// The tests that ship with a site, fetched once and kept for Reset
export async function exampleTests(id){
  if (exampleCache[id] === undefined){
    try {
      const res = await fetch(`example/${id}.yaml`);
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

// example/hooks.js, which every example page loads, reports the storage keys the
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
export function loadApp(path = '/'){
  hideSnapshot();
  return new Promise(res => {
    frame.onload = () => { attachRecorder(); res(); };
    frame.removeAttribute('srcdoc');          // a snapshot may have been showing
    frame.src = `example/${currentSite}.html?load=${++loadCount}`;
  });
}
