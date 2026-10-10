/* ---------- What differs between two test files ----------
   Compare's Diff check marks, on both sides, what one file says and
   the other does not: the same tests in two frameworks differ mostly in how
   they set up and check (a fixture against setUp, `assert x == 1` against
   assertEqual), and that is what it should show. Lines are matched on what
   they say, indentation aside; comments and blank lines are left out, since
   they explain rather than test. A changed line that resembles one changed on
   the other side, in the same place, is paired with it and only its differing
   tokens are marked; any other changed line is marked whole. */

// A comment's own line, in Python or JS/TS
const NOTE = /^\s*(#|\/\/|\/\*|\*|$)/;
const TOKEN = /\w+|[=!<>]=+|=>|&&|\|\||[^\w\s]/g;
// Paired when at least this share of their words are the same (punctuation
// alone would make any two calls alike)
const ALIKE = 0.5;

// The pairs [i, j] of a longest common subsequence of a and b
function common(a, b){
  const n = a.length, m = b.length, len = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      len[i][j] = a[i] === b[j] ? len[i + 1][j + 1] + 1 : Math.max(len[i + 1][j], len[i][j + 1]);
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m;){
    if (a[i] === b[j]){ pairs.push([i, j]); i++; j++; }
    else if (len[i + 1][j] >= len[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

const tokens = line => [...line.matchAll(TOKEN)].map(m => ({ t: m[0], s: m.index, e: m.index + m[0].length }));

// The ranges [start, end) of a's and b's tokens the other line lacks, joined
// across the spaces between them, or null when the lines are not alike
function tokenDiff(a, b){
  const ta = tokens(a), tb = tokens(b);
  const words = toks => toks.map(x => x.t).filter(t => /\w/.test(t));
  const wa = words(ta), wb = words(tb);
  if (2 * common(wa, wb).length / (wa.length + wb.length || 1) < ALIKE) return null;
  const pairs = common(ta.map(x => x.t), tb.map(x => x.t));
  const ranges = (toks, kept, line) => {
    const out = [];
    toks.forEach((x, i) => {
      if (kept.has(i)) return;
      const last = out[out.length - 1];
      if (last && !line.slice(last[1], x.s).trim()) last[1] = x.e;
      else out.push([x.s, x.e]);
    });
    return out;
  };
  return [ranges(ta, new Set(pairs.map(p => p[0])), a), ranges(tb, new Set(pairs.map(p => p[1])), b)];
}

/* For each line of a and of b: null when the other file has it too, true when
   it is changed as a whole, or the ranges of it that differ. */
export function diffLines(a, b){
  const la = a.split('\n'), lb = b.split('\n');
  const marks = [la.map(() => null), lb.map(() => null)];
  const kept = lines => lines.map((l, i) => i).filter(i => !NOTE.test(lines[i]));
  const ia = kept(la), ib = kept(lb), key = l => l.trim().replace(/\s+/g, ' ');
  const pairs = common(ia.map(i => key(la[i])), ib.map(i => key(lb[i])));
  // Between two matched lines, the changed ones on each side
  let pa = 0, pb = 0;
  for (const [x, y] of [...pairs, [ia.length, ib.length]]){
    const ca = ia.slice(pa, x), cb = ib.slice(pb, y);
    ca.forEach(i => { marks[0][i] = true; });
    cb.forEach(j => { marks[1][j] = true; });
    let from = 0;
    for (const i of ca)
      for (let k = from; k < cb.length; k++){
        const d = tokenDiff(la[i], lb[cb[k]]);
        if (!d) continue;
        [marks[0][i], marks[1][cb[k]]] = d.map(r => (r.length ? r : null));
        from = k + 1;
        break;
      }
    pa = x + 1; pb = y + 1;
  }
  return marks;
}

/* A highlighted line's HTML with the characters in ranges wrapped in <mark>,
   closed and opened again around the highlighter's own tags so they nest. */
export function markHtml(html, ranges){
  let out = '', pos = 0, open = false;
  for (const [t] of html.matchAll(/<[^>]*>|&[^;]+;|[^<&]/g)){
    if (t[0] === '<'){
      if (open){ out += '</mark>'; open = false; }
      out += t;
      continue;
    }
    const p = pos++, want = ranges.some(([s, e]) => p >= s && p < e);
    if (want !== open){ out += want ? '<mark>' : '</mark>'; open = want; }
    out += t;
  }
  return out + (open ? '</mark>' : '');
}
