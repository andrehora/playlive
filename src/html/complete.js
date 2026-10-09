import { ACTIONS } from './actions.js';
import { harvest, snapshot } from './catalog.js';
import { specEl } from '../dom.js';
import { similarity } from './find.js';
import { SETTINGS } from './parse.js';
import { withValue, yq } from './recorder.js';
import { currentSite, editorSite, recording, running, setCompletionOpen } from '../state.js';
import { suggestionList } from '../suggestlist.js';
import { norm } from '../util.js';

/* ---------- Autocomplete: only what this site can actually do ---------- */
// Two halves. context() reads the caret and says what kind of thing may go
// there; itemsFor() fills that slot from the site catalog, so a suggestion is
// never something the runner would then fail to find.

const MAX_ITEMS = 60, MAX_OPTIONS = 40;   // a long <select> shouldn't bury everything else
// Which catalog entries each action can act on. This is the whole point: after
// "- select:" only the page's <select>s are offered, after "- check:" only its boxes.
const KINDS = {
  click: ['click', 'toggle'],
  fill: ['field'],
  select: ['select'],
  check: ['toggle'],
  uncheck: ['toggle'],
  expectVisible: ['click', 'field', 'select', 'toggle', 'other']
};
const TARGET_KEYS = ['role', 'name', 'label', 'placeholder', 'text'];
const actions = () => Object.keys(ACTIONS);

/* ---------- Reading the line under the caret ---------- */
// The last comma that is not inside quotes, so { name: "a, b" } stays one part
function lastComma(s){
  let q = null, at = -1;
  for (let i = 0; i < s.length; i++){
    const c = s[i];
    if (q){ if (c === q && s[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === ',') at = i;
  }
  return at;
}
const unquote = v => /^(".*"|'.*')$/.test(v) ? v.slice(1, -1) : v;
// What the braces already say, so the next slot can be narrowed by it
function parseParts(inner){
  const parts = {};
  let rest = inner;
  while (rest){
    const at = lastComma(rest), seg = rest.slice(at + 1);
    const m = /^\s*([A-Za-z]\w*)\s*:\s*(.*?)\s*$/.exec(seg);
    if (m && !(m[1] in parts)) parts[m[1]] = unquote(m[2]);
    if (at < 0) break;
    rest = rest.slice(0, at);
  }
  return parts;
}

export function context(text, caret){
  const ls = text.lastIndexOf('\n', caret - 1) + 1;
  const nl = text.indexOf('\n', caret), le = nl < 0 ? text.length : nl;
  const line = text.slice(ls, le), before = text.slice(ls, caret), after = text.slice(caret, le);
  const wordEnd = caret + /^[\w-]*/.exec(after)[0].length;
  const slotEnd = caret + /^[^,}]*/.exec(after)[0].replace(/\s+$/, '').length;
  const head = /^\s*-\s*([A-Za-z]\w*)\s*:/.exec(line);
  const action = head ? head[1] : null;
  let m;

  // ${…} can appear inside anything else, so it is read first
  if ((m = /\$\{(\w*)$/.exec(before))){
    const closed = text[wordEnd] === '}';
    return { what: 'unique', from: caret - m[1].length, to: closed ? wordEnd + 1 : wordEnd };
  }
  // inside a target's braces
  if (/\{[^}]*$/.test(before)){
    const inner = before.slice(before.lastIndexOf('{') + 1);
    const at = lastComma(inner), seg = inner.slice(at + 1);
    const parts = parseParts(inner.slice(0, at + 1));
    if ((m = /^\s*([A-Za-z]\w*)\s*:\s*(.*)$/.exec(seg)))
      return { what: 'slot', key: m[1], action, parts, from: caret - m[2].length, to: slotEnd };
    if ((m = /^\s*([A-Za-z]*)$/.exec(seg)))
      return { what: 'key', action, parts, from: caret - m[1].length, to: wordEnd };
    return null;
  }
  // "- click: " — the whole argument, target and all
  if ((m = /^\s*-\s*([A-Za-z]\w*)\s*:\s*(.*)$/.exec(before)))
    return { what: 'arg', action: m[1], from: caret - m[2].length, to: le };
  // "timeout: 8000" on its own line, for the steps that have no target
  if ((m = /^\s+([A-Za-z]\w*)\s*:\s*(.*)$/.exec(before)) && m[1] === 'timeout')
    return { what: 'slot', key: 'timeout', from: caret - m[2].length, to: le };
  // "- cl" — the action itself
  if ((m = /^\s*-\s*([A-Za-z]*)$/.exec(before)))
    return { what: 'action', from: caret - m[1].length, to: wordEnd, bare: !after.trim() };
  // an indented word with no dash yet, inside a list of steps
  if ((m = /^(\s+)([A-Za-z]*)$/.exec(before)) && inSteps(text, ls))
    return { what: 'action', dash: true, from: caret - m[2].length, to: wordEnd, bare: !after.trim() };
  // a settings or test line at column 0
  if ((m = /^([A-Za-z]*)$/.exec(before)))
    return { what: 'top', line: ls, from: caret - m[1].length, to: wordEnd };
  return null;
}
// A bare indented word is an action only where steps live
function inSteps(text, lineStart){
  const before = text.slice(0, lineStart).split('\n');
  for (let i = before.length - 1; i >= 0; i--){
    const l = before[i];
    if (!l.trim() || /^\s*#/.test(l)) continue;
    return /^\s*-\s/.test(l) || /^\s*(steps|beforeEach)\s*:\s*$/.test(l);
  }
  return false;
}

/* ---------- Filling the slot from the site ---------- */
const item = (insert, label, detail, extra) => ({ insert, label: label ?? insert, detail, ...extra });
// Entries first by how reliably the page shows them, so a button that is always
// there comes before a label the page wore for a moment
const byUse = (a, b) => (b.vis - a.vis) || (b.hits - a.hits);
const entriesFor = (cat, action) => (KINDS[action] || []).flatMap(k => cat[k]).sort(byUse);
const partsMatch = (e, parts) => TARGET_KEYS.every(k => parts[k] === undefined || norm(parts[k]) === norm(e.parts[k]));

function targetItems(cat, action){
  const out = [];
  for (const e of entriesFor(cat, action)){
    const detail = [e.role, e.vis ? null : 'hidden'].filter(Boolean).join(' · ');
    if (action === 'select'){
      // The option is what the writer is choosing between, so it leads the row
      // and the field it belongs to becomes the hint beside it
      const field = e.parts.label ?? e.parts.placeholder ?? e.parts.name ?? e.role;
      for (const o of e.options.slice(0, MAX_OPTIONS)) out.push(item(withValue(e.target, o), o, field));
    } else if (action === 'fill'){
      const insert = withValue(e.target, '');            // valid the moment it lands; the caret waits inside the quotes
      out.push(item(insert, null, detail, { caret: insert.lastIndexOf('""') + 1 }));
    } else out.push(item(e.target, null, detail));
  }
  return out;
}
const textItems = cat => [...cat.texts].sort(byUse).map(e => item(yq(e.text), e.text, e.vis ? 'text' : 'hidden text'));

function valueItems(ctx, cat){
  const { key, action, parts = {} } = ctx;
  if (key === 'timeout') return ['4000', '8000', '12000'].map(v => item(v, v, 'ms'));
  if (key === 'value'){
    if (action !== 'select') return [];
    const sel = cat.select.filter(e => partsMatch(e, parts)).sort(byUse);
    return sel.flatMap(e => e.options.slice(0, MAX_OPTIONS).map(o => item(yq(o), o, 'option')));
  }
  if (!TARGET_KEYS.includes(key)) return [];
  if (key === 'text' && !KINDS[action]) return textItems(cat);
  const seen = entriesFor(cat, action).filter(e => partsMatch(e, { ...parts, [key]: undefined }));
  if (key === 'role') return [...new Set(seen.map(e => e.role).filter(Boolean))].map(r => item(r, r, 'role'));
  const vals = [];
  for (const e of seen){
    const v = e.parts[key];
    if (v !== undefined && !vals.includes(v)) vals.push(v);
  }
  return vals.map(v => item(yq(v), v, key));
}

function itemsFor(ctx, cat){
  switch (ctx.what){
    case 'unique':
      return [item('unique}', 'unique', 'new on every run')];
    case 'action':
      return actions().map(a => item((ctx.dash ? '- ' : '') + a + (ctx.bare ? ': ' : ''), a, 'action'));
    case 'top':
      return topItems(ctx);
    case 'key': {
      // Only the slots this site's own elements are described by: a field that
      // has a label is not worth offering a "role:" for
      // The range check has keys of its own rather than a target's
      if (ctx.action === 'expectNumber'){
        return ['text', 'min', 'max', 'timeout'].filter(k => ctx.parts[k] === undefined)
          .map(k => item(k + ': ', k, 'range'));
      }
      const used = new Set(entriesFor(cat, ctx.action).flatMap(e => Object.keys(e.parts)));
      const found = TARGET_KEYS.filter(k => used.has(k));
      const keys = [...(found.length ? found : TARGET_KEYS), ...(['fill', 'select'].includes(ctx.action) ? ['value'] : []), 'timeout'];
      return keys.filter(k => ctx.parts[k] === undefined).map(k => item(k + ': ', k, 'target'));
    }
    case 'slot':
      return valueItems(ctx, cat);
    case 'arg': {
      const a = ctx.action;
      if (a === 'wait') return ['500', '1000', '2000'].map(v => item(v, v, 'ms'));
      if (a === 'expectText' || a === 'expectNoText') return textItems(cat);
      // One line to edit rather than four to type: the page's own text, with a
      // range around it to replace.
      if (a === 'expectNumber'){
        return textItems(cat).map(i => ({ ...i, insert: `{ text: ${i.insert}, min: 0, max: 10 }` }));
      }
      return targetItems(cat, a);
    }
  }
  return [];
}
// Settings only belong above the first test; "test:" and "steps:" always do
function topItems(ctx){
  const out = [];
  const text = ctx.text ?? '';
  const firstTest = text.split('\n').findIndex(l => /^test\s*:/.test(l));
  const lineNo = text.slice(0, ctx.line).split('\n').length - 1;
  if (firstTest < 0 || lineNo <= firstTest) out.push(...SETTINGS.map(s => item(s + ': ', s, 'setting')));
  out.push(item('test: ', 'test', 'a new test'));
  if (/(^|\n)test\s*:[^\n]*\n[^\n]*$/.test(text.slice(0, ctx.line + 1))) out.unshift(item('steps: ', 'steps', 'the steps below'));
  return out;
}

/* ---------- Ranking ---------- */
const subseq = (hay, want) => { let i = 0; for (const c of hay) if (c === want[i]) i++; return i === want.length; };
function rank(items, word){
  const w = norm(word);
  if (!w) return items.slice(0, MAX_ITEMS);
  const scored = [];
  for (const it of items){
    const l = norm(it.label);
    let s = l.startsWith(w) ? 4 : l.includes(w) ? 3 : subseq(l, w) ? 2 : 0;
    if (!s){ const sim = similarity(w, l); if (sim < 0.6) continue; s = sim; }
    scored.push({ it, s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, MAX_ITEMS).map(x => x.it);
}

// The catalog of the site the editor's tests belong to. The frame is only read
// when that site is the one on screen, and not on every keystroke.
let lastRead = 0;
function catalogNow(){
  if (currentSite !== editorSite) return snapshot(editorSite);
  if (Date.now() - lastRead < 400) return snapshot(editorSite);
  lastRead = Date.now();
  return harvest(editorSite);
}

// What to offer at this caret, and the range the chosen item replaces.
export function suggest(text, caret, cat = catalogNow()){
  const ctx = context(text, caret);
  if (!ctx) return null;
  ctx.text = text;
  const word = text.slice(ctx.from, caret);
  const items = rank(itemsFor(ctx, cat), word);
  return items.length ? { what: ctx.what, from: ctx.from, to: Math.max(ctx.to, caret), word, items } : null;
}

/* ---------- The list under the caret ---------- */
// The list itself is suggestlist.js's; this side says what is in it and what
// taking one writes.
let open = null, accepting = false;
export const completion = () => open;
const list = suggestionList({
  input: specEl, id: 'acPop', option: 'acOpt', box: () => specEl.closest('.editor'),
  onAccept: it => accept(open.items.indexOf(it)),
  onToggle: on => { setCompletionOpen(on); if (!on) open = null; }
});
export const closeCompletion = () => list.close();
// The characters that start something new: typing one opens the list by itself,
// and accepting an item that ends in one leads on to the next choice.
const TRIGGER = /(?:[:\-{,]|\$\{)\s*$/;
export function accept(i){
  const it = open.items[i]; if (!it) return;
  const { from, to } = open;
  specEl.setRangeText(it.insert, from, to, 'end');
  const at = from + (it.caret ?? it.insert.length);
  specEl.setSelectionRange(at, at);
  closeCompletion();
  // The editor repaints and the file is saved, but this input is ours, not typing
  accepting = true;
  specEl.dispatchEvent(new Event('input', { bubbles: true }));
  accepting = false;
  // An action leads straight on to its target, but a finished value is finished
  if (TRIGGER.test(it.insert)) update();
}
// Ctrl/⌘+Space opens the list anywhere.
function update(forced){
  if (running || recording || specEl.readOnly || document.activeElement !== specEl) return closeCompletion();
  const caret = specEl.selectionStart;
  if (caret !== specEl.selectionEnd) return closeCompletion();
  const found = suggest(specEl.value, caret);
  if (!found) return closeCompletion();
  const line = specEl.value.slice(specEl.value.lastIndexOf('\n', caret - 1) + 1, caret);
  const wanted = forced || found.word.length > 0 || (found.what !== 'top' && TRIGGER.test(line));
  const done = found.items.length === 1 && found.items[0].insert === found.word;
  if (!wanted || (done && !forced)) return closeCompletion();
  open = found;
  list.show(found.items);
}
specEl.addEventListener('input', e => { if (!accepting && !e.undo) update(); });
specEl.addEventListener('keydown', e => {
  if (e.key === ' ' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); update(true); return; }
  if (list.key(e)){ e.preventDefault(); e.stopPropagation(); }
});
