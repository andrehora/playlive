import { codeState } from './code.js';
import { CODE_MODES, codeModeOf } from './core.js';
import { expand, match } from './snippets.js';
import { mode } from '../state.js';
import { suggestionList } from '../suggestlist.js';

/* ---------- Autocomplete in the code modes' tests editor ----------

   What it offers depends on the language and the framework on screen: a blank
   test, a group, a hook, an import, and the framework's checks (unittest's
   asserts, pytest's helpers, Jasmine's matchers, Chai's chains). The snippets
   are the profiles' (code/python/python.js, code/js/javascript.js); finding and expanding them is
   code/snippets.js, and the list itself suggestlist.js, the same one the YAML
   editor has. It opens as you type a word that begins a snippet, or after
   "expect(…)." for a matcher, and Ctrl/⌘+Space opens it anywhere. */
const ta = document.querySelector('#codeTestsEd textarea');
let found = null;
// Where Tab goes next (a snippet's $0, the test's body once it is named),
// counted back from the end of the file, so typing over the placeholder before
// it does not move it
let next = null;

const list = suggestionList({ input: ta, id: 'codeAc', box: () => ta.closest('.code-ed'), onAccept: accept });

function accept(s){
  const { from } = found, to = ta.selectionStart;
  const line = ta.value.slice(ta.value.lastIndexOf('\n', from - 1) + 1, from);
  const { text, select, next: after } = expand(s.body, /^\s*/.exec(line)[0]);
  list.close();
  ta.setRangeText(text, from, to, 'end');
  ta.setSelectionRange(from + select[0], from + select[1]);
  next = after == null ? null : ta.value.length - (from + after);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function updateCodeCompletion(forced = false){
  const L = CODE_MODES[codeModeOf(mode)];
  if (!L || ta.readOnly || document.activeElement !== ta || ta.selectionStart !== ta.selectionEnd) return list.close();
  const { example, framework, lang } = codeState();
  found = match(L.snippets(framework, lang, example), ta.value, ta.selectionStart, { forced, comment: L.comment });
  if (found) list.show(found.items); else list.close();
}
// Typing, not the editor's own changes: an accepted snippet is not a keystroke
ta.addEventListener('input', e => { if (e.isTrusted || e.inputType) updateCodeCompletion(); });
ta.addEventListener('blur', () => { next = null; });
// In the capture phase, so the list has Enter and Tab before the editor's own
// indenting does
ta.addEventListener('keydown', e => {
  const take = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if (e.key === ' ' && (e.ctrlKey || e.metaKey)){ take(); updateCodeCompletion(true); return; }
  if (list.key(e)){ take(); return; }
  if (list.open) return;
  if (next != null && e.key === 'Tab' && !e.shiftKey){
    take();
    const at = Math.max(0, ta.value.length - next);
    next = null;
    ta.setSelectionRange(at, at);
  } else if (e.key === 'Escape' || e.key === 'Enter') next = null;
}, true);
// A different language or framework offers different snippets
document.addEventListener('playlive:mode', () => list.close());
