import { ACTIONS, highlight } from './actions.js';
import { doc, errorEl, specEl } from './dom.js';
import { labelText, rawName, roleOf } from './find.js';
import { validate } from './parse.js';
import { setView } from './picker.js';
import { preview, syncUI, withUnique } from './run.js';
import { loadApp, persist } from './sites.js';
import { TIMEOUT, editorSite, recording, setRecording, setRunning, setStepTimeout } from './state.js';
import { toast } from './ui.js';
import { clean } from './util.js';

/* ---------- Recorder: use the site, get YAML steps ---------- */
export let recOriginal = '', recCount = 0;
// YAML-safe scalar: plain when harmless, double-quoted otherwise
export function yq(s){
  s = String(s);
  if (/^[A-Za-z][A-Za-z0-9 ._@'!?-]*$/.test(s) && !/^(true|false|yes|no|on|off|null)$/i.test(s) && !/[ ]$/.test(s)) return s;
  return JSON.stringify(s);
}
// The value a step types or picks goes inside its target
export const withValue = (target, value) => target.replace(/\s*\}$/, `, value: ${yq(value)} }`);
// The same target vocabulary the runner understands, as its parts, so the
// catalog can offer one slot at a time as well as the whole target
export function targetParts(el){
  if (/^(input|textarea|select)$/i.test(el.tagName)){
    const label = clean(el.getAttribute('aria-label') || labelText(el));
    if (label) return { label };
    const ph = el.getAttribute('placeholder'); if (ph) return { placeholder: ph };
  }
  const role = roleOf(el), name = rawName(el);
  if (role) return name ? { role, name } : { role };
  return name ? { text: name } : null;
}
// A role is one of a fixed set of words, so it stays plain; the rest is text a person wrote
export const renderTarget = parts => `{ ${Object.entries(parts).map(([k, v]) => `${k}: ${k === 'role' ? v : yq(v)}`).join(', ')} }`;
export function targetFor(el){
  const parts = targetParts(el);
  return parts ? renderTarget(parts) : null;
}
export function addStep(yamlStep){
  const ind = '  ';
  if (specEl.value && !specEl.value.endsWith('\n')) specEl.value += '\n';   // a step always starts its own line
  specEl.value += yamlStep.split('\n').map(l => ind + l).join('\n') + '\n';
  specEl.scrollTop = specEl.scrollHeight;
  recCount++; persist(); preview();
}
// A whole test at the end of the file. The Coverage panel writes one of these
// for a control nothing reaches: such a control needs a test of its own, not a
// step bolted onto whatever test happens to be last.
export function addTest(title, steps){
  const text = specEl.value.replace(/\s*$/, '');
  const block = `test: ${yq(title)}\nsteps:\n` + steps.map(s => '  ' + s).join('\n') + '\n';
  specEl.value = (text ? text + '\n\n' : '') + block;
  specEl.scrollTop = specEl.scrollHeight;
  persist(); preview();
}
export function attachRecorder(){
  const d = doc(); if (!d || d.__recorder) return;
  d.__recorder = true;
  d.addEventListener('click', e => {
    if (!recording) return;
    const t = e.target;
    if (e.shiftKey){                       // Shift+click adds a check instead of clicking
      e.preventDefault(); e.stopPropagation();
      const control = t.closest('button,a[href],[role=button],[role=link],h1,h2,h3,h4,h5,h6');
      if (control){ addStep(`- expectVisible: ${targetFor(control)}`); highlight(control, 'check added', '#1F8A55', 700); return; }
      const text = clean(t.innerText || t.textContent).slice(0, 80);
      if (text){ addStep(`- expectText: ${yq(text)}`); highlight(t, 'check added', '#1F8A55', 700); }
      return;
    }
    const el = t.closest('button,a[href],[role=button],[role=link],input[type=checkbox],input[type=radio],input[type=submit],input[type=button]');
    if (!el || el.disabled) return;
    const ty = (el.type || '').toLowerCase();
    const target = targetFor(el); if (!target) return;
    if (ty === 'checkbox') addStep(`- ${el.checked ? 'check' : 'uncheck'}: ${target}`);
    else if (ty === 'radio') addStep(`- check: ${target}`);
    else addStep(`- click: ${target}`);
  }, true);
  d.addEventListener('change', e => {
    if (!recording) return;
    const el = e.target, ty = (el.type || '').toLowerCase();
    const target = targetFor(el); if (!target) return;
    if (el.tagName === 'SELECT') addStep(`- select: ${withValue(target, clean(el.selectedOptions[0]?.textContent ?? el.value))}`);
    else if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox','radio','submit','button'].includes(ty))) addStep(`- fill: ${withValue(target, el.value)}`);
  }, true);
}
export function startRecording(){
  errorEl.textContent = '';
  recOriginal = specEl.value;
  let text = specEl.value;
  if (text.trim()){
    const v = validate(text);
    if (v.error){ errorEl.textContent = 'Fix these problems before recording:\n' + v.error; return; }
    if (/^tests:/m.test(text)){ errorEl.textContent = 'This file uses an old "tests:" list. Write each test as "test: <title>" to record new tests into it.'; return; }
  }
  text = text.trim() ? text.replace(/\s*$/, '\n\n') : '';   // an empty file starts straight at the test
  const n = (text.match(/Recorded test \d+/g) || []).length + 1;
  specEl.value = text + `test: Recorded test ${n}\nsteps:\n`;
  specEl.scrollTop = specEl.scrollHeight;
  recCount = 0;
  setView(editorSite);
  prepareRecording(validate(recOriginal).spec);
}
// Record from where tests start: a fresh page with the file's beforeEach steps already done
export async function prepareRecording(spec){
  const pre = spec && spec.tests.length ? spec.tests[0].steps.filter(s => s.from === 'beforeEach') : [];
  setRunning(true); syncUI();
  await loadApp();
  const unique = Date.now().toString(36);
  try {
    for (const st of pre){ setStepTimeout(st.timeout || TIMEOUT); await ACTIONS[st.action](withUnique(st, unique)); }
    if (pre.length) toast('beforeEach steps done, now recording');
  } catch (e) {
    errorEl.textContent = 'The beforeEach steps failed, so recording starts from the plain page:\n' + e.message;
  }
  setRunning(false); setRecording(true); syncUI();
}
export function stopRecording(){
  setRecording(false);
  if (!recCount) specEl.value = recOriginal;   // nothing recorded: leave the file as it was
  persist(); syncUI(); preview();
}
