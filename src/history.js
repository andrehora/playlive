/* ---------- Run history: spot flaky tests ---------- */
export const HIST = 'live-test-runner:history:v1';
export let runHistory = {};
try { runHistory = JSON.parse(localStorage.getItem(HIST) || '{}') || {}; } catch {}
// Same title + same steps = same test; editing a test starts a fresh history
export function testKey(t, site){
  const str = site + '\n' + t.title + '\n' + JSON.stringify(t.steps, (k, v) => k === 'src' ? undefined : v);
  let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return `${site}:${(h >>> 0).toString(36)}`;
}
export function recordHistory(key, ok){
  (runHistory[key] ||= []).push(ok ? 1 : 0);
  runHistory[key] = runHistory[key].slice(-20);
  try { localStorage.setItem(HIST, JSON.stringify(runHistory)); } catch {}
}
export function paintHistory(sec){
  const h = (runHistory[sec.dataset.key] || []).slice(-10);
  const box = sec.querySelector('.hist'); box.innerHTML = '';
  h.forEach(v => { const i = document.createElement('i'); i.className = v ? 'h-pass' : 'h-fail'; box.appendChild(i); });
  const passes = h.filter(Boolean).length;
  box.title = h.length ? `Passed ${passes} of the last ${h.length} runs` : '';
  sec.querySelector('.flaky').hidden = !(h.length >= 2 && passes > 0 && passes < h.length);
}
