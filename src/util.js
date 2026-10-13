// Text safe to put in markup
export const escH = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const sleep = ms => new Promise(r => setTimeout(r, ms));
// Text as a person reads it: one space between words, and for norm, case-insensitive
export const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
export const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
// "1 test", "3 tests": a count and its noun, the noun made plural by an s
// unless another plural is given
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// Text that matches itself, put into a regular expression
export const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A phone wraps long code lines (app.css): each line number then takes its
// line's height, and where a line starts is read, not counted
export function fitGutter(hl, gutter){
  if (getComputedStyle(hl).whiteSpace === 'pre') return;
  // Exact, not rounded: a rounded pixel a line would add up down the file
  const heights = [...hl.children].map(l => l.getBoundingClientRect().height);
  [...gutter.children].forEach((d, i) => { d.style.height = `${heights[i]}px`; });
}
export function lineTop(hl, i, lh){
  const l = hl.children[i], first = hl.children[0];
  return l && first ? l.offsetTop - first.offsetTop : i * lh;
}
// How a score reads, in three bands: all of it, most of it (60% on), or less
export const band = p => (p === 100 ? 'ok' : p >= 60 ? 'warn' : 'bad');
// What a Results head says when a run ends, in every mode alike: how many
// tests ran, how many passed, and how long it took. `ok` is whether it is good news.
export function runSummary({ ran, passed, secs, stopped = false }){
  const noun = n => (n === 1 ? 'test' : 'tests');
  if (stopped) return { text: `Stopped. ${passed} of ${ran} ${noun(ran)} passed.`, ok: false };
  if (passed === ran) return { text: `${ran === 1 ? 'The test' : `All ${ran} tests`} passed in ${secs}s`, ok: true };
  return { text: `${ran - passed} of ${ran} ${noun(ran)} failed (${secs}s)`, ok: false };
}
// A button that changes its label while it works (Run tests to Stop) keeps the
// width it had, so nothing beside it moves; it lets go once it is back.
export function holdWidth(btn, hold){
  if (!hold) btn.style.minWidth = '';
  else if (!btn.style.minWidth && btn.offsetWidth) btn.style.minWidth = `${btn.offsetWidth}px`;
}
