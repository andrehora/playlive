import { ACTIONS } from './actions.js';

/* ---------- Parsing: vars, beforeEach and one or more tests ---------- */
// What a step may carry besides its action. "value" belongs inside the target;
// "timeout" can also sit on its own line, for steps that have no target.
export const STEP_OPTS = new Set(['value', 'timeout']);
// The actions that say what should be true. A test without one of these checks
// nothing, which is what Create counts and what the Unknown Test smell names.
export const ASSERTIONS = new Set(['expectText', 'expectNoText', 'expectTextInRange', 'expectVisible']);
export const stripFences = t => t.replace(/^\s*```[\w-]*[ \t]*\n/, '').replace(/\n```\s*$/, '\n');   // LLMs love code fences
export const isMap = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export function normalizeStep(raw, n){
  if (!isMap(raw)) throw `${n}: each step must be "- action: ...".`;
  const keys = Object.keys(raw).filter(k => k !== 'value' && k !== 'timeout');
  if (keys.length !== 1) throw `${n}: use exactly one action per step (found: ${keys.join(', ') || 'none'}).`;
  const action = keys[0];
  if (!ACTIONS[action]) throw `${n}: unknown action "${action}". Allowed: ${Object.keys(ACTIONS).join(', ')}.`;
  let arg = raw[action];
  // The value goes with the target it fills: "- fill: { label: Email, value: ana@example.test }"
  const opt = { timeout: raw.timeout };
  const takesTarget = !['wait', 'expectText', 'expectNoText', 'expectTextInRange'].includes(action);
  if (raw.value !== undefined) throw `${n}: put the value inside the target, e.g. - ${takesTarget ? action : 'fill'}: { label: Email, value: ana@example.test }.`;
  if (takesTarget && isMap(arg)){
    const target = {};
    for (const [k, v] of Object.entries(arg)){
      if (!STEP_OPTS.has(k)){ target[k] = v; continue; }
      if (opt[k] !== undefined) throw `${n}: "${k}" is set twice.`;
      opt[k] = v;
    }
    arg = target;
  }
  const s = { action };
  if (opt.value !== undefined) s.value = String(opt.value);
  if (opt.timeout !== undefined){
    const ms = Number(opt.timeout);
    if (!(ms > 0)) throw `${n}: "timeout" must be a number of milliseconds, e.g. 8000.`;
    s.timeout = ms;
  }
  if (action === 'wait') s.ms = Number(arg) || 500;
  else if (action === 'expectText' || action === 'expectNoText'){
    if (arg == null || arg === '' || isMap(arg)) throw `${n}: "${action}" needs the text to look for, e.g. - ${action}: Welcome back.`;
    s.text = String(arg);
  }
  // The one check that takes a range rather than a target: the text to find the
  // number by, and the two ends it must stay between. "timeout" may sit in the
  // braces with them, since that is where a reader of the other steps looks.
  else if (action === 'expectTextInRange'){
    const eg = `e.g. - ${action}: { text: events, min: 3, max: 12 }`;
    if (!isMap(arg)) throw `${n}: "${action}" needs text and a range, ${eg}.`;
    const extra = Object.keys(arg).filter(k => !['text', 'min', 'max', 'timeout'].includes(k));
    if (extra.length) throw `${n}: "${action}" takes text, min, max and timeout, not "${extra[0]}". ${eg[0].toUpperCase() + eg.slice(1)}.`;
    if (arg.timeout !== undefined){
      if (s.timeout !== undefined) throw `${n}: "timeout" is set twice.`;
      const ms = Number(arg.timeout);
      if (!(ms > 0)) throw `${n}: "timeout" must be a number of milliseconds, e.g. 8000.`;
      s.timeout = ms;
    }
    s.text = String(arg.text ?? '');
    if (!s.text) throw `${n}: "${action}" needs the text to find the number by, ${eg}.`;
    s.min = Number(arg.min); s.max = Number(arg.max);
    if (!Number.isFinite(s.min) || !Number.isFinite(s.max)) throw `${n}: "min" and "max" must be numbers, ${eg}.`;
    if (s.min > s.max) throw `${n}: "min" is more than "max", so nothing could ever be between them.`;
  }
  else {
    if (typeof arg === 'string' || typeof arg === 'number') s.target = { text: String(arg) };   // "- click: Send" shorthand
    else if (isMap(arg)){
      if (!Object.keys(arg).length) throw `${n}: "${action}" needs something to find the element by, e.g. { role: button, name: Send }.`;
      s.target = Object.fromEntries(Object.entries(arg).map(([k, v]) => [k, String(v)]));
    }
    else throw `${n}: "${action}" needs a target, e.g. { role: button, name: Send }.`;
    if (['fill','select'].includes(action) && s.value === undefined) throw `${n}: "${action}" needs a value, e.g. - ${action}: { label: Email, value: ana@example.test }.`;
  }
  return s;
}
// Replace ${name} with values from vars
export function substitute(v, vars, n){
  if (typeof v === 'string') return v.replace(/\$\{(\w+)\}/g, (m, k) => {
    if (k === 'unique' && !(k in vars)) return m;   // filled in when the test runs
    if (!(k in vars)) throw `${n}: unknown variable "\${${k}}". Define it under "vars:".`;
    return String(vars[k]);
  });
  if (Array.isArray(v)) return v.map(x => substitute(x, vars, n));
  if (isMap(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, substitute(x, vars, n)]));
  return v;
}
// Normalize a list of steps, remembering where each one was written: the line
// Results and the editor point at, and "beforeEach" when it came from there.
export function expandSteps(list, label, vars, problems, from){
  const out = [];
  list.forEach((raw, i) => {
    const n = `${label}, step ${i + 1}`;
    try { const s = normalizeStep(substitute(raw, vars, n), n); if (from) s.from = from; s.src = { label, i }; out.push(s); }
    catch (e) { problems.push(String(e)); }
  });
  return out;
}
export function parseTest(raw, label, file){
  if (!isMap(raw)) throw [`${label}: write "test: <title>" with a "steps:" list below it.`];
  if (raw.vars !== undefined && !isMap(raw.vars)) throw [`${label}: "vars:" must be name: value pairs.`];
  if (!Array.isArray(raw.steps) || !raw.steps.length) throw [`${label}: needs a "steps:" list with at least one step.`];
  const vars = { ...file.vars, ...(raw.vars || {}) };
  const problems = [];
  const steps = [...expandSteps(file.beforeEach, 'beforeEach', vars, problems, 'beforeEach'), ...expandSteps(raw.steps, label, vars, problems)];
  if (problems.length) throw problems;
  return { title: raw.test != null ? String(raw.test) : label, steps };
}
export const SETTINGS = ['vars', 'beforeEach', 'failOnPageErrors'];
// A file is: optional settings, then one block per test. Every block starts with
// "test:" at the beginning of a line, so tests are written directly, with no list around them.
export function validate(text){
  const lines = stripFences(text).split('\n');
  const starts = [];
  lines.forEach((l, i) => { if (/^test\s*:/.test(l)) starts.push(i); });
  const load = (from, to) => {
    try { return { y: jsyaml.load(lines.slice(from, to).join('\n')) ?? {} }; }
    catch (e) { return { error: `This isn’t valid YAML (line ${e.mark ? from + e.mark.line + 1 : '?'}): ${e.reason || e.message}` }; }
  };
  const head = load(0, starts.length ? starts[0] : lines.length);
  if (head.error) return head;
  const y = head.y;
  if (!isMap(y)) return { error: 'Start with settings like "vars:", then write each test as "test: <title>" followed by "steps:".' };
  if (y.steps !== undefined) return { error: 'Every "steps:" list needs a "test: <title>" line right above it.' };
  const unknown = Object.keys(y).filter(k => !SETTINGS.includes(k));
  if (unknown.length) return { error: `Unknown setting "${unknown[0]}" before the first test. Settings are: ${SETTINGS.join(', ')}. Each test starts with "test:".` };
  if (y.vars !== undefined && !isMap(y.vars)) return { error: '"vars:" must be name: value pairs, e.g. "email: ana@example.test".' };
  if (y.beforeEach !== undefined && !Array.isArray(y.beforeEach)) return { error: '"beforeEach:" must be a list of steps that run at the start of every test.' };
  const file = { vars: y.vars || {}, beforeEach: y.beforeEach || [] };
  const rawTests = [], problems = [];
  starts.forEach((from, k) => {
    const r = load(from, starts[k + 1] ?? lines.length);
    if (r.error) problems.push(r.error); else rawTests.push(r.y);
  });
  if (problems.length) return { error: problems.join('\n') };
  if (!rawTests.length) return { error: 'No tests yet. Add one: a line "test: <title>", then "steps:" with the steps below it.' };
  const tests = [];
  rawTests.forEach((raw, i) => { try { tests.push(parseTest(raw, `Test ${i + 1}`, file)); } catch (e) { problems.push(...e); } });
  return problems.length ? { error: [...new Set(problems)].join('\n') } : { spec: { tests, failOnPageErrors: y.failOnPageErrors === true } };
}
