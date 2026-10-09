import { ACTIONS } from './actions.js';
import { harvest } from './catalog.js';
import { $id, KEY, errorEl, recBar, recordBtn, reloadBtn, resetBtn, resultsEl, runBtn, specEl, speed, speedMode, stopBtn, summaryEl, tabsEl } from '../dom.js';
import { lineForStep, setCurrentLine, setFileStatus } from './editor.js';
import { describeStep, followInResults } from './find.js';
import { renderHtmlView } from './htmlview.js';
import { paintHistory, recordHistory } from './history.js';
import { validate } from './parse.js';
import { closePicker, setView, siteBtn } from '../picker.js';
import { renderCreate } from './create.js';
import { renderSmells } from './smells.js';
import { markStep, renderResults } from './results.js';
import { loadApp, pageErrors, persist } from './sites.js';
import { TIMEOUT, editorSite, hunting, mode, previewTimer, recording, running, setLastEl, setRunning, setStepTimeout, setStopRequested, stopRequested } from '../state.js';
import { setProgress, setSiteStatus } from '../ui.js';
import { runSummary, sleep } from '../util.js';

/* ---------- Running ---------- */
export function withUnique(step, unique){
  const r = v => typeof v === 'string' ? v.split('${unique}').join(unique) : v;
  const out = { ...step };
  for (const k of ['value', 'text', 'url']) if (out[k] !== undefined) out[k] = r(out[k]);
  if (out.target) out.target = Object.fromEntries(Object.entries(out.target).map(([k, v]) => [k, r(v)]));
  return out;
}
// Circles, laid out hollow before they are reached. A test's row has one per
// step; the panel head has one per test of the repetition, so a collapsed
// panel still shows how long the run is and how far it has got.
const dots = (box, n) => { box.innerHTML = '<i class="todo"></i>'.repeat(n); };

export let nextResolve = null;
// Step by step: the Run button turns into Next step and waits for a click (or Ctrl/⌘+Enter)
function waitNext(){ return new Promise(res => { nextResolve = res; syncUI(); runBtn.focus({ preventScroll: true }); }); }
export function releaseNext(){ const r = nextResolve; nextResolve = null; syncUI(); if (r) r(); }

async function runTest(t, sec, opts){
  sec.dataset.state = 'running';
  followInResults(sec);
  setView(editorSite);
  await loadApp();                            // every test starts from a fresh page
  const items = [...sec.querySelectorAll('li')];
  const sdots = sec.querySelector('.sdots'); dots(sdots, t.steps.length);   // one small circle per step
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
    setCurrentLine(lineForStep(specEl.value, t.steps[i].src));   // the editor always follows the step
    const dot = sdots.children[i] || sdots.appendChild(document.createElement('i'));
    dot.className = 'run';
    sdots.title = `Step ${i + 1} of ${t.steps.length}`;
    followInResults(li);
    setLastEl(null);
    const step = withUnique(t.steps[i], unique);
    setStepTimeout(t.steps[i].timeout || TIMEOUT);
    try {
      if (speedMode() === 'step'){ await waitNext(); if (stopRequested) throw new Error('Stopped by user'); }
      const s0 = performance.now();
      await ACTIONS[step.action](step);
      collectErrors(i + 1);
      harvest();                                // the step may have revealed a new screen
      markStep(li, 'passed'); dot.className = 'ok';
      renderHtmlView('passed', step.action);  // the HTML view follows the element the step touched
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
  // A bug hunt breaks the page on purpose, so its failures are neither this
  // test's history nor a verdict on the site.
  if (!stopRequested && !hunting){ recordHistory(sec.dataset.key, rec.ok); paintHistory(sec); }
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
    // One circle per test this repetition runs, in order
    const head = $id('runDots');
    dots(head, only !== undefined ? 1 : spec.tests.length);
    let k = 0;
    renderResults(spec.tests);
    resultsEl.scrollTop = 0;
    syncUI();
    const sections = [...resultsEl.children];
    records = [];
    for (let i = 0; i < spec.tests.length; i++){
      if (only !== undefined && i !== only){ sections[i].dataset.state = 'idle'; continue; }
      if (stopRequested){ sections[i].dataset.state = 'notrun'; continue; }
      summaryEl.className = '';
      summaryEl.textContent = `Running ${done + 1} of ${total}` + (reps > 1 ? ` · repetition ${rep} of ${reps}` : '');
      const hdot = head.children[k++];
      hdot.className = 'run'; hdot.title = spec.tests[i].title;
      const r = await runTest(spec.tests[i], sections[i], spec);
      // A test stopped part way never finished: hollow, like the ones not reached
      hdot.className = stopRequested ? 'todo' : r.ok ? 'ok' : 'bad';
      setProgress(++done / total);
      if (!stopRequested){ tally[i].runs++; if (r.ok) tally[i].pass++; }
      records.push({ ...r, tally: tally[i] });
    }
  }
  const secs = ((performance.now() - started) / 1000).toFixed(1);
  const ran = records.length, passed = records.filter(r => r.ok).length;
  if (reps > 1 && !stopRequested){
    const totalRuns = tally.reduce((a, t) => a + t.runs, 0), totalPass = tally.reduce((a, t) => a + t.pass, 0);
    // The summary counts the runs and names no test, like every other thing it
    // says: which test went both ways is the row's own badge to carry.
    summaryEl.textContent = `${totalPass} of ${totalRuns} runs passed over ${reps} repetitions (${secs}s)`;
    summaryEl.className = totalPass === totalRuns ? 'ok' : 'bad';
  }
  else {
    const said = runSummary({ ran, passed, secs, stopped: stopRequested });
    summaryEl.textContent = said.text; summaryEl.className = said.ok ? 'ok' : 'bad';
  }
  const allOk = summaryEl.className === 'ok';
  setProgress(stopRequested ? null : 1, allOk ? 'ok' : 'bad');
  if (!stopRequested && only === undefined && !hunting) setSiteStatus(editorSite, allOk);
  if (!stopRequested && passed < ran){ const f = resultsEl.querySelector('li.failed'); if (f) followInResults(f); }
  setRunning(false); setCurrentLine(-1); syncUI();
  return { ran, passed, records, stopped: stopRequested };
}

export function syncUI(){
  const busy = running || recording || hunting;
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
  resetBtn.disabled = reloadBtn.disabled = busy;
  [siteBtn, $id('prevSite'), $id('nextSite'), ...tabsEl.querySelectorAll('button')].forEach(b => b.disabled = busy);
  if (busy) closePicker();
  resultsEl.querySelectorAll('.run-one').forEach(b => b.disabled = busy);
  // Panels that are only there in some modes keep their own controls in step
  // with the runner: they listen rather than being reached into from here.
  document.dispatchEvent(new CustomEvent('playlive:busy'));
}

// Which file Results was last drawn from. A file that stops parsing keeps the
// last list while you type, but only its own: after a swap (another example,
// Create's file, a Reset) the old list is someone else's tests, and in Create
// it would be the very answers you are meant to write.
let shownFor = '';
const fileKey = () => `${editorSite}:${mode === 'create' ? 'create' : 'tests'}`;
export function preview(){
  if (running) return;
  const v = validate(specEl.value);
  if (v.spec){ renderResults(v.spec.tests); shownFor = fileKey(); errorEl.textContent = ''; setFileStatus(v); }
  else if (!recording){
    if (shownFor !== fileKey()){ renderResults([]); shownFor = fileKey(); }
    errorEl.textContent = v.error; setFileStatus(v);
  }
  renderSmells();                   // the smells are read from the file itself
  renderCreate();                   // as is how much of this example you have written
  summaryEl.textContent = ''; summaryEl.className = ''; setProgress(null);
  $id('runDots').innerHTML = '';
}
