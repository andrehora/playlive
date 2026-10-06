import { SITES, SITE_IDS } from '../examples/examples.js';
import { $id } from './dom.js';
import { MODES, setMode } from './modes.js';
import { selectSite } from './picker.js';
import { editorSite, mode, recording, running } from './state.js';
import { toast } from './ui.js';

/* ---------- Shareable links: the mode and the example are the URL's hash ----
   ".../playlive/#create#coupon-code" opens that example in that mode, so a link
   points at what you were doing as well as what you were looking at — which is
   what makes an exercise something you can hand to somebody. The hash is used
   rather than a query so the link still works from a subfolder on GitHub Pages,
   with no server rule behind it.

   Each half is left out when it is the default: home is the first example and
   the default mode is Explore, so ".../" is Explore on the first example and
   "#coupon-code" still means exactly what it always did.                      */

// The parts of the fragment, in the order they are written. A fragment is
// everything after the first "#", so the second one is just a separator.
const parts = (hash = location.hash) => hash.replace(/^#\/?/, '').split('#')
  .map(p => { try { return decodeURIComponent(p.trim()); } catch { return p.trim(); } })
  .filter(Boolean);

export const siteFromHash = (hash = location.hash) => parts(hash).find(p => SITES[p]) || null;
// A part that is not an example and is a mode's name is the mode. Examples are
// looked at first, so a link from before modes existed cannot be misread.
export const modeFromHash = (hash = location.hash) => {
  const rest = parts(hash).filter(p => !SITES[p]);
  return rest.find(p => MODES.includes(p)) || null;
};
// "/index.html" and "/" are the same page, and the shorter one is the link worth
// sharing, so the file name is dropped: ".../#newsletter-signup".
const homePath = () => location.pathname.replace(/(^|\/)index\.html$/, '$1');
// Home is the first example, so that one is addressed as "/" with no hash at all
// and "/#address-form" is the same place, spelled out.
export const shareUrl = (id = editorSite, m = mode) =>
  `${location.origin}${homePath()}${location.search}`
  + (m && m !== MODES[0] ? '#' + m : '')
  + (id === SITE_IDS[0] ? '' : '#' + id);

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
  toast(`Link to ${SITES[id].name} copied`);
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
  // An emptied hash is home: the first example, in the first mode.
  const m = modeFromHash() || MODES[0];
  const id = siteFromHash() || SITE_IDS[0];
  if (m !== mode) setMode(m);        // first: it decides which file the example gets
  if (id !== editorSite) selectSite(id);
  else syncUrl(id);                  // a link that only named the mode still tidies up
});
