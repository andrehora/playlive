/* ---------- JS/TS flows: the control flow of each function with a branch ----------
   What code/python/worker.js's flows_of reads from Python's syntax tree, read here on
   tokens (code/js/cover.js) and statements (code/js/smells.js), in the shape code/flow.js
   draws: a function is a list of items, a block of plain statements (ending
   the flow when its last one returns, throws, breaks or continues), an if
   with its two arms (an else if is an if in the else), a loop with its body
   (`each` for a for…of or for…in, which run out rather than test), a try
   with its catch, or a switch with its cases. Lines count from 0.

   The functions are those declared with `function`, the methods of a class
   or an object, and a const, let or var given an arrow or a function; a
   method is named after its class or object. Only those with a branch are
   kept, as in Python. Pure, so the unit tests can read it.               */
import { atTop, close, statements, tokenize } from './tokens.js';

const TERMINAL = new Set(['return', 'throw', 'break', 'continue']);
const BRANCHY = new Set(['if', 'for', 'while', 'do', 'switch', 'try']);
const MODIFIERS = new Set(['export', 'default', 'async', 'static', 'public', 'private', 'protected', 'readonly', 'get', 'set', 'override', 'abstract', 'declare']);

export function flowsOf(src){
  let toks;
  try { toks = tokenize(src); } catch { return []; }
  if (statements(toks) == null) return [];
  const lines = src.split('\n');
  const first = st => lines[st[0].line].trim();
  const text = (a, b) => src.slice(a.start, b.start + b.value.length);
  // The block a statement opens at `i`, or the single statement that stands for one
  const body = (st, i) => (st[i]?.value === '{' ? st.slice(i + 1, close(st, i)) : st.slice(i));

  function seq(toks){
    const items = [];
    const plain = st => {
      let last = items.at(-1);
      if (!(last?.t === 'block' && !last.end)){ last = { t: 'block', lines: [], texts: [], end: false }; items.push(last); }
      last.lines.push(st[0].line);
      last.texts.push(first(st));
      last.end = TERMINAL.has(st[0].value);
    };
    const ifOf = (st, word) => {
      const shut = close(st, 1), rest = st.slice(shut + 1);
      // The then arm runs to an else at its own depth
      const k = rest[0]?.value === '{' ? close(rest, 0) + 1
        : atTop(rest).find(j => rest[j].value === 'else' && rest[j - 1]?.value === ';') ?? rest.length;
      const then = rest[0]?.value === '{' ? rest.slice(1, k - 1) : rest.slice(0, k);
      const other = rest[k]?.value === 'else' ? rest.slice(k + 1) : [];
      return { t: 'if', line: st[0].line, text: `${word} ${text(st[1], st[shut])}`, then: seq(then),
        else: other[0]?.value === 'if' ? [ifOf(other, 'else if')] : seq(other[0]?.value === '{' ? other.slice(1, close(other, 0)) : other) };
    };
    for (const st of statements(toks) || []){
      const v = st[0].value;
      if (st[0].type !== 'name' || !BRANCHY.has(v) || (v !== 'do' && v !== 'try' && st[1]?.value !== '(')){ plain(st); continue; }
      if (v === 'if'){ items.push(ifOf(st, 'if')); continue; }
      if (v === 'for' || v === 'while'){
        const shut = close(st, 1), head = st.slice(2, shut);
        items.push({ t: 'loop', line: st[0].line, text: `${v} ${text(st[1], st[shut])}`, body: seq(body(st, shut + 1)),
          each: v === 'for' && head.some(t => t.value === 'of' || t.value === 'in') && !head.some(t => t.value === ';') });
        continue;
      }
      if (v === 'do'){
        // do { … } while (c); or do one(); while (c);
        const w = st[1]?.value === '{' ? close(st, 1) + 1 : st.findLastIndex(t => t.value === 'while' && t.type === 'name');
        const cond = st.slice(w);
        // at its while, where the branch is
        items.push({ t: 'loop', line: cond[0]?.line ?? st[0].line, each: false, body: seq(st[1]?.value === '{' ? st.slice(2, w - 1) : st.slice(1, w)),
          text: `do … ${cond[0]?.value === 'while' && cond[1]?.value === '(' ? `while ${text(cond[1], cond[close(cond, 1)])}` : ''}`.trim() });
        continue;
      }
      if (v === 'switch'){
        const shut = close(st, 1), inside = st.slice(shut + 2, close(st, shut + 1));
        const cases = [];
        for (const i of atTop(inside)){
          const t = inside[i];
          if ((t.value === 'case' || t.value === 'default') && t.type === 'name'){
            const colon = inside.findIndex((x, j) => j > i && x.value === ':');
            cases.push({ line: t.line, text: text(t, inside[colon]), from: colon + 1, at: i });
          }
        }
        items.push({ t: 'match', line: st[0].line, text: `switch ${text(st[1], st[shut])}`,
          cases: cases.map((c, i) => ({ line: c.line, text: c.text, body: seq(inside.slice(c.from, cases[i + 1]?.at ?? inside.length)) })) });
        continue;
      }
      // try { … } catch (e) { … } finally { … }
      const tryEnd = close(st, 1), handlers = [];
      let i = tryEnd + 1, fin = null;
      while (i < st.length){
        if (st[i].value === 'catch'){
          const open = st[i + 1]?.value === '(' ? close(st, i + 1) + 1 : i + 1;
          handlers.push({ line: st[i].line, text: text(st[i], st[open - 1]), body: seq(st.slice(open + 1, close(st, open))) });
          i = close(st, open) + 1;
        } else if (st[i].value === 'finally'){ fin = st.slice(i + 2, close(st, i + 1)); break; }
        else i++;
      }
      items.push({ t: 'try', line: st[0].line, text: 'try', body: seq(st.slice(2, tryEnd)), handlers });
      if (fin) items.push(...seq(fin));
    }
    return items;
  }

  const out = [];
  const branchy = toks => toks.some((t, i) => t.type === 'name' && BRANCHY.has(t.value) && toks[i - 1]?.value !== '.');
  const add = (name, at, head, inner) => {
    if (branchy(inner)) out.push({ name, line: at.line, text: head, body: seq(inner) });
  };
  // The methods of a class or an object's body: name(…) { … }
  function members(toks, prefix){
    for (const st of statements(toks) || []){
      let i = 0;
      while (st[i] && MODIFIERS.has(st[i].value) && st[i + 1]?.type === 'name') i++;
      const name = st[i];
      if (name?.type !== 'name' || st[i + 1]?.value !== '(') continue;
      const shut = close(st, i + 1), open = st.findIndex((t, k) => k > shut && t.value === '{');
      if (open < 0) continue;
      add(prefix + name.value, st[0], text(st[0], st[shut]), st.slice(open + 1, close(st, open)));
      visit(st.slice(open + 1, close(st, open)), `${prefix}${name.value}.`);
    }
  }
  function visit(toks, prefix){
    for (const st of statements(toks) || []){
      let i = 0;
      while (st[i] && (st[i].value === 'export' || st[i].value === 'default' || st[i].value === 'async' || st[i].value === 'declare')) i++;
      const v = st[i]?.value;
      if (v === 'function' && st[i + 1]?.value !== '('){
        const name = st[i + 1]?.value === '*' ? st[i + 2] : st[i + 1];
        const paren = st.findIndex((t, k) => k > i && t.value === '('), shut = close(st, paren);
        const open = st.findIndex((t, k) => k > shut && t.value === '{');
        if (open < 0) continue;
        add(prefix + name.value, st[0], text(st[0], st[shut]), st.slice(open + 1, close(st, open)));
        visit(st.slice(open + 1, close(st, open)), `${prefix}${name.value}.`);
      } else if (v === 'class'){
        const open = st.findIndex((t, k) => k > i && t.value === '{');
        if (open > 0) members(st.slice(open + 1, close(st, open)), `${st[i + 1]?.type === 'name' && st[i + 1].value !== 'extends' ? st[i + 1].value : 'class'}.`);
      } else if ((v === 'const' || v === 'let' || v === 'var') && st[i + 1]?.type === 'name' && st[i + 2]?.value === '='){
        const name = st[i + 1].value, rest = st.slice(i + 3);
        if (rest[0]?.value === '{'){ members(rest.slice(1, close(rest, 0)), `${name}.`); continue; }
        const arrow = rest.findIndex(t => t.value === '=>'), fn = rest.findIndex(t => t.value === 'function');
        const k = arrow >= 0 && (fn < 0 || arrow < fn) ? arrow : fn;
        if (k < 0) continue;
        const open = rest.findIndex((t, j) => j > k && t.value === '{');
        if (open < 0 || (k === arrow && open !== arrow + 1)) continue;   // an arrow with no block is one expression
        const head = rest.slice(0, k === arrow ? arrow + 1 : close(rest, rest.findIndex((t, j) => j > k && t.value === '(')) + 1);
        add(name, st[0], `${st.slice(0, i + 3).map(t => t.value).join(' ')} ${text(head[0], head.at(-1))}`, rest.slice(open + 1, close(rest, open)));
        visit(rest.slice(open + 1, close(rest, open)), `${name}.`);
      }
    }
  }
  visit(toks, '');
  return out;
}
