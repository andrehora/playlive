/* ---------- JS/TS coverage: which lines of the code under test ran ----------
   Not Istanbul, only its idea, and no parser: the source is cut into tokens,
   the braces are told apart (a block, a class body, a switch, or an object),
   and a probe, `$cov[line]=1;`, goes before each statement that starts in a
   block. A line holds code when it has a probe, and ran when one of its probes
   did. A statement that is the body of an if or a loop without braces counts
   with the line it starts on, which is where its probe is.

   Nothing is inserted across lines, so a stack trace through the instrumented
   code still names the editor's lines. Should the instrumented code not parse,
   whoever runs it falls back to the code as written. Pure, so the unit tests
   can read it; jsworker.js is its one user.                               */
export const PROBE = '$cov';
export const BRANCH = '$brc';

// Names that cannot end a statement, so a line break after one is no end
const NOT_END = new Set(('case catch class const default delete do else export extends finally for function if import in '
  + 'instanceof let new of static switch throw try typeof var void while with yield await async').split(' '));
// Names that carry on what came before, so no statement starts with them
const CARRY_ON = new Set(['in', 'of', 'instanceof', 'as', 'satisfies', 'else', 'catch', 'finally']);
// After these a slash starts a regular expression rather than dividing
const BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
const CONTROL = new Set(['if', 'for', 'while', 'with', 'switch', 'catch']);
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

/* ---------- Probes ----------
   Where statements start: right inside a block, after a `;` or a case label
   in one, after a block closed in one (when a name follows), and after a line
   break that ends a statement (when a name follows). Returns the code with
   the probes, and the lines that have one, or null if it cannot be read. */
export function instrument(src, probe = PROBE, { branches = false } = {}){
  let toks;
  try { toks = tokenize(src); } catch { return null; }
  const at = [];                      // [offset, line] of each probe
  const stack = [{ kind: 'block', fresh: true, first: true }];
  let prev = null, closedBlock = false, closedDo = false, parenBefore = null, classAt = -1;
  for (const t of toks){
    const ctx = stack.at(-1), v = t.type === 'punct' || t.type === 'name' ? t.value : null;
    const inBody = ctx.kind === 'block' || (ctx.kind === 'switch' && ctx.inCase);
    let starts = false;
    if (inBody && v !== '}' && v !== ';' && !CARRY_ON.has(v) && !(ctx.kind === 'switch' && (v === 'case' || v === 'default'))
      && !(v === 'while' && closedDo && prev?.value === '}')){
      const ends = p => p.type !== 'punct' ? !(p.type === 'name' && NOT_END.has(p.value))
        : p.value === ']' || p.value === '++' || p.value === '--' || (p.value === ')' && !CONTROL.has(parenBefore?.value)) || (p.value === '}' && !closedBlock);
      starts = !prev || ctx.fresh
        || (t.type === 'name' && prev.value === '}' && closedBlock)
        || (t.type === 'name' && t.line > prev.end && ends(prev));
      // "use strict" has to stay first to be a directive
      if (starts && !(t.type === 'str' && ctx.first)) at.push([t.start, t.line]);
    }
    if (inBody){ ctx.fresh = false; ctx.first = false; }

    if (v === '{'){
      const kind = classAt === stack.length ? 'class'
        : prev?.value === ')' ? (parenBefore?.value === 'switch' ? 'switch' : 'block')
        : prev && ['=>', 'else', 'try', 'finally', 'do'].includes(prev.value) ? 'block'
        : prev?.value === 'static' && ctx.kind === 'class' ? 'block'
        : starts ? 'block' : 'object';
      if (kind === 'class') classAt = -1;
      stack.push({ kind, fresh: true, first: true, isDo: prev?.value === 'do' });
    } else if (v === '}'){
      const done = stack.length > 1 ? stack.pop() : ctx;
      closedBlock = done.kind !== 'object' && done.kind !== 'paren';
      closedDo = !!done.isDo;
    } else if (v === '(' || v === '['){
      stack.push({ kind: 'paren', before: prev });
    } else if (v === ')' || v === ']'){
      if (ctx.kind === 'paren'){ stack.pop(); parenBefore = ctx.before; }
    } else if (v === 'class'){
      classAt = stack.length;
    } else if (ctx.kind === 'block' && v === ';'){
      ctx.fresh = true;
    } else if (ctx.kind === 'switch'){
      if (v === 'case' || v === 'default') ctx.label = true;
      else if (v === ':' && ctx.label){ ctx.label = false; ctx.inCase = true; ctx.fresh = true; }
      else if (v === ';') ctx.fresh = true;
    }
    prev = t;
  }
  const put = at.map(([offset, line]) => [offset, `${probe}[${line}]=1;`]);
  const found = branches ? branchesIn(toks) : [];
  for (const b of found) put.push(...b.put);
  put.sort((a, b) => a[0] - b[0]);
  let code = '', from = 0;
  for (const [offset, text] of put){ code += src.slice(from, offset) + text; from = offset; }
  return { code: code + src.slice(from), lines: [...new Set(at.map(([, line]) => line))],
    ...(branches && { branches: found.map(({ id, line }) => ({ id, line })) }) };
}

/* ---------- Branches ----------
   The ways out of each if, while and for: true or false for a condition,
   and for a for…of, into the body or run out. The condition is wrapped,
   `if ($brc.b(3, c))`, and so is a for…of's iterable, `$brc.i(3, xs)`, which
   records the item handed out and the end reached. A for with no condition,
   a for…in and a for await have no branch that can be read this way and are
   left alone, and so are a ternary and an && within a line, as in Python.
   Nothing is put across lines, so the lines stay the lines written. */
function branchesIn(toks){
  const out = [];
  const closing = i => { for (let d = 0, j = i; j < toks.length; j++){ const v = toks[j].type === 'punct' ? toks[j].value : ''; if (v === '(' || v === '[' || v === '{') d++; else if ((v === ')' || v === ']' || v === '}') && --d === 0) return j; } return -1; };
  toks.forEach((t, i) => {
    if (t.type !== 'name' || !['if', 'while', 'for'].includes(t.value) || toks[i - 1]?.value === '.' || toks[i + 1]?.value !== '(') return;
    const open = i + 1, shut = closing(open);
    if (shut < 0 || shut === open + 1) return;
    const id = out.length, wrap = (a, b, fn) => out.push({ id, line: t.line, put: [[toks[a].start, `${BRANCH}.${fn}(${id}, `], [toks[b].start + toks[b].value.length, ')']] });
    if (t.value !== 'for') return wrap(open + 1, shut - 1, 'b');
    // for (…; condition; …), or for (… of iterable)
    const top = [];
    for (let d = 0, j = open + 1; j < shut; j++){
      const v = toks[j].type === 'punct' ? toks[j].value : toks[j].type === 'name' ? toks[j].value : '';
      if (v === '(' || v === '[' || v === '{') d++;
      else if (v === ')' || v === ']' || v === '}') d--;
      else if (!d && (v === ';' || v === 'of' || v === 'in')) top.push([v, j]);
    }
    const [first, second] = top;
    if (first?.[0] === ';' && second?.[0] === ';' && second[1] > first[1] + 1) wrap(first[1] + 1, second[1] - 1, 'b');
    else if (first?.[0] === 'of' && !top.some(([v]) => v === ';') && shut > first[1] + 1) wrap(first[1] + 1, shut - 1, 'i');
  });
  return out;
}
