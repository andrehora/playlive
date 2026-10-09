import { NO_TESTS, STEP_OPTS } from './parse.js';
import { ACTIONS } from './actions.js';
import { $id, errorEl, specEl } from './dom.js';
import { completionOpen } from './state.js';
import { toast } from './ui.js';
import { escH, escRe, plural } from './util.js';

/* ---------- Editor: syntax highlighting, line numbers, error lines ---------- */
const hlEl = $id('hl'), gutterEl = $id('gutter');
export { escH } from './util.js';
// Built on first use: ACTIONS lives in a module that imports this one back
let actionKeys = null;
export const isAction = key => (actionKeys ||= new Set(Object.keys(ACTIONS))).has(key);
export function hlValue(v){
  const re = /("(?:[^"\\]|\\.)*"?|'(?:[^']|'')*'?|\$\{\w+\}|[{}[\],]|[A-Za-z_][\w-]*(?=:(?:\s|$))|\b\d+(?:\.\d+)?\b)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(v))){
    const tok = m[0], c = tok[0];
    out += escH(v.slice(last, m.index));
    const cls = c === '"' || c === "'" ? 's' : c === '$' ? 'v' : /[{}[\],]/.test(c) ? 'p' : /\d/.test(c) ? 'n' : 'fk';
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
    if ((ch === '"' || ch === "'") && (i === 0 || /[\s:{[,-]/.test(line[i - 1]))){ q = ch; continue; }
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
/* ---------- ⌘/Ctrl+/ comments the selected lines, or uncomments them ----------
   Every editor does this: the tests (#), the Python files (#) and the HTML view
   (<!-- -->). The lines are the ones the selection touches, less a last line it
   only reaches the start of. If every non-blank one is already commented they
   are uncommented; otherwise each is commented at the block's own indent, so
   the result still reads as one block. Returns the new text and the range the
   lines now cover, to select. */
export function commentLines(text, start, end, open, close = ''){
  const from = text.lastIndexOf('\n', start - 1) + 1;
  let stop = end > start && text[end - 1] === '\n' ? end - 1 : end;
  stop = text.indexOf('\n', stop); if (stop < 0) stop = text.length;
  const lines = text.slice(from, stop).split('\n');
  const used = lines.filter(l => l.trim());
  const isOn = new RegExp(`^(\\s*)${escRe(open)} ?(.*?)${close ? ` ?${escRe(close)}` : ''}\\s*$`);
  const on = used.length > 0 && used.every(l => isOn.test(l));
  const indent = Math.min(...used.map(l => l.search(/\S/)));
  const out = lines.map(l => {
    if (!l.trim()) return l;
    if (on) return l.replace(isOn, '$1$2');
    return l.slice(0, indent) + open + ' ' + l.slice(indent) + (close ? ' ' + close : '');
  }).join('\n');
  return { text: text.slice(0, from) + out + text.slice(stop), start: from, end: from + out.length };
}
// Wire the shortcut to a textarea. Its input event is what tells the editor.
// `open` may be a function, for an editor whose language changes.
export function commentKey(ta, open, close){
  ta.addEventListener('keydown', e => {
    if (!(e.metaKey || e.ctrlKey) || e.key !== '/' || ta.readOnly) return;
    e.preventDefault();
    const o = typeof open === 'function' ? open() : open;
    const r = commentLines(ta.value, ta.selectionStart, ta.selectionEnd, o, close);
    // Only the lines change: what follows them is the same text in both
    const oldEnd = ta.value.length - (r.text.length - r.end);
    ta.setRangeText(r.text.slice(r.start, r.end), r.start, oldEnd, 'select');
    ta.dispatchEvent(new Event('input'));
  });
}
/* ---------- Undo ----------
   The browser's own undo forgets a textarea whose value is set, and never
   hears of setRangeText, which is how Tab, Enter, snippets and comments edit.
   So each editor keeps its own: every input event is a step (typing a word and
   the spaces after it, in quick succession, is one), and ⌘/Ctrl+Z undoes, ⇧⌘Z or Ctrl+Y
   redoes. A value set from outside (another file loaded) starts the history
   afresh. Going back fires input, marked `undo`, so the editor follows. */
const UNDO_LIMIT = 200, MERGE_MS = 600;
export function undoable(ta){
  let stack = [], at = -1, lastAt = 0, lastType = '', lastData = '';
  const state = () => ({ v: ta.value, s: ta.selectionStart, e: ta.selectionEnd });
  // The value changed without an input event: a new file, so a new history
  const sync = () => { if (stack[at]?.v !== ta.value){ stack = [state()]; at = 0; lastType = ''; } };
  for (const type of ['focus', 'pointerdown', 'beforeinput']) ta.addEventListener(type, sync);
  ta.addEventListener('input', e => {
    if (e.undo) return;
    if (!stack.length){ stack = [state()]; at = 0; return; }
    const now = Date.now(), type = e.inputType || '';
    const data = e.data || '', typing = /^(insertText|deleteContent)/.test(type) && !data.includes('\n');
    // A word starts a new step after a space, so a step is a word and its spaces
    const merge = typing && type === lastType && now - lastAt < MERGE_MS && at > 0 && !(/\s$/.test(lastData) && /^\S/.test(data));
    if (merge) stack[at] = state();
    else { stack = stack.slice(0, at + 1); stack.push(state()); if (stack.length > UNDO_LIMIT) stack.shift(); at = stack.length - 1; }
    lastAt = now; lastType = typing ? type : ''; lastData = data;
  });
  const go = to => {
    const st = stack[to], top = ta.scrollTop;
    at = to; lastType = '';
    ta.value = st.v;
    ta.setSelectionRange(st.s, st.e);
    ta.scrollTop = top;
    ta.dispatchEvent(Object.assign(new Event('input', { bubbles: true }), { undo: true }));
  };
  // In the capture phase, so the history is current before any key handler edits
  ta.addEventListener('keydown', e => {
    sync();
    if (!(e.metaKey || e.ctrlKey) || e.altKey || ta.readOnly) return;
    const k = e.key.toLowerCase();
    const redo = (k === 'z' && e.shiftKey) || (k === 'y' && e.ctrlKey && !e.metaKey);
    if (k !== 'z' && !redo) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (redo ? at < stack.length - 1 : at > 0) go(redo ? at + 1 : at - 1);
  }, true);
}

// Map error messages ("line 7", "Test 2, step 3") to editor lines
export function errorLinesFor(msg, text){
  const lines = text.split('\n'), out = new Set();
  for (const m of msg.matchAll(/\(line (\d+)\)/g)) out.add(+m[1] - 1);
  const firstTest = lines.findIndex(l => /^test\s*:/.test(l));
  const headLine = re => { const i = lines.findIndex((l, j) => (firstTest < 0 || j < firstTest) && re.test(l)); if (i >= 0) out.add(i); };
  for (const m of msg.matchAll(/Unknown setting "([\w-]+)"/g)) headLine(new RegExp(`^${m[1]}\\s*:`));
  if (/needs a "test: <title>" line/.test(msg)) headLine(/^steps\s*:/);
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
let edText = null, errLines = new Set(), curLine = -1;
// Find the editor line of a step from where it was defined: a test's steps or beforeEach
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
  return -1;
}
// The line box is taller on phones than on desktop, so it is read, not assumed
const lineH = () => parseFloat(getComputedStyle(specEl).lineHeight) || 20;
export function setCurrentLine(n){
  if (n === curLine) return;
  curLine = n; renderEditor(true);
  if (n >= 0){
    const lh = lineH(), top = n * lh, h = specEl.clientHeight;
    if (top < specEl.scrollTop + lh || top > specEl.scrollTop + h - lh - 30) specEl.scrollTop = Math.max(0, top - h / 3);
  }
}
function renderEditor(force){
  const text = specEl.value;
  if (!force && text === edText) return;
  edText = text;
  const lines = text.split('\n');
  const cls = i => (errLines.has(i) ? ' bad' : '') + (i === curLine ? ' cur' : '');
  hlEl.innerHTML = lines.map((l, i) => `<span class="l${cls(i)}">${hlLine(l) || ' '}</span>`).join('');
  gutterEl.innerHTML = lines.map((_, i) => `<div class="${cls(i).trim()}">${i + 1}</div>`).join('');
  syncEditorScroll();
}
function syncEditorScroll(){ hlEl.scrollTop = specEl.scrollTop; hlEl.scrollLeft = specEl.scrollLeft; gutterEl.scrollTop = specEl.scrollTop; }
specEl.addEventListener('scroll', syncEditorScroll);

/* ---------- Folding: one button hides the code, leaving the panel's controls ---------- */
// The textarea holds the whole file either way, so running, recording and exporting are untouched
const foldSpecBtn = $id('foldSpec'), editorEl = $id('editor');
let specFolded = false;
export function setSpecFolded(folded){
  specFolded = folded;
  editorEl.hidden = folded;
  // The layout reads the column's folds off #left, the way it reads the other
  // two: with the code hidden, the room it gave up goes to a list rather than
  // stretching Results past its own rows.
  $id('left').dataset.spec = folded ? 'collapsed' : 'open';
  foldSpecBtn.setAttribute('aria-expanded', String(!folded));
  foldSpecBtn.setAttribute('aria-label', folded ? 'Expand all' : 'Collapse all');
  foldSpecBtn.title = folded ? 'Expand all tests' : 'Collapse all tests';
  $id('foldSpecIcon').setAttribute('d', folded ? 'M7 9l5-5 5 5M7 15l5 5 5-5' : 'M7 4l5 5 5-5M7 20l5-5 5 5');
  if (!folded) renderEditor(true);   // the tick skips a hidden editor, so redraw on the way back
}
foldSpecBtn.addEventListener('click', () => setSpecFolded(!specFolded));

/* ---------- The editor does not paste ----------
   Writing the step is the exercise. A file that can be pasted in from
   somewhere else turns every mode into a shuffling of text that teaches
   nothing — Create most of all, where the answer is one mode away on purpose.
   So paste and a dropped selection are turned down here, with a line saying
   why rather than a control that quietly does nothing. Copy and cut are fine:
   taking your own tests out costs the exercise nothing.
   The tests and the recorder write the file through its value, not through the
   clipboard, so none of this is in their way. */
const REFUSED = {
  paste: 'Pasting into the tests is off here. Type the step, or press Ctrl+Space for the suggestions.',
  drop: 'Dropping text into the tests is off here. Type the step, or press Ctrl+Space for the suggestions.'
};
for (const [type, msg] of Object.entries(REFUSED)){
  specEl.addEventListener(type, e => { e.preventDefault(); toast(msg); });
}
// Programmatic edits (recorder, site switch, reset) are picked up here too
(function tick(){ if (!specFolded) renderEditor(); requestAnimationFrame(tick); })();
// Whatever lands in the error box also marks the matching lines
new MutationObserver(() => {
  errLines = errorEl.textContent ? errorLinesFor(errorEl.textContent, specEl.value) : new Set();
  errorEl.classList.toggle('jump', errLines.size > 0);
  errorEl.classList.toggle('hint', errorEl.textContent === NO_TESTS);
  errorEl.title = errLines.size ? 'Go to the line' : '';
  renderEditor(true);
})
  .observe(errorEl, { childList: true, characterData: true, subtree: true });
// Go to a line and select it: what clicking a problem does, and what a panel
// that names a line does too.
export function jumpToLine(line){
  if (!(line >= 0)) return;
  setSpecFolded(false);   // there is no line to jump to while the code is hidden
  const lines = specEl.value.split('\n');
  if (line >= lines.length) return;
  const pos = lines.slice(0, line).reduce((n, l) => n + l.length + 1, 0);
  specEl.focus({ preventScroll: true });
  specEl.setSelectionRange(pos + lines[line].search(/\S|$/), pos + lines[line].length);
  specEl.scrollTop = Math.max(0, line * lineH() - specEl.clientHeight / 3);
}
// Clicking a problem jumps to its line
errorEl.addEventListener('click', () => {
  if (!errLines.size) return;
  jumpToLine(Math.min(...errLines));
});
commentKey(specEl, '#');
undoable(specEl);
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
    el.textContent = `${plural(v.spec.tests.length, 'test')} · ${plural(steps, 'step')}`;
    el.className = 'file-status';
  } else if (v.empty){
    el.textContent = 'No tests';
    el.className = 'file-status none';
  } else {
    const n = v.error.split('\n').length;
    el.textContent = plural(n, 'problem');
    el.className = 'file-status bad';
  }
}
