import { ACTIONS } from './actions.js';

/* ---------- Parsing: vars, flows and one or more tests ---------- */
// What a step may carry besides its action. "value" belongs inside the target;
// "timeout" can also sit on its own line, for steps that have no target.
export const STEP_OPTS = new Set(['value', 'timeout']);
export const stripFences = t => t.replace(/^\s*```[\w-]*[ \t]*\n/, '').replace(/\n```\s*$/, '\n');   // LLMs love code fences
export const isMap = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export function normalizeStep(raw, n){
  if (!isMap(raw)) throw `${n}: each step must be "- action: ...".`;
  const keys = Object.keys(raw).filter(k => k !== 'value' && k !== 'timeout');
  if (keys.length !== 1) throw `${n}: use exactly one action per step (found: ${keys.join(', ') || 'none'}).`;
  const action = keys[0];
  if (!ACTIONS[action]) throw `${n}: unknown action "${action}". Allowed: ${Object.keys(ACTIONS).join(', ')}, use.`;
  let arg = raw[action];
  // The value goes with the target it fills: "- fill: { label: Email, value: ana@example.test }"
  const opt = { timeout: raw.timeout };
  const takesTarget = !['wait', 'expectText', 'expectNoText'].includes(action);
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
// Expand "- use: flow" into the flow's steps (flows can use other flows)
export function expandSteps(list, label, ctx, stack, problems, from){
  const out = [];
  list.forEach((raw, i) => {
    const n = `${label}, step ${i + 1}`;
    if (isMap(raw) && 'use' in raw){
      const name = String(raw.use), names = Object.keys(ctx.flows);
      if (!ctx.flows[name]){ problems.push(`${n}: no flow named "${name}".${names.length ? ` Defined flows: ${names.join(', ')}.` : ' Define it under "flows:".'}`); return; }
      if (stack.includes(name)){ problems.push(`${n}: flow "${name}" ends up using itself.`); return; }
      out.push(...expandSteps(ctx.flows[name], `Flow "${name}"`, ctx, [...stack, name], problems, from || name));
      return;
    }
    try { const s = normalizeStep(substitute(raw, ctx.vars, n), n); if (from) s.from = from; s.src = { label, i }; out.push(s); }
    catch (e) { problems.push(String(e)); }
  });
  return out;
}
export function parseTest(raw, label, file){
  if (!isMap(raw)) throw [`${label}: write "test: <title>" with a "steps:" list below it.`];
  if (raw.name !== undefined && raw.test === undefined) throw [`${label}: use "test:" for the title instead of "name:".`];
  if (raw.vars !== undefined && !isMap(raw.vars)) throw [`${label}: "vars:" must be name: value pairs.`];
  if (!Array.isArray(raw.steps) || !raw.steps.length) throw [`${label}: needs a "steps:" list with at least one step.`];
  const ctx = { vars: { ...file.vars, ...(raw.vars || {}) }, flows: file.flows };
  const problems = [];
  const steps = [...expandSteps(file.beforeEach, 'beforeEach', ctx, [], problems, 'beforeEach'), ...expandSteps(raw.steps, label, ctx, [], problems)];
  if (problems.length) throw problems;
  return { title: raw.test != null ? String(raw.test) : label, steps };
}
export const SETTINGS = ['vars', 'flows', 'beforeEach', 'failOnPageErrors'];
// "site:" used to name the site a file belonged to. The selected site says that
// now, so older files still parse and the line is simply ignored.
const LEGACY = ['site', 'tests'];
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
  let rawTests = [];
  if (Array.isArray(y.tests)) rawTests = y.tests;          // older files with a "tests:" list still work
  else {
    if (y.steps !== undefined) return { error: 'Every "steps:" list needs a "test: <title>" line right above it.' };
    const unknown = Object.keys(y).filter(k => !SETTINGS.includes(k) && !LEGACY.includes(k));
    if (unknown.length) return { error: `Unknown setting "${unknown[0]}" before the first test. Settings are: ${SETTINGS.join(', ')}. Each test starts with "test:".` };
  }
  if (y.vars !== undefined && !isMap(y.vars)) return { error: '"vars:" must be name: value pairs, e.g. "email: ana@example.test".' };
  if (y.flows !== undefined && (!isMap(y.flows) || Object.values(y.flows).some(f => !Array.isArray(f)))) return { error: '"flows:" must map each flow name to a list of steps.' };
  if (y.beforeEach !== undefined && !Array.isArray(y.beforeEach)) return { error: '"beforeEach:" must be a list of steps that run at the start of every test.' };
  const file = { vars: y.vars || {}, flows: y.flows || {}, beforeEach: y.beforeEach || [] };
  const problems = [];
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
