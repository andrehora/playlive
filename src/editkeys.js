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
