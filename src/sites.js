import { SITES } from '../examples/examples.js';
import { harvest } from './catalog.js';
import { renderCoverage } from './coverage.js';
import { frame, specEl } from './dom.js';
import { attachRecorder } from './recorder.js';
import { hideSnapshot } from './snapshots.js';
import { bugHtml, currentSite, editedHtml, editorSite } from './state.js';

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
// The site's markup as it ships, fetched once: what a bug patch is applied to
export const sourceCache = {};
export async function pageSource(id){
  if (sourceCache[id] === undefined){
    try {
      const res = await fetch(`examples/${id}/index.html`);
      sourceCache[id] = res.ok ? await res.text() : '';
    } catch { sourceCache[id] = ''; }
  }
  return sourceCache[id];
}
export const STORE = 'live-test-runner';
try {
  const d = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (d && d.savedTests){
    for (const k of Object.keys(SITES)) if (typeof d.savedTests[k] === 'string') savedTests[k] = d.savedTests[k];
  }
} catch {}
export function persist(){
  savedTests[editorSite] = specEl.value;
  // The example visited last is deliberately not kept: opening the page with no
  // hash starts at the first example, so only the tests are stored.
  try { localStorage.setItem(STORE, JSON.stringify({ savedTests })); } catch {}
}

// examples/hooks.js, which every example page loads, reports the storage keys the
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
export let loadCount = 0;
export function loadApp(){
  hideSnapshot();
  const site = currentSite;
  return new Promise(res => {
    frame.onload = () => {
      attachRecorder(); harvest(site); renderCoverage();
      // A page that fills itself in after load is read again a moment later
      setTimeout(() => { if (currentSite === site){ harvest(site); renderCoverage(); } }, 250);
      res();
    };
    frame.removeAttribute('srcdoc');          // a snapshot may have been showing
    // An injected bug is the page while it is injected, so the tests meet the
    // broken version. Markup applied in the HTML view is the page until Reset,
    // so a run starts every test from the page as it was edited.
    if (bugHtml[currentSite]) frame.srcdoc = bugHtml[currentSite];
    else if (editedHtml[currentSite]) frame.srcdoc = editedHtml[currentSite];
    else frame.src = `examples/${currentSite}/index.html?load=${++loadCount}`;
  });
}
