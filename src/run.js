import { ACTIONS } from './actions.js';
import { harvest } from './catalog.js';
import { $id, KEY, errorEl, recBar, recordBtn, resetBtn, resultsEl, runBtn, specEl, speed, speedMode, stopBtn, summaryEl, tabsEl } from './dom.js';
import { lineForStep, setCurrentLine, setFileStatus } from './editor.js';
import { describeStep, followInResults } from './find.js';
import { renderHtmlView } from './htmlview.js';
import { paintHistory, recordHistory } from './history.js';
import { trackLineEl } from './layout.js';
import { validate } from './parse.js';
import { closePicker, setView, siteBtn } from './picker.js';
import { markStep, renderResults } from './results.js';
import { loadApp, pageErrors, persist } from './sites.js';
import { TIMEOUT, editorSite, previewTimer, recording, running, setLastEl, setRunning, setStepTimeout, setStopRequested, stopRequested } from './state.js';
import { setProgress, setSiteStatus } from './ui.js';
import { sleep } from './util.js';

/* ---------- Running ---------- */
export function withUnique(step, unique){
  const r = v => typeof v === 'string' ? v.split('${unique}').join(unique) : v;
  const out = { ...step };
  for (const k of ['value', 'text', 'url']) if (out[k] !== undefined) out[k] = r(out[k]);
  if (out.target) out.target = Object.fromEntries(Object.entries(out.target).map(([k, v]) => [k, r(v)]));
  return out;
}
export let nextResolve = null;
// Step by step: the Run button turns into Next step and waits for a click (or Ctrl/⌘+Enter)
export function waitNext(){ return new Promise(res => { nextResolve = res; syncUI(); runBtn.focus({ preventScroll: true }); }); }
export function releaseNext(){ const r = nextResolve; nextResolve = null; syncUI(); if (r) r(); }

export async function runTest(t, sec, opts){
  sec.dataset.state = 'running';
  followInResults(sec);
  setView(editorSite);
  await loadApp();                            // every test starts from a fresh page
  const items = [...sec.querySelectorAll('li')];
  const sdots = sec.querySelector('.sdots'); sdots.innerHTML = '';   // one small circle per step, added as each step starts
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);   // the value of ${unique} for this run
  const warnBox = sec.querySelector('.warnings');
  const rec = { title: t.title, ok: true, warnings: [] };
  const t0 = performance.now();
  let errArr = null, seen = 0;
  // Page errors (uncaught exceptions, console.error) are reported, or fail the test if asked to
  const collectErrors = stepNo => {
    const arr = pageErrors();
    if (arr !== errArr){ errArr = arr; seen = 0; }
    const fresh = arr.slice(seen); seen = arr.length;
    fresh.forEach(msg => {
      rec.warnings.push({ step: stepNo, msg });
      const w = document.createElement('div'); w.className = 'warn';
      w.textContent = `Page error after step ${stepNo}: ${msg}`;
      warnBox.appendChild(w);
    });
    if (fresh.length && opts.failOnPageErrors) throw new Error(`Page error: ${fresh[0]}`);
  };
  for (let i = 0; i < t.steps.length; i++){
    const li = items[i]; li.className = 'running';
    setCurrentLine(trackLineEl.checked ? lineForStep(specEl.value, t.steps[i].src) : -1);
    const dot = document.createElement('i'); dot.className = 'run'; sdots.appendChild(dot);
    sdots.title = `Step ${i + 1} of ${t.steps.length}`;
    followInResults(li);
    setLastEl(null);
    setStepTimeout(t.steps[i].timeout || TIMEOUT);
    try {
      if (speedMode() === 'step'){ await waitNext(); if (stopRequested) throw new Error('Stopped by user'); }
      const s0 = performance.now();
      await ACTIONS[t.steps[i].action](withUnique(t.steps[i], unique));
      collectErrors(i + 1);
      harvest();                                // the step may have revealed a new screen
      markStep(li, 'passed'); dot.className = 'ok';
      renderHtmlView('passed', t.steps[i].action);  // the HTML view follows the element the step touched
      li.querySelector('.ms').textContent = `${Math.round(performance.now() - s0)} ms`;
      await sleep(speed().step);
    } catch (e) {
      try { collectErrors(i + 1); } catch {}
      harvest();
      markStep(li, 'failed'); dot.className = 'bad';
      renderHtmlView('failed', t.steps[i].action);
      const err = document.createElement('span'); err.className = 'err'; err.textContent = e.message;
      li.querySelector('.desc').appendChild(err);
      items.slice(i + 1).forEach(x => x.className = 'skipped');
      Object.assign(rec, { ok: false, failedStep: i + 1, failedDesc: describeStep(t.steps[i]), error: e.message });
      break;
    }
  }
  rec.secs = ((performance.now() - t0) / 1000).toFixed(1);
  sec.dataset.state = rec.ok ? 'passed' : 'failed';
  sec.querySelector('.test-head .ms').textContent = `${rec.secs}s`;
  if (!stopRequested){ recordHistory(sec.dataset.key, rec.ok); paintHistory(sec); }
  return rec;
}

// run() runs every test; run(i) runs only test i
export async function run(only){
  if (running || recording) return;
  clearTimeout(previewTimer);
  errorEl.textContent = ''; summaryEl.textContent = ''; summaryEl.className = '';
  const { spec, error } = validate(specEl.value);
  if (error){ errorEl.textContent = error; return; }
  persist();
  setStopRequested(false); setRunning(true);
  const reps = Number($id('repeat').value) || 1;
  const tally = spec.tests.map(() => ({ pass: 0, runs: 0 }));
  const started = performance.now();
  let records = [];
  const total = (only !== undefined ? 1 : spec.tests.length) * reps;
  let done = 0;
  setProgress(0);
  for (let rep = 1; rep <= reps && !stopRequested; rep++){
    renderResults(spec.tests);
    resultsEl.scrollTop = 0;
    syncUI();
    const sections = [...resultsEl.children];
    records = [];
    for (let i = 0; i < spec.tests.length; i++){
      if (only !== undefined && i !== only){ sections[i].dataset.state = 'idle'; continue; }
      if (stopRequested){ sections[i].dataset.state = 'notrun'; continue; }
      summaryEl.className = '';
      summaryEl.textContent = `Running “${spec.tests[i].title}” · ${done + 1} of ${total}` + (reps > 1 ? ` · repetition ${rep} of ${reps}` : '');
      const r = await runTest(spec.tests[i], sections[i], spec);
      setProgress(++done / total);
      if (!stopRequested){ tally[i].runs++; if (r.ok) tally[i].pass++; }
      records.push({ ...r, tally: tally[i] });
    }
  }
  const secs = ((performance.now() - started) / 1000).toFixed(1);
  const ran = records.length, passed = records.filter(r => r.ok).length;
  const noun = n => n === 1 ? 'test' : 'tests';
  const flaky = spec.tests.filter((t, i) => tally[i].runs > 1 && tally[i].pass > 0 && tally[i].pass < tally[i].runs);
  if (stopRequested){ summaryEl.textContent = `Stopped. ${passed} of ${ran} ${noun(ran)} passed.`; summaryEl.className = 'bad'; }
  else if (reps > 1){
    const totalRuns = tally.reduce((a, t) => a + t.runs, 0), totalPass = tally.reduce((a, t) => a + t.pass, 0);
    summaryEl.textContent = `${totalPass} of ${totalRuns} runs passed over ${reps} repetitions (${secs}s)` + (flaky.length ? `. Flaky: ${flaky.map(t => `“${t.title}”`).join(', ')}` : '');
    summaryEl.className = totalPass === totalRuns ? 'ok' : 'bad';
  }
  else if (passed === ran){ summaryEl.textContent = `${ran === 1 ? 'The test' : `All ${ran} tests`} passed in ${secs}s`; summaryEl.className = 'ok'; }
  else { summaryEl.textContent = `${ran - passed} of ${ran} ${noun(ran)} failed (${secs}s)`; summaryEl.className = 'bad'; }
  const allOk = summaryEl.className === 'ok';
  setProgress(stopRequested ? null : 1, allOk ? 'ok' : 'bad');
  if (!stopRequested && only === undefined) setSiteStatus(editorSite, allOk);
  if (!stopRequested && passed < ran){ const f = resultsEl.querySelector('li.failed'); if (f) followInResults(f); }
  setRunning(false); setCurrentLine(-1); syncUI();
}

export function syncUI(){
  const busy = running || recording;
  const stepping = running && speedMode() === 'step';
  runBtn.disabled = busy && !nextResolve;
  runBtn.querySelector('.lbl').textContent = stepping ? 'Next step' : 'Run';
  runBtn.querySelector('.ic-play').toggleAttribute('hidden', stepping);
  runBtn.querySelector('.ic-next').toggleAttribute('hidden', !stepping);
  runBtn.title = stepping ? `Run the next step (${KEY}+Enter)` : `Run all tests (${KEY}+Enter)`;
  stopBtn.disabled = !running;
  recordBtn.disabled = running;
  recordBtn.querySelector('.lbl').textContent = recording ? 'Stop recording' : 'Record';
  recordBtn.classList.toggle('recording', recording);
  recBar.hidden = !recording;
  specEl.readOnly = recording;
  resetBtn.disabled = busy;
  [siteBtn, $id('prevSite'), $id('nextSite'), ...tabsEl.querySelectorAll('button')].forEach(b => b.disabled = busy);
  if (busy) closePicker();
  resultsEl.querySelectorAll('.run-one').forEach(b => b.disabled = busy);
}

export function preview(){
  if (running) return;
  const v = validate(specEl.value);
  if (v.spec){ renderResults(v.spec.tests); errorEl.textContent = ''; setFileStatus(v); }
  else if (!recording){ errorEl.textContent = v.error; setFileStatus(v); }
  summaryEl.textContent = ''; summaryEl.className = ''; setProgress(null);
}
