/* ---------- The same test on both sides of Compare ----------
   Pure, so the unit tests can read it. Every example names its tests alike in
   every framework and language (`test_has_soup` in Python, "has soup" in
   JS/TS), so a test on one side is paired with the one named alike on the
   other, in order. A test's lines run from its decorators to its body's end.
   The pairs' first and last lines are the anchors two sides scroll by: a line
   between two anchors lies as far between theirs on the other side. */

import { common } from './diff.js';

const indent = l => l.length - l.trimStart().length;
const said = name => name.toLowerCase().replace(/['’]/g, '').replace(/^test_?/, '').replace(/[\W_]+/g, ' ').trim();

// For each test ({ name, line }, as testsIn finds them): its lines [start, end)
export function testSpans(text, tests){
  const lines = text.split('\n');
  return tests.map((t, k) => {
    const at = indent(lines[t.line]), limit = k + 1 < tests.length ? tests[k + 1].line : lines.length;
    let start = t.line, end = t.line + 1;
    while (start > 0 && lines[start - 1].trim().startsWith('@') && indent(lines[start - 1]) === at) start--;
    for (; end < limit; end++){
      const l = lines[end];
      if (!l.trim() || indent(l) > at) continue;
      // A closing bracket at the test's own indentation still belongs to it
      if (indent(l) === at && /^[\])}]/.test(l.trim())) end++;
      break;
    }
    while (end > t.line + 1 && !lines[end - 1].trim()) end--;
    return { name: t.name, start, end };
  });
}

// The pairs [i, j] of a's and b's spans that are the same test
export const pairTests = (a, b) => common(a.map(s => said(s.name)), b.map(s => said(s.name)));

// The lines [inA, inB] that sit level, in order, from the top to the ends
export function anchorsOf(a, b, pairs, linesA, linesB){
  const out = [[0, 0]];
  for (const [i, j] of pairs) out.push([a[i].start, b[j].start], [a[i].end, b[j].end]);
  out.push([linesA, linesB]);
  return out;
}

// Where line x (fractional) of the first side falls on the second
export function mapLine(anchors, x){
  let k = 1;
  while (k < anchors.length - 1 && x >= anchors[k][0]) k++;
  const [a0, b0] = anchors[k - 1], [a1, b1] = anchors[k];
  if (x < a0) return b0 + x - a0;
  if (x >= a1) return b1 + x - a1;
  return b0 + (x - a0) * (b1 - b0) / (a1 - a0);
}
