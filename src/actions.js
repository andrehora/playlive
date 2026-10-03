import { doc, speed } from './dom.js';
import { closestText, describeTarget, find, query, scrollWithinFrame, slowHint, waitFor } from './find.js';
import { loadApp } from './sites.js';
import { lastEl, setLastEl, stepTimeout, stopRequested } from './state.js';
import { clean, norm, sleep } from './util.js';

/* ---------- Doing what a step says, inside the site ---------- */

export async function highlight(el, label, color = '#EAB308', ms){
  scrollWithinFrame(el);
  const d = el.ownerDocument, W = d.defaultView, r = el.getBoundingClientRect();
  const prev = [el.style.outline, el.style.outlineOffset];
  el.style.outline = `3px solid ${color}`; el.style.outlineOffset = '2px';
  let tag = null;
  if (label){
    tag = d.createElement('div'); tag.textContent = label;
    tag.style.cssText = `position:absolute;left:${r.left + W.scrollX}px;top:${Math.max(0, r.top + W.scrollY - 24)}px;background:${color};color:${color === '#EAB308' ? '#1F2937' : '#fff'};font:600 11px/1 system-ui,sans-serif;padding:4px 7px;border-radius:4px;z-index:2147483647;pointer-events:none`;
    d.body.appendChild(tag);
  }
  await sleep(ms ?? Math.max(160, speed().step * 0.6));
  el.style.outline = prev[0]; el.style.outlineOffset = prev[1];
  if (tag) tag.remove();
}
export function setNativeValue(el, v){
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); // works with React-controlled inputs too
}
export function mouse(el, type){
  const W = el.ownerDocument.defaultView;
  el.dispatchEvent(new W.MouseEvent(type, { bubbles: true, cancelable: true, view: W }));
}

export const ACTIONS = {
  async goto(s){ await loadApp(s.url || '/'); },
  async click(s){
    const el = await find(s.target);
    await waitFor(() => !el.disabled, `${describeTarget(s.target)} to be enabled`);
    await highlight(el, 'click');
    mouse(el, 'mousedown'); el.focus({ preventScroll: true }); mouse(el, 'mouseup'); el.click();
  },
  async fill(s){
    const el = await find(s.target);
    await highlight(el, 'type');
    el.focus({ preventScroll: true }); setNativeValue(el, '');
    const W = el.ownerDocument.defaultView;
    for (const ch of String(s.value ?? '')){
      if (stopRequested) throw new Error('Stopped by user');
      setNativeValue(el, el.value + ch);
      el.dispatchEvent(new W.InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
      if (speed().type) await sleep(speed().type);
    }
    el.dispatchEvent(new W.Event('change', { bubbles: true }));
  },
  async select(s){
    const el = await find(s.target);
    await highlight(el, 'choose');
    const opt = [...el.options].find(o => norm(o.textContent) === norm(s.value) || o.value === s.value);
    if (!opt) throw new Error(`No option “${s.value}” in ${describeTarget(s.target)}. Options: ${[...el.options].map(o => clean(o.textContent)).join(', ')}`);
    el.value = opt.value;
    const W = el.ownerDocument.defaultView;
    el.dispatchEvent(new W.Event('input', { bubbles: true }));
    el.dispatchEvent(new W.Event('change', { bubbles: true }));
  },
  async check(s){ const el = await find(s.target); await highlight(el, 'check'); if (!el.checked) el.click(); },
  async uncheck(s){ const el = await find(s.target); await highlight(el, 'uncheck'); if (el.checked) el.click(); },
  async wait(s){ await sleep(s.ms || 500); },
  async expectText(s){
    try { await waitFor(() => doc() && doc().body && norm(doc().body.innerText).includes(norm(s.text)), `the text “${s.text}”`); }
    catch (e) { if (stopRequested) throw e; throw new Error(e.message + (closestText(s.text) || slowHint())); }
    const el = query({ text: s.text })[0]; if (el){ setLastEl(el); await highlight(el, 'found', '#1F8A55'); }
  },
  async expectNoText(s){
    await sleep(150);
    const end = Date.now() + stepTimeout;
    while (norm(doc().body.innerText).includes(norm(s.text))){
      if (stopRequested) throw new Error('Stopped by user');
      if (Date.now() > end) throw new Error(`The text “${s.text}” is still on the page`);
      await sleep(50);
    }
  },
  async expectVisible(s){ const el = await find(s.target); await highlight(el, 'visible', '#1F8A55'); }
};
