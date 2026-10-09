/* ---------- JS/TS mutations: the code changed in one small way ----------
   What code/python/worker.js's mutants_of does for Python, done on tokens (code/js/cover.js)
   since there is no parser here: a comparison swapped (< for <=, === for !==),
   arithmetic swapped (+ for -, * for /), && for ||, a whole number one more,
   true for false, a ! removed, and a returned value replaced by undefined.

   Each change stays within its line, so every mutant can be written back as
   that one line (`after`) and a stack trace still names the lines as written.
   Without a parser some care stands in for one: < and > and the arithmetic
   are changed only with a space on both sides, which a TypeScript generic
   (Array<number>) and a sign (-1) do not have; the lines that import, require
   or export are left alone, and a template literal is one token, so it is
   never changed inside. The same file mutated the same way twice is one
   mutant. Pure, so the unit tests can read it; code/js/worker.js is its one user. */
import { close, opens, shuts, tokenize } from './tokens.js';

const SWAPS = { '<': '<=', '<=': '<', '>': '>=', '>=': '>', '===': '!==', '!==': '===', '==': '!=', '!=': '==',
  '+': '-', '-': '+', '*': '/', '/': '*', '%': '*', '+=': '-=', '-=': '+=', '*=': '/=', '/=': '*=', '&&': '||', '||': '&&' };
// Swapped only with a space on each side, so a generic or a sign is not
const SPACED = new Set(['<', '>', '+', '-', '*', '/', '%']);
const LEFT_ALONE = /^\s*(import\b|export\s*(\{|\*|default\s*\{)|module\.exports\b|(const|let|var)\s[^=]*=\s*require\()/;
export const MAX_MUTANTS = 60;

// [{ id, line, what, text, after }, src]: the line from 0, the change, the
// line as written, and as changed; and the whole file as changed
export function mutantsOf(src){
  let toks;
  try { toks = tokenize(src); } catch { return []; }
  const lines = src.split('\n');
  const changes = [];                 // [start, end, replacement, what, line]
  toks.forEach((t, i) => {
    if (t.line !== t.end || LEFT_ALONE.test(lines[t.line])) return;
    const v = t.value;
    if (t.type === 'punct' && SWAPS[v] && (!SPACED.has(v) || (src[t.start - 1] === ' ' && src[t.start + v.length] === ' ')))
      changes.push([t.start, t.start + v.length, SWAPS[v], `${v} → ${SWAPS[v]}`, t.line]);
    else if (t.type === 'punct' && v === '!' && toks[i + 1]?.line === t.line)
      changes.push([t.start, t.start + 1, '', '! removed', t.line]);
    else if (t.type === 'num' && /^\d+$/.test(v))
      changes.push([t.start, t.start + v.length, String(+v + 1), `${v} → ${+v + 1}`, t.line]);
    else if (t.type === 'name' && (v === 'true' || v === 'false') && toks[i - 1]?.value !== '.')
      changes.push([t.start, t.start + v.length, v === 'true' ? 'false' : 'true', `${v} → ${v === 'true' ? 'false' : 'true'}`, t.line]);
    else if (t.type === 'name' && v === 'return'){
      // To the ; that ends it on this line, outside any brackets
      let j = i + 1;
      for (; j < toks.length && toks[j].line === t.line && !shuts(toks[j]) && toks[j].value !== ';'; j++)
        if (opens(toks[j])){ j = close(toks, j); if (j < 0) break; }
      const last = toks[j - 1];
      // the whole of it on the return's line, as every change here is
      if (j > i + 1 && toks[j]?.value === ';' && toks[j].line === t.line && !(j === i + 2 && last.value === 'undefined'))
        changes.push([toks[i + 1].start, last.start + last.value.length, 'undefined', 'returns undefined', t.line]);
    }
  });
  const out = [], seen = new Set();
  for (const [a, b, put, what, line] of changes){
    const mutated = src.slice(0, a) + put + src.slice(b);
    if (mutated === src || seen.has(mutated)) continue;
    seen.add(mutated);
    const from = lines.slice(0, line).reduce((n, l) => n + l.length + 1, 0);
    out.push([{ id: out.length, line, what, text: lines[line].trim(), after: lines[line].slice(0, a - from) + put + lines[line].slice(b - from) }, mutated]);
    if (out.length >= MAX_MUTANTS) break;
  }
  return out;
}
