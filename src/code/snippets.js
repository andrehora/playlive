/* ---------- Snippets for the code modes: what to offer, and what it writes ----------

   Pure, so the unit tests can read it. A snippet is { label, detail, body,
   start, also }: the label is what is typed to find it, the body what it
   writes, and `also` other words that find it ("test" finds JS's `it`). A
   `start` snippet (a test, a hook, an import) is only offered with nothing
   but indent before it on the line. A label that begins with "." (a Jasmine
   matcher, a Chai chain) is offered after "expect(…)" and the like.

   In a body, ${1:text} is a placeholder, written as its text; the first one is
   selected when the snippet lands, so typing replaces it. $0 is where the
   caret goes when there is no placeholder, and where Tab takes it after one
   (the test's body, once it is named). Lines after the first take the indent
   of the line the snippet starts on.                                       */

// The word being typed: letters, digits, "_", "." and "@", back from the caret
export const wordAt = (text, caret) => /[@\w.]*$/.exec(text.slice(text.lastIndexOf('\n', caret - 1) + 1, caret))[0];

// Inside a string or a comment, nothing is offered: a quote left open before
// the caret, or the line's comment marker, says the caret is in one.
export function quiet(before, comment){
  let q = null;
  for (let i = 0; i < before.length; i++){
    const c = before[i];
    if (q){ if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if (before.startsWith(comment, i)) return true;
  }
  return q !== null;
}

// The snippets that fit at the caret, best first. Forced (Ctrl/⌘+Space), an
// empty word offers everything that fits there.
export function match(snippets, text, caret, { forced = false, comment = '#' } = {}){
  const lineStart = text.lastIndexOf('\n', caret - 1) + 1, before = text.slice(lineStart, caret);
  const word = wordAt(text, caret), lead = before.slice(0, before.length - word.length);
  if (quiet(lead, comment)) return null;
  const atStart = !lead.trim();
  // after ")" only a matcher or chain can follow
  const chained = /\)\s*$/.test(lead) || word.startsWith('.');
  const w = word.toLowerCase();
  if (!forced && !(w.length >= 2 || (w === '.' && chained))) return null;
  const scored = [];
  for (const s of snippets){
    if (s.start && !atStart) continue;
    if (s.label.startsWith('.') !== chained) continue;
    // "assertEq" finds "self.assertEqual", "rai" finds "pytest.raises"
    const scoreOf = key => {
      const l = key.toLowerCase(), tail = l.slice(l.lastIndexOf('.') + 1);
      return !w ? 1 : l.startsWith(w) ? 2 : tail.startsWith(w.replace(/^.*\./, '')) && w.length > 1 ? 1 : 0;
    };
    const score = Math.max(...[s.label, ...(s.also || [])].map(scoreOf));
    if (score) scored.push({ s, score });
  }
  if (!scored.length) return null;
  const items = scored.sort((a, b) => b.score - a.score).map(x => x.s);
  // Typed in full, there is nothing left to offer
  if (!forced && items.length === 1 && items[0].label.toLowerCase() === w) return null;
  return { from: caret - word.length, word, items };
}

// A snippet as text, indented to its line, with what to select once it lands
// and, if that is a placeholder, where $0 is: `next`, for Tab
export function expand(body, indent){
  let out = '', sel = null, caret = null;
  const re = /\$\{(\d+):([^}]*)\}|\$(\d+)/g;
  let last = 0, m, first = Infinity;
  const src = body.replace(/\n/g, '\n' + indent);
  while ((m = re.exec(src))){
    out += src.slice(last, m.index);
    if (m[1] !== undefined){
      const n = +m[1];
      if (n < first){ first = n; sel = [out.length, out.length + m[2].length]; }
      out += m[2];
    } else if (m[3] === '0') caret = out.length;
    last = re.lastIndex;
  }
  out += src.slice(last);
  if (!sel){ const at = caret ?? out.length; return { text: out, select: [at, at], next: null }; }
  return { text: out, select: sel, next: caret };
}
