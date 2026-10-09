import { escH } from '../util.js';

/* ---------- The flow view: a function's control flow, drawn ----------
   Python mode reads each function that has a branch from its syntax tree
   (code/python/worker.js) and this lays it out as SVG, top to bottom: a box for each
   run of plain statements, a six-sided box for each decision (if, try,
   match) with its arms side by side, and a loop with its body below it, a
   way back on the left and a way out on the right. A box whose last
   statement returns, raises, breaks or continues ends its path there.

   It knows nothing of coverage: `paint(lines, decision)` names each box's
   class (hit, part, miss or none). Pure, so the unit tests can read it.   */
const CH = 7, LH = 16, PX = 10, PY = 6;      // a character's width, a line's height, the padding
const G = 26, GX = 28, RAIL = 22;            // the gaps between rows, between arms, and to the loop's rails
const MAX = 40;                              // characters a line of a box keeps

const cut = t => (t.length > MAX ? t.slice(0, MAX - 1) + '…' : t);
const attr = t => escH(t).replace(/"/g, '&quot;');

// A box: some lines of text, at a place in the code. `kind` is block, dec,
// start or end; a box with `stop` has no way out.
function box(texts, { kind = 'block', line, cls = '', stop = false }){
  const shown = texts.length > 3 ? [...texts.slice(0, 2), `… ${texts.length - 2} more`] : texts;
  const lines = shown.map(cut);
  const w = Math.max(44, Math.max(...lines.map(t => t.length)) * CH + 2 * PX + (kind === 'dec' ? 16 : 0));
  const h = lines.length * LH + 2 * PY;
  return {
    w, h, ax: w / 2,
    render(x, y, out, reached = true){
      if (kind === 'end' && !reached) return [];
      const shape = kind === 'dec'
        ? `<path d="M${x},${y + h / 2}L${x + 8},${y}H${x + w - 8}L${x + w},${y + h / 2}L${x + w - 8},${y + h}H${x + 8}Z"/>`
        : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${kind === 'block' ? 5 : h / 2}"/>`;
      const text = lines.map((t, i) => `<text x="${x + w / 2}" y="${y + PY + LH * i + 12}">${escH(t)}</text>`).join('');
      const at = line != null ? ` data-line="${line}" tabindex="0" role="button" aria-label="${attr(`Line ${line + 1}: ${texts[0]}`)}"` : '';
      out.push(`<g class="fnode ${kind} ${cls}"${at}>${shape}${text}</g>`);
      return stop ? [] : [{ x: x + w / 2, y: y + h }];
    }
  };
}

// An arrow along points; `arrow` false leaves the head off, for a way that
// carries on into what follows rather than ending at a box
function edge(out, pts, label, arrow = true){
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('');
  out.push(`<path class="fedge" d="${d}"${arrow ? ' marker-end="url(#fhead)"' : ''}/>`);
  if (label){
    const [a, b] = pts.length > 2 ? [pts[1], pts[2]] : pts;
    const lx = a.x === b.x ? a.x + 5 : (a.x + b.x) / 2, ly = a.y === b.y ? a.y - 4 : (a.y + b.y) / 2 + 4;
    out.push(`<text class="flabel" x="${lx}" y="${ly}"${a.x === b.x ? ' text-anchor="start"' : ''}>${escH(label)}</text>`);
  }
}
// From a way out to the top of what follows, turning halfway down the gap
function join(out, from, to){
  edge(out, from.x === to.x ? [from, to] : [from, { x: from.x, y: to.y - G / 2 }, { x: to.x, y: to.y - G / 2 }, to]);
}

// Items one under another, on one axis
function column(units){
  const left = Math.max(...units.map(u => u.ax)), right = Math.max(...units.map(u => u.w - u.ax));
  return {
    w: left + right, ax: left,
    h: units.reduce((n, u) => n + u.h, 0) + G * (units.length - 1),
    render(x, y, out){
      let ends = null;
      for (const u of units){
        const top = { x: x + left, y };
        if (ends) for (const e of ends) join(out, e, top);
        ends = u.render(x + left - u.ax, y, out, !ends || ends.length > 0);
        y += u.h + G;
      }
      return ends;
    }
  };
}
// An arm with nothing in it: the way goes straight on
const lane = () => ({ w: 24, h: 0, ax: 12, empty: true, render: (x, y) => [{ x: x + 12, y }] });

// A decision and its arms: the first straight below, the others to the right
function decision(head, arms){
  const first = arms[0].u, o = Math.max(0, head.w / 2 - first.ax), ax = o + first.ax;
  const xs = [o];
  let x = o + first.w;
  for (const arm of arms.slice(1)){
    x = Math.max(x + GX, ax + head.w / 2 + 14 - arm.u.ax);
    xs.push(x);
    x += arm.u.w;
  }
  return {
    w: Math.max(x, ax + head.w / 2), ax,
    h: head.h + G + Math.max(...arms.map(a => a.u.h)),
    render(x0, y0, out){
      head.render(x0 + ax - head.w / 2, y0, out);
      const top = y0 + head.h + G, mid = y0 + head.h / 2, ends = [];
      arms.forEach((arm, i) => {
        const bx = x0 + xs[i], drop = bx + arm.u.ax;
        if (i === 0) edge(out, [{ x: x0 + ax, y: y0 + head.h }, { x: drop, y: top }], arm.label, !arm.u.empty);
        else edge(out, [{ x: x0 + ax + head.w / 2, y: mid }, { x: drop, y: mid }, { x: drop, y: top }], arm.label, !arm.u.empty);
        ends.push(...arm.u.render(bx, top, out));
      });
      return ends;
    }
  };
}

// A loop: its body below it, back on the left, out on the right
function loop(head, body, labels){
  const ax = Math.max(RAIL + body.ax, RAIL + head.w / 2);
  const right = Math.max(ax + head.w / 2, ax - body.ax + body.w) + RAIL, h = head.h + G + body.h + 18;
  return {
    w: right + 6, ax, h,
    render(x0, y0, out){
      head.render(x0 + ax - head.w / 2, y0, out);
      const top = y0 + head.h + G, mid = y0 + head.h / 2, low = top + body.h + 12;
      edge(out, [{ x: x0 + ax, y: y0 + head.h }, { x: x0 + ax, y: top }], labels[0]);
      for (const e of body.render(x0 + ax - body.ax, top, out))
        edge(out, [e, { x: e.x, y: low }, { x: x0 + 8, y: low }, { x: x0 + 8, y: mid }, { x: x0 + ax - head.w / 2, y: mid }]);
      edge(out, [{ x: x0 + ax + head.w / 2, y: mid }, { x: x0 + right, y: mid }, { x: x0 + right, y: y0 + h }], labels[1], false);
      return [{ x: x0 + right, y: y0 + h }];
    }
  };
}

// The pieces of a function's flow, as the worker sends them
function units(items, paint){
  const arm = (seq, label) => ({ label, u: seq.length ? column(units(seq, paint)) : lane() });
  const head = it => box([it.text], { kind: 'dec', line: it.line, cls: paint([it.line], true) });
  return items.map(it => {
    if (it.t === 'block') return box(it.texts, { line: it.lines[0], cls: paint(it.lines, false), stop: it.end });
    if (it.t === 'if') return decision(head(it), [arm(it.then, 'True'), arm(it.else, 'False')]);
    if (it.t === 'loop') return loop(head(it), column(units(it.body, paint)), (it.each ?? it.text.startsWith('for')) ? ['each', 'done'] : ['True', 'False']);
    if (it.t === 'try') return decision(head(it), [arm(it.body, ''), ...it.handlers.map(h => arm(h.body, h.text))]);
    if (it.t === 'match') return decision(head(it), it.cases.map(c => arm(c.body, c.text)));
    return box([it.text || ''], {});
  });
}

// The arrowhead every flow's edges end in, defined once on the page
export const FLOW_DEFS = '<svg class="flow-defs" aria-hidden="true" width="0" height="0"><defs><marker id="fhead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L8,4L0,8Z"/></marker></defs></svg>';
// One function's flow as an SVG
export function flowSvg(fn, paint = () => ''){
  const all = column([
    box([fn.text], { kind: 'start', line: fn.line }),
    ...units(fn.body, paint),
    box(['end'], { kind: 'end' })
  ]);
  const out = [], pad = 8;
  all.render(pad, pad, out);
  const w = Math.ceil(all.w + 2 * pad), h = Math.ceil(all.h + 2 * pad);
  return `<svg class="flow" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${attr(`How ${fn.name} runs`)}">`
    + out.join('') + '</svg>';
}
