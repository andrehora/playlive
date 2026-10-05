import { $id, doc, frame } from './dom.js';
import { escH } from './editor.js';
import { reduceMotion } from './find.js';
import { layout, saveLayout } from './layout.js';
import { loadApp } from './sites.js';
import { currentSite, lastEl, setEditedHtml } from './state.js';

/* ---------- The HTML view: the site's live markup, following the run ----------

   The site panel shows either the page itself or its HTML. The markup is read
   back out of the live document on every step, so a filled field reads
   value="…" and a screen a step revealed is really there. Each element is
   remembered against the line its opening tag sits on, which is how the view
   can highlight the line the running step is working on.

   The markup is editable, like the test editor: a textarea over a highlighted
   copy of itself. Edits sit in the textarea until Save writes them back into
   the frame, which re-parses the page so its own scripts run again. While
   there are unsaved edits the view stops reading the page, so a running step
   cannot overwrite what is being typed. Reset brings the original page back. */
export const htmlPane = $id('htmlPane'), htmlCode = $id('htmlCode'), htmlGutter = $id('htmlGutter');
export const htmlEdit = $id('htmlEdit');
const applyBtn = $id('htmlApply'), revertBtn = $id('htmlRevert');
export const viewSeg = document.querySelectorAll('.view-seg [data-view]');
export let viewMode = 'site';            // 'site' shows the page, 'html' shows its markup

const INDENT = '  ';
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
// Attributes written without a value, so "checked" does not read checked=""
const BOOL = new Set(['checked','selected','disabled','readonly','required','multiple','open','hidden','autofocus','novalidate','default','inert']);

let elLine = new Map();                  // element -> the line its opening tag is on
let shown = '';                          // the markup as the view last read it
let dirty = false;                       // the editor holds changes the page has not seen

const squeeze = s => s.replace(/\s+/g, ' ').trim();

// What the element's attributes are right now, with what the user typed folded
// in: the DOM keeps typed values and checked states off the attributes.
function attrsOf(el){
  // The outline a step draws leaves style="" behind, which Chromium will not
  // let go of, so an empty style attribute is the runner's and not the page's.
  const out = [...el.attributes].filter(a => a.name !== 'style' || a.value).map(a => [a.name, a.value]);
  const set = (n, v) => { const a = out.find(x => x[0] === n); if (a) a[1] = v; else out.push([n, v]); };
  const flag = (n, on) => { const i = out.findIndex(x => x[0] === n); if (on && i < 0) out.push([n, '']); else if (!on && i >= 0) out.splice(i, 1); };
  if (el.tagName === 'INPUT'){
    if (el.type === 'checkbox' || el.type === 'radio') flag('checked', el.checked);
    else set('value', el.value);
  }
  else if (el.tagName === 'OPTION') flag('selected', el.selected);
  return out;
}
// One line of markup, coloured as text: the view reads the same lines whether
// they came from the page or from what is being typed over them.
export function hlMarkupLine(line){
  let out = '', i = 0, inTag = false;
  while (i < line.length){
    const rest = line.slice(i);
    let m;
    if (!inTag){
      const lt = rest.search(/</);
      if (lt < 0){ out += escH(rest); break; }
      out += escH(rest.slice(0, lt));
      i += lt;
      const open = line.slice(i);
      if ((m = /^<!(?:--.*?--)?[^>]*>?/.exec(open))){ out += `<i class="c">${escH(m[0])}</i>`; i += m[0].length; continue; }
      if ((m = /^<(\/?)([A-Za-z][\w-]*)/.exec(open))){
        out += `<i class="p">&lt;${m[1]}</i><i class="k">${escH(m[2])}</i>`;
        i += m[0].length; inTag = true; continue;
      }
      out += '&lt;'; i++; continue;
    }
    if ((m = /^\s+/.exec(rest))){ out += escH(m[0]); i += m[0].length; continue; }
    if ((m = /^\/?>/.exec(rest))){ out += `<i class="p">${escH(m[0])}</i>`; i += m[0].length; inTag = false; continue; }
    if ((m = /^([^\s=>/]+)(=)?("[^"]*"?|'[^']*'?|[^\s>]*)?/.exec(rest)) && m[0]){
      out += `<i class="f">${escH(m[1])}</i>`;
      if (m[2]) out += `<i class="p">=</i>`;
      if (m[3]) out += `<i class="s">${escH(m[3])}</i>`;
      i += m[0].length; continue;
    }
    out += escH(rest[0]); i++;
  }
  return out;
}
function openTag(el){
  let s = `<${el.tagName.toLowerCase()}`;
  for (const [name, value] of attrsOf(el)) s += value === '' && BOOL.has(name) ? ` ${name}` : ` ${name}="${value}"`;
  return s + '>';
}
const closeTag = el => `</${el.tagName.toLowerCase()}>`;

// The whole document as lines of markup, each element remembered against its line
function toLines(d){
  const lines = [], map = new Map();
  const add = (depth, text) => lines.push(INDENT.repeat(depth) + text);
  const walk = (el, depth) => {
    if (el.hasAttribute(BASE_MARK)) return;        // the runner's own base tag, not the page's
    const tag = el.tagName.toLowerCase();
    map.set(el, lines.length);
    if (VOID.has(tag)) return add(depth, openTag(el));
    if (tag === 'textarea') return add(depth, openTag(el) + el.value + closeTag(el));
    // Scripts and styles are shown as they are written, so the page reads like its file
    if (tag === 'script' || tag === 'style'){
      const body = el.textContent.replace(/^\n+|\s+$/g, '');
      if (!body) return add(depth, openTag(el) + closeTag(el));
      add(depth, openTag(el));
      body.split('\n').forEach(l => lines.push(l.replace(/\s+$/, '')));
      return add(depth, closeTag(el));
    }
    const kids = [...el.childNodes].filter(n => n.nodeType === 1 || (n.nodeType === 3 && squeeze(n.textContent)));
    if (!kids.length) return add(depth, openTag(el) + closeTag(el));
    const only = kids[0].nodeType === 3 ? squeeze(kids[0].textContent) : '';
    if (kids.length === 1 && only) return add(depth, openTag(el) + only + closeTag(el));
    add(depth, openTag(el));
    for (const n of kids){
      if (n.nodeType === 1) walk(n, depth + 1);
      else add(depth + 1, squeeze(n.textContent));
    }
    add(depth, closeTag(el));
  };
  if (d.doctype) add(0, `<!doctype ${d.doctype.name}>`);
  if (d.documentElement) walk(d.documentElement, 0);
  return { lines, map };
}
// Reads the site again and redraws. state marks the line of the element the
// current step acted on: 'running' while it runs, 'passed' or 'failed' after,
// tagged with the step's action the way the site view tags the element itself.
export function renderHtmlView(state, action){
  if (viewMode !== 'html' || dirty) return;        // unsaved edits are never overwritten
  const d = doc();
  if (!d || !d.documentElement){ htmlCode.textContent = ''; htmlEdit.value = ''; htmlGutter.innerHTML = ''; elLine = new Map(); return; }
  const { lines, map } = toLines(d);
  elLine = map;
  shown = lines.join('\n');
  if (htmlEdit.value !== shown) htmlEdit.value = shown;
  const cur = state && lastEl && lastEl.ownerDocument === d ? elLine.get(lastEl) : undefined;
  const mark = state === 'failed' ? 'bad' : state === 'passed' ? 'ok' : 'cur';
  const tag = action ? `<i class="tag">${escH(action)}</i>` : '';
  paint(lines, i => (i === cur ? ' ' + mark : ''), i => (i === cur ? tag : ''));
  if (cur !== undefined) followLine(cur);
}
// The coloured copy under the textarea, and the line numbers beside it
function paint(lines, cls = () => '', after = () => ''){
  htmlCode.innerHTML = lines.map((l, i) => `<span class="l${cls(i)}">${hlMarkupLine(l) || ' '}${after(i)}</span>`).join('');
  htmlGutter.innerHTML = lines.map((_, i) => `<div${cls(i) ? ` class="${cls(i).trim()}"` : ''}>${i + 1}</div>`).join('');
  syncHtmlScroll();
}
// Keep the line the run is on in view, without ever scrolling the page
function followLine(i){
  const el = htmlCode.children[i]; if (!el) return;
  const lh = el.getBoundingClientRect().height || 20, top = i * lh, h = htmlEdit.clientHeight;
  if (top >= htmlEdit.scrollTop + lh && top <= htmlEdit.scrollTop + h - lh) return;
  htmlEdit.scrollTo({ top: Math.max(0, top - h / 3), behavior: reduceMotion ? 'auto' : 'smooth' });
}
export function syncHtmlScroll(){
  htmlCode.scrollTop = htmlEdit.scrollTop; htmlCode.scrollLeft = htmlEdit.scrollLeft;
  htmlGutter.scrollTop = htmlEdit.scrollTop;
}
htmlEdit.addEventListener('scroll', syncHtmlScroll);

/* ---------- Editing the markup ---------- */
// Typing changes nothing on the page until Save: half-written markup would
// break it, and a running step would overwrite it on the way past.
export function setHtmlDirty(on){
  dirty = on;
  applyBtn.disabled = revertBtn.disabled = !on;
}
// The markup goes back through the parser, so the page's own scripts run again
// and its buttons keep working. What the page kept in its variables starts over.
// It stays the site's page from here on, so a run starts every test from it;
// Reset brings the file on disk back.
export function applyHtml(){
  if (!dirty) return;
  const d = doc(); if (!d) return;
  setEditedHtml(currentSite, withBase(htmlEdit.value, d.baseURI));
  loadApp();                           // the load reads the page again and clears the edited mark
}
// A written page has no address of its own, so it needs the real one to find
// the stylesheet and scripts the markup asks for. The tag is the runner's, and
// the view skips it, so saving twice does not stack them up.
const BASE_MARK = 'data-playlive-base';
function withBase(markup, href){
  const tag = `<base ${BASE_MARK} href="${href}">`;
  const head = /<head[^>]*>/i.exec(markup);
  if (head) return markup.slice(0, head.index + head[0].length) + '\n' + tag + markup.slice(head.index + head[0].length);
  const dt = /<!doctype[^>]*>/i.exec(markup);
  const at = dt ? dt.index + dt[0].length : 0;
  return markup.slice(0, at) + tag + markup.slice(at);
}
export function revertHtml(){ setHtmlDirty(false); renderHtmlView(); }
export const htmlDirty = () => dirty;
htmlEdit.addEventListener('input', () => {
  setHtmlDirty(htmlEdit.value !== shown);
  if (dirty) paint(htmlEdit.value.split('\n'));      // colour what is being typed, with no marks on it
});
htmlEdit.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter'){ e.preventDefault(); e.stopPropagation(); applyHtml(); }
});
applyBtn.addEventListener('click', applyHtml);
revertBtn.addEventListener('click', revertHtml);

// The site stays laid out underneath, covered by the markup rather than hidden:
// a step can only see an element that the browser is still giving a size to.
export function setViewMode(mode, remember = true){
  viewMode = mode === 'html' ? 'html' : 'site';
  viewSeg.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === viewMode)));
  htmlPane.hidden = viewMode !== 'html';
  if (remember){ layout.view = viewMode; saveLayout(); }
  renderHtmlView();
}
viewSeg.forEach(b => b.addEventListener('click', () => setViewMode(b.dataset.view)));
// A fresh page, a reload or a snapshot all mean the markup changed, and the
// page it was typed over is gone, so edits that were never applied go with it.
frame.addEventListener('load', () => { setHtmlDirty(false); renderHtmlView(); });
setHtmlDirty(false);
setViewMode(layout.view || 'site', false);
