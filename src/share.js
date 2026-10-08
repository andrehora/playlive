import { SITES, SITE_IDS } from '../examples/html/examples.js';
import { $id } from './dom.js';
import { MODES, OLD_MODES, setMode } from './modes.js';
import { selectSite } from './picker.js';
import { LABS, exampleOf, labOf, selectExample } from './lab.js';
import { editorSite, mode, recording, running } from './state.js';
import { toast } from './ui.js';

/* ---------- Shareable links: the mode and the example are the URL's hash ----
   ".../playlive/#create#coupon-code" opens that example in that mode, so a link
   points at what you were doing as well as what you were looking at — which is
   what makes an exercise something you can hand to somebody. The hash is used
   rather than a query so the link still works from a subfolder on GitHub Pages,
   with no server rule behind it.

   Each half is left out when it is the default: home is Python on its first
   example, so ".../" is that. Only Explore has the sites, so a link naming a
   site and no mode is Explore, and "#coupon-code" still means exactly what it
   always did; Explore on the first site is "#explore".

   The code modes (Python, JS/TS) have examples of their own, so their links
   name one of those instead: "#javascript#cart", or "#javascript" alone for
   the first. Python is home, so its links are just "#stack".                                                                      */

// The parts of the fragment, in the order they are written. A fragment is
// everything after the first "#", so the second one is just a separator.
const parts = (hash = location.hash) => hash.replace(/^#\/?/, '').split('#')
  .map(p => { try { return decodeURIComponent(p.trim()); } catch { return p.trim(); } })
  .filter(Boolean);

export const siteFromHash = (hash = location.hash) => parts(hash).find(p => SITES[p]) || null;
export const labFromHash = (hash = location.hash, m = linkedMode(hash)) => (labOf(m) && parts(hash).find(p => LABS[labOf(m)].examples[p])) || null;
// A part that is not an example and is a mode's name is the mode. Examples are
// looked at first, so a link from before modes existed cannot be misread.
export const modeFromHash = (hash = location.hash) => {
  const rest = parts(hash).filter(p => !SITES[p] && !Object.values(LABS).some(l => l.examples[p]));
  return rest.find(p => MODES.includes(p) || OLD_MODES.includes(p)) || null;
};
// The mode a link opens: the one it names, else Explore if it names a site,
// else home's.
export const linkedMode = (hash = location.hash) => modeFromHash(hash) || (siteFromHash(hash) ? 'explore' : MODES[0]);
// "/index.html" and "/" are the same page, and the shorter one is the link worth
// sharing, so the file name is dropped: ".../#newsletter-signup".
const homePath = () => location.pathname.replace(/(^|\/)index\.html$/, '$1');
// Home is the first example, so that one is addressed as "/" with no hash at all
// and "/#address-form" is the same place, spelled out.
// In a code mode the example is the mode's own, whichever site is given.
export const shareUrl = (id = editorSite, m = mode, lab = labOf(m) && exampleOf(m)) => {
  const [ex, home] = labOf(m) ? [lab, LABS[labOf(m)].ids[0]] : [id, SITE_IDS[0]];
  const implied = m === MODES[0] || (m === 'explore' && ex !== home);
  return `${location.origin}${homePath()}${location.search}`
    + (m && !implied ? '#' + m : '')
    + (ex === home ? '' : '#' + ex);
};

// Walking the 100 examples would fill the back button with steps nobody took on
// purpose, so the URL is replaced rather than pushed. Replacing it also drops
// "index.html" from the address bar, and the hash when home is what is showing.
export function syncUrl(id = editorSite, m = mode){
  const url = shareUrl(id, m);
  if (location.href === url) return;
  try { history.replaceState(null, '', url); } catch {}
}
export async function copyLink(id = editorSite, m = mode){
  const url = shareUrl(id, m);
  try { await navigator.clipboard.writeText(url); }
  catch {
    const t = document.createElement('textarea');
    t.value = url; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch {}
    t.remove();
  }
  toast('Link copied!');
  return url;
}
$id('share').addEventListener('click', () => copyLink(editorSite));
// Someone pasting a link into the bar, or going back, changes the mode and the
// example too. The mode goes first: it decides which file the example's editor
// is about to be handed.
window.addEventListener('hashchange', () => {
  if (running || recording) return;
  // Both halves are read before either is applied: changing the mode writes the
  // address, which would take the example out of the hash before it was read.
  // An emptied hash is home: Python, on its first example.
  const m = linkedMode();
  const id = siteFromHash() || SITE_IDS[0];
  if (m !== mode) setMode(m);        // first: it decides which file the example gets
  if (labOf(m)){
    const ex = labFromHash(location.hash, m) || LABS[labOf(m)].ids[0];
    if (ex !== exampleOf(m)) selectExample(ex); else syncUrl();
  }
  else if (id !== editorSite) selectSite(id);
  else syncUrl(id);                  // a link that only named the mode still tidies up
});
