import { SITES, SITE_IDS } from '../examples/examples.js';
import { $id } from './dom.js';
import { selectSite } from './picker.js';
import { editorSite, recording, running } from './state.js';
import { toast } from './ui.js';

/* ---------- Shareable links: the example is the URL's hash ---------- */
// ".../playlive/#coupon-code" opens that example, so a link points at what you
// were looking at. The hash is used rather than a query so the link still works
// from a subfolder on GitHub Pages, with no server rule behind it.

export const siteFromHash = (hash = location.hash) => {
  let id = hash.replace(/^#\/?/, '').trim();
  try { id = decodeURIComponent(id); } catch {}
  return SITES[id] ? id : null;
};
// "/index.html" and "/" are the same page, and the shorter one is the link worth
// sharing, so the file name is dropped: ".../#newsletter-signup".
const homePath = () => location.pathname.replace(/(^|\/)index\.html$/, '$1');
// Home is the first example, so that one is addressed as "/" with no hash at all
// and "/#address-form" is the same place, spelled out.
export const shareUrl = id =>
  `${location.origin}${homePath()}${location.search}${id === SITE_IDS[0] ? '' : '#' + id}`;

// Walking the 100 examples would fill the back button with steps nobody took on
// purpose, so the URL is replaced rather than pushed. Replacing it also drops
// "index.html" from the address bar, and the hash when home is what is showing.
export function syncUrl(id){
  const url = shareUrl(id);
  if (location.href === url) return;
  try { history.replaceState(null, '', url); } catch {}
}
export async function copyLink(id = editorSite){
  const url = shareUrl(id);
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
// Someone pasting a link into the bar, or going back, changes the example too
window.addEventListener('hashchange', () => {
  if (running || recording) return;
  // An emptied hash is home, which is the first example
  const id = siteFromHash() || SITE_IDS[0];
  if (id !== editorSite) selectSite(id);
});
