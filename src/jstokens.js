/* ---------- JS/TS tokens: what the code modes read JavaScript with ----------
   No parser: the source cut into tokens, a bracket's partner found by
   counting, and a block cut into statements. jscover.js puts its probes in
   by them, and jsmutate.js, jssmells.js and jsflow.js read code with them.
   Pure, so the unit tests can read it.                                     */

// After these a slash starts a regular expression rather than dividing
const BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '?.', '??=', '&&=', '||=', '=>', '==', '!=', '<=', '>=',
  '&&', '||', '??', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>'];

/* ---------- Tokens ----------
   { type, value, start, line, end }: type is name, num, str, tmpl, regex or
   punct; `line` is where it starts and `end` the line it ends on, from 0.
   Comments and white space are skipped. A template literal is one token. */
export function tokenize(src){
  const out = [];
  let i = 0, line = 0;
  const lines = (a, b) => { for (let k = a; k < b; k++) if (src[k] === '\n') line++; };
  // From the character after a quote to just after the closing one
  const quoted = (k, q) => { while (k < src.length && src[k] !== q && src[k] !== '\n'){ if (src[k] === '\\') k++; k++; } return k + 1; };
  // From just after a backquote to just after its closing one, ${…} and all
  function template(k){
    while (k < src.length && src[k] !== '`'){
      if (src[k] === '\\') k += 2;
      else if (src[k] === '$' && src[k + 1] === '{'){
        let depth = 1;
        k += 2;
        while (k < src.length && depth){
          const c = src[k];
          if (c === '{') depth++;
          else if (c === '}') depth--;
          if (c === '"' || c === "'") k = quoted(k + 1, c);
          else if (c === '`') k = template(k + 1);
          else k++;
        }
      } else k++;
    }
    return k + 1;
  }
  while (i < src.length){
    const c = src[i];
    if (c === '\n'){ line++; i++; continue; }
    if (/\s/.test(c)){ i++; continue; }
    if (c === '/' && src[i + 1] === '/'){ while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*'){
      const e = src.indexOf('*/', i + 2), end = e < 0 ? src.length : e + 2;
      lines(i, end); i = end; continue;
    }
    const start = i, first = line, prev = out.at(-1);
    let type;
    if (c === '"' || c === "'"){ type = 'str'; i = quoted(i + 1, c); }
    else if (c === '`'){ type = 'tmpl'; i = template(i + 1); lines(start, i); }
    else if (/[\w$#\u0080-￿]/.test(c) && !/\d/.test(c)){ type = 'name'; i = start + /^[\w$#\u0080-￿]+/.exec(src.slice(i))[0].length; }
    else if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1]))){ type = 'num'; i = start + /^\.?[\w.]+/.exec(src.slice(i))[0].length; }
    else if (c === '/' && (!prev || (prev.type === 'punct' && !')]}'.includes(prev.value)) || (prev.type === 'name' && BEFORE_REGEX.has(prev.value)))){
      type = 'regex';
      let k = i + 1, cls = false;
      while (k < src.length && src[k] !== '\n' && (cls || src[k] !== '/')){
        if (src[k] === '\\') k++;
        else if (src[k] === '[') cls = true;
        else if (src[k] === ']') cls = false;
        k++;
      }
      i = k + 1;
      while (/\w/.test(src[i] || '')) i++;
    } else { type = 'punct'; i += (PUNCT.find(p => src.startsWith(p, i)) || c).length; }
    out.push({ type, value: src.slice(start, i), start, line: first, end: line });
  }
  return out;
}


// An opening or a closing bracket, as a token
export const opens = t => t?.type === 'punct' && (t.value === '(' || t.value === '[' || t.value === '{');
export const shuts = t => t?.type === 'punct' && (t.value === ')' || t.value === ']' || t.value === '}');

// The tokens between an opening bracket at `i` and its partner: the index of the partner
export function close(toks, i){
  for (let depth = 0, j = i; j < toks.length; j++){
    if (opens(toks[j])) depth++;
    else if (shuts(toks[j]) && --depth === 0) return j;
  }
  return -1;
}
// The indexes from `from` up to `to` that are at their own depth, a bracket
// and all it holds stepped over; it stops at an opening that never closes
export function atTop(toks, from = 0, to = toks.length){
  const out = [];
  for (let j = from; j < to; j++){
    out.push(j);
    if (opens(toks[j])){ j = close(toks, j); if (j < 0) break; }
  }
  return out;
}
// A block's statements, at its own depth: cut at ; and, where a line ends
// one, at a new line (a line ending in an operator or an opening carries on,
// and so does an else, a catch, a finally, or the while of a do)
const CARRY = new Set(['else', 'catch', 'finally']);
export function statements(toks){
  const out = [];
  let cur = [];
  const push = () => { if (cur.length) out.push(cur); cur = []; };
  for (let i = 0; i < toks.length; i++){
    const t = toks[i], prev = cur.at(-1);
    if (prev && t.line > prev.end && ends(prev) && !(t.type === 'punct' && '.?)]}'.includes(t.value[0]))
      && !(t.type === 'name' && (CARRY.has(t.value) || (t.value === 'while' && cur[0]?.value === 'do')))) push();
    // `if (a) b();` ended at its ; and an else still belongs to it
    if (!cur.length && t.type === 'name' && out.length && (CARRY.has(t.value) || (t.value === 'while' && out.at(-1)[0].value === 'do'))) cur = out.pop();
    if (opens(t)){
      const j = close(toks, i);
      if (j < 0) return null;
      cur.push(...toks.slice(i, j + 1));
      i = j;
      continue;
    }
    if (t.type === 'punct' && t.value === ';'){ cur.push(t); push(); continue; }
    cur.push(t);
  }
  push();
  return out;
}
const ends = t => (t.type === 'punct' ? [')', ']', '}', '++', '--'].includes(t.value) : !['return', 'new', 'typeof', 'await', 'const', 'let', 'var'].includes(t.value));
