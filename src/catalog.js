import { doc } from './dom.js';
import { roleOf, visible } from './find.js';
import { renderTarget, targetParts } from './recorder.js';
import { currentSite } from './state.js';
import { clean } from './util.js';

/* ---------- Site catalog: what this example page offers a test ---------- */
// Read the page the way the runner and the recorder read it, so suggestions can
// only ever be things the site actually has. Hidden elements count too — an
// error message already in the DOM is a fair expectText target — and every
// harvest merges into what is already known, so a screen a run walked through
// stays on offer once the page has moved on.

const MAX_TEXTS = 400;        // a long page shouldn't grow the catalog without end
const MAX_TEXT_LEN = 120;     // whole paragraphs are not what anyone types into expectText

export const catalogs = {};   // site id -> Map(key -> entry), in the order first seen
const catOf = site => (catalogs[site] ||= new Map());
export const clearCatalog = site => { delete catalogs[site]; };

// What a step would do with this element. Elements with no role are skipped:
// every <div> has text, and offering all of them would drown the real targets.
function kindOf(el, role){
  const tag = el.tagName.toLowerCase(), type = (el.type || '').toLowerCase();
  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'field';
  if (tag === 'input'){
    if (type === 'checkbox' || type === 'radio') return 'toggle';
    if (['submit', 'button', 'reset'].includes(type)) return 'click';
    return type === 'hidden' ? null : 'field';
  }
  // Clickable the way the recorder sees it: the tag counts even when a role
  // overrides it, so <button role="tab"> is still something a test clicks
  if (tag === 'button' || (tag === 'a' && el.hasAttribute('href')) || role === 'button' || role === 'link') return 'click';
  return role ? 'other' : null;    // headings and the like: only expectVisible wants them
}
const optionsOf = el => [...el.options].map(o => clean(o.textContent) || o.value).filter(Boolean);

// How an element is listed: what a step would do with it, the target a test
// would write, and the key that joins the two. Coverage credits a step with
// this same key, so what a run touched and what the catalog offers cannot
// drift apart.
export function entryFor(el){
  const role = roleOf(el);
  const kind = kindOf(el, role); if (!kind) return null;
  const parts = targetParts(el); if (!parts) return null;
  const target = renderTarget(parts);
  return { kind, target, parts, role, key: `${kind} ${target}` };
}
export const keyFor = el => { const e = entryFor(el); return e ? e.key : null; };

function addEl(cat, el){
  const base = entryFor(el); if (!base) return;
  const vis = visible(el);
  const prev = cat.get(base.key);
  if (prev){
    prev.vis = prev.vis || vis; prev.hits++;
    // A select can be refilled as the page runs, so its options accumulate
    if (prev.kind === 'select') for (const o of optionsOf(el)) if (!prev.options.includes(o)) prev.options.push(o);
    return;
  }
  // hits counts the harvests that saw it: a button that is always there outranks
  // a label the page wore for a moment, like a button reading “Checking…”
  const entry = { ...base, vis, hits: 1 };
  if (base.kind === 'select') entry.options = optionsOf(el);
  cat.set(base.key, entry);
}

// Text a person would write in expectText: leaves only, so "Welcome back" is
// offered once instead of again for every box it sits inside.
function addTexts(cat, body){
  let n = 0;
  for (const e of cat.values()) if (e.kind === 'text') n++;
  for (const el of body.querySelectorAll('*')){
    if (el.children.length || /^(script|style|option|title|textarea)$/i.test(el.tagName)) continue;
    const text = clean(el.textContent);
    if (!text || text.length > MAX_TEXT_LEN) continue;
    const key = `text ${text}`, prev = cat.get(key);
    if (prev){ prev.vis = prev.vis || visible(el); prev.hits++; continue; }
    if (n >= MAX_TEXTS) return;
    cat.set(key, { kind: 'text', text, vis: visible(el), hits: 1 }); n++;
  }
}

// Read the live page into the catalog. Safe to call often: it only ever adds.
export function harvest(site = currentSite){
  const d = doc();
  if (d && d.body){
    const cat = catOf(site);
    // The frame can navigate while the walk runs, which throws rather than lies
    try {
      for (const el of d.body.querySelectorAll('*')) addEl(cat, el);
      addTexts(cat, d.body);
    } catch {}
  }
  return snapshot(site);
}
// A plain object, so Playlive's own tests can read a catalog across the page boundary
export function snapshot(site = currentSite){
  const list = [...catOf(site).values()];
  const of = kind => list.filter(e => e.kind === kind);
  return {
    site,
    click: of('click'), field: of('field'), select: of('select'), toggle: of('toggle'), other: of('other'),
    texts: of('text'),
    roles: [...new Set(list.map(e => e.role).filter(Boolean))].sort()
  };
}
