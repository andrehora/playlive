import { $id, doc, frame } from './dom.js';
import { escH } from './editor.js';
import { reduceMotion } from './find.js';
import { layout, saveLayout } from './layout.js';
import { lastEl } from './state.js';

/* ---------- The HTML view: the site's live markup, following the run ----------

   The site panel shows either the page itself or its HTML. The markup is read
   back out of the live document on every step, so a filled field reads
   value="…" and a screen a step revealed is really there. Each element is
   remembered against the line its opening tag sits on, which is how the view
   can highlight the line the running step is working on. */
export const htmlPane = $id('htmlPane'), htmlCode = $id('htmlCode'), htmlGutter = $id('htmlGutter');
export const viewSeg = document.querySelectorAll('.view-seg [data-view]');
export let viewMode = 'site';            // 'site' shows the page, 'html' shows its markup

const INDENT = '  ';
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
// Attributes written without a value, so "checked" does not read checked=""
const BOOL = new Set(['checked','selected','disabled','readonly','required','multiple','open','hidden','autofocus','novalidate','default','inert']);

let elLine = new Map();                  // element -> the line its opening tag is on

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
function openTag(el){
  let s = `<i class="p">&lt;</i><i class="k">${el.tagName.toLowerCase()}</i>`;
  for (const [name, value] of attrsOf(el)){
    s += ` <i class="f">${escH(name)}</i>`;
    if (!(value === '' && BOOL.has(name))) s += `<i class="p">=</i><i class="s">"${escH(value)}"</i>`;
  }
  return s + '<i class="p">&gt;</i>';
}
const closeTag = el => `<i class="p">&lt;/</i><i class="k">${el.tagName.toLowerCase()}</i><i class="p">&gt;</i>`;

// The whole document as lines of highlighted markup, one <span class="l"> each
function toLines(d){
  const lines = [], map = new Map();
  const add = (depth, html) => lines.push(INDENT.repeat(depth) + html);
  const walk = (el, depth) => {
    const tag = el.tagName.toLowerCase();
    map.set(el, lines.length);
    if (VOID.has(tag)) return add(depth, openTag(el));
    if (tag === 'textarea') return add(depth, openTag(el) + escH(el.value) + closeTag(el));
    // Scripts and styles are shown as they are written, so the page reads like its file
    if (tag === 'script' || tag === 'style'){
      const body = el.textContent.replace(/^\n+|\s+$/g, '');
      if (!body) return add(depth, openTag(el) + closeTag(el));
      add(depth, openTag(el));
      body.split('\n').forEach(l => lines.push(escH(l.replace(/\s+$/, ''))));
      return add(depth, closeTag(el));
    }
    const kids = [...el.childNodes].filter(n => n.nodeType === 1 || (n.nodeType === 3 && squeeze(n.textContent)));
    if (!kids.length) return add(depth, openTag(el) + closeTag(el));
    const text = kids[0].nodeType === 3 ? squeeze(kids[0].textContent) : '';
    if (kids.length === 1 && text) return add(depth, openTag(el) + escH(text) + closeTag(el));
    add(depth, openTag(el));
    for (const n of kids){
      if (n.nodeType === 1) walk(n, depth + 1);
      else add(depth + 1, escH(squeeze(n.textContent)));
    }
    add(depth, closeTag(el));
  };
  if (d.doctype) lines.push(`<i class="c">&lt;!doctype ${escH(d.doctype.name)}&gt;</i>`);
  if (d.documentElement) walk(d.documentElement, 0);
  return { lines, map };
}
// Reads the site again and redraws. state marks the line of the element the
// current step acted on: 'running' while it runs, 'passed' or 'failed' after,
// tagged with the step's action the way the site view tags the element itself.
export function renderHtmlView(state, action){
  if (viewMode !== 'html') return;
  const d = doc();
  if (!d || !d.documentElement){ htmlCode.textContent = ''; htmlGutter.innerHTML = ''; elLine = new Map(); return; }
  const { lines, map } = toLines(d);
  elLine = map;
  const cur = state && lastEl && lastEl.ownerDocument === d ? elLine.get(lastEl) : undefined;
  const mark = state === 'failed' ? 'bad' : state === 'passed' ? 'ok' : 'cur';
  const tag = action ? `<i class="tag">${escH(action)}</i>` : '';
  htmlCode.innerHTML = lines.map((l, i) => `<span class="l${i === cur ? ' ' + mark : ''}">${l || ' '}${i === cur ? tag : ''}</span>`).join('');
  htmlGutter.innerHTML = lines.map((_, i) => `<div${i === cur ? ` class="${mark}"` : ''}>${i + 1}</div>`).join('');
  syncHtmlScroll();
  if (cur !== undefined) followLine(cur);
}
// Keep the line the run is on in view, without ever scrolling the page
function followLine(i){
  const el = htmlCode.children[i]; if (!el) return;
  const lh = el.getBoundingClientRect().height || 20, top = i * lh, h = htmlCode.clientHeight;
  if (top >= htmlCode.scrollTop + lh && top <= htmlCode.scrollTop + h - lh) return;
  htmlCode.scrollTo({ top: Math.max(0, top - h / 3), behavior: reduceMotion ? 'auto' : 'smooth' });
}
export function syncHtmlScroll(){ htmlGutter.scrollTop = htmlCode.scrollTop; }
htmlCode.addEventListener('scroll', syncHtmlScroll);

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
// A fresh page, a reload or a snapshot all mean the markup changed
frame.addEventListener('load', () => renderHtmlView());
setViewMode(layout.view || 'site', false);
