import { escRe } from './util.js';

/* ---------- What every editor's keys do ----------
   The YAML editor, the HTML view and the code modes' two editors are plain
   textareas; these give each the comment shortcut and an undo of its own. */

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
/* ---------- Tab over several lines indents each of them ----------
   A selection within one line is replaced by the indent, as typing would. One
   with a line break in it (a whole line, say) indents every non-blank line it
   touches, less a last line it only reaches the start of, and selects them.
   Returns null for one line. */
export function indentLines(text, start, end, step){
  if (!text.slice(start, end).includes('\n')) return null;
  const from = text.lastIndexOf('\n', start - 1) + 1;
  let stop = text[end - 1] === '\n' ? end - 1 : end;
  stop = text.indexOf('\n', stop); if (stop < 0) stop = text.length;
  const out = text.slice(from, stop).split('\n').map(l => (l.trim() ? step + l : l)).join('\n');
  return { text: text.slice(0, from) + out + text.slice(stop), start: from, end: from + out.length };
}
// Tab in an editor: the lines indented, or the selection replaced by `step`.
// The caller fires input, as its other edits do.
export function indentTab(ta, step){
  const r = indentLines(ta.value, ta.selectionStart, ta.selectionEnd, step);
  if (!r){ ta.setRangeText(step, ta.selectionStart, ta.selectionEnd, 'end'); return; }
  const oldEnd = ta.value.length - (r.text.length - r.end);
  ta.setRangeText(r.text.slice(r.start, r.end), r.start, oldEnd, 'select');
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
/* ---------- The bracket the caret is next to, and its partner ----------
   The one just before the caret first, then the one after it, as code editors
   do. Returns both offsets, or null when there is none or it is unmatched. */
const PAIRS = { '(': ')', '[': ']', '{': '}' }, CLOSERS = { ')': '(', ']': '[', '}': '{' };
export function matchBracket(text, caret){
  for (const at of [caret - 1, caret]){
    const ch = text[at];
    if (!(ch in PAIRS || ch in CLOSERS)) continue;
    const step = ch in PAIRS ? 1 : -1, want = PAIRS[ch] || CLOSERS[ch];
    for (let i = at + step, depth = 0; i >= 0 && i < text.length; i += step){
      if (text[i] === ch) depth++;
      else if (text[i] === want && depth-- === 0) return [at, i];
    }
    return null;
  }
  return null;
}

/* ---------- The caret's line ----------
   While an editor has focus, a faint band sits behind the line the caret is
   on, as in a code editor, and a box around the bracket beside the caret and
   its partner. Both are measured from the highlighted copy itself, so a
   wrapped line is shaded whole, and they follow typing, clicks and scrolling. */
// Where a character of the highlighted copy is drawn: its line's span holds
// the line's text, in as many coloured pieces as it has
function charRect(hl, line, col){
  const l = hl.children[line]; if (!l) return null;
  const walk = document.createTreeWalker(l, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()){
    if (col < n.length){
      const r = document.createRange(); r.setStart(n, col); r.setEnd(n, col + 1);
      return r.getBoundingClientRect();
    }
    col -= n.length;
  }
  return null;
}
export function caretLine(ta, hl){
  const band = document.createElement('div');
  band.className = 'caret-line'; band.hidden = true;
  const marks = [0, 1].map(() => Object.assign(document.createElement('div'), { className: 'bracket-mark', hidden: true }));
  hl.before(band, ...marks);
  let queued = false;
  const place = () => {
    queued = false;
    const end = ta.selectionDirection === 'backward' ? ta.selectionStart : ta.selectionEnd;
    const line = ta.value.slice(0, end).split('\n').length - 1;
    const l = hl.children[line];
    // Only for a caret: with text selected the selection says where you are,
    // and a whole line's ends at the start of the next one
    const caret = ta.selectionStart === ta.selectionEnd;
    band.hidden = document.activeElement !== ta || !l || !caret;
    const pair = !band.hidden && matchBracket(ta.value, end);
    marks.forEach((m, i) => {
      const at = pair && pair[i], before = pair && ta.value.slice(0, at);
      const r = pair && charRect(hl, before.split('\n').length - 1, at - before.lastIndexOf('\n') - 1);
      m.hidden = !r;
      if (!r) return;
      const box = ta.parentElement.getBoundingClientRect();
      Object.assign(m.style, { left: `${r.left - box.left}px`, top: `${r.top - box.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    });
    if (band.hidden) return;
    band.style.top = `${l.offsetTop - ta.scrollTop}px`;
    band.style.height = `${l.offsetHeight}px`;
  };
  // After the editor repaints its copy, which an input does
  const update = () => { if (!queued){ queued = true; requestAnimationFrame(place); } };
  for (const type of ['focus', 'blur', 'input', 'scroll', 'select', 'keyup', 'pointerup', 'selectionchange']) ta.addEventListener(type, update);
  document.addEventListener('selectionchange', () => { if (document.activeElement === ta) update(); });
  new ResizeObserver(update).observe(hl);
}

/* ---------- Clicking a line number selects the line ----------
   The whole line, its newline too, as in a code editor. Dragging down or up
   the numbers takes in every line passed over, and shift-click stretches the
   selection to the line clicked. */
export function gutterSelect(ta, gutter){
  const rowAt = y => {
    const rows = [...gutter.children];
    const i = rows.findIndex(r => r.getBoundingClientRect().bottom > y);
    return i < 0 ? rows.length - 1 : i;
  };
  const startOf = (lines, i) => lines.slice(0, i).reduce((n, l) => n + l.length + 1, 0);
  // Lines a to b, either way round; the caret goes where the pointer is
  const select = (a, b) => {
    const lines = ta.value.split('\n'), last = lines.length - 1;
    a = Math.min(a, last); b = Math.min(b, last);
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const start = startOf(lines, lo), end = Math.min(ta.value.length, startOf(lines, hi) + lines[hi].length + 1);
    ta.setSelectionRange(start, end, b < a ? 'backward' : 'forward');
  };
  let anchor = null;
  gutter.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !e.target.closest('.gutter > div')) return;
    e.preventDefault();
    const line = rowAt(e.clientY);
    // Shift stretches from where the selection started
    if (e.shiftKey && document.activeElement === ta){
      const fixed = ta.selectionDirection === 'backward' ? ta.selectionEnd - 1 : ta.selectionStart;
      anchor = ta.value.slice(0, Math.max(0, fixed)).split('\n').length - 1;
    } else anchor = line;
    ta.focus({ preventScroll: true });
    select(anchor, line);
    gutter.setPointerCapture(e.pointerId);
  });
  // The press would otherwise take the focus from the editor
  gutter.addEventListener('mousedown', e => { if (e.button === 0) e.preventDefault(); });
  gutter.addEventListener('pointermove', e => { if (anchor !== null) select(anchor, rowAt(e.clientY)); });
  for (const type of ['pointerup', 'pointercancel']) gutter.addEventListener(type, () => { anchor = null; });
}
