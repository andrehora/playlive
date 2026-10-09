import { SITES, SITE_IDS } from '../examples/html/examples.js';
import { $id } from './dom.js';
import { MODES, setMode } from './modes.js';
import { selectSite } from './picker.js';
import { selectExample } from './lab.js';
import { LABS, exampleOf, labOf } from './labcore.js';
import { editorSite, mode, recording, running } from './state.js';
import { toast } from './ui.js';

/* ---------- Shareable links: the mode and the example are the URL's hash ----
   ".../playlive/#html-create#coupon-code" opens that example in that mode, so a link
   points at what you were doing as well as what you were looking at — which is
   what makes an exercise something you can hand to somebody. The hash is used
   rather than a query so the link still works from a subfolder on GitHub Pages,
   with no server rule behind it.

   The hash is the mode, then the example: "#python", "#python-create",
   "#javascript", "#javascript-create", "#html" and "#html-create", then the
   example, left out when it is the mode's first: "#python#stack",
   "#html-create#coupon-code". Home is Python on its first example, so "/" and
   "#python" are both home, and both stay as typed. Any other hash is home.  */

// The parts of the fragment, in the order they are written. A fragment is
// everything after the first "#", so the second one is just a separator.
const parts = (hash = location.hash) => hash.replace(/^#\/?/, '').split('#')
  .map(p => { try { return decodeURIComponent(p.trim()); } catch { return p.trim(); } })
  .filter(Boolean);

// How a mode is written in a link: the code modes by their own names, the
// sites' by their language
const LINKS = { explore: 'html', create: 'html-create' };
const MODE_OF = Object.fromEntries(MODES.map(m => [LINKS[m] || m, m]));
// What a hash says: the mode first, then the site or the code mode's example
const read = (hash = location.hash) => {
  const [link, ex] = parts(hash), m = MODE_OF[link] || null;
  return {
    mode: m,
    site: m && !labOf(m) && SITES[ex] ? ex : null,
    lab: m && labOf(m) && LABS[labOf(m)].examples[ex] ? ex : null
  };
};
export const siteFromHash = hash => read(hash).site;
export const labFromHash = hash => read(hash).lab;
export const modeFromHash = hash => read(hash).mode;
// The mode a link opens: the one it names, else home's
export const linkedMode = hash => modeFromHash(hash) || MODES[0];
// "/index.html" and "/" are the same page, and the shorter one is the link worth
// sharing, so the file name is dropped: ".../#html#newsletter-signup".
const homePath = () => location.pathname.replace(/(^|\/)index\.html$/, '$1');
// The mode is always named, and the example unless it is the mode's first. In
// a code mode the example is the mode's own, whichever site is given.
export const shareUrl = (id = editorSite, m = mode, lab = labOf(m) && exampleOf(m)) => {
  const [ex, first] = labOf(m) ? [lab, LABS[labOf(m)].ids[0]] : [id, SITE_IDS[0]];
  return `${location.origin}${homePath()}${location.search}#${LINKS[m] || m}${ex === first ? '' : '#' + ex}`;
};
// Whether the address already says this place, in any spelling: "/" and
// "#python" are both home, and "#python#calculator" is "#python".
const says = (id, m) => {
  if (location.hash.replace(/^#/, '') && !modeFromHash()) return false;
  if (linkedMode() !== m) return false;
  return labOf(m) ? (labFromHash() || LABS[labOf(m)].ids[0]) === exampleOf(m) : (siteFromHash() || SITE_IDS[0]) === id;
};

// Walking the 100 examples would fill the back button with steps nobody took on
// purpose, so the URL is replaced rather than pushed. An address that already
// says what is showing is left as typed; "index.html" is still dropped.
export function syncUrl(id = editorSite, m = mode){
  if (applying) return;
  if (location.pathname === homePath() && says(id, m)) return;
  try { history.replaceState(null, '', says(id, m) ? location.href.replace(/index\.html(?=[?#]|$)/, '') : shareUrl(id, m)); } catch {}
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
// While a pasted link is applied, the address is the link: the steps on the
// way (the mode, then the example) must not write a half of it back over it.
let applying = false;
window.addEventListener('hashchange', () => {
  if (running || recording) return;
  // An emptied hash is home: Python, on its first example.
  const m = linkedMode();
  const id = siteFromHash() || SITE_IDS[0];
  const ex = labOf(m) && (labFromHash() || LABS[labOf(m)].ids[0]);
  applying = true;
  try {
    if (m !== mode) setMode(m);      // first: it decides which file the example gets
    if (ex){ if (ex !== exampleOf(m)) selectExample(ex); }
    else if (id !== editorSite) selectSite(id);
  } finally { applying = false; }
  syncUrl(id, m);                    // a link in no known shape becomes home's
});
