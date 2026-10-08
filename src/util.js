// Text safe to put in markup
export const escH = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const sleep = ms => new Promise(r => setTimeout(r, ms));
// Text as a person reads it: one space between words, and for norm, case-insensitive
export const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
export const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
// What a Results head says when a run ends, in every mode alike: how many
// tests ran, how many passed, and how long it took. `ok` is whether it is good news.
export function runSummary({ ran, passed, secs, stopped = false }){
  const noun = n => (n === 1 ? 'test' : 'tests');
  if (stopped) return { text: `Stopped. ${passed} of ${ran} ${noun(ran)} passed.`, ok: false };
  if (passed === ran) return { text: `${ran === 1 ? 'The test' : `All ${ran} tests`} passed in ${secs}s`, ok: true };
  return { text: `${ran - passed} of ${ran} ${noun(ran)} failed (${secs}s)`, ok: false };
}
