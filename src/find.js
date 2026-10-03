import { $id, doc, resultsEl } from './dom.js';
import { targetFor } from './recorder.js';
import { setLastEl, stepTimeout, stopRequested } from './state.js';
import { clean, norm, sleep } from './util.js';

/* ---------- Finding elements the way a person describes them ---------- */
export function roleOf(el){
  const r = el.getAttribute('role'); if (r) return r;
  const t = el.tagName.toLowerCase();
  if (t === 'button') return 'button';
  if (t === 'a' && el.hasAttribute('href')) return 'link';
  if (t === 'textarea') return 'textbox';
  if (t === 'select') return 'combobox';
  if (/^h[1-6]$/.test(t)) return 'heading';
  if (t === 'input'){
    const ty = (el.type || 'text').toLowerCase();
    if (['button','submit','reset'].includes(ty)) return 'button';
    if (ty === 'checkbox') return 'checkbox';
    if (ty === 'radio') return 'radio';
    if (ty === 'hidden') return null;
    return 'textbox';
  }
  return null;
}
export const labelText = el => el.labels && el.labels.length ? [...el.labels].map(l => l.textContent).join(' ') : '';
export const rawName = el => clean(el.getAttribute('aria-label') || labelText(el) || el.textContent || el.value || el.getAttribute('placeholder'));
export const nameOf = el => norm(rawName(el));
export function visible(el){
  if (!el.getClientRects().length) return false;
  return el.ownerDocument.defaultView.getComputedStyle(el).visibility !== 'hidden';
}
export function query(t, includeHidden){
  const d = doc(); if (!d || !d.body) return [];
  const all = [...d.body.querySelectorAll('*')];
  let found = [];
  if (t.role){
    const want = norm(t.name);
    found = all.filter(el => roleOf(el) === t.role && (!t.name || nameOf(el) === want));
    if (!found.length && t.name) found = all.filter(el => roleOf(el) === t.role && nameOf(el).includes(want));
  } else if (t.label){
    const want = norm(t.label);
    found = all.filter(el => /^(input|textarea|select)$/i.test(el.tagName) &&
      (norm(labelText(el)) === want || norm(el.getAttribute('aria-label')) === want));
  } else if (t.placeholder){
    const want = norm(t.placeholder);
    found = all.filter(el => norm(el.getAttribute('placeholder')) === want);
  } else if (t.text){
    const want = norm(t.text);
    found = all.filter(el => norm(el.textContent).includes(want) &&
      ![...el.children].some(c => norm(c.textContent).includes(want)));
  }
  return includeHidden ? found : found.filter(visible);
}

export function describeTarget(t){
  if (!t) return 'element';
  if (t.role) return `${t.role}${t.name ? ` “${t.name}”` : ''}`;
  if (t.label) return `field “${t.label}”`;
  if (t.placeholder) return `field with placeholder “${t.placeholder}”`;
  if (t.text) return `text “${t.text}”`;
  return 'element';
}
export function describeStep(s){
  const base = describeStepBase(s);
  return s.timeout ? `${base} (waits up to ${s.timeout / 1000}s)` : base;
}
export function describeStepBase(s){
  switch (s.action){
    case 'goto': return `Open ${s.url || '/'}`;
    case 'click': return `Click ${describeTarget(s.target)}`;
    case 'fill': return `Type “${s.value}” into ${describeTarget(s.target)}`;
    case 'select': return `Choose “${s.value}” in ${describeTarget(s.target)}`;
    case 'check': return `Check ${describeTarget(s.target)}`;
    case 'uncheck': return `Uncheck ${describeTarget(s.target)}`;
    case 'wait': return `Wait ${s.ms || 500} ms`;
    case 'expectText': return `Expect to see “${s.text}”`;
    case 'expectNoText': return `Expect not to see “${s.text}”`;
    case 'expectVisible': return `Expect ${describeTarget(s.target)} to be visible`;
    default: return s.action;
  }
}

// Retry until the condition is true: this is what makes tests resilient to loading and animations
export async function waitFor(check, what){
  const end = Date.now() + stepTimeout;
  while (Date.now() < end){
    if (stopRequested) throw new Error('Stopped by user');
    const r = check(); if (r) return r;
    await sleep(50);
  }
  throw new Error(`Couldn’t find ${what} within ${stepTimeout / 1000}s`);
}
// When the page still shows a loading message, the app was probably just slow
export function slowHint(){
  const t = norm(doc() && doc().body ? doc().body.innerText : '');
  return /loading|checking|sending|saving|please wait|…/.test(t) ? '. The page still looks busy: if this sometimes passes, give the step more time with "timeout: 8000".' : '';
}
export async function find(t){
  try { const el = await waitFor(() => query(t)[0], describeTarget(t)); setLastEl(el); return el; }
  catch (e) { if (stopRequested) throw e; throw new Error(e.message + hintFor(t)); }
}

/* ---------- Helpful failures: "did you mean…?" ---------- */
export function similarity(a, b){
  a = norm(a); b = norm(b); if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.2 + 0.8 * Math.min(a.length, b.length) / Math.max(a.length, b.length);
  // Shared words count too: "Questions about my order" is close to "Questions about your order?"
  const wa = a.match(/[\p{L}\p{N}]+/gu) || [], wb = new Set(b.match(/[\p{L}\p{N}]+/gu) || []);
  const overlap = wa.length ? wa.filter(w => wb.has(w)).length / Math.max(wa.length, wb.size * 0.6) : 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++){
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return Math.max(overlap * 0.9, 1 - prev[b.length] / Math.max(a.length, b.length));
}
export function hintFor(t){
  if (query(t, true).length) return '. It exists on the page but isn’t visible yet, so an earlier step may be missing.';
  const d = doc(); if (!d || !d.body) return '';
  const wanted = t.name ?? t.label ?? t.placeholder ?? t.text ?? '';
  let best = null, score = 0;
  for (const el of d.body.querySelectorAll('*')){
    const role = roleOf(el);
    if (!role || role === 'heading') continue;
    for (const nm of [rawName(el), labelText(el), el.getAttribute('placeholder')]){
      const sc = similarity(wanted, nm) + (visible(el) ? 0.01 : 0);   // prefer visible elements on ties
      if (sc > score){ score = sc; best = el; }
    }
  }
  if (!best || score < 0.45) return '';
  return `. Did you mean ${targetFor(best)}?` + (visible(best) ? '' : ' It isn’t visible yet, so an earlier step may be missing.');
}
export function closestText(want){
  const d = doc(); if (!d || !d.body) return '';
  let best = '', score = 0;
  for (const el of d.body.querySelectorAll('*')){
    if (el.children.length || !visible(el)) continue;
    const t = clean(el.textContent); if (!t) continue;
    const sc = similarity(want, t); if (sc > score){ score = sc; best = t; }
  }
  return score >= 0.5 ? `. Closest text on the page: “${best}”` : '';
}

// Scroll only inside the tested site, and only if the element is off screen,
// so neither the site nor this page jumps around during a run
export function scrollWithinFrame(el){
  const W = el.ownerDocument.defaultView, r = el.getBoundingClientRect();
  if (r.top >= 0 && r.bottom <= W.innerHeight) return;
  W.scrollTo({ top: W.scrollY + r.top - W.innerHeight / 2 + r.height / 2, behavior: 'instant' });
}
// Keep the running step in view inside the Results panel (never scrolls the page)
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function followInResults(el){
  if (!$id('follow').checked) return;
  if (el.tagName === 'LI' && el.closest('.test.collapsed')) el = el.closest('.test');   // follow the folded test, not its hidden steps
  const br = resultsEl.getBoundingClientRect(), er = el.getBoundingClientRect();
  if (er.top >= br.top + 4 && er.bottom <= br.bottom - 4) return;
  resultsEl.scrollTo({ top: resultsEl.scrollTop + (er.top - br.top) - resultsEl.clientHeight / 3, behavior: reduceMotion ? 'auto' : 'smooth' });
}
// Outline the element and show a small badge saying what the runner is doing
