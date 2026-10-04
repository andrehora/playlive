import { STEP_OPTS } from './parse.js';
import { ACTIONS } from './actions.js';
import { $id, errorEl, specEl } from './dom.js';
import { completionOpen } from './state.js';

/* ---------- Editor: syntax highlighting, line numbers, error lines ---------- */
export const hlEl = $id('hl'), gutterEl = $id('gutter');
export const escH = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Built on first use: ACTIONS lives in a module that imports this one back
let actionKeys = null;
export const isAction = key => (actionKeys ||= new Set([...Object.keys(ACTIONS), 'use'])).has(key);
export function hlValue(v){
  const re = /("(?:[^"\\]|\\.)*"?|'(?:[^']|'')*'?|\$\{\w+\}|[{}\[\],]|[A-Za-z_][\w-]*(?=:(?:\s|$))|\b\d+(?:\.\d+)?\b)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(v))){
    const tok = m[0], c = tok[0];
    out += escH(v.slice(last, m.index));
    const cls = c === '"' || c === "'" ? 's' : c === '$' ? 'v' : /[{}\[\],]/.test(c) ? 'p' : /\d/.test(c) ? 'n' : 'fk';
    let inner = escH(tok);
    if (cls === 's') inner = inner.replace(/\$\{\w+\}/g, x => `<i class="v">${x}</i>`);
    out += `<i class="${cls}">${inner}</i>`;
    last = m.index + tok.length;
  }
  return out + escH(v.slice(last));
}
export function hlLine(line){
  let q = null, ci = -1;
  for (let i = 0; i < line.length; i++){
    const ch = line[i];
    if (q){ if (ch === q && line[i - 1] !== '\\') q = null; continue; }
    if ((ch === '"' || ch === "'") && (i === 0 || /[\s:{\[,-]/.test(line[i - 1]))){ q = ch; continue; }
    if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))){ ci = i; break; }
  }
  const code = ci >= 0 ? line.slice(0, ci) : line, com = ci >= 0 ? line.slice(ci) : '';
  const m = /^(\s*)(-\s+)?([A-Za-z_][\w-]*)(:)(?=\s|$)/.exec(code);
  let html;
  if (m){
    const [all, ind, dash = '', key] = m;
    const cls = key === 'test' ? 'tt' : !ind && !dash ? 'top' : isAction(key) ? 'act' : STEP_OPTS.has(key) ? 'opt' : 'k';
    html = escH(ind) + (dash ? `<i class="p">${escH(dash)}</i>` : '') + `<i class="${cls}">${escH(key)}</i><i class="p">:</i>`;
    const rest = code.slice(all.length);
    html += key === 'test' ? `<i class="tt-v">${escH(rest)}</i>` : hlValue(rest);
  } else {
    const d = /^(\s*)(-\s+)?/.exec(code);
    html = escH(d[1]) + (d[2] ? `<i class="p">${escH(d[2])}</i>` : '') + hlValue(code.slice(d[0].length));
  }
  return html + (com ? `<i class="c">${escH(com)}</i>` : '');
}
// Map error messages ("line 7", "Test 2, step 3") to editor lines
export function errorLinesFor(msg, text){
  const lines = text.split('\n'), out = new Set();
  for (const m of msg.matchAll(/\(line (\d+)\)/g)) out.add(+m[1] - 1);
  const firstTest = lines.findIndex(l => /^test\s*:/.test(l));
  const headLine = re => { const i = lines.findIndex((l, j) => (firstTest < 0 || j < firstTest) && re.test(l)); if (i >= 0) out.add(i); };
  for (const m of msg.matchAll(/Unknown setting "([\w-]+)"/g)) headLine(new RegExp(`^${m[1]}\\s*:`));
  if (/needs a "test: <title>" line/.test(msg)) headLine(/^steps\s*:/);
  for (const m of msg.matchAll(/Unknown site "([\w-]+)"/g)) headLine(/^site\s*:/);
  const starts = [];
  lines.forEach((l, i) => { if (/^test\s*:/.test(l)) starts.push(i); });
  for (const m of msg.matchAll(/Test (\d+)(?:, step (\d+))?/g)){
    const ti = +m[1], si = m[2] ? +m[2] : 0, start = starts[ti - 1];
    if (start === undefined) continue;
    if (!si){ out.add(start); continue; }
    const end = starts[ti] ?? lines.length;
    let k = start; while (k < end && !/^\s*steps\s*:/.test(lines[k])) k++;
    let ind = null, c = 0;
    for (let i = k + 1; i < end; i++){
      const mm = /^(\s*)- /.exec(lines[i]); if (!mm) continue;
      if (ind === null) ind = mm[1].length;
      if (mm[1].length === ind && ++c === si){ out.add(i); break; }
    }
  }
  return out;
}
export let edText = null, errLines = new Set(), curLine = -1;
// Find the editor line of a step from where it was defined: a test's steps, a flow, or beforeEach
export function lineForStep(text, src){
  if (!src) return -1;
  const lines = text.split('\n');
  const indent = l => l.search(/\S/);
  const blank = l => !l.trim() || /^\s*#/.test(l);
  // the n-th list item below line `start`, stopping at the first line indented no deeper than `start`
  const nthItem = (start, n) => {
    const base = indent(lines[start]); let itemInd = null, c = 0;
    for (let i = start + 1; i < lines.length; i++){
      const l = lines[i]; if (blank(l)) continue;
      if (indent(l) <= base && !(indent(l) === base && /^\s*- /.test(l) && base > 0)) break;
      const m = /^(\s*)- /.exec(l); if (!m) continue;
      if (itemInd === null) itemInd = m[1].length;
      if (m[1].length === itemInd && ++c === n + 1) return i;
    }
    return -1;
  };
  const firstTest = lines.findIndex(l => /^test\s*:/.test(l));
  const head = i => firstTest < 0 || i < firstTest;
  let m;
  if ((m = /^Test (\d+)$/.exec(src.label))){
    let seen = 0, start = -1;
    for (let i = 0; i < lines.length; i++) if (/^test\s*:/.test(lines[i]) && ++seen === +m[1]){ start = i; break; }
    if (start < 0) return -1;
    let k = start + 1; while (k < lines.length && !/^steps\s*:/.test(lines[k]) && !/^test\s*:/.test(lines[k])) k++;
    return k < lines.length && /^steps\s*:/.test(lines[k]) ? nthItem(k, src.i) : -1;
  }
  if (src.label === 'beforeEach'){
    const k = lines.findIndex((l, i) => head(i) && /^beforeEach\s*:/.test(l));
    return k < 0 ? -1 : nthItem(k, src.i);
  }
  if ((m = /^Flow "(.+)"$/.exec(src.label))){
    const f = lines.findIndex((l, i) => head(i) && /^flows\s*:/.test(l)); if (f < 0) return -1;
    for (let i = f + 1; i < lines.length; i++){
      const l = lines[i]; if (blank(l)) continue;
      if (indent(l) === 0) break;
      if (new RegExp('^\\s+' + m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:').test(l)) return nthItem(i, src.i);
    }
  }
  return -1;
}
// The line box is taller on phones than on desktop, so it is read, not assumed
export const lineH = () => parseFloat(getComputedStyle(specEl).lineHeight) || 20;
export function setCurrentLine(n){
  if (n === curLine) return;
  curLine = n; renderEditor(true);
  if (n >= 0){
    const lh = lineH(), top = n * lh, h = specEl.clientHeight;
    if (top < specEl.scrollTop + lh || top > specEl.scrollTop + h - lh - 30) specEl.scrollTop = Math.max(0, top - h / 3);
  }
}
export function renderEditor(force){
  const text = specEl.value;
  if (!force && text === edText) return;
  edText = text;
  const lines = text.split('\n');
  const cls = i => (errLines.has(i) ? ' bad' : '') + (i === curLine ? ' cur' : '');
  hlEl.innerHTML = lines.map((l, i) => `<span class="l${cls(i)}">${hlLine(l) || ' '}</span>`).join('');
  gutterEl.innerHTML = lines.map((_, i) => `<div class="${cls(i).trim()}">${i + 1}</div>`).join('');
  syncEditorScroll();
}
export function syncEditorScroll(){ hlEl.scrollTop = specEl.scrollTop; hlEl.scrollLeft = specEl.scrollLeft; gutterEl.scrollTop = specEl.scrollTop; }
specEl.addEventListener('scroll', syncEditorScroll);

/* ---------- Folding: one button hides the code, leaving the panel's controls ---------- */
// The textarea holds the whole file either way, so running, recording and exporting are untouched
export const foldSpecBtn = $id('foldSpec'), editorEl = $id('editor');
let specFolded = false;
export function setSpecFolded(folded){
  specFolded = folded;
  editorEl.hidden = folded;
  foldSpecBtn.setAttribute('aria-expanded', String(!folded));
  foldSpecBtn.setAttribute('aria-label', folded ? 'Expand all' : 'Collapse all');
  foldSpecBtn.title = folded ? 'Show the code of every test' : 'Hide the code of every test';
  $id('foldSpecIcon').setAttribute('d', folded ? 'M7 9l5-5 5 5M7 15l5 5 5-5' : 'M7 4l5 5 5-5M7 20l5-5 5 5');
  if (!folded) renderEditor(true);   // the tick skips a hidden editor, so redraw on the way back
}
foldSpecBtn.addEventListener('click', () => setSpecFolded(!specFolded));
// Programmatic edits (recorder, site switch, reset) are picked up here too
(function tick(){ if (!specFolded) renderEditor(); requestAnimationFrame(tick); })();
// Whatever lands in the error box also marks the matching lines
new MutationObserver(() => {
  errLines = errorEl.textContent ? errorLinesFor(errorEl.textContent, specEl.value) : new Set();
  errorEl.classList.toggle('jump', errLines.size > 0);
  errorEl.title = errLines.size ? 'Go to the line' : '';
  renderEditor(true);
})
  .observe(errorEl, { childList: true, characterData: true, subtree: true });
// Clicking a problem jumps to its line
errorEl.addEventListener('click', () => {
  if (!errLines.size) return;
  setSpecFolded(false);   // there is no line to jump to while the code is hidden
  const line = Math.min(...errLines), lines = specEl.value.split('\n');
  const pos = lines.slice(0, line).reduce((n, l) => n + l.length + 1, 0);
  specEl.focus({ preventScroll: true });
  specEl.setSelectionRange(pos + lines[line].search(/\S|$/), pos + lines[line].length);
  specEl.scrollTop = Math.max(0, line * lineH() - specEl.clientHeight / 3);
});
// Tab inserts two spaces instead of leaving the editor
specEl.addEventListener('keydown', e => {
  if (e.key === 'Tab' && !completionOpen && !e.shiftKey && !e.metaKey && !e.ctrlKey && !specEl.readOnly){
    e.preventDefault();
    const { selectionStart: a, selectionEnd: b } = specEl;
    specEl.setRangeText('  ', a, b, 'end');
    specEl.dispatchEvent(new Event('input'));
  }
});
export function setFileStatus(v){
  const el = $id('fileStatus');
  if (v.spec){
    const steps = v.spec.tests.reduce((n, t) => n + t.steps.length, 0);
    el.textContent = `${v.spec.tests.length} ${v.spec.tests.length === 1 ? 'test' : 'tests'} · ${steps} ${steps === 1 ? 'step' : 'steps'}`;
    el.className = 'file-status';
  } else {
    const n = v.error.split('\n').length;
    el.textContent = `${n} ${n === 1 ? 'problem' : 'problems'}`;
    el.className = 'file-status bad';
  }
}
