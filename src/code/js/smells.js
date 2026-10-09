/* ---------- JS/TS test smells: what is wrong with the tests themselves ----------
   The four code/python/worker.js's smells_of finds in Python, found here in Jasmine and
   Mocha files on tokens (code/js/cover.js), since there is no parser: the
   describe(…), it(…) and beforeEach(…) calls, their callbacks' bodies cut into
   statements, and the statements compared token by token. As quiet as the
   others when unsure.

   Unknown Test: an it with no check of its own (an expect, an assert, a fail,
   or a call to a function of the file's that checks). Assertion Roulette: more
   than ROULETTE. Duplication of Setup: every it of a describe (two or more)
   opens with the same statements, up to the first check. General Fixture: a
   beforeEach sets a name (`x = …`) and some test under it does without it, by
   setting it again first or by never reading it (nor anything the beforeEach
   built from it); a test that calls a function of the file's might use
   anything, so it is not counted, and nor is a name the rest of beforeEach or
   an afterEach reads. Each finding is { smell, what, detail, line }, from 0.
   Pure, so the unit tests can read it; code/js/javascript.js is its one user.        */
import { close, statements, tokenize } from './tokens.js';

export const ROULETTE = 5;
const HOOKS = new Set(['beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'before', 'after']);
const TESTS = new Set(['it', 'test', 'fit', 'xit']);

const textOf = st => st.map(t => t.value).join(' ');
// A call to `name(` that is not a method (no "." before it)
const calls = (toks, names) => toks.filter((t, i) => t.type === 'name' && names.has(t.value) && toks[i + 1]?.value === '(' && toks[i - 1]?.value !== '.');
// The body of the function passed in a call's arguments, (…, () => { … }) or
// function () { … }, as tokens; null when there is none
function callback(args){
  for (let i = 0; i < args.length; i++){
    if (args[i].value === '{' && (args[i - 1]?.value === '=>' || args[i - 1]?.value === ')')){
      const j = close(args, i);
      return j < 0 ? null : args.slice(i + 1, j);
    }
  }
  return null;
}
// A test's checks: an expect(…), an assert, a fail(…), or a call of a helper that checks
const CHECKS = new Set(['expect', 'expectAsync', 'assert', 'fail']);
const checksIn = (toks, helpers) => toks.filter((t, i) => t.type === 'name' && toks[i - 1]?.value !== '.'
  && (CHECKS.has(t.value) || (helpers.has(t.value) && toks[i + 1]?.value === '('))).length;
const reads = (toks, name) => toks.some((t, i) => t.type === 'name' && t.value === name && toks[i - 1]?.value !== '.');
// `name = …;` as a statement, with what it sets, or null
const setsName = st => (st[0]?.type === 'name' && st[1]?.value === '=' && st[2] ? st[0].value : null);

export function smellsOf(src){
  let toks;
  try { toks = tokenize(src); } catch { return null; }
  if (statements(toks) == null) return null;
  const lines = src.split('\n');
  const first = st => lines[st[0].line].trim();

  // The functions the file declares, and which of them check
  const fns = new Map();
  toks.forEach((t, i) => {
    let name = null, at = -1;
    if (t.value === 'function' && toks[i + 1]?.type === 'name'){ name = toks[i + 1].value; at = i + 2; }
    else if (['const', 'let', 'var'].includes(t.value) && toks[i + 1]?.type === 'name' && toks[i + 2]?.value === '='
      && (toks[i + 3]?.value === '(' || toks[i + 3]?.value === 'function' || toks[i + 4]?.value === '=>')){ name = toks[i + 1].value; at = i + 3; }
    if (!name) return;
    const open = toks.findIndex((x, k) => k >= at && x.value === '{');
    const end = open < 0 ? -1 : close(toks, open);
    if (end > 0) fns.set(name, toks.slice(open + 1, end));
  });
  const helpers = new Set();
  for (let round = 0; round < 3; round++)
    for (const [name, body] of fns) if (!helpers.has(name) && checksIn(body, helpers)) helpers.add(name);

  // The describes, each with its tests and hooks, and the tests outside any
  const groups = [], tests = [];
  function read(body, title, inherited){
    const group = { title, tests: [], before: [], after: [] };
    into(group, body, inherited);
    groups.push(group);
  }
  // A test written in a loop, or in a forEach, is still the describe's
  function into(group, body, inherited){
    for (const st of statements(body) || []){
      const head = st[0];
      if (head?.type !== 'name' || st[1]?.value !== '(' || !['describe', 'fdescribe', 'xdescribe', 'beforeEach', ...TESTS, ...HOOKS].includes(head.value)){
        st.forEach((t, i) => { if (t.value === '{' && t.type === 'punct') into(group, st.slice(i + 1, close(st, i)), inherited); });
        continue;
      }
      const end = close(st, 1), args = st.slice(2, end), fn = callback(args);
      if (!fn) continue;
      if (head.value === 'describe' || head.value === 'fdescribe' || head.value === 'xdescribe'){
        read(fn, args[0]?.type === 'str' ? args[0].value.slice(1, -1) : '', [...inherited, group]);
      } else if (TESTS.has(head.value)){
        const t = { title: args[0]?.type === 'str' || args[0]?.type === 'tmpl' ? args[0].value.slice(1, -1) : '', line: head.line, body: fn, stmts: statements(fn) || [], under: [...inherited, group] };
        group.tests.push(t); tests.push(t);
      } else if (head.value === 'beforeEach') group.before.push(...(statements(fn) || []));
      else if (HOOKS.has(head.value)) group.after.push(fn);
    }
  }
  read(toks, '', []);

  const items = [];
  for (const t of tests){
    const n = checksIn(t.body, helpers);
    if (!n) items.push({ smell: 'unknown-test', what: t.title, detail: 'runs its code and checks nothing', line: t.line });
    if (n > ROULETTE) items.push({ smell: 'assertion-roulette', what: t.title, detail: `${n} checks in one test`, line: t.line });
  }
  for (const g of groups){
    if (g.tests.length >= 2){
      const bodies = g.tests.map(t => t.stmts);
      for (let k = 0; bodies.every(b => k < b.length) && bodies.every(b => textOf(b[k]) === textOf(bodies[0][k])); k++){
        if (checksIn(bodies[0][k], helpers)) break;       // a check is the test, not its setup
        items.push({ smell: 'duplication-of-setup', what: first(bodies[0][k]),
          detail: `at the start of all ${g.tests.length} tests${g.title ? ` in ${g.title}` : ''}`, line: bodies[0][k][0].line });
      }
    }
    // General Fixture: every test under this describe runs its beforeEach
    const under = tests.filter(t => t.under.includes(g));
    const sets = new Map(g.before.filter(setsName).map(st => [setsName(st), st]));
    const built = new Map([...sets].map(([k, st]) => [k, [...sets.keys()].filter(o => o !== k && reads(st.slice(2), o))]));
    const needs = names => { const out = new Set(), todo = [...names]; while (todo.length){ const n = todo.pop(); if (!out.has(n)){ out.add(n); todo.push(...(built.get(n) || [])); } } return out; };
    for (const [name, st] of sets){
      const others = [...g.before.filter(s => s !== st && setsName(s) !== name).flat(), ...g.after.flat()];
      if (reads(others, name)) continue;
      let k = 0, counted = 0;
      for (const t of under){
        if (calls(t.body, new Set([...fns.keys()].filter(f => !helpers.has(f)))).length) continue;
        counted++;
        // Set again first, what the test reads afterwards is its own value
        const head = t.stmts[0];
        const replaced = head && setsName(head) === name && !reads(head.slice(2), name) && textOf(head) !== textOf(st);
        const used = new Set([...sets.keys()].filter(n => reads(t.stmts.flat(), n)));
        if (replaced) used.delete(name);
        if (!needs(used).has(name)) k++;
      }
      if (k) items.push({ smell: 'general-fixture', what: first(st), line: st[0].line,
        detail: k === counted ? 'used by no test' : `not used by ${k} of ${counted} tests` });
    }
  }
  return { tests: tests.length, items };
}
