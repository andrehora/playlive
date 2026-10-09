/* ---------- JS/TS mode's runner: Jasmine, or Mocha with Chai and Sinon, off the page ----------

   A module worker, started afresh for every run (the profile's `fresh`), so no
   global a test file defines can leak into the next run, and Stop can end a
   test that never does. The frameworks are fetched from cdnjs and evaluated
   here, each defining its globals the way it does on a page.

   The test files use CommonJS, the way Jasmine's and Mocha's own guides do:
   `require("./calculator")` and `module.exports`. A small require below
   resolves the files sent and a few built-ins, among them an in-memory `fs`
   for the example that writes a file. Each file is wrapped on its first line,
   with a sourceURL, so the line numbers in a stack trace are the editor's.

   TypeScript is the same files with types, written with import and export.
   The compiler is fetched only when TS is chosen, and only transpiles: types
   are removed, not checked. Each .ts file is compiled as it is required, with
   a source map, and the lines of a stack trace are mapped back through it to
   the lines that were written.

   Messages in and out are the ones pyworker.js uses; see there. A test's id is
   "<file>::<describe> > <describe> > <it>".

   Coverage: the file named by `cover` runs with probes in it (jscover.js),
   after TypeScript has compiled it, and the lines that have one, and those
   that ran, are mapped back to the lines that were written.              */
import { BRANCH, PROBE, instrument } from './jscover.js';
import { flowsOf } from './jsflow.js';
import { mutantsOf } from './jsmutate.js';
import { lineMap } from './sourcemap.js';
import { escRe, plural } from './util.js';

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
const LIBS = { jasmine: CDN + 'jasmine/7.0.2/jasmine.min.js', mocha: CDN + 'mocha/12.0.3/mocha.min.js' };
const CHAI = CDN + 'chai/5.2.0/chai.js';         // an ES module, imported rather than evaluated
// Mocha has no stubs of its own (Jasmine has spyOn), so Sinon comes with it
const SINON = CDN + 'sinon.js/22.1.0/sinon.min.js';
const TS = CDN + 'typescript/5.9.3/typescript.min.js';

const tell = (type, data = {}) => postMessage({ type, ...data });
const print = line => tell('out', { line });
// The framework's globals land on this worker's globalThis, like on a page.
// Its text is kept, so a check can evaluate it again for a fresh runner.
const TEXT = {};
async function script(url){
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  (0, eval)(TEXT[url] = await r.text());
}
// The framework is the worker's from the start, so only its library is fetched
const params = new URL(self.location.href).searchParams;
const FW = params.get('fw') || 'jasmine', LANG = params.get('lang') || 'js';
// JavaScript has no version of its own: what runs it is the browser's engine
function browser(){
  const ua = navigator.userAgent;
  const m = /Edg\/(\d+)/.exec(ua) ? ['Edge', /Edg\/(\d+)/.exec(ua)[1]]
    : /Firefox\/(\d+)/.exec(ua) ? ['Firefox', /Firefox\/(\d+)/.exec(ua)[1]]
    : /Chrome\/(\d+)/.exec(ua) ? ['Chrome', /Chrome\/(\d+)/.exec(ua)[1]]
    : /Version\/(\d+).*Safari/.exec(ua) ? ['Safari', /Version\/(\d+)/.exec(ua)[1]] : null;
  return m ? m.join(' ') : 'this browser';
}
const version = url => url.match(/\/(\d+\.\d+\.\d+)\//)[1];
let chai = null;
const ready = (async () => {
  await script(LIBS[FW]);
  if (FW === 'mocha') [chai] = await Promise.all([import(CHAI), script(SINON)]);
  if (LANG === 'ts') await script(TS);
  tell('ready', { versions: {
    [FW]: version(LIBS[FW]),
    ...(chai && { chai: version(CHAI), sinon: version(SINON) }),
    ...(LANG === 'ts' && { typescript: version(TS) }),
    browser: browser()
  } });
})();
ready.catch(e => tell('error', { message: String(e?.message || e) }));

/* ---------- Modules ---------- */
// The files of this run, by name, with the frames of a stack trace in them
let FILES = {};
// A compiled file's lines, to the lines it was compiled from (from 0)
const MAPS = {};
const written = (file, line) => {
  const map = MAPS[file];
  if (!map) return line;
  for (let l = line; l >= 0; l--) if (map[l] != null) return map[l];
  return line;
};
// "at add (calculator.js:5:11)" or "add@calculator.js:5:11": ours, deepest last
function frames(stack){
  const out = [];
  for (const m of String(stack || '').matchAll(/([\w.-]+\.[jt]s):(\d+):\d+/g))
    if (FILES[m[1]] != null) out.push({ file: m[1], line: written(m[1], +m[2] - 1) });
  return out.reverse();
}

/* ---------- TypeScript ---------- */
// A .ts file as JavaScript, or a SyntaxError that says where
function compile(name){
  const { ts } = globalThis;
  const r = ts.transpileModule(FILES[name], {
    fileName: name, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, sourceMap: true, esModuleInterop: true }
  });
  const d = r.diagnostics?.[0];
  if (d){
    const line = d.file ? d.file.getLineAndCharacterOfPosition(d.start).line : 0;
    throw Object.assign(new SyntaxError(ts.flattenDiagnosticMessageText(d.messageText, ' ')), { frames: [{ file: name, line }] });
  }
  MAPS[name] = lineMap(JSON.parse(r.sourceMapText).mappings);
  return r.outputText.replace(/^\/\/# sourceMappingURL=.*$/m, '');
}
// Node's fs, os and path, as much of them as the examples use, over a map
function builtins(){
  const files = new Map(), dirs = new Set(['/tmp']);
  const missing = p => Object.assign(new Error(`ENOENT: no such file or directory, open '${p}'`), { code: 'ENOENT' });
  let n = 0;
  const fs = {
    writeFileSync: (p, data) => { files.set(String(p), String(data)); },
    readFileSync: p => { if (!files.has(String(p))) throw missing(p); return files.get(String(p)); },
    existsSync: p => files.has(String(p)) || dirs.has(String(p)),
    mkdtempSync: prefix => { const d = `${prefix}${(++n).toString(36).padStart(6, '0')}`; dirs.add(d); return d; },
    rmSync: p => { p = String(p); dirs.delete(p); for (const f of [...files.keys()]) if (f === p || f.startsWith(p + '/')) files.delete(f); },
    unlinkSync: p => { if (!files.delete(String(p))) throw missing(p); }
  };
  const path = { join: (...parts) => parts.join('/').replace(/\/+/g, '/'), sep: '/' };
  const os = { tmpdir: () => '/tmp' };
  return { fs, path, os };
}
/* ---------- Coverage ---------- */
// What the file under test is, its probes, and the lines (compiled) they hit
let COVER = null, probed = null, branchesAt = null;
const HITS = {};
// The ways out each branch took ("<id>:1" true or into the body, ":0" false
// or run out), recorded by the wrapped conditions and iterables (jscover.js)
const TAKEN = new Set();
const BRANCHES = {
  b: (id, v) => { TAKEN.add(`${id}:${v ? 1 : 0}`); return v; },
  *i(id, items){ for (const x of items){ TAKEN.add(`${id}:1`); yield x; } TAKEN.add(`${id}:0`); }
};
// While a check runs, the probes count the statements that run too, and stop
// code that runs on far longer than the code as written did (see brief)
let GUARD = null;
function guard(limit){
  const seen = new Set();
  let n = 0, total = 0, stopped = false;
  return { seen, count: () => total, stopped: () => stopped, probe: new Proxy({}, { set(_, line){
    seen.add(+line);
    total++;
    // Counted again from nothing, so the tests after this one run as usual
    if (++n > limit && limit){ n = 0; stopped = true; throw new Error('The code ran on and on, so it was stopped'); }
    return true;
  } }) };
}
// The file as it runs, with probes when they still parse; the same text
// either way for a file not measured
function source(name){
  const js = name.endsWith('.ts') ? compile(name) : FILES[name];
  if (name !== COVER) return [js];
  const r = instrument(js, PROBE, { branches: true });
  try { new Function('module', 'exports', 'require', PROBE, BRANCH, r.code); } catch { probed = false; return [js]; }
  probed = r.lines; branchesAt = r.branches;
  return [r.code, GUARD?.probe || HITS];
}
// The lines written that have a probe, and those of them that ran, from 0; a
// module the tests never loaded is read for its lines now
function coverage(){
  if (probed == null){
    try { source(COVER); } catch { probed = false; }
  }
  if (!probed) return { file: COVER, lines: null };
  const map = MAPS[COVER], back = l => (map ? map[l] : l);
  const lines = new Set(probed.map(back).filter(l => l != null));
  const hit = new Set(Object.keys(HITS).map(l => back(+l)).filter(l => lines.has(l)));
  // Per line written with a branch: [line, ways out, ways taken], as pyworker.js sends them
  const per = new Map();
  for (const { id, line } of branchesAt || []){
    const l = back(line);
    if (l == null) continue;
    const t = per.get(l) || [l, 0, 0];
    t[1] += 2; t[2] += TAKEN.has(`${id}:1`) + TAKEN.has(`${id}:0`);
    per.set(l, t);
  }
  return { file: COVER, lines: [...lines].sort((a, b) => a - b), hit: [...hit].sort((a, b) => a - b),
    branches: [...per.values()].sort((a, b) => a[0] - b[0]), flows: flowsOf(FILES[COVER]) };
}

function makeRequire(){
  const cache = {}, base = builtins();
  const resolve = spec => {
    const name = spec.replace(/^\.\//, '');
    return [name, `${name}.js`, `${name}.ts`].find(n => FILES[n] != null);
  };
  const require = spec => {
    const bare = spec.replace(/^node:/, '');
    if (base[bare]) return base[bare];
    if (spec === 'chai' && chai) return chai;
    if (spec === 'sinon' && globalThis.sinon) return globalThis.sinon;
    const name = spec.startsWith('.') && resolve(spec);
    if (!name) throw new Error(`Cannot find module '${spec}'`);
    if (cache[name]) return cache[name].exports;
    const module = cache[name] = { exports: {} };
    // On the file's first line, so its lines are the editor's lines
    const [js, hits] = source(name);
    const fn = (0, eval)(`(function (module, exports, require, ${PROBE}, ${BRANCH}) {${js}\n})\n//# sourceURL=${name}`);
    fn(module, module.exports, require, hits, BRANCHES);
    return module.exports;
  };
  return require;
}

/* ---------- The runners ----------
   Each runs the file's tests, or `target` alone, and says how each went:
   aloud (`out` is the console and the page), or quietly for a run of the
   mutations or Create's check (QUIET). Each returns the exit code, each
   test's title and whether it passed (a title that runs more than once
   passes only if every run does), and whether the file broke outside any
   test, which leaves nothing to judge by. */
const LOUD = { print, tell }, QUIET = { print(){}, tell(){} };

/* ---------- Jasmine ---------- */
async function runJasmine(testsFile, target, out = LOUD){
  // Loaded in a browser, Jasmine has already put describe, it and expect on
  // the globals; running is left to whoever boots it, which is us
  const env = globalThis.jasmine.getEnv();
  env.configure({ random: false });
  makeRequire()(`./${testsFile}`);            // defines the suites

  // Every spec, as the runner will name it, before any of them runs
  const ids = new Map(), list = [];
  (function walk(node, path){
    for (const c of node.children || []){
      const p = [...path, c.description];
      if (c.children) walk(c, p);
      else { const id = `${testsFile}::${p.join(' > ')}`; ids.set(c.id, id); list.push({ id, name: c.description }); }
    }
  })(env.topSuite(), []);
  out.tell('collected', { tests: list });

  let depth = 0, t0 = 0;
  const failures = [], counts = { specs: 0, failed: 0, pending: 0 }, results = new Map();
  const pad = () => '  '.repeat(depth);
  env.addReporter({
    suiteStarted: r => { out.print(pad() + r.description); depth++; },
    suiteDone: () => { depth--; },
    specStarted: r => { t0 = performance.now(); out.tell('start', { id: ids.get(r.id) }); },
    specDone: r => {
      const id = ids.get(r.id), ms = Math.round(performance.now() - t0);
      if (r.status === 'excluded') return;
      counts.specs++;
      results.set(r.description, results.get(r.description) !== false && r.status !== 'failed');
      if (r.status === 'passed'){ out.print(`${pad()}✓ ${r.description}`); out.tell('result', { id, outcome: 'passed', ms }); return; }
      if (r.status === 'pending'){ counts.pending++; out.print(`${pad()}- ${r.description} (pending)`); out.tell('result', { id, outcome: 'skipped', ms, message: r.pendingReason || 'Pending', frames: [] }); return; }
      counts.failed++;
      const f = r.failedExpectations[0] || {};
      out.print(`${pad()}✗ ${r.description}`);
      failures.push([r.fullName, r.failedExpectations]);
      out.tell('result', { id, outcome: 'failed', ms, message: f.message, frames: frames(f.stack) });
    }
  });
  const result = await env.execute(target === testsFile ? undefined : [...ids].filter(([, v]) => v === target).map(([k]) => k));

  failures.forEach(([name, fails], i) => {
    out.print('');
    out.print(`${i + 1}) ${name}`);
    for (const f of fails){ out.print(`  Message:`); out.print(`    ${f.message}`); out.print(`  Stack:`); for (const l of String(f.stack || '').split('\n').slice(0, 6)) out.print(`    ${l.trim()}`); }
  });
  out.print('');
  out.print(`${plural(counts.specs, 'spec')}, ${plural(counts.failed, 'failure')}`
    + (counts.pending ? `, ${counts.pending} pending ${counts.pending === 1 ? 'spec' : 'specs'}` : ''));
  for (const e of result?.failedExpectations || []) out.print(`Error: ${e.message}`);
  const code = !counts.specs ? 5 : counts.failed || result?.overallStatus === 'failed' ? 1 : 0;
  return { code, results, broken: !!result?.failedExpectations?.length };
}

/* ---------- Mocha, with its spec reporter's words ---------- */
async function runMocha(testsFile, target, out = LOUD){
  const { mocha } = globalThis;
  const ids = new Map(), failures = [], passed = new Set(), failed = new Set();
  let depth = 0, passing = 0, pending = 0, t0 = 0, broken = false;
  const pad = () => '  '.repeat(depth + 1);
  const idOf = t => `${testsFile}::${t.titlePath().join(' > ')}`;
  // A reporter is the one thing Mocha is told about the page: here there is none
  function Reporter(runner){
    runner.on('suite', s => { if (s.title){ out.print(pad() + s.title); depth++; } });
    runner.on('suite end', s => { if (s.title) depth--; });
    runner.on('test', t => { t0 = performance.now(); out.tell('start', { id: idOf(t) }); });
    runner.on('pass', t => { passing++; passed.add(t.title); out.print(`${pad()}✔ ${t.title}`); out.tell('result', { id: idOf(t), outcome: 'passed', ms: t.duration ?? 0 }); });
    runner.on('pending', t => { pending++; passed.add(t.title); out.print(`${pad()}- ${t.title}`); out.tell('result', { id: idOf(t), outcome: 'skipped', ms: 0, message: 'Pending', frames: [] }); });
    runner.on('fail', (t, err) => {
      failures.push([t, err]);
      out.print(`${pad()}${failures.length}) ${t.title}`);
      const info = { message: `${err.name || 'Error'}: ${err.message}`, frames: frames(err.stack) };
      // A hook that fails is not a test: it fails the test it ran for
      const test = t.type === 'hook' ? t.ctx?.currentTest : t;
      if (test) failed.add(test.title);
      else broken = true;
      if (test) out.tell('result', { id: idOf(test), outcome: t.type === 'hook' ? 'error' : 'failed', ms: Math.round(performance.now() - t0), ...info });
      else out.tell('collect-error', info);
    });
  }
  mocha.setup({ ui: 'bdd', reporter: Reporter, checkLeaks: false });
  makeRequire()(`./${testsFile}`);            // defines the suites

  // Every test, as the runner will name it, before any of them runs
  const list = [];
  (function walk(suite){
    for (const t of suite.tests){ const id = idOf(t); ids.set(id, t); list.push({ id, name: t.title }); }
    for (const s of suite.suites) walk(s);
  })(mocha.suite);
  out.tell('collected', { tests: list });
  if (target !== testsFile && ids.has(target))
    mocha.grep(new RegExp(`^${escRe(ids.get(target).fullTitle())}$`));

  out.print('');
  const start = performance.now();
  await new Promise(done => mocha.run(done));
  out.print('');
  out.print(`  ${passing} passing (${Math.round(performance.now() - start)}ms)`);
  if (pending) out.print(`  ${pending} pending`);
  if (failures.length) out.print(`  ${failures.length} failing`);
  failures.forEach(([t, err], i) => {
    out.print('');
    out.print(`  ${i + 1}) ${t.fullTitle()}:`);
    for (const l of String(err.stack || `${err.name}: ${err.message}`).split('\n').slice(0, 6)) out.print(`     ${l.trim()}`);
  });
  const code = !passing && !failures.length && !pending ? 5 : failures.length ? 1 : 0;
  return { code, results: new Map(list.map(t => [t.name, passed.has(t.name) && !failed.has(t.name)])), broken };
}

/* ---------- Create: does a test you wrote catch what the example's own catches? ----------
   pyworker.js's brief, for JavaScript: both test files run on the code, then
   on each mutant (jsmutate.js), every test to the end, and what is kept is
   the titles of the tests that failed. The framework is evaluated again for
   each run, so each starts with nothing defined. A mutant whose code runs
   more than 100 times as many statements as the code as written is stopped,
   which fails the test it was in. */
async function failing(testsFile){
  (0, eval)(TEXT[LIBS[FW]]);
  try {
    const r = await (FW === 'mocha' ? runMocha : runJasmine)(testsFile, testsFile, QUIET);
    return r.broken ? null : r.results;
  } catch { return null; }
}
// A title written with ${…} runs once per case, each named for its values:
// the cases are put back under the title as written, failing if any fails
const asWritten = names => {
  const res = names.map(n => [n, new RegExp(`^${n.split(/\$\{[^}]*\}/).map(escRe).join('.*?')}$`)]);
  return r => {
    if (!r) return r;
    const out = new Map();
    for (const [title, ok] of r){
      const k = res.find(([, re]) => re.test(title))?.[0] ?? title;
      out.set(k, (out.get(k) ?? true) && ok);
    }
    return out;
  };
};
// One quiet run of `testsFile` with these files: what each test did (by
// failing), how many statements of the code ran, the lines written that ran,
// and whether the guard had to stop the code. `unrun` says whether a line
// surely never ran: it starts a statement (has a probe) and that did not run.
// A line inside a statement that starts above it cannot say, so it counts as run.
async function quietly(files, cover, testsFile, limit, group = r => r){
  FILES = files; COVER = cover; probed = null;
  GUARD = guard(limit);
  const r = group(await failing(testsFile));
  const map = MAPS[COVER], back = ls => new Set([...ls].map(l => (map ? map[l] : l)).filter(l => l != null));
  const lines = back(GUARD.seen), probes = back(probed || []);
  return { r, n: GUARD.count(), stopped: GUARD.stopped(), lines, unrun: l => probes.has(l) && !lines.has(l) };
}
// eslint-disable-next-line no-console -- the tests' own output goes nowhere while checking
const silence = () => { console.log = console.info = console.warn = console.error = () => {}; };

/* ---------- Mutation: does a test notice when the code changes? ----------
   pyworker.js's mutate, for JavaScript: the tests must pass as they are, a
   mutant on a line no test runs is never run, and each of the others runs
   every test (jsmutate.js makes them). `only`, a mutant's id, runs that one. */
async function mutate(data){
  const code = data.files[data.cover], mutants = mutantsOf(code);
  tell('mutants', { mutants: mutants.map(([meta]) => meta) });
  silence();
  try {
    const base = await quietly(data.files, data.cover, data.target, 0);
    if (!base.r?.size) return tell('mutation-refused', { reason: base.r ? 'none' : 'failing' });
    if (![...base.r.values()].every(Boolean)) return tell('mutation-refused', { reason: 'failing' });
    const limit = Math.max(100 * base.n, 100000);
    for (const [meta, src] of mutants){
      if (data.only != null && meta.id !== data.only) continue;
      if (base.unrun(meta.line)){ tell('mutant', { id: meta.id, outcome: 'unrun' }); continue; }
      const m = await quietly({ ...data.files, [data.cover]: src }, data.cover, data.target, limit);
      tell('mutant', { id: meta.id, outcome: m.r && [...m.r.values()].every(Boolean) ? 'escaped' : 'caught', timeout: m.stopped });
    }
  } catch (e){ tell('error', { message: String(e?.message || e) }); return; }
  finally { GUARD = null; }
  tell('mutation-done');
}

async function brief(data){
  const code = data.files[data.cover], mine = data.target, group = asWritten(data.names || []);
  const theirs = mine.replace(/\.(spec|test)\./, '.original.$1.');
  silence();
  const measure = (file, src, limit) => quietly({ ...data.files, [theirs]: data.original, [data.cover]: src }, data.cover, file, limit, group);
  try {
    const t = await measure(theirs, code, 0), m = await measure(mine, code, 0);
    if (!t.r || ![...t.r.values()].every(Boolean)) return tell('brief', { refused: 'original' });
    if (!m.r) return tell('brief', { refused: 'mine' });
    const limit = Math.max(100 * Math.max(t.n, m.n), 100000);
    const mutants = mutantsOf(code).filter(([meta]) => !(t.unrun(meta.line) && m.unrun(meta.line)));
    const fails = (r, all) => (r ? [...r].filter(([, ok]) => !ok).map(([n]) => n) : [...all.keys()]);
    const caught = [];
    for (const [i, [meta, src]] of mutants.entries()){
      tell('brief-progress', { done: i, of: mutants.length });
      caught.push([meta.id, new Set(fails((await measure(theirs, src, limit)).r, t.r)), new Set(fails((await measure(mine, src, limit)).r, m.r))]);
    }
    const tests = {};
    for (const name of t.r.keys()){
      const need = caught.filter(([, them]) => them.has(name));
      tests[name] = { written: m.r.has(name), passes: !!m.r.get(name),
        need: need.map(([id]) => id), missed: need.filter(([, , me]) => !me.has(name)).map(([id]) => id) };
    }
    tell('brief', { tests, mutants: mutants.map(([meta]) => meta) });
  } catch (e){ tell('error', { message: String(e?.message || e) }); }
  finally { GUARD = null; }
}

onmessage = async ({ data }) => {
  try { await ready; } catch { return; }       // already reported
  if (data.brief) return brief(data);
  if (data.mutate) return mutate(data);
  if (data.list) return tell('mutants', { mutants: mutantsOf(data.src).map(([meta]) => meta) });
  FILES = data.files;
  COVER = FILES[data.cover] != null ? data.cover : null;
  const testsFile = Object.keys(FILES).find(n => /\.(spec|test)\.[jt]s$/.test(n));
  // What a test prints goes to the console, the way it would in a terminal
  // eslint-disable-next-line no-console -- the tests' own output, sent to the console tab
  console.log = console.info = console.warn = console.error = (...a) => print(a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  let code;
  try { ({ code } = await (FW === 'mocha' ? runMocha : runJasmine)(testsFile, data.target)); }
  catch (e){
    // The file did not load: a syntax error, or a require that failed
    print(String(e?.stack || e));
    tell('collect-error', { message: `${e?.name || 'Error'}: ${e?.message || e}`, frames: e?.frames || frames(e?.stack) });
    code = 1;
  }
  if (COVER) tell('coverage', coverage());
  tell('done', { code });
};
